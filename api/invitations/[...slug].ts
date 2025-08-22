import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import { pgTable, varchar, timestamp, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { ensureDbInitialized } from '../../shared/db-init';

neonConfig.webSocketConstructor = ws;

// Inline schema definitions
const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviterId: varchar("inviter_id").notNull().references(() => users.id),
  recipientEmail: varchar("recipient_email"),
  recipientPhone: varchar("recipient_phone"),
  invitationType: varchar("invitation_type").notNull(), // "connection" or "list"
  listId: varchar("list_id"), // null for connection invites
  status: varchar("status").notNull().default("pending"), // pending, accepted, expired, cancelled
  token: varchar("token").notNull().unique(), // unique invitation token
  expiresAt: timestamp("expires_at").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

const schema = { users, invitations };

let db: any;

async function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await ensureDbInitialized(pool);
    db = drizzle({ client: pool, schema });
  }
  return db;
}

async function createUser(userData: any) {
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

async function getUser(id: string) {
  const database = await getDb();
  const [user] = await database.select().from(schema.users).where(eq(schema.users.id, id));
  return user;
}

async function createInvitation(invitationData: any) {
  const database = await getDb();
  const [invitation] = await database.insert(schema.invitations).values(invitationData).returning();
  return invitation;
}

async function getInvitationByToken(token: string) {
  const database = await getDb();
  const [invitation] = await database.select().from(schema.invitations).where(eq(schema.invitations.token, token));
  return invitation;
}

async function updateInvitationStatus(id: string, status: string, acceptedAt?: Date) {
  const database = await getDb();
  const [invitation] = await database
    .update(schema.invitations)
    .set({ status, acceptedAt: acceptedAt || null })
    .where(eq(schema.invitations.id, id))
    .returning();
  return invitation;
}

function generateInvitationToken(): string {
  return nanoid(32);
}

function getExpirationDate(): Date {
  // 7 days from now
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

// Email service (mock implementation - replace with real service in production)
async function sendInvitationEmail(
  recipientEmail: string,
  inviterName: string,
  invitationLink: string,
  invitationType: 'connection' | 'list',
  listName?: string
): Promise<void> {
  const subject = invitationType === 'list' 
    ? `${inviterName} invited you to collaborate on "${listName}"`
    : `${inviterName} wants to connect with you on Shist`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎯 Shist Invitation</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to 
          ${invitationType === 'list' ? `collaborate on the list "<strong>${listName}</strong>"` : 'connect'} 
          on Shist - the collaborative list app that keeps you organized together.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            display: inline-block;
            transition: transform 0.2s;
          ">Accept Invitation</a>
        </div>
        
        <p style="font-size: 14px; color: #777; line-height: 1.6;">
          With Shist, you can create shared lists, collaborate in real-time, and stay organized together.
        </p>
      </div>
    </div>
  `;

  // In production, implement with your chosen email service (SendGrid, Nodemailer, etc.)
  console.log('📧 Would send email:', { recipientEmail, subject, htmlContent });
}

// SMS service (mock implementation - replace with real service in production)
async function sendInvitationSMS(
  recipientPhone: string,
  inviterName: string,
  invitationLink: string,
  invitationType: 'connection' | 'list',
  listName?: string
): Promise<void> {
  const message = invitationType === 'list'
    ? `🎯 ${inviterName} invited you to collaborate on "${listName}" in Shist! Accept: ${invitationLink}`
    : `🎯 ${inviterName} wants to connect with you on Shist! Accept: ${invitationLink}`;

  // In production, implement with your chosen SMS service (Twilio, etc.)
  console.log('📱 Would send SMS:', { recipientPhone, message });
}

// Ensure default user exists
async function ensureDefaultUser() {
  try {
    const defaultUserId = 'kbs-user-id';
    const defaultUser = await getUser(defaultUserId);
    
    if (!defaultUser) {
      await createUser({
        id: defaultUserId,
        email: 'kbs.bradley88@gmail.com',
        firstName: 'KBS',
        lastName: 'Bradley',
      });
    }
    
    return defaultUserId;
  } catch (error) {
    console.error('Error ensuring default user:', error);
    throw new Error('Failed to initialize default user');
  }
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

    // Handle /invitations/accept/:token
    const acceptMatch = path.match(/^\/invitations\/accept\/([^/]+)$/);
    if (acceptMatch) {
      const [, token] = acceptMatch;
      
      if (req.method === 'POST') {
        const invitation = await getInvitationByToken(token);
        
        if (!invitation) {
          return res.status(404).json({ message: 'Invitation not found' });
        }
        
        if (invitation.status !== 'pending') {
          return res.status(400).json({ message: 'Invitation already processed' });
        }
        
        const updatedInvitation = await updateInvitationStatus(invitation.id, 'accepted', new Date());
        return res.status(200).json(updatedInvitation);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/decline/:token
    const declineMatch = path.match(/^\/invitations\/decline\/([^/]+)$/);
    if (declineMatch) {
      const [, token] = declineMatch;
      
      if (req.method === 'POST') {
        const invitation = await getInvitationByToken(token);
        
        if (!invitation) {
          return res.status(404).json({ message: 'Invitation not found' });
        }
        
        if (invitation.status !== 'pending') {
          return res.status(400).json({ message: 'Invitation already processed' });
        }
        
        const updatedInvitation = await updateInvitationStatus(invitation.id, 'declined');
        return res.status(200).json(updatedInvitation);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/received
    if (path === '/invitations/received') {
      if (req.method === 'GET') {
        // For now, return empty array since we need to implement this
        return res.status(200).json([]);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/sent
    if (path === '/invitations/sent') {
      if (req.method === 'GET') {
        // For now, return empty array since we need to implement this
        return res.status(200).json([]);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/cleanup
    if (path === '/invitations/cleanup') {
      if (req.method === 'POST') {
        // For now, return success since we need to implement this
        return res.status(200).json({ success: true });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations
    if (path === '/invitations') {
      if (req.method === 'POST') {
        const defaultUserId = await ensureDefaultUser();
        const inviter = await getUser(defaultUserId);
        
        // Validate invitation data
        if (!req.body.recipientEmail && !req.body.recipientPhone) {
          return res.status(400).json({ message: 'Either email or phone is required' });
        }
        
        if (!req.body.invitationType || !['connection', 'list'].includes(req.body.invitationType)) {
          return res.status(400).json({ message: 'Invalid invitation type' });
        }
        
        // Create invitation
        const invitation = await createInvitation({
          token: generateInvitationToken(),
          inviterId: defaultUserId,
          recipientEmail: req.body.recipientEmail,
          recipientPhone: req.body.recipientPhone,
          invitationType: req.body.invitationType,
          listId: req.body.listId,
          expiresAt: getExpirationDate(),
          status: 'pending',
        });
        
        // Generate invitation link
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const invitationLink = `${baseUrl}/invite/${invitation.token}`;
        
        // Get list name if it's a list invitation
        let listName: string | undefined = undefined;
        if (req.body.listId && req.body.invitationType === 'list') {
          // In a real implementation, you'd fetch the list name here
          listName = 'Shared List';
        }
        
        // Send invitation via email or SMS
        try {
          if (req.body.recipientEmail) {
            await sendInvitationEmail(
              req.body.recipientEmail,
              inviter.firstName || inviter.email || 'Someone',
              invitationLink,
              req.body.invitationType,
              listName
            );
          } else if (req.body.recipientPhone) {
            await sendInvitationSMS(
              req.body.recipientPhone,
              inviter.firstName || inviter.email || 'Someone',
              invitationLink,
              req.body.invitationType,
              listName
            );
          }
        } catch (sendError) {
          console.error('Error sending invitation:', sendError);
          // Still return success since invitation was created
        }
        
        return res.status(201).json(invitation);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // fallback: no matching route
    return res.status(404).json({ ok: false, error: 'no matching route', path });
  } catch (error) {
    console.error('Error in invitations API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
