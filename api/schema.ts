import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User connections for sharing lists
export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addresseeId: varchar("addressee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shared lists
export const lists = pgTable("lists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// List participants with permissions
export const listParticipants = pgTable("list_participants", {
  listId: uuid("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  canAdd: boolean("can_add").notNull().default(true),
  canEdit: boolean("can_edit").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.listId, table.userId] }),
}));

// Invitations sent via email/SMS
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inviterId: varchar("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientEmail: varchar("recipient_email"),
  recipientPhone: varchar("recipient_phone"),
  invitationType: varchar("invitation_type").notNull(), // "connection" or "list"
  listId: uuid("list_id").references(() => lists.id, { onDelete: "cascade" }), // null for connection invites
  status: varchar("status").notNull().default("pending"), // pending, accepted, expired, cancelled
  token: varchar("token").notNull().unique(), // unique invitation token
  expiresAt: timestamp("expires_at").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Categories for list items
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  icon: varchar("icon").notNull(), // Lucide icon name
  parentId: uuid("parent_id").references((): any => categories.id), // For subcategories
  metadata: jsonb("metadata"), // Additional category-specific data
  createdAt: timestamp("created_at").defaultNow(),
});

// List items with enhanced category support
export const listItems = pgTable("list_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: uuid("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  note: text("note"),
  categoryId: uuid("category_id").references(() => categories.id),
  url: varchar("url"), // For music URLs, movie links, etc.
  metadata: jsonb("metadata"), // Category-specific metadata (rating, duration, etc.)
  addedById: varchar("added_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  requestedConnections: many(connections, { relationName: "requester" }),
  receivedConnections: many(connections, { relationName: "addressee" }),
  createdLists: many(lists),
  listParticipations: many(listParticipants),
  addedItems: many(listItems),
  sentInvitations: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  inviter: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
  list: one(lists, {
    fields: [invitations.listId],
    references: [lists.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "subcategories",
  }),
  subcategories: many(categories, {
    relationName: "subcategories",
  }),
  listItems: many(listItems),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  requester: one(users, {
    fields: [connections.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  addressee: one(users, {
    fields: [connections.addresseeId],
    references: [users.id],
    relationName: "addressee",
  }),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  creator: one(users, {
    fields: [lists.creatorId],
    references: [users.id],
  }),
  participants: many(listParticipants),
  items: many(listItems),
}));

export const listParticipantsRelations = relations(listParticipants, ({ one }) => ({
  list: one(lists, {
    fields: [listParticipants.listId],
    references: [lists.id],
  }),
  user: one(users, {
    fields: [listParticipants.userId],
    references: [users.id],
  }),
}));

export const listItemsRelations = relations(listItems, ({ one }) => ({
  list: one(lists, {
    fields: [listItems.listId],
    references: [lists.id],
  }),
  addedBy: one(users, {
    fields: [listItems.addedById],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [listItems.categoryId],
    references: [categories.id],
  }),
}));

// Zod schemas
export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertListSchema = createInsertSchema(lists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertListParticipantSchema = createInsertSchema(listParticipants).omit({
  joinedAt: true,
});

export const insertListItemSchema = createInsertSchema(listItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  token: true,
  sentAt: true,
  acceptedAt: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;
export type ListParticipant = typeof listParticipants.$inferSelect;
export type InsertListParticipant = z.infer<typeof insertListParticipantSchema>;
export type ListItem = typeof listItems.$inferSelect;
export type InsertListItem = z.infer<typeof insertListItemSchema>;
export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Extended types for API responses
export type ListWithDetails = List & {
  creator: User;
  participants: (ListParticipant & { user: User })[];
  items: (ListItem & { addedBy: User })[];
  itemCount: number;
  lastItem?: ListItem & { addedBy: User };
};

export type UserConnection = Connection & {
  requester: User;
  addressee: User;
};

export type InvitationWithDetails = Invitation & {
  inviter: User;
  list?: List;
};

export type CategoryWithSubcategories = Category & {
  subcategories: Category[];
};

export type ListItemWithDetails = ListItem & {
  addedBy: User;
  category?: Category;
};
