import {
  users,
  connections,
  lists,
  listParticipants,
  listItems,
  invitations,
  categories,
  sessions,
  type User,
  type UpsertUser,
  type Connection,
  type InsertConnection,
  type List,
  type InsertList,
  type ListParticipant,
  type InsertListParticipant,
  type ListItem,
  type InsertListItem,
  type Invitation,
  type InsertInvitation,
  type Category,
  type InsertCategory,
  type ListWithDetails,
  type UserConnection,
  type InvitationWithDetails,
  type CategoryWithSubcategories,
  type ListItemWithDetails,
} from "@shared/schema";
// Use appropriate database connection based on environment
const isLocalDev = !process.env.REPL_ID || process.env.LOCAL_DEV === 'true' || process.env.NODE_ENV === 'development';

let db: any;

async function initializeDatabase() {
  if (isLocalDev) {
    console.log("Using local PostgreSQL database");
    const { db: localDb } = await import("./localDb");
    return localDb;
  } else {
    console.log("Using Neon serverless database");
    const { db: neonDb } = await import("./db");
    return neonDb;
  }
}

// Initialize database connection
const dbPromise = initializeDatabase();
db = await dbPromise;

import { eq, and, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Connection operations
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnectionStatus(id: string, status: string): Promise<Connection>;
  getUserConnections(userId: string): Promise<UserConnection[]>;
  getPendingInvitations(userId: string): Promise<UserConnection[]>;
  getConnectionByUsers(requesterId: string, addresseeId: string): Promise<Connection | undefined>;
  
  // List operations
  createList(list: InsertList): Promise<List>;
  getUserLists(userId: string): Promise<ListWithDetails[]>;
  getListById(id: string): Promise<ListWithDetails | undefined>;
  updateList(id: string, updates: Partial<InsertList>): Promise<List>;
  deleteList(id: string): Promise<void>;
  
  // List participant operations
  addListParticipant(participant: InsertListParticipant): Promise<ListParticipant>;
  removeListParticipant(listId: string, userId: string): Promise<void>;
  updateParticipantPermissions(listId: string, userId: string, permissions: Partial<Pick<InsertListParticipant, 'canAdd' | 'canEdit' | 'canDelete'>>): Promise<ListParticipant>;
  
  // List item operations
  addListItem(item: InsertListItem): Promise<ListItemWithDetails>;
  updateListItem(id: string, updates: Partial<InsertListItem>): Promise<ListItem>;
  deleteListItem(id: string): Promise<void>;
  getListItems(listId: string): Promise<ListItemWithDetails[]>;
  
  // Category operations
  createCategory(category: InsertCategory): Promise<Category>;
  getCategories(): Promise<CategoryWithSubcategories[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  initializeDefaultCategories(): Promise<void>;
  
  // Invitation operations
  createInvitation(invitation: InsertInvitation & { token: string }): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<InvitationWithDetails | undefined>;
  getUserInvitations(userId: string): Promise<InvitationWithDetails[]>;
  getSentInvitations(userId: string): Promise<InvitationWithDetails[]>;
  updateInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<Invitation>;
  deleteInvitation(id: string): Promise<void>;
  expireOldInvitations(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Connection operations
  async createConnection(connection: InsertConnection): Promise<Connection> {
    const [newConnection] = await db
      .insert(connections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateConnectionStatus(id: string, status: string): Promise<Connection> {
    const [connection] = await db
      .update(connections)
      .set({ status, updatedAt: new Date() })
      .where(eq(connections.id, id))
      .returning();
    return connection;
  }

  async getUserConnections(userId: string): Promise<UserConnection[]> {
    // First get all accepted connections for the user
    const userConnections = await db
      .select()
      .from(connections)
      .where(
        and(
          or(
            eq(connections.requesterId, userId),
            eq(connections.addresseeId, userId)
          ),
          eq(connections.status, "accepted")
        )
      );

    // Then fetch user details for each connection
    const result: UserConnection[] = [];
    for (const connection of userConnections) {
      const [requester] = await db.select().from(users).where(eq(users.id, connection.requesterId));
      const [addressee] = await db.select().from(users).where(eq(users.id, connection.addresseeId));
      
      result.push({
        ...connection,
        requester: requester!,
        addressee: addressee!,
      });
    }

    return result;
  }

  async getPendingInvitations(userId: string): Promise<UserConnection[]> {
    // First get all pending invitations for the user
    const pendingInvitations = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.addresseeId, userId),
          eq(connections.status, "pending")
        )
      );

    // Then fetch user details for each invitation
    const result: UserConnection[] = [];
    for (const invitation of pendingInvitations) {
      const [requester] = await db.select().from(users).where(eq(users.id, invitation.requesterId));
      const [addressee] = await db.select().from(users).where(eq(users.id, invitation.addresseeId));
      
      result.push({
        ...invitation,
        requester: requester!,
        addressee: addressee!,
      });
    }

    return result;
  }

  async getConnectionByUsers(requesterId: string, addresseeId: string): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(
        or(
          and(
            eq(connections.requesterId, requesterId),
            eq(connections.addresseeId, addresseeId)
          ),
          and(
            eq(connections.requesterId, addresseeId),
            eq(connections.addresseeId, requesterId)
          )
        )
      );
    return connection;
  }

  // List operations
  async createList(list: InsertList): Promise<List> {
    const [newList] = await db
      .insert(lists)
      .values(list)
      .returning();
    return newList;
  }

  async getUserLists(userId: string): Promise<ListWithDetails[]> {
    const userLists = await db
      .select({
        list: lists,
        creator: users,
        itemCount: sql<number>`count(${listItems.id})`.as('item_count'),
      })
      .from(lists)
      .leftJoin(users, eq(lists.creatorId, users.id))
      .leftJoin(listParticipants, eq(lists.id, listParticipants.listId))
      .leftJoin(listItems, eq(lists.id, listItems.listId))
      .where(
        or(
          eq(lists.creatorId, userId),
          eq(listParticipants.userId, userId)
        )
      )
      .groupBy(lists.id, users.id)
      .orderBy(desc(lists.updatedAt));

    const result: ListWithDetails[] = [];
    
    for (const row of userLists) {
      const participants = await db
        .select()
        .from(listParticipants)
        .leftJoin(users, eq(listParticipants.userId, users.id))
        .where(eq(listParticipants.listId, row.list.id));

      const items = await db
        .select()
        .from(listItems)
        .leftJoin(users, eq(listItems.addedById, users.id))
        .where(eq(listItems.listId, row.list.id))
        .orderBy(desc(listItems.createdAt));

      result.push({
        ...row.list,
        creator: row.creator!,
        participants: participants.map((p: any) => ({
          ...p.list_participants,
          user: p.users!,
        })),
        items: items.map((i: any) => ({
          ...i.list_items,
          addedBy: i.users!,
        })),
        itemCount: row.itemCount,
        lastItem: items[0] ? {
          ...items[0].list_items,
          addedBy: items[0].users!,
        } : undefined,
      });
    }

    return result;
  }

  async getListById(id: string): Promise<ListWithDetails | undefined> {
    const [listResult] = await db
      .select()
      .from(lists)
      .leftJoin(users, eq(lists.creatorId, users.id))
      .where(eq(lists.id, id));

    if (!listResult) return undefined;

    const participants = await db
      .select()
      .from(listParticipants)
      .leftJoin(users, eq(listParticipants.userId, users.id))
      .where(eq(listParticipants.listId, id));

    const items = await db
      .select()
      .from(listItems)
      .leftJoin(users, eq(listItems.addedById, users.id))
      .where(eq(listItems.listId, id))
      .orderBy(desc(listItems.createdAt));

    return {
      ...listResult.lists,
      creator: listResult.users!,
      participants: participants.map((p: any) => ({
        ...p.list_participants,
        user: p.users!,
      })),
      items: items.map((i: any) => ({
        ...i.list_items,
        addedBy: i.users!,
      })),
      itemCount: items.length,
      lastItem: items[0] ? {
        ...items[0].list_items,
        addedBy: items[0].users!,
      } : undefined,
    };
  }

  async updateList(id: string, updates: Partial<InsertList>): Promise<List> {
    const [list] = await db
      .update(lists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lists.id, id))
      .returning();
    return list;
  }

  async deleteList(id: string): Promise<void> {
    await db.delete(lists).where(eq(lists.id, id));
  }

  // List participant operations
  async addListParticipant(participant: InsertListParticipant): Promise<ListParticipant> {
    const [newParticipant] = await db
      .insert(listParticipants)
      .values(participant)
      .returning();
    return newParticipant;
  }

  async removeListParticipant(listId: string, userId: string): Promise<void> {
    await db
      .delete(listParticipants)
      .where(
        and(
          eq(listParticipants.listId, listId),
          eq(listParticipants.userId, userId)
        )
      );
  }

  async updateParticipantPermissions(
    listId: string, 
    userId: string, 
    permissions: Partial<Pick<InsertListParticipant, 'canAdd' | 'canEdit' | 'canDelete'>>
  ): Promise<ListParticipant> {
    const [participant] = await db
      .update(listParticipants)
      .set(permissions)
      .where(
        and(
          eq(listParticipants.listId, listId),
          eq(listParticipants.userId, userId)
        )
      )
      .returning();
    return participant;
  }

  // List item operations
  async addListItem(item: InsertListItem): Promise<ListItemWithDetails> {
    const [newItem] = await db
      .insert(listItems)
      .values(item)
      .returning();

    // Update list's updatedAt timestamp
    await db
      .update(lists)
      .set({ updatedAt: new Date() })
      .where(eq(lists.id, item.listId));

    const [itemWithDetails] = await db
      .select()
      .from(listItems)
      .leftJoin(users, eq(listItems.addedById, users.id))
      .leftJoin(categories, eq(listItems.categoryId, categories.id))
      .where(eq(listItems.id, newItem.id));

    return {
      ...itemWithDetails.list_items,
      addedBy: itemWithDetails.users!,
      category: itemWithDetails.categories || undefined,
    };
  }

  async updateListItem(id: string, updates: Partial<InsertListItem>): Promise<ListItem> {
    const [item] = await db
      .update(listItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(listItems.id, id))
      .returning();
    return item;
  }

  async deleteListItem(id: string): Promise<void> {
    await db.delete(listItems).where(eq(listItems.id, id));
  }

  async getListItems(listId: string): Promise<ListItemWithDetails[]> {
    const items = await db
      .select()
      .from(listItems)
      .leftJoin(users, eq(listItems.addedById, users.id))
      .leftJoin(categories, eq(listItems.categoryId, categories.id))
      .where(eq(listItems.listId, listId))
      .orderBy(desc(listItems.createdAt));

    return items.map((item: any) => ({
      ...item.list_items,
      addedBy: item.users!,
      category: item.categories || undefined,
    }));
  }

  // Category operations
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async getCategories(): Promise<CategoryWithSubcategories[]> {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(categories.name);

    // Group categories with their subcategories
    const mainCategories = allCategories.filter((cat: any) => !cat.parentId);
    
    return mainCategories.map((mainCat: any) => ({
      ...mainCat,
      subcategories: allCategories.filter((subCat: any) => subCat.parentId === mainCat.id)
    }));
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async initializeDefaultCategories(): Promise<void> {
    // Check if categories already exist
    const existingCategories = await db.select().from(categories).limit(1);
    if (existingCategories.length > 0) return;

    // Import and create default categories
    const { defaultCategories, musicSubcategories, foodSubcategories, movieSubcategories } = await import("./categories");
    
    // Insert main categories
    const insertedCategories = await db
      .insert(categories)
      .values(defaultCategories)
      .returning();

    // Find specific category IDs for subcategories
    const musicCategory = insertedCategories.find((cat: any) => cat.name === "Music");
    const foodCategory = insertedCategories.find((cat: any) => cat.name === "Food & Restaurants");
    const movieCategory = insertedCategories.find((cat: any) => cat.name === "Movies");

    // Insert subcategories
    const subcategoriesToInsert = [];
    
    if (musicCategory) {
      subcategoriesToInsert.push(...musicSubcategories(musicCategory.id));
    }
    if (foodCategory) {
      subcategoriesToInsert.push(...foodSubcategories(foodCategory.id));
    }
    if (movieCategory) {
      subcategoriesToInsert.push(...movieSubcategories(movieCategory.id));
    }

    if (subcategoriesToInsert.length > 0) {
      await db.insert(categories).values(subcategoriesToInsert);
    }

    console.log(`Initialized ${insertedCategories.length} main categories and ${subcategoriesToInsert.length} subcategories`);
  }

  // Invitation operations
  async createInvitation(invitation: InsertInvitation & { token: string }): Promise<Invitation> {
    const [newInvitation] = await db
      .insert(invitations)
      .values(invitation)
      .returning();
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<InvitationWithDetails | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .leftJoin(users, eq(invitations.inviterId, users.id))
      .leftJoin(lists, eq(invitations.listId, lists.id))
      .where(eq(invitations.token, token));

    if (!invitation) return undefined;

    return {
      ...invitation.invitations,
      inviter: invitation.users!,
      list: invitation.lists || undefined,
    };
  }

  async getUserInvitations(userId: string): Promise<InvitationWithDetails[]> {
    // Get invitations by email/phone for the user
    const user = await this.getUser(userId);
    if (!user) return [];

    const userInvitations = await db
      .select()
      .from(invitations)
      .leftJoin(users, eq(invitations.inviterId, users.id))
      .leftJoin(lists, eq(invitations.listId, lists.id))
      .where(
        and(
          or(
            eq(invitations.recipientEmail, user.email || ''),
            eq(invitations.recipientPhone, user.email || '') // In case phone is stored in email field
          ),
          eq(invitations.status, 'pending'),
          sql`${invitations.expiresAt} > NOW()`
        )
      )
      .orderBy(desc(invitations.createdAt));

    return userInvitations.map((inv: any) => ({
      ...inv.invitations,
      inviter: inv.users!,
      list: inv.lists || undefined,
    }));
  }

  async getSentInvitations(userId: string): Promise<InvitationWithDetails[]> {
    const sentInvitations = await db
      .select()
      .from(invitations)
      .leftJoin(users, eq(invitations.inviterId, users.id))
      .leftJoin(lists, eq(invitations.listId, lists.id))
      .where(eq(invitations.inviterId, userId))
      .orderBy(desc(invitations.createdAt));

    return sentInvitations.map((inv: any) => ({
      ...inv.invitations,
      inviter: inv.users!,
      list: inv.lists || undefined,
    }));
  }

  async updateInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<Invitation> {
    const [updatedInvitation] = await db
      .update(invitations)
      .set({ 
        status, 
        acceptedAt: acceptedAt || null 
      })
      .where(eq(invitations.id, id))
      .returning();
    return updatedInvitation;
  }

  async deleteInvitation(id: string): Promise<void> {
    await db
      .delete(invitations)
      .where(eq(invitations.id, id));
  }

  async expireOldInvitations(): Promise<void> {
    await db
      .update(invitations)
      .set({ status: 'expired' })
      .where(
        and(
          eq(invitations.status, 'pending'),
          sql`${invitations.expiresAt} < NOW()`
        )
      );
  }
}

export const storage = new DatabaseStorage();
