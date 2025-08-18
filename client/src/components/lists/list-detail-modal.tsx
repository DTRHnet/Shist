import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";
import { X, Plus, Trash2, Share } from "lucide-react";
import type { ListWithDetails } from "@shared/schema";

interface ListDetailModalProps {
  list: ListWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export function ListDetailModal({ list, isOpen, onClose }: ListDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemContent, setNewItemContent] = useState("");
  const [newItemNote, setNewItemNote] = useState("");

  // Subscribe to real-time updates for this list
  useWebSocket(list.id);

  const addItemMutation = useMutation({
    mutationFn: async (data: { content: string; note?: string }) => {
      await apiRequest("POST", `/api/lists/${list.id}/items`, data);
    },
    onSuccess: () => {
      setNewItemContent("");
      setNewItemNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists", list.id] });
      toast({
        title: "Success",
        description: "Item added successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/lists/${list.id}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists", list.id] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    if (!newItemContent.trim()) return;
    
    addItemMutation.mutate({
      content: newItemContent.trim(),
      note: newItemNote.trim() || undefined,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleShare = async () => {
    if (list.isPublic) {
      const shareUrl = `${window.location.origin}/public/list/${list.id}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Check out my ${list.name} list on Shist`,
            url: shareUrl,
          });
        } catch (error) {
          // User cancelled sharing or sharing failed
        }
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Share link copied to clipboard",
        });
      }
    } else {
      toast({
        title: "Cannot share",
        description: "Only public lists can be shared",
        variant: "destructive",
      });
    }
  };

  const userParticipant = list.participants.find(p => p.userId === user?.id);
  const canAdd = userParticipant?.canAdd ?? false;
  const canDelete = userParticipant?.canDelete ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              {list.name}
              <Badge variant={list.isPublic ? "default" : "secondary"} className="ml-2">
                {list.isPublic ? "Public" : "Private"}
              </Badge>
            </DialogTitle>
            <div className="flex items-center space-x-2">
              {list.isPublic && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShare}
                  data-testid="button-share-list"
                >
                  <Share size={16} />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                data-testid="button-close-modal"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
          {list.description && (
            <p className="text-sm text-gray-600 mt-2">{list.description}</p>
          )}
        </DialogHeader>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {list.items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No items yet</p>
              <p className="text-sm text-gray-400 mt-1">Add the first item below</p>
            </div>
          ) : (
            list.items.map((item) => {
              const isOwner = item.addedById === user?.id;
              const borderColor = isOwner ? "border-l-indigo-500" : "border-l-emerald-500";
              const bgColor = isOwner ? "bg-indigo-50" : "bg-emerald-50";
              
              return (
                <div 
                  key={item.id} 
                  className={`${bgColor} rounded-lg p-3 border-l-4 ${borderColor}`}
                  data-testid={`item-${item.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.content}</h4>
                      {item.note && (
                        <p className="text-sm text-gray-600 mt-1">{item.note}</p>
                      )}
                    </div>
                    {(canDelete || isOwner) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={deleteItemMutation.isPending}
                        className="text-gray-400 hover:text-red-500 ml-2"
                        data-testid={`button-delete-item-${item.id}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Added by {item.addedBy.firstName || item.addedBy.email}</span>
                    <span>{formatDistanceToNow(new Date(item.createdAt!))} ago</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Item Form */}
        {canAdd && (
          <div className="flex-shrink-0 border-t pt-4 space-y-3">
            <Input
              placeholder="Add new item..."
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleAddItem()}
              data-testid="input-new-item"
            />
            <Textarea
              placeholder="Add a note (optional)..."
              value={newItemNote}
              onChange={(e) => setNewItemNote(e.target.value)}
              className="min-h-[60px] resize-none"
              data-testid="textarea-new-item-note"
            />
            <Button
              onClick={handleAddItem}
              disabled={!newItemContent.trim() || addItemMutation.isPending}
              className="w-full"
              data-testid="button-add-item"
            >
              <Plus className="mr-2" size={16} />
              Add Item
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
