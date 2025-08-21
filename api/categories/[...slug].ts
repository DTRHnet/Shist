import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../../shared/schema";

neonConfig.webSocketConstructor = ws;

let db: any;

async function getDb() {
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
async function initializeDefaultCategories() {
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

async function getCategories() {
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

async function createCategory(categoryData: any) {
  const database = await getDb();
  const [category] = await database.insert(schema.categories).values(categoryData).returning();
  return category;
}

async function getCategoryById(id: string) {
  const database = await getDb();
  const [category] = await database.select().from(schema.categories).where(eq(schema.categories.id, id));
  return category;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = req.url || '';
    const path = url.replace(/^\/api/, '');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    // Handle /categories/:categoryId
    const categoryIdMatch = path.match(/^\/categories\/([^/]+)$/);
    if (categoryIdMatch) {
      const categoryId = categoryIdMatch[1];
      
      if (req.method === 'GET') {
        const category = await getCategoryById(categoryId);
        
        if (!category) {
          return res.status(404).json({ message: 'Category not found' });
        }
        
        return res.status(200).json(category);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /categories
    if (path === '/categories') {
      if (req.method === 'GET') {
        const categories = await getCategories();
        return res.status(200).json(categories);
      }
      
      if (req.method === 'POST') {
        const category = await createCategory({
          name: req.body.name,
          icon: req.body.icon || '📝',
          parentId: req.body.parentId,
          metadata: req.body.metadata,
        });
        return res.status(201).json(category);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // fallback: no matching route
    return res.status(404).json({ ok: false, error: 'no matching route', path });
  } catch (error) {
    console.error('Error in categories API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
