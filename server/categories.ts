// Default categories and subcategories for Shist
import type { InsertCategory } from "@shared/schema";

// Define the metadata type for categories
type CategoryMetadata = {
  description: string;
  fields: string[];
};

export const defaultCategories: InsertCategory[] = [
  // Main Categories
  {
    name: "Music",
    icon: "Music",
    parentId: null,
    metadata: {
      description: "Songs, albums, artists, playlists",
      fields: ["url", "artist", "album", "genre", "rating"]
    } as CategoryMetadata
  },
  {
    name: "Movies",
    icon: "Film", 
    parentId: null,
    metadata: {
      description: "Films, documentaries, series",
      fields: ["url", "director", "year", "genre", "rating"]
    } as CategoryMetadata
  },
  {
    name: "TV Shows",
    icon: "Tv",
    parentId: null,
    metadata: {
      description: "TV series, episodes, shows",
      fields: ["url", "season", "episode", "network", "rating"]
    } as CategoryMetadata
  },
  {
    name: "Food & Restaurants",
    icon: "UtensilsCrossed",
    parentId: null,
    metadata: {
      description: "Restaurants, recipes, food items",
      fields: ["url", "cuisine", "location", "price", "rating"]
    } as CategoryMetadata
  },
  {
    name: "Books",
    icon: "Book",
    parentId: null,
    metadata: {
      description: "Books, audiobooks, ebooks",
      fields: ["url", "author", "genre", "pages", "rating"]
    } as CategoryMetadata
  },
  {
    name: "Travel",
    icon: "MapPin",
    parentId: null,
    metadata: {
      description: "Destinations, hotels, activities",
      fields: ["url", "location", "date", "cost", "rating"]
    } as CategoryMetadata
  },
  {
    name: "Shopping",
    icon: "ShoppingBag",
    parentId: null,
    metadata: {
      description: "Products, stores, wishlists",
      fields: ["url", "price", "store", "brand", "priority"]
    } as CategoryMetadata
  },
  {
    name: "Games",
    icon: "Gamepad2",
    parentId: null,
    metadata: {
      description: "Video games, board games",
      fields: ["url", "platform", "genre", "multiplayer", "rating"]
    } as CategoryMetadata
  },
  {
    name: "Health & Fitness",
    icon: "Heart",
    parentId: null,
    metadata: {
      description: "Workouts, nutrition, wellness",
      fields: ["url", "duration", "intensity", "type", "progress"]
    } as CategoryMetadata
  },
  {
    name: "Work & Productivity",
    icon: "Briefcase",
    parentId: null,
    metadata: {
      description: "Tasks, projects, meetings",
      fields: ["url", "priority", "deadline", "status", "assignee"]
    } as CategoryMetadata
  },
  {
    name: "Learning",
    icon: "GraduationCap",
    parentId: null,
    metadata: {
      description: "Courses, tutorials, skills",
      fields: ["url", "level", "duration", "progress", "certificate"]
    } as CategoryMetadata
  },
  {
    name: "Events",
    icon: "Calendar",
    parentId: null,
    metadata: {
      description: "Concerts, conferences, gatherings",
      fields: ["url", "date", "location", "cost", "tickets"]
    } as CategoryMetadata
  },
  {
    name: "Sports",
    icon: "Trophy",
    parentId: null,
    metadata: {
      description: "Teams, matches, activities",
      fields: ["url", "league", "season", "score", "date"]
    } as CategoryMetadata
  },
  {
    name: "Technology",
    icon: "Smartphone",
    parentId: null,
    metadata: {
      description: "Gadgets, software, apps",
      fields: ["url", "platform", "version", "price", "rating"]
    } as CategoryMetadata
  },
  {
    name: "Home & Garden",
    icon: "Home",
    parentId: null,
    metadata: {
      description: "Furniture, plants, improvements",
      fields: ["url", "room", "cost", "store", "priority"]
    } as CategoryMetadata
  },
  {
    name: "Fashion & Style",
    icon: "Shirt",
    parentId: null,
    metadata: {
      description: "Clothing, accessories, looks",
      fields: ["url", "brand", "size", "color", "price"]
    } as CategoryMetadata
  },
  {
    name: "Art & Culture",
    icon: "Palette",
    parentId: null,
    metadata: {
      description: "Museums, galleries, artwork",
      fields: ["url", "artist", "period", "location", "exhibition"]
    } as CategoryMetadata
  },
  {
    name: "Automotive",
    icon: "Car",
    parentId: null,
    metadata: {
      description: "Cars, maintenance, accessories",
      fields: ["url", "make", "model", "year", "price"]
    } as CategoryMetadata
  },
  {
    name: "Pets",
    icon: "Heart",
    parentId: null,
    metadata: {
      description: "Pet care, supplies, health",
      fields: ["url", "petType", "brand", "vet", "schedule"]
    } as CategoryMetadata
  },
  {
    name: "Finance",
    icon: "DollarSign",
    parentId: null,
    metadata: {
      description: "Investments, budgets, expenses",
      fields: ["url", "amount", "category", "date", "account"]
    } as CategoryMetadata
  }
];

