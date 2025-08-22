import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Music, ExternalLink } from "lucide-react";
import type { CategoryWithSubcategories } from "@shared/schema";

interface AddItemFormProps {
  listId: string;
  onClose?: () => void;
}

export function AddItemForm({ listId, onClose }: AddItemFormProps) {
  const [formData, setFormData] = useState({
    content: "",
    note: "",
    url: "",
    categoryId: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories for selection
  const { data: categories = [] } = useQuery<CategoryWithSubcategories[]>({
    queryKey: ["/api/categories"],
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/lists/${listId}/items`, "POST", {
        content: data.content,
        note: data.note || null,
        url: data.url || null,
        categoryId: data.categoryId || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Item added!",
        description: "Your item has been added to the list.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${listId}/items`] });
      setFormData({ content: "", note: "", url: "", categoryId: "" });
      onClose?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add item",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    addItemMutation.mutate(formData);
  };

  const getAllSubcategories = () => {
    const allSubs: any[] = [];
    categories.forEach((cat: CategoryWithSubcategories) => {
      allSubs.push(cat);
      allSubs.push(...cat.subcategories);
    });
    return allSubs;
  };

  const getSelectedCategory = () => {
    const allCategories = getAllSubcategories();
    return allCategories.find(cat => cat.id === formData.categoryId);
  };

  const selectedCategory = getSelectedCategory();
  const isMusicCategory = selectedCategory?.name === 'Music' || 
    selectedCategory?.parentId && 
    categories.find((c: CategoryWithSubcategories) => c.id === selectedCategory.parentId)?.name === 'Music';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Plus className="mr-2" size={20} />
          Add New Item
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="What would you like to add?"
              data-testid="input-add-content"
              required
            />
          </div>

          <div>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger data-testid="select-add-category">
                <SelectValue placeholder="Choose a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No category</SelectItem>
                {categories.map((category: CategoryWithSubcategories) => (
                  <div key={category.id}>
                    <SelectItem value={category.id}>
                      {category.name}
                    </SelectItem>
                    {category.subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        • {subcategory.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="advanced">
                {isMusicCategory ? (
                  <span className="flex items-center gap-1">
                    <Music className="w-4 h-4" />
                    Music Details
                  </span>
                ) : (
                  "More Details"
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-3">
              <Textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Add a note or description (optional)"
                className="min-h-[80px]"
                data-testid="textarea-add-note"
              />
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4" />
                  <label className="text-sm font-medium">
                    {isMusicCategory ? "Song/Album URL" : "Related URL"}
                  </label>
                </div>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder={
                    isMusicCategory 
                      ? "Spotify, YouTube, Apple Music link..." 
                      : "Add a related link (optional)"
                  }
                  type="url"
                  data-testid="input-add-url"
                />
                {isMusicCategory && (
                  <p className="text-xs text-gray-500 mt-1">
                    Add Spotify, YouTube, Apple Music, or other music platform links
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={addItemMutation.isPending || !formData.content.trim()}
              data-testid="button-add-item"
            >
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}