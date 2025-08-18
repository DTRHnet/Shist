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
  insertListItemSchema 
} from "@shared/schema";
import { z } from "zod";

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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.get('/api/connections/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const list = await storage.getListById(id);
      
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }

      res.json(list);
    } catch (error) {
      console.error("Error fetching list:", error);
      res.status(500).json({ message: "Failed to fetch list" });
    }
  });

  app.patch('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
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
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
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
      const { itemId } = req.params;
      const { content, note } = req.body;
      
      const item = await storage.updateListItem(itemId, content, note);
      res.json(item);
    } catch (error) {
      console.error("Error updating list item:", error);
      res.status(500).json({ message: "Failed to update list item" });
    }
  });

  app.delete('/api/lists/:listId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { listId, itemId } = req.params;
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
