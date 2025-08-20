import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { X } from "lucide-react";

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateListModal({ isOpen, onClose }: CreateListModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
  });

  const createListMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", "/api/lists", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "Success",
        description: "List created successfully",
      });
      handleClose();
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
        description: "Failed to create list",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "List name is required",
        variant: "destructive",
      });
      return;
    }

    createListMutation.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || "",
      isPublic: formData.isPublic,
    });
  };

  const handleClose = () => {
    setFormData({ name: "", description: "", isPublic: false });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New List</DialogTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              data-testid="button-close-create-modal"
            >
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="list-name" className="text-sm font-medium">
              List Name *
            </Label>
            <Input
              id="list-name"
              placeholder="e.g., Movies to Watch"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1"
              data-testid="input-list-name"
            />
          </div>

          <div>
            <Label htmlFor="list-description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="list-description"
              placeholder="What's this list for?"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 min-h-[80px] resize-none"
              data-testid="textarea-list-description"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="list-public" className="text-sm font-medium">
                Make Public
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Public lists can be shared with anyone via a link
              </p>
            </div>
            <Switch
              id="list-public"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
              data-testid="switch-list-public"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || createListMutation.isPending}
              className="flex-1"
              data-testid="button-create-list"
            >
              Create List
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
