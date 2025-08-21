import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, or } from 'drizzle-orm';
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

// Initialize default categories
export async function initializeDefaultCategories() {
  const database = await getDb();
  
  // Check if categories already exist
  const existingCategories = await database.select().from(schema.categories).limit(1);
  
  if (existingCategories.length === 0) {
    // Create default categories
    const defaultCategories = [
      { name: 'Music', icon: 'Music', parentId: null, metadata: { description: 'Songs, albums, artists, playlists', fields: ['url', 'artist', 'album', 'genre', 'rating'] } },
      { name: 'Movies', icon: 'Film', parentId: null, metadata: { description: 'Films, documentaries, series', fields: ['url', 'director', 'year', 'genre', 'rating'] } },
      { name: 'TV Shows', icon: 'Tv', parentId: null, metadata: { description: 'TV series, episodes, shows', fields: ['url', 'season', 'episode', 'network', 'rating'] } },
      { name: 'Food & Restaurants', icon: 'UtensilsCrossed', parentId: null, metadata: { description: 'Restaurants, recipes, food items', fields: ['url', 'cuisine', 'location', 'price', 'rating'] } },
      { name: 'Books', icon: 'Book', parentId: null, metadata: { description: 'Books, audiobooks, ebooks', fields: ['url', 'author', 'genre', 'pages', 'rating'] } },
      { name: 'Travel', icon: 'MapPin', parentId: null, metadata: { description: 'Destinations, hotels, activities', fields: ['url', 'location', 'date', 'cost', 'rating'] } },
      { name: 'Shopping', icon: 'ShoppingBag', parentId: null, metadata: { description: 'Products, stores, wishlists', fields: ['url', 'price', 'store', 'brand', 'priority'] } },
      { name: 'Games', icon: 'Gamepad2', parentId: null, metadata: { description: 'Video games, board games', fields: ['url', 'platform', 'genre', 'multiplayer', 'rating'] } },
      { name: 'Health & Fitness', icon: 'Heart', parentId: null, metadata: { description: 'Workouts, nutrition, wellness', fields: ['url', 'duration', 'intensity', 'type', 'progress'] } },
      { name: 'Work & Productivity', icon: 'Briefcase', parentId: null, metadata: { description: 'Tasks, projects, meetings', fields: ['url', 'priority', 'deadline', 'status', 'assignee'] } },
      { name: 'Learning', icon: 'GraduationCap', parentId: null, metadata: { description: 'Courses, tutorials, skills', fields: ['url', 'level', 'duration', 'progress', 'certificate'] } },
      { name: 'Events', icon: 'Calendar', parentId: null, metadata: { description: 'Concerts, conferences, gatherings', fields: ['url', 'date', 'location', 'cost', 'tickets'] } },
      { name: 'Sports', icon: 'Trophy', parentId: null, metadata: { description: 'Teams, matches, activities', fields: ['url', 'league', 'season', 'score', 'date'] } },
      { name: 'Technology', icon: 'Smartphone', parentId: null, metadata: { description: 'Gadgets, software, apps', fields: ['url', 'platform', 'version', 'price', 'rating'] } },
      { name: 'Home & Garden', icon: 'Home', parentId: null, metadata: { description: 'Furniture, plants, improvements', fields: ['url', 'room', 'cost', 'store', 'priority'] } },
      { name: 'Fashion & Style', icon: 'Shirt', parentId: null, metadata: { description: 'Clothing, accessories, looks', fields: ['url', 'brand', 'size', 'color', 'price'] } },
      { name: 'Art & Culture', icon: 'Palette', parentId: null, metadata: { description: 'Museums, galleries, artwork', fields: ['url', 'artist', 'period', 'location', 'exhibition'] } },
      { name: 'Automotive', icon: 'Car', parentId: null, metadata: { description: 'Cars, maintenance, accessories', fields: ['url', 'make', 'model', 'year', 'price'] } },
      { name: 'Pets', icon: 'Heart', parentId: null, metadata: { description: 'Pet care, supplies, health', fields: ['url', 'petType', 'brand', 'vet', 'schedule'] } },
      { name: 'Finance', icon: 'DollarSign', parentId: null, metadata: { description: 'Investments, budgets, expenses', fields: ['url', 'amount', 'category', 'date', 'account'] } }
    ];

    for (const category of defaultCategories) {
      await database.insert(schema.categories).values(category);
    }
  }
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
  const [user] = await database.select().from(schema.users).where(eq(schema.users.id, id));
  return user;
}

export async function createList(listData: any) {
  const database = await getDb();
  const [list] = await database.insert(schema.lists).values(listData).returning();
  return list;
}

export async function getLists(userId: string) {
  const database = await getDb();
  
  // Get basic lists
  const lists = await database
    .select()
    .from(schema.lists)
    .where(eq(schema.lists.creatorId, userId));
  
  // For each list, get the related data
  const listsWithDetails = await Promise.all(
    lists.map(async (list) => {
      // Get creator
      const [creator] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, list.creatorId));
      
      // Get participants
      const participants = await database
        .select()
        .from(schema.listParticipants)
        .where(eq(schema.listParticipants.listId, list.id));
      
      // Get participants with user data
      const participantsWithUsers = await Promise.all(
        participants.map(async (participant) => {
          const [user] = await database
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, participant.userId));
          return { ...participant, user };
        })
      );
      
      // Get items
      const items = await database
        .select()
        .from(schema.listItems)
        .where(eq(schema.listItems.listId, list.id))
        .orderBy(schema.listItems.createdAt);
      
      // Get items with user data
      const itemsWithUsers = await Promise.all(
        items.map(async (item) => {
          const [addedBy] = await database
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, item.addedById));
          return { ...item, addedBy };
        })
      );
      
      // Get last item
      const lastItem = itemsWithUsers.length > 0 ? itemsWithUsers[itemsWithUsers.length - 1] : undefined;
      
      return {
        ...list,
        creator,
        participants: participantsWithUsers,
        items: itemsWithUsers,
        itemCount: itemsWithUsers.length,
        lastItem,
      };
    })
  );
  
  return listsWithDetails;
}

