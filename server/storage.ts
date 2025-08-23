import { PrismaClient } from '@prisma/client';
import type {
  User,
  UpsertUser,
  Connection,
  InsertConnection,
  List,
  InsertList,
  ListParticipant,
  InsertListParticipant,
  ListItem,
  InsertListItem,
  Invitation,
  InsertInvitation,
  Category,
  InsertCategory,
  ListWithDetails,
  UserConnection,
  InvitationWithDetails,
  CategoryWithSubcategories,
  ListItemWithDetails,
} from "@shared/schema";

const prisma = new PrismaClient();

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Connection operations
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnectionStatus(id: string, status: string): Promise<Connection>;
  getUserConnections(userId: string): Promise<UserConnection[]>;
  getPendingInvitations(userId: string): Promise<UserConnection[]>;
  getConnectionByUsers(requesterId: string, addresseeId: string): Promise<Connection | undefined>;
  
  // List operations
  createList(list: InsertList): Promise<List>;
  getUserLists(userId: string): Promise<ListWithDetails[]>;
  getListById(id: string): Promise<ListWithDetails | undefined>;
  updateList(id: string, updates: Partial<InsertList>): Promise<List>;
  deleteList(id: string): Promise<void>;
  
  // List participant operations
  addListParticipant(participant: InsertListParticipant): Promise<ListParticipant>;
  removeListParticipant(listId: string, userId: string): Promise<void>;
  updateParticipantPermissions(listId: string, userId: string, permissions: Partial<Pick<InsertListParticipant, 'canAdd' | 'canEdit' | 'canDelete'>>): Promise<ListParticipant>;
  
  // List item operations
  addListItem(item: InsertListItem): Promise<ListItemWithDetails>;
  updateListItem(id: string, updates: Partial<InsertListItem>): Promise<ListItem>;
  deleteListItem(id: string): Promise<void>;
  getListItems(listId: string): Promise<ListItemWithDetails[]>;
  
  // Category operations
  createCategory(category: InsertCategory): Promise<Category>;
  getCategories(): Promise<CategoryWithSubcategories[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  initializeDefaultCategories(): Promise<void>;
  
  // Invitation operations
  createInvitation(invitation: InsertInvitation & { token: string }): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<InvitationWithDetails | undefined>;
  getUserInvitations(userId: string): Promise<InvitationWithDetails[]>;
  getSentInvitations(userId: string): Promise<InvitationWithDetails[]>;
  updateInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<Invitation>;
  deleteInvitation(id: string): Promise<void>;
  expireOldInvitations(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user as User | undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user as User | undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user = await prisma.user.upsert({
      where: { id: userData.id },
      update: {
        ...userData,
        updatedAt: new Date(),
      },
      create: userData,
    });
    return user as User;
  }

  // Connection operations
  async createConnection(connection: InsertConnection): Promise<Connection> {
    const newConnection = await prisma.connection.create({
      data: connection,
    });
    return newConnection as Connection;
  }

  async updateConnectionStatus(id: string, status: string): Promise<Connection> {
    const connection = await prisma.connection.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
    return connection as Connection;
  }

  async getUserConnections(userId: string): Promise<UserConnection[]> {
    const userConnections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
        status: "accepted",
      },
      include: {
        requester: true,
        addressee: true,
      },
    });

    return userConnections.map(conn => ({
      ...conn,
      requester: conn.requester!,
      addressee: conn.addressee!,
    })) as UserConnection[];
  }

  async getPendingInvitations(userId: string): Promise<UserConnection[]> {
    const pendingInvitations = await prisma.connection.findMany({
      where: {
        addresseeId: userId,
        status: "pending",
      },
      include: {
        requester: true,
        addressee: true,
      },
    });

    return pendingInvitations.map(inv => ({
      ...inv,
      requester: inv.requester!,
      addressee: inv.addressee!,
    })) as UserConnection[];
  }

  async getConnectionByUsers(requesterId: string, addresseeId: string): Promise<Connection | undefined> {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          {
            requesterId,
            addresseeId,
          },
          {
            requesterId: addresseeId,
            addresseeId: requesterId,
          },
        ],
      },
    });
    return connection as Connection | undefined;
  }

  // List operations
  async createList(list: InsertList): Promise<List> {
    const newList = await prisma.list.create({
      data: list,
    });
    return newList as List;
  }

  async getUserLists(userId: string): Promise<ListWithDetails[]> {
    const lists = await prisma.list.findMany({
      where: {
        OR: [
          { creatorId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
        items: {
          include: {
            category: true,
            addedBy: true,
          },
        },
      },
    });

    return lists.map(list => ({
      ...list,
      creator: list.creator!,
      members: list.members.map(member => ({
        ...member,
        user: member.user!,
      })),
      items: list.items.map(item => ({
        ...item,
        category: item.category || undefined,
        addedBy: item.addedBy!,
      })),
    })) as ListWithDetails[];
  }

  async getListById(id: string): Promise<ListWithDetails | undefined> {
    const list = await prisma.list.findUnique({
      where: { id },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
        items: {
          include: {
            category: true,
            addedBy: true,
          },
        },
      },
    });

    if (!list) return undefined;

    return {
      ...list,
      creator: list.creator!,
      members: list.members.map(member => ({
        ...member,
        user: member.user!,
      })),
      items: list.items.map(item => ({
        ...item,
        category: item.category || undefined,
        addedBy: item.addedBy!,
      })),
    } as ListWithDetails;
  }

  async updateList(id: string, updates: Partial<InsertList>): Promise<List> {
    const list = await prisma.list.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
    return list as List;
  }

  async deleteList(id: string): Promise<void> {
    await prisma.list.delete({
      where: { id },
    });
  }

  // List participant operations
  async addListParticipant(participant: InsertListParticipant): Promise<ListParticipant> {
    const newParticipant = await prisma.listMember.upsert({
      where: {
        listId_userId: {
          listId: participant.listId,
          userId: participant.userId,
        },
      },
      update: participant,
      create: participant,
    });
    return newParticipant as ListParticipant;
  }

  async removeListParticipant(listId: string, userId: string): Promise<void> {
    await prisma.listMember.delete({
      where: {
        listId_userId: {
          listId,
          userId,
        },
      },
    });
  }

  async updateParticipantPermissions(
    listId: string,
    userId: string,
    permissions: Partial<Pick<InsertListParticipant, 'canAdd' | 'canEdit' | 'canDelete'>>
  ): Promise<ListParticipant> {
    const participant = await prisma.listMember.update({
      where: {
        listId_userId: {
          listId,
          userId,
        },
      },
      data: permissions,
    });
    return participant as ListParticipant;
  }

  // List item operations
  async addListItem(item: InsertListItem): Promise<ListItemWithDetails> {
    const newItem = await prisma.listItem.create({
      data: item,
      include: {
        category: true,
        addedBy: true,
      },
    });
    return {
      ...newItem,
      category: newItem.category || undefined,
      addedBy: newItem.addedBy!,
    } as ListItemWithDetails;
  }

  async updateListItem(id: string, updates: Partial<InsertListItem>): Promise<ListItem> {
    const item = await prisma.listItem.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
    return item as ListItem;
  }

  async deleteListItem(id: string): Promise<void> {
    await prisma.listItem.delete({
      where: { id },
    });
  }

  async getListItems(listId: string): Promise<ListItemWithDetails[]> {
    const items = await prisma.listItem.findMany({
      where: { listId },
      include: {
        category: true,
        addedBy: true,
      },
    });

    return items.map(item => ({
      ...item,
      category: item.category || undefined,
      addedBy: item.addedBy!,
    })) as ListItemWithDetails[];
  }

  // Category operations
  async createCategory(category: InsertCategory): Promise<Category> {
    const newCategory = await prisma.category.create({
      data: category,
    });
    return newCategory as Category;
  }

  async getCategories(): Promise<CategoryWithSubcategories[]> {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: true,
      },
    });

    return categories.map(cat => ({
      ...cat,
      subcategories: cat.children,
    })) as CategoryWithSubcategories[];
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const category = await prisma.category.findUnique({
      where: { id },
    });
    return category as Category | undefined;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category> {
    const category = await prisma.category.update({
      where: { id },
      data: updates,
    });
    return category as Category;
  }

  async deleteCategory(id: string): Promise<void> {
    await prisma.category.delete({
      where: { id },
    });
  }

  async initializeDefaultCategories(): Promise<void> {
    // Check if categories already exist
    const existingCategories = await prisma.category.findFirst();
    if (existingCategories) return;

    // Import and create default categories
    const { defaultCategories, musicSubcategories, foodSubcategories, movieSubcategories } = await import("./categories");
    
    // Insert main categories
    const insertedCategories = await prisma.category.createMany({
      data: defaultCategories,
    });

    // Find specific category IDs for subcategories
    const musicCategory = await prisma.category.findFirst({
      where: { name: "Music" },
    });
    const foodCategory = await prisma.category.findFirst({
      where: { name: "Food & Restaurants" },
    });
    const movieCategory = await prisma.category.findFirst({
      where: { name: "Movies" },
    });

    // Insert subcategories
    const subcategoriesToInsert = [];
    
    if (musicCategory) {
      subcategoriesToInsert.push(...musicSubcategories(musicCategory.id));
    }
    if (foodCategory) {
      subcategoriesToInsert.push(...foodSubcategories(foodCategory.id));
    }
    if (movieCategory) {
      subcategoriesToInsert.push(...movieSubcategories(movieCategory.id));
    }

    if (subcategoriesToInsert.length > 0) {
      await prisma.category.createMany({
        data: subcategoriesToInsert,
      });
    }

    console.log(`Initialized ${defaultCategories.length} main categories and ${subcategoriesToInsert.length} subcategories`);
  }

  // Invitation operations
  async createInvitation(invitation: InsertInvitation & { token: string }): Promise<Invitation> {
    const newInvitation = await prisma.invitation.create({
      data: invitation,
    });
    return newInvitation as Invitation;
  }

  async getInvitationByToken(token: string): Promise<InvitationWithDetails | undefined> {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        inviter: true,
        list: true,
      },
    });

    if (!invitation) return undefined;

    return {
      ...invitation,
      inviter: invitation.inviter!,
      list: invitation.list || undefined,
    } as InvitationWithDetails;
  }

  async getUserInvitations(userId: string): Promise<InvitationWithDetails[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    const userInvitations = await prisma.invitation.findMany({
      where: {
        recipientEmail: user.email || '',
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        inviter: true,
        list: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return userInvitations.map(inv => ({
      ...inv,
      inviter: inv.inviter!,
      list: inv.list || undefined,
    })) as InvitationWithDetails[];
  }

  async getSentInvitations(userId: string): Promise<InvitationWithDetails[]> {
    const sentInvitations = await prisma.invitation.findMany({
      where: {
        inviterId: userId,
      },
      include: {
        inviter: true,
        list: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sentInvitations.map(inv => ({
      ...inv,
      inviter: inv.inviter!,
      list: inv.list || undefined,
    })) as InvitationWithDetails[];
  }

  async updateInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<Invitation> {
    const invitation = await prisma.invitation.update({
      where: { id },
      data: {
        status: status as any,
        acceptedAt,
      },
    });
    return invitation as Invitation;
  }

  async deleteInvitation(id: string): Promise<void> {
    await prisma.invitation.delete({
      where: { id },
    });
  }

  async expireOldInvitations(): Promise<void> {
    await prisma.invitation.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }
}

// Export a singleton instance
export const storage = new DatabaseStorage();
