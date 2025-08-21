import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../../shared/schema";

neonConfig.webSocketConstructor = ws;

let db: any;

export async function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
  }
  return db;
}

// Simple database operations
export async function createUser(userData: any) {
  const database = await getDb();
  const [user] = await database
    .insert(schema.users)
    .values(userData)
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

export async function getUser(id: string) {
  const database = await getDb();
  const [user] = await database.select().from(schema.users).where(schema.users.id === id);
  return user;
}

export async function createList(listData: any) {
  const database = await getDb();
  const [list] = await database.insert(schema.lists).values(listData).returning();
  return list;
}

export async function getLists(userId: string) {
  const database = await getDb();
  const lists = await database
    .select()
    .from(schema.lists)
    .where(schema.lists.creatorId === userId);
  return lists;
}

export async function getListById(id: string) {
  const database = await getDb();
  const [list] = await database.select().from(schema.lists).where(schema.lists.id === id);
  return list;
}

export async function updateList(id: string, updates: any) {
  const database = await getDb();
  const [list] = await database
    .update(schema.lists)
    .set({ ...updates, updatedAt: new Date() })
    .where(schema.lists.id === id)
    .returning();
  return list;
}

export async function deleteList(id: string) {
  const database = await getDb();
  await database.delete(schema.lists).where(schema.lists.id === id);
}

export async function createConnection(connectionData: any) {
  const database = await getDb();
  const [connection] = await database.insert(schema.connections).values(connectionData).returning();
  return connection;
}

export async function getConnections(userId: string) {
  const database = await getDb();
  const connections = await database
    .select()
    .from(schema.connections)
    .where(schema.connections.requesterId === userId || schema.connections.addresseeId === userId);
  return connections;
}

export async function updateConnectionStatus(id: string, status: string) {
  const database = await getDb();
  const [connection] = await database
    .update(schema.connections)
    .set({ status, updatedAt: new Date() })
    .where(schema.connections.id === id)
    .returning();
  return connection;
}

export async function createInvitation(invitationData: any) {
  const database = await getDb();
  const [invitation] = await database.insert(schema.invitations).values(invitationData).returning();
  return invitation;
}

export async function getInvitationByToken(token: string) {
  const database = await getDb();
  const [invitation] = await database.select().from(schema.invitations).where(schema.invitations.token === token);
  return invitation;
}

export async function updateInvitationStatus(id: string, status: string, acceptedAt?: Date) {
  const database = await getDb();
  const [invitation] = await database
    .update(schema.invitations)
    .set({ status, acceptedAt: acceptedAt || null })
    .where(schema.invitations.id === id)
    .returning();
  return invitation;
}

export async function getCategories() {
  const database = await getDb();
  const categories = await database.select().from(schema.categories).orderBy(schema.categories.name);
  return categories;
}

export async function createCategory(categoryData: any) {
  const database = await getDb();
  const [category] = await database.insert(schema.categories).values(categoryData).returning();
  return category;
}

export async function getCategoryById(id: string) {
  const database = await getDb();
  const [category] = await database.select().from(schema.categories).where(schema.categories.id === id);
  return category;
}

export async function addListItem(itemData: any) {
  const database = await getDb();
  const [item] = await database.insert(schema.listItems).values(itemData).returning();
  return item;
}

export async function updateListItem(id: string, updates: any) {
  const database = await getDb();
  const [item] = await database
    .update(schema.listItems)
    .set({ ...updates, updatedAt: new Date() })
    .where(schema.listItems.id === id)
    .returning();
  return item;
}

export async function deleteListItem(id: string) {
  const database = await getDb();
  await database.delete(schema.listItems).where(schema.listItems.id === id);
}

export async function addListParticipant(participantData: any) {
  const database = await getDb();
  const [participant] = await database.insert(schema.listParticipants).values(participantData).returning();
  return participant;
}
