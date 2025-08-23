import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requirePermission, getUserRoleInList, getVisibility } from '../guards';

vi.mock('../storage', () => {
  return {
    storage: {
      getListById: vi.fn(),
    },
  };
});

import { storage } from '../storage';

function makeList({
  id,
  creatorId,
  isPublic = false,
  participants = [],
}: any) {
  return {
    id,
    name: 'Test',
    description: null,
    isPublic,
    creatorId,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: { id: creatorId },
    participants,
    items: [],
    itemCount: 0,
  } as any;
}

function participant(userId: string, perms: Partial<{ canAdd: boolean; canEdit: boolean; canDelete: boolean }> = {}) {
  return {
    listId: 'list-1',
    userId,
    canAdd: !!perms.canAdd,
    canEdit: !!perms.canEdit,
    canDelete: !!perms.canDelete,
    joinedAt: new Date(),
    user: { id: userId },
  } as any;
}

describe('guards', () => {
  const ownerId = '00000000-0000-0000-0000-000000000001';
  const viewerId = '00000000-0000-0000-0000-000000000002';
  const editorId = '00000000-0000-0000-0000-000000000003';
  const deleterId = '00000000-0000-0000-0000-000000000004';
  const strangerId = '00000000-0000-0000-0000-000000000099';
  const listId = '10000000-0000-0000-0000-000000000000';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('derives roles correctly', async () => {
    const list = makeList({ id: listId, creatorId: ownerId, participants: [
      participant(viewerId, { canAdd: true }),
      participant(editorId, { canEdit: true }),
      participant(deleterId, { canDelete: true }),
    ]});

    expect(getUserRoleInList(list as any, ownerId)).toBe('owner');
    expect(getUserRoleInList(list as any, viewerId)).toBe('viewer');
    expect(getUserRoleInList(list as any, editorId)).toBe('editor');
    expect(getUserRoleInList(list as any, deleterId)).toBe('editor');
    expect(getUserRoleInList(list as any, strangerId)).toBeNull();
  });

  it('computes visibility correctly', () => {
    const privateList = makeList({ id: listId, creatorId: ownerId, isPublic: false, participants: [participant(ownerId, { canAdd: true, canEdit: true, canDelete: true })]});
    const sharedList = makeList({ id: listId, creatorId: ownerId, isPublic: false, participants: [participant(ownerId, { canAdd: true, canEdit: true, canDelete: true }), participant(viewerId, { canAdd: true })]});
    const publicList = makeList({ id: listId, creatorId: ownerId, isPublic: true, participants: []});

    expect(getVisibility(privateList as any)).toBe('private');
    expect(getVisibility(sharedList as any)).toBe('shared');
    expect(getVisibility(publicList as any)).toBe('public');
  });

  it('allows viewing public lists without membership', async () => {
    (storage.getListById as any).mockResolvedValueOnce(makeList({ id: listId, creatorId: ownerId, isPublic: true }));
    await expect(requirePermission({ userId: strangerId, listId }, 'view_list')).resolves.toBeUndefined();
  });

  it('enforces private list view to owner only', async () => {
    const list = makeList({ id: listId, creatorId: ownerId, isPublic: false, participants: [participant(ownerId, { canAdd: true, canEdit: true, canDelete: true })]});
    (storage.getListById as any).mockResolvedValue(list);
    await expect(requirePermission({ userId: ownerId, listId }, 'view_list')).resolves.toBeUndefined();
    await expect(requirePermission({ userId: strangerId, listId }, 'view_list')).rejects.toThrowError('FORBIDDEN');
  });

  it('viewer can add items but cannot update or delete', async () => {
    const list = makeList({ id: listId, creatorId: ownerId, isPublic: false, participants: [
      participant(ownerId, { canAdd: true, canEdit: true, canDelete: true }),
      participant(viewerId, { canAdd: true }),
    ]});
    (storage.getListById as any).mockResolvedValue(list);

    await expect(requirePermission({ userId: viewerId, listId }, 'add_item')).resolves.toBeUndefined();
    await expect(requirePermission({ userId: viewerId, listId }, 'update_item')).rejects.toThrowError('FORBIDDEN');
    await expect(requirePermission({ userId: viewerId, listId }, 'delete_item')).rejects.toThrowError('FORBIDDEN');
  });

  it('editor (canEdit) can update but not delete items', async () => {
    const list = makeList({ id: listId, creatorId: ownerId, isPublic: false, participants: [
      participant(ownerId, { canAdd: true, canEdit: true, canDelete: true }),
      participant(editorId, { canEdit: true }),
    ]});
    (storage.getListById as any).mockResolvedValue(list);

    await expect(requirePermission({ userId: editorId, listId }, 'update_item')).resolves.toBeUndefined();
    await expect(requirePermission({ userId: editorId, listId }, 'delete_item')).rejects.toThrowError('FORBIDDEN');
  });

  it('deleter (canDelete) can update and delete items', async () => {
    const list = makeList({ id: listId, creatorId: ownerId, isPublic: false, participants: [
      participant(ownerId, { canAdd: true, canEdit: true, canDelete: true }),
      participant(deleterId, { canDelete: true }),
    ]});
    (storage.getListById as any).mockResolvedValue(list);

    await expect(requirePermission({ userId: deleterId, listId }, 'update_item')).resolves.toBeUndefined();
    await expect(requirePermission({ userId: deleterId, listId }, 'delete_item')).resolves.toBeUndefined();
  });

  it('owner can do everything', async () => {
    const list = makeList({ id: listId, creatorId: ownerId, isPublic: false, participants: [participant(ownerId, { canAdd: true, canEdit: true, canDelete: true })]});
    (storage.getListById as any).mockResolvedValue(list);

    for (const perm of ['view_list','edit_list','delete_list','add_item','update_item','delete_item'] as const) {
      await expect(requirePermission({ userId: ownerId, listId }, perm)).resolves.toBeUndefined();
    }
  });
});