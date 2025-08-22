import { pgTable, varchar, timestamp, jsonb, uuid, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = pgTable("users", {
	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
	email: varchar("email").unique(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	role: varchar("role").notNull().default("user"),
	isActive: boolean("is_active").notNull().default(true),
	lastLoginAt: timestamp("last_login_at"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
	name: varchar("name").notNull(),
	icon: varchar("icon").notNull(),
	parentId: uuid("parent_id"),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
	index("IDX_categories_parent").on(table.parentId),
]);

// Lists table
export const lists = pgTable("lists", {
	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
	name: varchar("name").notNull(),
	description: varchar("description"),
	isPublic: boolean("is_public").default(false),
	creatorId: varchar("creator_id").notNull().references(() => users.id),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// List participants table
export const listParticipants = pgTable("list_participants", {
	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
	listId: varchar("list_id").notNull().references(() => lists.id),
	userId: varchar("user_id").notNull().references(() => users.id),
	canAdd: boolean("can_add").default(true),
	canEdit: boolean("can_edit").default(false),
	canDelete: boolean("can_delete").default(false),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// List items table
export const listItems = pgTable("list_items", {
	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
	listId: varchar("list_id").notNull().references(() => lists.id),
	content: varchar("content").notNull(),
	note: varchar("note"),
	url: varchar("url"),
	categoryId: varchar("category_id"),
	addedById: varchar("added_by_id").notNull().references(() => users.id),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Connections table
export const connections = pgTable("connections", {
	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
	requesterId: varchar("requester_id").notNull().references(() => users.id),
	addresseeId: varchar("addressee_id").notNull().references(() => users.id),
	status: varchar("status").notNull().default("pending"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Invitations table
export const invitations = pgTable("invitations", {
	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
	token: varchar("token").unique().notNull(),
	senderId: varchar("sender_id").notNull().references(() => users.id),
	recipientEmail: varchar("recipient_email").notNull(),
	status: varchar("status").notNull().default("pending"),
	expiresAt: timestamp("expires_at").notNull(),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const schema = {
	users,
	categories,
	lists,
	listParticipants,
	listItems,
	connections,
	invitations,
};

export default schema;