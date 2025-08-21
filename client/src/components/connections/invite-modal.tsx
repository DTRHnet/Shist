import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { X, Mail } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: "",
    message: "",
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { addresseeEmail: string; message?: string }) => {
      await apiRequest("POST", "/api/connections/invite", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Invitation sent",
        description: "Your invitation has been sent successfully",
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
      
      let errorMessage = "Failed to send invitation";
      if (error.message.includes("404")) {
        errorMessage = "User not found. Make sure they have a Shist account.";
      } else if (error.message.includes("400")) {
        errorMessage = "You're already connected with this user.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.email.trim()) {
      toast({
        title: "Error",
        description: "Email address is required",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate({
      addresseeEmail: formData.email.trim(),
      message: formData.message.trim() || undefined,
    });
  };

  const handleClose = () => {
    setFormData({ email: "", message: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <Mail className="mr-2" size={20} />
              Invite Someone
            </DialogTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              data-testid="button-close-invite-modal"
            >
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="invite-email" className="text-sm font-medium">
              Email Address *
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="friend@example.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1"
              data-testid="input-invite-email"
            />
          </div>

          <div>
            <Label htmlFor="invite-message" className="text-sm font-medium">
              Personal Message (Optional)
            </Label>
            <Textarea
              id="invite-message"
              placeholder="Hey! Let's start sharing lists on Shist..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="mt-1 min-h-[80px] resize-none"
              data-testid="textarea-invite-message"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Note about invitations
            </h4>
            <p className="text-xs text-blue-700">
              Your friend will need to create a Shist account to accept your invitation. 
              They'll receive an email with instructions to get started.
            </p>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              data-testid="button-cancel-invite"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.email.trim() || inviteMutation.isPending}
              className="flex-1"
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
