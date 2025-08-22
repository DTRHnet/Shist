import { z } from "zod";
import { storage } from "./storage";
import type { ListWithDetails } from "@shared/schema";

export const RoleSchema = z.enum(["viewer", "editor", "owner"]);
export type Role = z.infer<typeof RoleSchema>;

export const PermissionSchema = z.enum([
  "view_list",
  "edit_list",
  "delete_list",
  "add_item",
  "update_item",
  "delete_item",
]);
export type Permission = z.infer<typeof PermissionSchema>;

export const GuardContextSchema = z.object({
  userId: z.string().uuid(),
  listId: z.string().uuid(),
});
export type GuardContext = z.infer<typeof GuardContextSchema>;

export const ItemContextSchema = GuardContextSchema.extend({
  itemId: z.string().uuid(),
});
export type ItemContext = z.infer<typeof ItemContextSchema>;

export type Visibility = "public" | "shared" | "private";

export function getVisibility(list: ListWithDetails): Visibility {
  if (list.isPublic) return "public";
  const hasNonOwnerParticipant = list.participants.some(p => p.user.id !== list.creator.id);
  return hasNonOwnerParticipant ? "shared" : "private";
}

export function getUserRoleInList(list: ListWithDetails, userId: string): Role | null {
  if (list.creator.id === userId) return "owner";
  const member = list.participants.find(p => p.user.id === userId);
  if (!member) return null;
  if (member.canEdit || member.canDelete) return "editor";
  if (member.canAdd) return "viewer";
  return null;
}

export function compareRoles(userRole: Role, required: Role): boolean {
  const rank: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };
  return rank[userRole] >= rank[required];
}

async function loadListOrThrow(listId: string): Promise<ListWithDetails> {
  const list = await storage.getListById(listId);
  if (!list) throw new Error("NOT_FOUND");
  return list;
}

export async function requirePermission(ctx: GuardContext, permission: Permission): Promise<void> {
  const { userId, listId } = GuardContextSchema.parse(ctx);
  const list = await loadListOrThrow(listId);

  const isOwner = list.creator.id === userId;
  const member = list.participants.find(p => p.user.id === userId);
  const isEditor = !!member && (member.canEdit || member.canDelete);
  const isViewer = !!member && member.canAdd && !isEditor;

  switch (permission) {
    case "view_list": {
      if (list.isPublic) return;
      if (isOwner || !!member) return;
      throw new Error("FORBIDDEN");
    }
    case "edit_list": {
      if (isOwner) return;
      if (isEditor) return;
      throw new Error("FORBIDDEN");
    }
    case "delete_list": {
      if (isOwner) return;
      if (isEditor) return; // maintain existing behavior where editors can delete
      throw new Error("FORBIDDEN");
    }
    case "add_item": {
      if (isOwner) return;
      if (member && (member.canAdd || member.canEdit || member.canDelete)) return;
      throw new Error("FORBIDDEN");
    }
    case "update_item": {
      if (isOwner) return;
      if (member && (member.canEdit || member.canDelete)) return;
      throw new Error("FORBIDDEN");
    }
    case "delete_item": {
      if (isOwner) return;
      if (member && member.canDelete) return;
      throw new Error("FORBIDDEN");
    }
  }
}