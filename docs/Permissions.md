### Permissions and Access Control

This project uses a single unified guard layer to enforce access control for lists and items.

### Roles

- **viewer**: can view a shared list and add items.
- **editor**: can view and edit a shared list; can add and update items. May delete items if granted delete permission.
- **owner**: list creator; full access.

Role hierarchy: owner > editor > viewer.

A member's role is derived from permissions:
- `owner`: list creator.
- `editor`: `canEdit` or `canDelete` is true.
- `viewer`: `canAdd` is true but neither `canEdit` nor `canDelete`.

### Visibility

- **public**: anyone can view. No mutation allowed unless a member per role.
- **shared**: invite required. Computed when the list is not public and there are participants other than the owner.
- **private**: not public and no participants other than the owner.

### Guarded permissions

- **view_list**: allowed if public, owner, or participant.
- **edit_list**: allowed for owner or participants with `canEdit` or `canDelete`.
- **delete_list**: allowed for owner or participants with `canEdit` or `canDelete`.
- **add_item**: allowed for owner or participants with any of `canAdd`, `canEdit`, or `canDelete`.
- **update_item**: allowed for owner or participants with `canEdit` or `canDelete`.
- **delete_item**: allowed for owner or participants with `canDelete`.

All guard inputs are validated using Zod.

### Examples

```ts
import { requirePermission } from "../server/guards";

await requirePermission({ userId, listId }, "view_list");
await requirePermission({ userId, listId }, "edit_list");
await requirePermission({ userId, listId }, "add_item");
await requirePermission({ userId, listId }, "update_item");
await requirePermission({ userId, listId }, "delete_item");
```

### Notes

- Public lists can be viewed by anyone, but mutations still require membership per role.
- Editors with only `canEdit` cannot delete items; only `canDelete` grants deletion.
- Guards throw `NOT_FOUND` when the list does not exist, and `FORBIDDEN` when access is denied.