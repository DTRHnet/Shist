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

// List items
export const listItems = pgTable("list_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: uuid("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  note: text("note"),
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