export async function getListById(id: string) {
  const database = await getDb();
  const [list] = await database.select().from(schema.lists).where(eq(schema.lists.id, id));
  
  if (!list) {
    return null;
  }
  
  // Get creator
  const [creator] = await database
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, list.creatorId));
  
  // Get participants
  const participants = await database
    .select()
    .from(schema.listParticipants)
    .where(eq(schema.listParticipants.listId, list.id));
  
  // Get participants with user data
  const participantsWithUsers = await Promise.all(
    participants.map(async (participant) => {
      const [user] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, participant.userId));
      return { ...participant, user };
    })
  );
  
  // Get items
  const items = await database
    .select()
    .from(schema.listItems)
    .where(eq(schema.listItems.listId, list.id))
    .orderBy(schema.listItems.createdAt);
  
  // Get items with user data
  const itemsWithUsers = await Promise.all(
    items.map(async (item) => {
      const [addedBy] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, item.addedById));
      return { ...item, addedBy };
    })
  );
  
  // Get last item
  const lastItem = itemsWithUsers.length > 0 ? itemsWithUsers[itemsWithUsers.length - 1] : undefined;
  
  return {
    ...list,
    creator,
    participants: participantsWithUsers,
    items: itemsWithUsers,
    itemCount: itemsWithUsers.length,
    lastItem,
  };
}

export async function updateList(id: string, updates: any) {
  const database = await getDb();
  const [list] = await database
    .update(schema.lists)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.lists.id, id))
    .returning();
  return list;
}

export async function deleteList(id: string) {
  const database = await getDb();
  await database.delete(schema.lists).where(eq(schema.lists.id, id));
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
    .where(or(eq(schema.connections.requesterId, userId), eq(schema.connections.addresseeId, userId)));
  
  // Get connections with user data
  const connectionsWithUsers = await Promise.all(
    connections.map(async (connection) => {
      const [requester] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, connection.requesterId));
      
      const [addressee] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, connection.addresseeId));
      
      return {
        ...connection,
        requester,
        addressee,
      };
    })
  );
  
  return connectionsWithUsers;
}

export async function updateConnectionStatus(id: string, status: string) {
  const database = await getDb();
  const [connection] = await database
    .update(schema.connections)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.connections.id, id))
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
  const [invitation] = await database.select().from(schema.invitations).where(eq(schema.invitations.token, token));
  return invitation;
}

export async function updateInvitationStatus(id: string, status: string, acceptedAt?: Date) {
  const database = await getDb();
  const [invitation] = await database
    .update(schema.invitations)
    .set({ status, acceptedAt: acceptedAt || null })
    .where(eq(schema.invitations.id, id))
    .returning();
  return invitation;
}

export async function getCategories() {
  const database = await getDb();
  // Initialize default categories if none exist
  await initializeDefaultCategories();
  
  // Get all categories
  const allCategories = await database.select().from(schema.categories).orderBy(schema.categories.name);
  
  // Organize into parent categories and subcategories
  const parentCategories = allCategories.filter(cat => !cat.parentId);
  const subcategories = allCategories.filter(cat => cat.parentId);
  
  // Add subcategories to their parent categories
  const categoriesWithSubcategories = parentCategories.map(parent => ({
    ...parent,
    subcategories: subcategories.filter(sub => sub.parentId === parent.id)
  }));
  
  return categoriesWithSubcategories;
}

export async function createCategory(categoryData: any) {
  const database = await getDb();
  const [category] = await database.insert(schema.categories).values(categoryData).returning();
  return category;
}

export async function getCategoryById(id: string) {
  const database = await getDb();
  const [category] = await database.select().from(schema.categories).where(eq(schema.categories.id, id));
  return category;
}

export async function addListItem(itemData: any) {
  const database = await getDb();
  const [item] = await database.insert(schema.listItems).values(itemData).returning();
  return item;
}

export async function getListItems(listId: string) {
  const database = await getDb();
  const items = await database
    .select()
    .from(schema.listItems)
    .where(eq(schema.listItems.listId, listId))
    .orderBy(schema.listItems.createdAt);
  
  // Get items with user data
  const itemsWithUsers = await Promise.all(
    items.map(async (item) => {
      const [addedBy] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, item.addedById));
      return { ...item, addedBy };
    })
  );
  
  return itemsWithUsers;
}

export async function updateListItem(id: string, updates: any) {
  const database = await getDb();
  const [item] = await database
    .update(schema.listItems)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.listItems.id, id))
    .returning();
  return item;
}

export async function deleteListItem(id: string) {
  const database = await getDb();
  await database.delete(schema.listItems).where(eq(schema.listItems.id, id));
}

export async function addListParticipant(participantData: any) {
  const database = await getDb();
  const [participant] = await database.insert(schema.listParticipants).values(participantData).returning();
  return participant;
}
