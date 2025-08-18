import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { InviteModal } from "@/components/connections/invite-modal";
import { apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, Check, X } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Connections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ["/api/connections"],
  });

  const { data: pendingInvitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["/api/connections/pending"],
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/connections/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connections/pending"] });
      toast({
        title: "Success",
        description: "Connection updated successfully",
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
        description: "Failed to update connection",
        variant: "destructive",
      });
    },
  });

  const handleAcceptInvitation = (id: string) => {
    updateConnectionMutation.mutate({ id, status: "accepted" });
  };

  const handleRejectInvitation = (id: string) => {
    updateConnectionMutation.mutate({ id, status: "rejected" });
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Connections</h1>
          <Button 
            size="sm"
            onClick={() => setShowInviteModal(true)}
            data-testid="button-invite-connection"
          >
            <UserPlus className="mr-1" size={16} />
            Invite
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Pending Invitations */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h2>
          
          {invitationsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <UserPlus className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="font-medium text-gray-900 mb-2">No pending invitations</h3>
                <p className="text-sm text-gray-500">
                  You're all caught up! No new connection requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => {
                const requester = invitation.requester;
                const initial = (requester.firstName?.[0] || requester.email?.[0] || '?').toUpperCase();
                
                return (
                  <Card key={invitation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-medium mr-3">
                            {initial}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {requester.firstName && requester.lastName 
                                ? `${requester.firstName} ${requester.lastName}`
                                : requester.email}
                            </h4>
                            <p className="text-sm text-gray-500">
                              wants to connect with you
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            disabled={updateConnectionMutation.isPending}
                            data-testid={`button-accept-${invitation.id}`}
                          >
                            <Check size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectInvitation(invitation.id)}
                            disabled={updateConnectionMutation.isPending}
                            data-testid={`button-reject-${invitation.id}`}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Active Connections */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Connections</h2>
          
          {connectionsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : connections.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="font-medium text-gray-900 mb-2">No connections yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Start building your network by inviting friends and family
                </p>
                <Button onClick={() => setShowInviteModal(true)}>
                  Send Your First Invitation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {connections.map((connection) => {
                const otherUser = connection.requesterId === user?.id 
                  ? connection.addressee 
                  : connection.requester;
                const initial = (otherUser.firstName?.[0] || otherUser.email?.[0] || '?').toUpperCase();
                
                return (
                  <Card key={connection.id} data-testid={`card-connection-${connection.id}`}>
                    <CardContent className="p-4 text-center">
                      <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white font-medium text-xl mx-auto mb-3">
                        {initial}
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        {otherUser.firstName && otherUser.lastName 
                          ? `${otherUser.firstName} ${otherUser.lastName}`
                          : otherUser.email}
                      </h4>
                      <p className="text-sm text-gray-500 mb-2">
                        {otherUser.email}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Connected
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <InviteModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
