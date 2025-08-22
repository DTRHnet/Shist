import type { Express } from "express";
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

  // Initialize default categories on first run
  await storage.initializeDefaultCategories();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both Replit and local auth user structures
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Connection routes
  app.post('/api/connections/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const { addresseeEmail } = req.body;

      // Find addressee by email
      const addressee = await storage.getUserByEmail(addresseeEmail);
      if (!addressee) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if connection already exists
      const existingConnection = await storage.getConnectionByUsers(userId, addressee.id);
      if (existingConnection) {
        return res.status(400).json({ message: "Connection already exists" });
      }

      const connectionData = insertConnectionSchema.parse({
        requesterId: userId,
        addresseeId: addressee.id,
      });

      const connection = await storage.createConnection(connectionData);
      res.json(connection);
    } catch (error) {
      console.error("Error creating connection:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  app.get('/api/connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.get('/api/connections/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const invitations = await storage.getPendingInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ message: "Failed to fetch pending invitations" });
    }
  });

  app.patch('/api/connections/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const connection = await storage.updateConnectionStatus(id, status);
      res.json(connection);
    } catch (error) {
      console.error("Error updating connection status:", error);
      res.status(500).json({ message: "Failed to update connection status" });
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

      res.json(list);
    } catch (error) {
      console.error("Error creating list:", error);
      res.status(500).json({ message: "Failed to create list" });
    }
  });

  app.get('/api/lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const lists = await storage.getUserLists(userId);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching lists:", error);
      res.status(500).json({ message: "Failed to fetch lists" });
    }
  });

  app.get('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId: id }, 'view_list');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ message: 'List not found' });
        return res.status(403).json({ message: 'Forbidden' });
      }
      const list = await storage.getListById(id);
      res.json(list);
    } catch (error) {
      console.error("Error fetching list:", error);
      res.status(500).json({ message: "Failed to fetch list" });
    }
  });

  app.patch('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId: id }, 'edit_list');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ message: 'List not found' });
        return res.status(403).json({ message: 'Forbidden' });
      }
      const updates = req.body;
      const list = await storage.updateList(id, updates);
      res.json(list);
    } catch (error) {
      console.error("Error updating list:", error);
      res.status(500).json({ message: "Failed to update list" });
    }
  });

  app.delete('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId: id }, 'delete_list');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ message: 'List not found' });
        return res.status(403).json({ message: 'Forbidden' });
      }
      await storage.deleteList(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting list:", error);
      res.status(500).json({ message: "Failed to delete list" });
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
      console.error("Error adding participant:", error);
      res.status(500).json({ message: "Failed to add participant" });
    }
  });

  // List item routes
  app.post('/api/lists/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const { id } = req.params;
      try {
        await requirePermission({ userId, listId: id }, 'add_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ message: 'List not found' });
        return res.status(403).json({ message: 'Forbidden' });
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
      console.error("Error adding list item:", error);
      res.status(500).json({ message: "Failed to add list item" });
    }
  });

  app.patch('/api/lists/:listId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { listId, itemId } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId }, 'update_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ message: 'List not found' });
        return res.status(403).json({ message: 'Forbidden' });
      }

      const updates = insertListItemSchema.partial().parse(req.body);

      if (!updates.content && !updates.note && !updates.url && !updates.categoryId && !updates.metadata) {
        return res.status(400).json({ message: "At least one field is required to update" });
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
      console.error("Error updating list item:", error);
      res.status(500).json({ message: "Failed to update list item" });
    }
  });

  app.delete('/api/lists/:listId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { listId, itemId } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      try {
        await requirePermission({ userId, listId }, 'delete_item');
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return res.status(404).json({ message: 'List not found' });
        return res.status(403).json({ message: 'Forbidden' });
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
      console.error("Error deleting list item:", error);
      res.status(500).json({ message: "Failed to delete list item" });
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get('/api/categories/:categoryId', async (req, res) => {
    try {
      const { categoryId } = req.params;
      const category = await storage.getCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid category data" });
    }
  });

  // Invitation routes
  const { emailService, smsService } = createInvitationServices();

  // Create invitation
  app.post('/api/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const invitationData = insertInvitationSchema.parse({
        ...req.body,
        inviterId: userId,
        expiresAt: InvitationUtils.getExpirationDate(),
      });

      // Generate unique token
      const token = InvitationUtils.generateInvitationToken();
      const invitation = await storage.createInvitation({
        ...invitationData,
        token,
      });

      // Get inviter details for sending
      const inviter = await storage.getUser(userId);
      if (!inviter) {
        return res.status(404).json({ message: "User not found" });
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
        } else if (invitationData.recipientPhone) {
          await smsService.sendInvitationSMS(
            invitationData.recipientPhone,
            inviterName,
            invitationLink,
            invitationData.invitationType as 'connection' | 'list',
            listName
          );
        }
      } catch (sendError) {
        console.error('Error sending invitation:', sendError);
        // Still return success since invitation was created
      }

      res.json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid invitation data" });
    }
  });

  // Get received invitations
  app.get('/api/invitations/received', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const invitations = await storage.getUserInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching received invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Get sent invitations
  app.get('/api/invitations/sent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const invitations = await storage.getSentInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching sent invitations:", error);
      res.status(500).json({ message: "Failed to fetch sent invitations" });
    }
  });

  // Accept invitation by token
  app.post('/api/invitations/accept/:token', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;

      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invitation has expired" });
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
        // Add user to the list with default VIEWER role (canAdd true)
        await storage.addListParticipant({
          listId: invitation.listId,
          userId: userId,
          canAdd: true,
          canEdit: false,
          canDelete: false,
        });
      }

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted', new Date());

      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Decline invitation
  app.post('/api/invitations/decline/:token', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      await storage.updateInvitationStatus(invitation.id, 'cancelled');
      res.json({ message: "Invitation declined" });
    } catch (error) {
      console.error("Error declining invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
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
      console.error("Error handling invitation:", error);
      res.status(500).json({ error: 'Server error' });
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
      console.error("Error fetching public list:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Cleanup expired invitations (can be called by a cron job)
  app.post('/api/invitations/cleanup', isAuthenticated, async (req: any, res) => {
    try {
      await storage.expireOldInvitations();
      res.json({ message: "Expired invitations cleaned up" });
    } catch (error) {
      console.error("Error cleaning up invitations:", error);
      res.status(500).json({ message: "Failed to cleanup invitations" });
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
