// Default categories and subcategories for Shist
import type { InsertCategory } from "@shared/schema";

export const defaultCategories: InsertCategory[] = [
  // Main Categories
  {
    name: "Music",
    icon: "Music",
    parentId: null,
    metadata: {
      description: "Songs, albums, artists, playlists",
      fields: ["url", "artist", "album", "genre", "rating"]
    }
  },
  {
    name: "Movies",
    icon: "Film", 
    parentId: null,
    metadata: {
      description: "Films, documentaries, series",
      fields: ["url", "director", "year", "genre", "rating"]
    }
  },
  {
    name: "TV Shows",
    icon: "Tv",
    parentId: null,
    metadata: {
      description: "TV series, episodes, shows",
      fields: ["url", "season", "episode", "network", "rating"]
    }
  },
  {
    name: "Food & Restaurants",
    icon: "UtensilsCrossed",
    parentId: null,
    metadata: {
      description: "Restaurants, recipes, food items",
      fields: ["url", "cuisine", "location", "price", "rating"]
    }
  },
  {
    name: "Books",
    icon: "Book",
    parentId: null,
    metadata: {
      description: "Books, audiobooks, ebooks",
      fields: ["url", "author", "genre", "pages", "rating"]
    }
  },
  {
    name: "Travel",
    icon: "MapPin",
    parentId: null,
    metadata: {
      description: "Destinations, hotels, activities",
      fields: ["url", "location", "date", "cost", "rating"]
    }
  },
  {
    name: "Shopping",
    icon: "ShoppingBag",
    parentId: null,
    metadata: {
      description: "Products, stores, wishlists",
      fields: ["url", "price", "store", "brand", "priority"]
    }
  },
  {
    name: "Games",
    icon: "Gamepad2",
    parentId: null,
    metadata: {
      description: "Video games, board games",
      fields: ["url", "platform", "genre", "multiplayer", "rating"]
    }
  },
  {
    name: "Health & Fitness",
    icon: "Heart",
    parentId: null,
    metadata: {
      description: "Workouts, nutrition, wellness",
      fields: ["url", "duration", "intensity", "type", "progress"]
    }
  },
  {
    name: "Work & Productivity",
    icon: "Briefcase",
    parentId: null,
    metadata: {
      description: "Tasks, projects, meetings",
      fields: ["url", "priority", "deadline", "status", "assignee"]
    }
  },
  {
    name: "Learning",
    icon: "GraduationCap",
    parentId: null,
    metadata: {
      description: "Courses, tutorials, skills",
      fields: ["url", "level", "duration", "progress", "certificate"]
    }
  },
  {
    name: "Events",
    icon: "Calendar",
    parentId: null,
    metadata: {
      description: "Concerts, conferences, gatherings",
      fields: ["url", "date", "location", "cost", "tickets"]
    }
  },
  {
    name: "Sports",
    icon: "Trophy",
    parentId: null,
    metadata: {
      description: "Teams, matches, activities",
      fields: ["url", "league", "season", "score", "date"]
    }
  },
  {
    name: "Technology",
    icon: "Smartphone",
    parentId: null,
    metadata: {
      description: "Gadgets, software, apps",
      fields: ["url", "platform", "version", "price", "rating"]
    }
  },
  {
    name: "Home & Garden",
    icon: "Home",
    parentId: null,
    metadata: {
      description: "Furniture, plants, improvements",
      fields: ["url", "room", "cost", "store", "priority"]
    }
  },
  {
    name: "Fashion & Style",
    icon: "Shirt",
    parentId: null,
    metadata: {
      description: "Clothing, accessories, looks",
      fields: ["url", "brand", "size", "color", "price"]
    }
  },
  {
    name: "Art & Culture",
    icon: "Palette",
    parentId: null,
    metadata: {
      description: "Museums, galleries, artwork",
      fields: ["url", "artist", "period", "location", "exhibition"]
    }
  },
  {
    name: "Automotive",
    icon: "Car",
    parentId: null,
    metadata: {
      description: "Cars, maintenance, accessories",
      fields: ["url", "make", "model", "year", "price"]
    }
  },
  {
    name: "Pets",
    icon: "Heart",
    parentId: null,
    metadata: {
      description: "Pet care, supplies, health",
      fields: ["url", "petType", "brand", "vet", "schedule"]
    }
  },
  {
    name: "Finance",
    icon: "DollarSign",
    parentId: null,
    metadata: {
      description: "Investments, budgets, expenses",
      fields: ["url", "amount", "category", "date", "account"]
    }
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
    }
  },
  {
    name: "Albums",
    icon: "Disc3",
    parentId: musicCategoryId,
    metadata: {
      description: "Full albums and EPs",
      fields: ["spotify", "youtube", "apple_music", "artist", "year", "tracks", "genre"]
    }
  },
  {
    name: "Artists",
    icon: "User",
    parentId: musicCategoryId,
    metadata: {
      description: "Musicians and bands",
      fields: ["spotify", "youtube", "apple_music", "genre", "country", "formed"]
    }
  },
  {
    name: "Playlists",
    icon: "ListMusic",
    parentId: musicCategoryId,
    metadata: {
      description: "Curated music collections",
      fields: ["spotify", "youtube", "apple_music", "creator", "tracks", "duration"]
    }
  },
  {
    name: "Live Music",
    icon: "Mic",
    parentId: musicCategoryId,
    metadata: {
      description: "Concerts and live performances",
      fields: ["venue", "date", "tickets", "artist", "setlist", "recording"]
    }
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
    }
  },
  {
    name: "Recipes",
    icon: "ChefHat",
    parentId: foodCategoryId,
    metadata: {
      description: "Cooking recipes",
      fields: ["url", "cuisine", "difficulty", "cookTime", "servings", "ingredients"]
    }
  },
  {
    name: "Takeout",
    icon: "ShoppingBag",
    parentId: foodCategoryId,
    metadata: {
      description: "Food delivery options",
      fields: ["app", "restaurant", "cuisine", "deliveryTime", "minimumOrder"]
    }
  },
  {
    name: "Grocery Items",
    icon: "ShoppingCart",
    parentId: foodCategoryId,
    metadata: {
      description: "Shopping list items",
      fields: ["brand", "store", "price", "quantity", "organic"]
    }
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
    }
  },
  {
    name: "Watched",
    icon: "CheckCircle",
    parentId: movieCategoryId,
    metadata: {
      description: "Completed movies",
      fields: ["platform", "rating", "watchDate", "genre", "director", "review"]
    }
  },
  {
    name: "Cinema",
    icon: "Film",
    parentId: movieCategoryId,
    metadata: {
      description: "Theater releases",
      fields: ["theater", "showtime", "tickets", "price", "seats", "date"]
    }
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