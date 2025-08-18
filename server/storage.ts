import {
  users,
  connections,
  lists,
  listParticipants,
  listItems,
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
  type ListWithDetails,
  type UserConnection,
} from "@shared/schema";
import { db } from "./db";
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
  addListItem(item: InsertListItem): Promise<ListItem & { addedBy: User }>;
  updateListItem(id: string, content: string, note?: string): Promise<ListItem>;
  deleteListItem(id: string): Promise<void>;
  getListItems(listId: string): Promise<(ListItem & { addedBy: User })[]>;
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
    const userConnections = await db
      .select()
      .from(connections)
      .leftJoin(users, eq(connections.requesterId, users.id))
      .leftJoin(users, eq(connections.addresseeId, users.id))
      .where(
        and(
          or(
            eq(connections.requesterId, userId),
            eq(connections.addresseeId, userId)
          ),
          eq(connections.status, "accepted")
        )
      );

    return userConnections.map(row => ({
      ...row.connections,
      requester: row.users!,
      addressee: row.users!,
    }));
  }

  async getPendingInvitations(userId: string): Promise<UserConnection[]> {
    const pendingInvitations = await db
      .select()
      .from(connections)
      .leftJoin(users, eq(connections.requesterId, users.id))
      .leftJoin(users, eq(connections.addresseeId, users.id))
      .where(
        and(
          eq(connections.addresseeId, userId),
          eq(connections.status, "pending")
        )
      );

    return pendingInvitations.map(row => ({
      ...row.connections,
      requester: row.users!,
      addressee: row.users!,
    }));
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
        participants: participants.map(p => ({
          ...p.list_participants,
          user: p.users!,
        })),
        items: items.map(i => ({
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
      participants: participants.map(p => ({
        ...p.list_participants,
        user: p.users!,
      })),
      items: items.map(i => ({
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
  async addListItem(item: InsertListItem): Promise<ListItem & { addedBy: User }> {
    const [newItem] = await db
      .insert(listItems)
      .values(item)
      .returning();

    // Update list's updatedAt timestamp
    await db
      .update(lists)
      .set({ updatedAt: new Date() })
      .where(eq(lists.id, item.listId));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, item.addedById));

    return {
      ...newItem,
      addedBy: user!,
    };
  }

  async updateListItem(id: string, content: string, note?: string): Promise<ListItem> {
    const [item] = await db
      .update(listItems)
      .set({ content, note, updatedAt: new Date() })
      .where(eq(listItems.id, id))
      .returning();
    return item;
  }

  async deleteListItem(id: string): Promise<void> {
    await db.delete(listItems).where(eq(listItems.id, id));
  }

  async getListItems(listId: string): Promise<(ListItem & { addedBy: User })[]> {
    const items = await db
      .select()
      .from(listItems)
      .leftJoin(users, eq(listItems.addedById, users.id))
      .where(eq(listItems.listId, listId))
      .orderBy(desc(listItems.createdAt));

    return items.map(item => ({
      ...item.list_items,
      addedBy: item.users!,
    }));
  }
}

export const storage = new DatabaseStorage();