// Music subcategories with specific metadata
export const musicSubcategories = (musicCategoryId: string): InsertCategory[] => [
  {
    name: "Songs",
    icon: "Music",
    parentId: musicCategoryId,
    metadata: {
      description: "Individual tracks and singles",
      fields: ["spotify", "youtube", "apple_music", "artist", "album", "duration", "bpm"]
    } as CategoryMetadata
  },
  {
    name: "Albums",
    icon: "Disc3",
    parentId: musicCategoryId,
    metadata: {
      description: "Full albums and EPs",
      fields: ["spotify", "youtube", "apple_music", "artist", "year", "tracks", "genre"]
    } as CategoryMetadata
  },
  {
    name: "Artists",
    icon: "User",
    parentId: musicCategoryId,
    metadata: {
      description: "Musicians and bands",
      fields: ["spotify", "youtube", "apple_music", "genre", "country", "formed"]
    } as CategoryMetadata
  },
  {
    name: "Playlists",
    icon: "ListMusic",
    parentId: musicCategoryId,
    metadata: {
      description: "Curated music collections",
      fields: ["spotify", "youtube", "apple_music", "creator", "tracks", "duration"]
    } as CategoryMetadata
  },
  {
    name: "Live Music",
    icon: "Mic",
    parentId: musicCategoryId,
    metadata: {
      description: "Concerts and live performances",
      fields: ["venue", "date", "tickets", "artist", "setlist", "recording"]
    } as CategoryMetadata
  }
];

// Food subcategories 
export const foodSubcategories = (foodCategoryId: string): InsertCategory[] => [
  {
    name: "Restaurants",
    icon: "UtensilsCrossed",
    parentId: foodCategoryId,
    metadata: {
      description: "Dining establishments",
      fields: ["location", "cuisine", "priceRange", "rating", "phone", "hours"]
    } as CategoryMetadata
  },
  {
    name: "Recipes",
    icon: "ChefHat",
    parentId: foodCategoryId,
    metadata: {
      description: "Cooking recipes",
      fields: ["url", "cuisine", "difficulty", "cookTime", "servings", "ingredients"]
    } as CategoryMetadata
  },
  {
    name: "Takeout",
    icon: "ShoppingBag",
    parentId: foodCategoryId,
    metadata: {
      description: "Food delivery options",
      fields: ["app", "restaurant", "cuisine", "deliveryTime", "minimumOrder"]
    } as CategoryMetadata
  },
  {
    name: "Grocery Items",
    icon: "ShoppingCart",
    parentId: foodCategoryId,
    metadata: {
      description: "Shopping list items",
      fields: ["brand", "store", "price", "quantity", "organic"]
    } as CategoryMetadata
  }
];

// Movie subcategories
export const movieSubcategories = (movieCategoryId: string): InsertCategory[] => [
  {
    name: "To Watch",
    icon: "Eye",
    parentId: movieCategoryId,
    metadata: {
      description: "Movies on watchlist",
      fields: ["netflix", "amazon", "disney", "hbo", "genre", "year", "duration"]
    } as CategoryMetadata
  },
  {
    name: "Watched",
    icon: "CheckCircle",
    parentId: movieCategoryId,
    metadata: {
      description: "Completed movies",
      fields: ["platform", "rating", "watchDate", "genre", "director", "review"]
    } as CategoryMetadata
  },
  {
    name: "Cinema",
    icon: "Film",
    parentId: movieCategoryId,
    metadata: {
      description: "Theater releases",
      fields: ["theater", "showtime", "tickets", "price", "seats", "date"]
    } as CategoryMetadata
  }
];

export function getCategoryIcon(categoryName: string): string {
  const category = defaultCategories.find(cat => cat.name === categoryName);
  return category?.icon || "Circle";
}

export function getCategoryMetadata(categoryName: string) {
  const category = defaultCategories.find(cat => cat.name === categoryName);
  return category?.metadata || {};
}