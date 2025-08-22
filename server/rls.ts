import { storage } from "./storage";

export async function assertCanViewList(userId: string, listId: string) {
	const list = await storage.getListById(listId);
	if (!list) throw new Error("NOT_FOUND");
	if (list.isPublic) return;
	if (list.creator.id === userId) return;
	const isMember = list.participants.some(p => p.user.id === userId);
	if (!isMember) throw new Error("FORBIDDEN");
}

export async function assertCanEditList(userId: string, listId: string) {
	const list = await storage.getListById(listId);
	if (!list) throw new Error("NOT_FOUND");
	if (list.creator.id === userId) return;
	const member = list.participants.find(p => p.user.id === userId);
	if (!member) throw new Error("FORBIDDEN");
	if (member.canEdit || member.canDelete) return;
	throw new Error("FORBIDDEN");
}

export async function assertCanAddItem(userId: string, listId: string) {
	const list = await storage.getListById(listId);
	if (!list) throw new Error("NOT_FOUND");
	if (list.creator.id === userId) return;
	const member = list.participants.find(p => p.user.id === userId);
	if (!member) throw new Error("FORBIDDEN");
	if (member.canAdd || member.canEdit || member.canDelete) return;
	throw new Error("FORBIDDEN");
}

export async function assertCanDeleteItem(userId: string, listId: string) {
	const list = await storage.getListById(listId);
	if (!list) throw new Error("NOT_FOUND");
	if (list.creator.id === userId) return;
	const member = list.participants.find(p => p.user.id === userId);
	if (!member) throw new Error("FORBIDDEN");
	if (member.canDelete) return;
	throw new Error("FORBIDDEN");
}