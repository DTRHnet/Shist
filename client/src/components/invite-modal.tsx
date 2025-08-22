import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, MessageSquare, Users, List, X, Send } from "lucide-react";
import type { List as ListType } from "@shared/schema";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists?: ListType[];
}

export function InviteModal({ isOpen, onClose, lists = [] }: InviteModalProps) {
  const [inviteMethod, setInviteMethod] = useState<"email" | "sms">("email");
  const [recipient, setRecipient] = useState("");
  const [invitationType, setInvitationType] = useState<"connection" | "list">("connection");
  const [selectedListId, setSelectedListId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (data: {
      recipientEmail?: string;
      recipientPhone?: string;
      invitationType: string;
      listId?: string;
    }) => {
      return await apiRequest("POST", "/api/invitations", data);
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: `Your invitation has been sent via ${inviteMethod}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/sent"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipient.trim()) {
      toast({
        title: "Recipient required",
        description: `Please enter ${inviteMethod === "email" ? "an email address" : "a phone number"}.`,
        variant: "destructive",
      });
      return;
    }

    if (invitationType === "list" && !selectedListId) {
      toast({
        title: "List selection required",
        description: "Please select a list to invite the person to.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    if (inviteMethod === "email" && !isValidEmail(recipient)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (inviteMethod === "sms" && !isValidPhone(recipient)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const inviteData = {
      [inviteMethod === "email" ? "recipientEmail" : "recipientPhone"]: recipient,
      invitationType,
      ...(invitationType === "list" && { listId: selectedListId }),
    };

    inviteMutation.mutate(inviteData);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setRecipient("");
    setInvitationType("connection");
    setSelectedListId("");
    setIsSubmitting(false);
    onClose();
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="invite-modal">
        <div className="flex justify-between items-start">
          <div>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>
              Invite someone to join you on Shist via email or SMS
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            data-testid="button-close-invite"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invitation Method Tabs */}
          <Tabs value={inviteMethod} onValueChange={(value) => setInviteMethod(value as "email" | "sms")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" data-testid="tab-email">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" data-testid="tab-sms">
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  data-testid="input-email"
                />
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  data-testid="input-phone"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Invitation Type */}
          <div className="space-y-3">
            <Label>What would you like to invite them to?</Label>
            <Tabs value={invitationType} onValueChange={(value) => setInvitationType(value as "connection" | "list")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="connection" data-testid="tab-connection">
                  <Users className="w-4 h-4 mr-2" />
                  Connect
                </TabsTrigger>
                <TabsTrigger value="list" data-testid="tab-list">
                  <List className="w-4 h-4 mr-2" />
                  Join List
                </TabsTrigger>
              </TabsList>

              <TabsContent value="connection">
                <p className="text-sm text-gray-600">
                  Send a connection invitation to start sharing lists together.
                </p>
              </TabsContent>

              <TabsContent value="list" className="space-y-3">
                <p className="text-sm text-gray-600">
                  Invite them to collaborate on a specific list.
                </p>
                
                {lists.length > 0 ? (
                  <div>
                    <Label htmlFor="list-select">Select List</Label>
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger data-testid="select-list">
                        <SelectValue placeholder="Choose a list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    You don't have any lists yet. Create a list first, then you can invite people to it.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || inviteMutation.isPending}
              className="flex-1"
              data-testid="button-send-invite"
            >
              {isSubmitting || inviteMutation.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}