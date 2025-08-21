import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteModal } from "@/components/invitations/invite-modal";
import { InvitationList } from "@/components/invitations/invitation-list";
import { Plus, Users } from "lucide-react";
import type { List } from "@shared/schema";

export default function Invitations() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { data: lists = [] } = useQuery({
    queryKey: ["/api/lists"],
  });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Users className="mr-3" size={28} />
            Invitations
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your invitations and connect with others
          </p>
        </div>
        
        <Button 
          onClick={() => setIsInviteModalOpen(true)}
          data-testid="button-send-invitation"
        >
          <Plus className="mr-2" size={16} />
          Send Invitation
        </Button>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" data-testid="tab-received">
            Received
          </TabsTrigger>
          <TabsTrigger value="sent" data-testid="tab-sent">
            Sent
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="space-y-4">
          <InvitationList type="received" />
        </TabsContent>
        
        <TabsContent value="sent" className="space-y-4">
          <InvitationList type="sent" />
        </TabsContent>
      </Tabs>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        lists={lists as List[]}
      />
    </div>
  );
}