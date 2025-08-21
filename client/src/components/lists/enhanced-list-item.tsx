import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, 
  Save, 
  X, 
  Trash2, 
  ExternalLink,
  Music,
  Film,
  Tv,
  UtensilsCrossed,
  User
} from "lucide-react";
import type { ListItemWithDetails, CategoryWithSubcategories } from "@shared/schema";

interface EnhancedListItemProps {
  item: ListItemWithDetails;
  listId: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function EnhancedListItem({ item, listId, canEdit = true, canDelete = true }: EnhancedListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    content: item.content,
    note: item.note || "",
    url: item.url || "",
    categoryId: item.categoryId || "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories for selection
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest(`/api/lists/${listId}/items/${item.id}`, "PATCH", updates);
    },
    onSuccess: () => {
      toast({
        title: "Item updated",
        description: "List item has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}/items`] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update item",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/lists/${listId}/items/${item.id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "List item has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}/items`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete item",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updates: any = {
      content: editData.content,
      note: editData.note || null,
      url: editData.url || null,
      categoryId: editData.categoryId || null,
    };

    updateMutation.mutate(updates);
  };

  const handleCancel = () => {
    setEditData({
      content: item.content,
      note: item.note || "",
      url: item.url || "",
      categoryId: item.categoryId || "",
    });
    setIsEditing(false);
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'music': return <Music className="w-4 h-4" />;
      case 'movies': return <Film className="w-4 h-4" />;
      case 'tv shows': return <Tv className="w-4 h-4" />;
      case 'food & restaurants': return <UtensilsCrossed className="w-4 h-4" />;
      default: return null;
    }
  };

  const getAllSubcategories = () => {
    const allSubs: any[] = [];
    categories.forEach((cat: CategoryWithSubcategories) => {
      allSubs.push(cat);
      allSubs.push(...cat.subcategories);
    });
    return allSubs;
  };

  if (isEditing) {
    return (
      <Card className="mb-3">
        <CardContent className="p-4 space-y-3">
          <Input
            value={editData.content}
            onChange={(e) => setEditData({ ...editData, content: e.target.value })}
            placeholder="Item content..."
            data-testid={`input-edit-content-${item.id}`}
          />
          
          <Textarea
            value={editData.note}
            onChange={(e) => setEditData({ ...editData, note: e.target.value })}
            placeholder="Add a note (optional)..."
            className="min-h-[60px]"
            data-testid={`textarea-edit-note-${item.id}`}
          />

          <Input
            value={editData.url}
            onChange={(e) => setEditData({ ...editData, url: e.target.value })}
            placeholder="Add URL (optional)..."
            type="url"
            data-testid={`input-edit-url-${item.id}`}
          />

          <Select
            value={editData.categoryId}
            onValueChange={(value) => setEditData({ ...editData, categoryId: value })}
          >
            <SelectTrigger data-testid={`select-edit-category-${item.id}`}>
              <SelectValue placeholder="Select category (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No category</SelectItem>
              {getAllSubcategories().map((category: any) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.parentId ? `• ${category.name}` : category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending || !editData.content.trim()}
              data-testid={`button-save-${item.id}`}
            >
              {updateMutation.isPending ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              data-testid={`button-cancel-${item.id}`}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-medium text-gray-900" data-testid={`text-content-${item.id}`}>
                {item.content}
              </p>
              {item.category && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  {getCategoryIcon(item.category.name)}
                  {item.category.name}
                </Badge>
              )}
            </div>

            {item.note && (
              <p className="text-sm text-gray-600 mb-2" data-testid={`text-note-${item.id}`}>
                {item.note}
              </p>
            )}

            {item.url && (
              <div className="mb-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  data-testid={`link-url-${item.id}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  {item.category?.name === 'Music' ? 'Play Song' : 'View Link'}
                </a>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span data-testid={`text-author-${item.id}`}>
                {item.addedBy.firstName || item.addedBy.email}
              </span>
              <span>•</span>
              <span data-testid={`text-date-${item.id}`}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </div>

          <div className="flex gap-1 ml-4">
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                data-testid={`button-edit-${item.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:text-red-800"
                data-testid={`button-delete-${item.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}