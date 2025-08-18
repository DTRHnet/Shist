import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";

// Create a default account for easy testing
async function createDefaultAccount() {
  try {
    const defaultEmail = "demo@shist.local";
    const existingUser = await storage.getUserByEmail(defaultEmail);
    
    if (!existingUser) {
      await storage.upsertUser({
        id: 'default-user',
        email: defaultEmail,
        firstName: 'Demo',
        lastName: 'User',
        profileImageUrl: null,
      });
      console.log("Created default account: demo@shist.local");
    }
  } catch (error) {
    console.warn("Could not create default account:", error);
  }
}

// Simple local development authentication
export function getLocalSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  return session({
    secret: process.env.SESSION_SECRET || 'local-dev-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Always false for local development
      maxAge: sessionTtl,
    },
  });
}

export async function setupLocalAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getLocalSession());

  // Create default account if it doesn't exist
  await createDefaultAccount();

  // Simple local auth routes
  app.post('/api/auth/local-login', async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // For local development, create or get user with minimal data
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create a new user for local development
        user = await storage.upsertUser({
          id: `local-${Date.now()}`,
          email: email,
          firstName: name || 'Local',
          lastName: 'User',
          profileImageUrl: null,
        });
      }

      // Set up session
      (req.session as any).user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };

      res.json({ message: "Logged in successfully", user });
    } catch (error) {
      console.error("Local auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Quick login with default account
  app.post('/api/auth/demo-login', async (req, res) => {
    try {
      const user = await storage.getUserByEmail("demo@shist.local");
      
      if (!user) {
        return res.status(404).json({ message: "Default account not found" });
      }

      // Set up session
      (req.session as any).user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };

      res.json({ message: "Logged in with demo account", user });
    } catch (error) {
      console.error("Demo login error:", error);
      res.status(500).json({ message: "Demo login failed" });
    }
  });
}

export const isLocalAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > user.expires_at) {
    return res.status(401).json({ message: "Session expired" });
  }

  // Attach user to request
  req.user = user;
  next();
};