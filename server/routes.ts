import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

// Force local development mode when running in Replit development environment
const isLocalDev = !process.env.REPL_ID || process.env.LOCAL_DEV === 'true' || process.env.NODE_ENV === 'development';
import { 
  insertConnectionSchema, 
  insertListSchema, 
  insertListParticipantSchema, 
  insertListItemSchema,
  insertInvitationSchema,
  insertCategorySchema
} from "@shared/schema";
import { createInvitationServices, InvitationUtils } from "./invitationService";
import { z } from "zod";
import { requirePermission } from "./guards";
import { toErrorResponse } from "./errors";
import { InvitationRoleSchema, roleToPermissions, signInvitationToken, verifyInvitationToken, globalRateLimiter, globalIdempotencyStore } from "./invitationsUtil";
import { handleStripeWebhook } from "./stripeWebhooks";
import { track } from "./analytics";

export async function registerRoutes(app: Express): Promise<Server> {
  // Import auth functions based on environment
  let setupAuth: (app: Express) => Promise<void>;
  let isAuthenticated: any;

  if (isLocalDev) {
    console.log("Using local authentication for development");
    const { setupLocalAuth, isLocalAuthenticated } = await import("./localAuth");
    setupAuth = setupLocalAuth;
    isAuthenticated = isLocalAuthenticated;
  } else {
    console.log("Using Replit authentication for production");
    const { setupAuth: setupReplitAuth, isAuthenticated: isReplitAuthenticated } = await import("./replitAuth");
    setupAuth = setupReplitAuth;
    isAuthenticated = isReplitAuthenticated;
  }

  // Auth middleware
  await setupAuth(app);

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Initialize default categories on first run
  await storage.initializeDefaultCategories();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both Replit and local auth user structures
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const user = await storage.getUser(userId);
      const sub = await storage.getSubscriptionByUserId(userId);
      const isAdFree = (user?.adPreference === 'hide') || (sub && (sub.status === 'active' || sub.status === 'trialing'));
      res.json({ ...user, isAdFree });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Users routes (alias)
  app.get('/api/users/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const user = await storage.getUser(userId);
      const sub = await storage.getSubscriptionByUserId(userId);
      const isAdFree = (user?.adPreference === 'hide') || (sub && (sub.status === 'active' || sub.status === 'trialing'));
      res.json({ ...user, isAdFree });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Webhooks
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }) as any, async (req: any, res) => {
    await handleStripeWebhook(req, res);
    try {
      const userId = req.body?.data?.object?.metadata?.userId;
      const status = req.body?.data?.object?.status;
      if (userId && status) track(req, { type: 'subscription_updated', userId, status });
    } catch {}
  });

  // Connection routes
  app.post('/api/connections/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const { addresseeEmail } = req.body;

      // Find addressee by email
      const addressee = await storage.getUserByEmail(addresseeEmail);
      if (!addressee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: "User not found" } });
      }

      // Check if connection already exists
      const existingConnection = await storage.getConnectionByUsers(userId, addressee.id);
      if (existingConnection) {
        return res.status(400).json({ error: { code: 'CONFLICT', message: "Connection already exists" } });
      }

      const connectionData = insertConnectionSchema.parse({
        requesterId: userId,
        addresseeId: addressee.id,
      });

      const connection = await storage.createConnection(connectionData);
      res.json(connection);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.get('/api/connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.get('/api/connections/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const invitations = await storage.getPendingInvitations(userId);
      res.json(invitations);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.patch('/api/connections/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: "Invalid status" } });
      }

      const connection = await storage.updateConnectionStatus(id, status);
      res.json(connection);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // List routes
  app.post('/api/lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const listData = insertListSchema.parse({
        ...req.body,
        creatorId: userId,
      });

      const list = await storage.createList(listData);
      
      // Add creator as participant with full permissions
      await storage.addListParticipant({
        listId: list.id,
        userId,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      });

      track(req, { type: 'list_created', listId: list.id, userId });
      res.json(list);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.get('/api/lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const lists = await storage.getUserLists(userId);
      res.json(lists);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.get('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId: id }, 'view_list');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }
      const list = await storage.getListById(id);
      res.json(list);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.patch('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId: id }, 'edit_list');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }
      const updates = req.body;
      const list = await storage.updateList(id, updates);
      res.json(list);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.delete('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId: id }, 'delete_list');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }
      await storage.deleteList(id);
      res.json({ success: true });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // List participant routes
  app.post('/api/lists/:id/participants', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const participantData = insertListParticipantSchema.parse({
        listId: id,
        ...req.body,
      });

      const participant = await storage.addListParticipant(participantData);
      res.json(participant);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // List item routes (nested)
  app.post('/api/lists/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const { id } = req.params;
      try {
        await requirePermission({ userId, listId: id }, 'add_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }
      const itemData = insertListItemSchema.parse({
        listId: id,
        addedById: userId,
        ...req.body,
      });

      const item = await storage.addListItem(itemData);
      
      // Broadcast to WebSocket clients
      broadcastToList(id, {
        type: 'item_added',
        listId: id,
        item,
      });

      res.json(item);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.patch('/api/lists/:listId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { listId, itemId } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId }, 'update_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }

      const updates = insertListItemSchema.partial().parse(req.body);

      if (!updates.content && !updates.note && !updates.url && !updates.categoryId && !updates.metadata) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: "At least one field is required to update" } });
      }

      const item = await storage.updateListItem(itemId, updates);
      
      // Broadcast to WebSocket clients
      broadcastToList(listId, {
        type: 'item_updated',
        listId,
        item,
      });
      
      res.json(item);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.delete('/api/lists/:listId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { listId, itemId } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId }, 'delete_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }
      await storage.deleteListItem(itemId);
      
      // Broadcast to WebSocket clients
      broadcastToList(listId, {
        type: 'item_deleted',
        listId,
        itemId,
      });

      res.json({ success: true });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Items routes (top-level)
  app.post('/api/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const data = insertListItemSchema.parse({ ...req.body, addedById: userId });
      try {
        await requirePermission({ userId, listId: data.listId }, 'add_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }
      const item = await storage.addListItem(data);
      broadcastToList(data.listId, { type: 'item_added', listId: data.listId, item });
      res.json(item);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.patch('/api/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      // Need listId for guard. Require it in body.
      const parsed = insertListItemSchema.partial().extend({ listId: z.string().uuid() }).parse(req.body);
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId: parsed.listId! }, 'update_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }
      if (!parsed.content && !parsed.note && !parsed.url && !parsed.categoryId && !parsed.metadata) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: "At least one field is required to update" } });
      }
      const item = await storage.updateListItem(itemId, parsed);
      broadcastToList(parsed.listId!, { type: 'item_updated', listId: parsed.listId!, item });
      res.json(item);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.delete('/api/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const body = z.object({ listId: z.string().uuid() }).parse(req.body);
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId: body.listId }, 'delete_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'List not found' } });
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      }
      await storage.deleteListItem(itemId);
      broadcastToList(body.listId, { type: 'item_deleted', listId: body.listId, itemId });
      res.json({ success: true });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.get('/api/categories/:categoryId', async (req, res) => {
    try {
      const { categoryId } = req.params;
      const category = await storage.getCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: "Category not found" } });
      }
      
      res.json(category);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Invitation routes
  const { emailService, smsService } = createInvitationServices();

  // Create invitation (with rate limit and signed token)
  app.post('/api/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      if (!globalRateLimiter.allow(`invite:create:${ip}`, 5, 10 * 60 * 1000)) {
        return res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } });
      }

      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const role = InvitationRoleSchema.parse(req.body.role ?? 'viewer');
      const invitationData = insertInvitationSchema.parse({
        ...req.body,
        inviterId: userId,
        expiresAt: InvitationUtils.getExpirationDate(),
      });

      // Generate signed token including role
      const payload = {
        jti: cryptoRandom(),
        inviterId: userId,
        listId: invitationData.listId,
        invitationType: invitationData.invitationType as 'connection' | 'list',
        role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(InvitationUtils.getExpirationDate().getTime() / 1000),
      } as const;
      const token = signInvitationToken(payload);

      const invitation = await storage.createInvitation({
        ...invitationData,
        token,
      });

      // Get inviter details for sending
      const inviter = await storage.getUser(userId);
      if (!inviter) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: "User not found" } });
      }

      const inviterName = inviter.firstName 
        ? `${inviter.firstName} ${inviter.lastName || ''}`.trim()
        : inviter.email || "Someone";

      // Generate invitation link
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const invitationLink = InvitationUtils.generateInvitationLink(token, baseUrl);

      // Get list name if it's a list invitation
      let listName: string | undefined;
      if (invitationData.invitationType === 'list' && invitationData.listId) {
        const list = await storage.getListById(invitationData.listId);
        listName = list?.name;
      }

      // Send invitation via email or SMS
      try {
        if (invitationData.recipientEmail) {
          await emailService.sendInvitationEmail(
            invitationData.recipientEmail,
            inviterName,
            invitationLink,
            invitationData.invitationType as 'connection' | 'list',
            listName
          );
          track(req, { type: 'invite_sent', listId: invitationData.listId, inviterId: userId, channel: 'email' });
        } else if (invitationData.recipientPhone) {
          await smsService.sendInvitationSMS(
            invitationData.recipientPhone,
            inviterName,
            invitationLink,
            invitationData.invitationType as 'connection' | 'list',
            listName
          );
          track(req, { type: 'invite_sent', listId: invitationData.listId, inviterId: userId, channel: 'sms' });
        }
      } catch (sendError) {
        console.error('Error sending invitation:', sendError);
        // Still return success since invitation was created
      }

      res.json(invitation);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  function cryptoRandom() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  // Get received invitations
  app.get('/api/invitations/received', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const invitations = await storage.getUserInvitations(userId);
      res.json(invitations);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Get sent invitations
  app.get('/api/invitations/sent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const invitations = await storage.getSentInvitations(userId);
      res.json(invitations);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Accept invitation by token with idempotency and rate limiting
  app.post('/api/invitations/accept/:token', isAuthenticated, async (req: any, res) => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      if (!globalRateLimiter.allow(`invite:accept:${ip}`, 10, 10 * 60 * 1000)) {
        return res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } });
      }

      const idemKey = req.header('Idempotency-Key');
      if (!idemKey) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing Idempotency-Key header' } });
      }
      if (globalIdempotencyStore.has(idemKey)) {
        return res.status(200).json({ message: 'Already accepted' });
      }

      const { token } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;

      // Verify token signature and expiry
      let decoded: any;
      try {
        decoded = verifyInvitationToken(token);
      } catch (e: any) {
        return res.status(400).json({ error: { code: 'BAD_TOKEN', message: e?.message || 'Invalid token' } });
      }

      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: "Invitation not found" } });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: "Invitation is no longer valid" } });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: "Invitation has expired" } });
      }

      // Upsert user record (best-effort)
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        const email = req.user.claims?.email || req.user.email;
        await storage.upsertUser({ id: userId, email });
      }

      // Process the invitation based on type
      if (invitation.invitationType === 'connection') {
        // Create connection if it doesn't exist
        const existingConnection = await storage.getConnectionByUsers(
          invitation.inviterId,
          userId
        );
        
        if (!existingConnection) {
          await storage.createConnection({
            requesterId: invitation.inviterId,
            addresseeId: userId,
            status: 'accepted'
          });
        } else if (existingConnection.status !== 'accepted') {
          await storage.updateConnectionStatus(existingConnection.id, 'accepted');
        }
      } else if (invitation.invitationType === 'list' && invitation.listId) {
        // Assign permissions based on role from token
        const perms = roleToPermissions(decoded.role || 'viewer');
        await storage.addListParticipant({
          listId: invitation.listId,
          userId: userId,
          ...perms,
        });
      }

      // Mark invitation as accepted and remember idempotency key
      await storage.updateInvitationStatus(invitation.id, 'accepted', new Date());
      globalIdempotencyStore.add(idemKey);

      track(req, { type: 'invite_accepted', listId: invitation.listId, userId });
      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Decline invitation
  app.post('/api/invitations/decline/:token', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: "Invitation not found" } });
      }

      await storage.updateInvitationStatus(invitation.id, 'cancelled');
      res.json({ message: "Invitation declined" });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Public invitation acceptance page (for users not logged in)
  app.get('/invite/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: 'This invitation is no longer valid' });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'This invitation has expired' });
      }

      // Return invitation details for frontend handling
      res.json({
        invitation: {
          id: invitation.id,
          type: invitation.invitationType,
          inviterName: invitation.inviter.firstName 
            ? `${invitation.inviter.firstName} ${invitation.inviter.lastName || ''}`.trim()
            : invitation.inviter.email,
          listName: invitation.list?.name,
          token: invitation.token
        }
      });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Public list sharing (for public lists)
  app.get('/list/:listId', async (req, res) => {
    try {
      const { listId } = req.params;
      
      const list = await storage.getListById(listId);
      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      if (!list.isPublic) {
        return res.status(403).json({ error: 'This list is private' });
      }

      // Return public list data
      res.json({ list });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  // Cleanup expired invitations (can be called by a cron job)
  app.post('/api/invitations/cleanup', isAuthenticated, async (req: any, res) => {
    try {
      await storage.expireOldInvitations();
      res.json({ message: "Expired invitations cleaned up" });
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      res.status(status).json(body);
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const listSubscriptions = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribe_list') {
          const { listId } = message;
          if (!listSubscriptions.has(listId)) {
            listSubscriptions.set(listId, new Set());
          }
          listSubscriptions.get(listId)!.add(ws);
        } else if (message.type === 'unsubscribe_list') {
          const { listId } = message;
          const subscribers = listSubscriptions.get(listId);
          if (subscribers) {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
              listSubscriptions.delete(listId);
            }
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      // Remove from all subscriptions
      listSubscriptions.forEach((subscribers, listId) => {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          listSubscriptions.delete(listId);
        }
      });
    });
  });

  function broadcastToList(listId: string, message: any) {
    const subscribers = listSubscriptions.get(listId);
    if (subscribers) {
      const messageStr = JSON.stringify(message);
      subscribers.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  return httpServer;
}
