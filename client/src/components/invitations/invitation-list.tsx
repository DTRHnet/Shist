import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { 
  Mail, 
  MessageSquare, 
  Users, 
  List as ListIcon, 
  Clock, 
  CheckCircle,
  XCircle,
  Send,
  Inbox
} from "lucide-react";
import type { InvitationWithDetails } from "@shared/schema";

interface InvitationListProps {
  type: "received" | "sent";
}

export function InvitationList({ type }: InvitationListProps) {
  const { data: invitations = [], isLoading } = useQuery<InvitationWithDetails[]>({
    queryKey: [`/api/invitations/${type}`],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest("POST", `/api/invitations/accept/${token}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted!",
        description: "You have successfully accepted the invitation.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/invitations/${type}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest("POST", `/api/invitations/decline/${token}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation declined",
        description: "You have declined the invitation.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/invitations/${type}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to decline invitation",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "expired":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "expired":
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {type === "received" ? <Inbox className="mr-2" size={20} /> : <Send className="mr-2" size={20} />}
            {type === "received" ? "Received Invitations" : "Sent Invitations"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderInvitation = (invitation: InvitationWithDetails) => {
    const isExpired = new Date(invitation.expiresAt) < new Date();
    const recipient = invitation.recipientEmail || invitation.recipientPhone || "Unknown";
    const inviterName = invitation.inviter.firstName 
      ? `${invitation.inviter.firstName} ${invitation.inviter.lastName || ''}`.trim()
      : invitation.inviter.email || "Someone";

    return (
      <div
        key={invitation.id}
        className={`p-4 border rounded-lg transition-colors ${
          isExpired ? "bg-gray-50 border-gray-200" : "bg-white border-gray-300 hover:border-gray-400"
        }`}
        data-testid={`invitation-${invitation.id}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              {/* Invitation Type Icon */}
              {invitation.invitationType === "list" ? (
                <ListIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
              ) : (
                <Users className="h-4 w-4 text-green-600 flex-shrink-0" />
              )}

              {/* Method Icon */}
              {invitation.recipientEmail ? (
                <Mail className="h-3 w-3 text-gray-500 flex-shrink-0" />
              ) : (
                <MessageSquare className="h-3 w-3 text-gray-500 flex-shrink-0" />
              )}

              {/* Status Badge */}
              <Badge variant="secondary" className={getStatusColor(invitation.status)}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(invitation.status)}
                  <span className="capitalize">{invitation.status}</span>
                </div>
              </Badge>
            </div>

            <div className="space-y-1">
              {type === "received" ? (
                <p className="text-sm font-medium text-gray-900">
                  {invitation.invitationType === "list" 
                    ? `${inviterName} invited you to "${invitation.list?.name || 'Unknown List'}"`
                    : `${inviterName} wants to connect with you`
                  }
                </p>
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {invitation.invitationType === "list"
                    ? `Invited ${recipient} to "${invitation.list?.name || 'Unknown List'}"`
                    : `Invited ${recipient} to connect`
                  }
                </p>
              )}

              <p className="text-xs text-gray-500">
                Sent {formatDistanceToNow(new Date(invitation.sentAt || invitation.createdAt || new Date()))} ago
                {isExpired && " • Expired"}
              </p>

              <p className="text-xs text-gray-400 truncate">
                To: {recipient}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2 ml-4">
            {type === "received" && invitation.status === "pending" && !isExpired && (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={declineMutation.isPending}
                  onClick={() => declineMutation.mutate(invitation.token)}
                  data-testid={`button-decline-${invitation.id}`}
                >
                  {declineMutation.isPending ? "..." : "Decline"}
                </Button>
                <Button
                  size="sm"
                  disabled={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(invitation.token)}
                  data-testid={`button-accept-${invitation.id}`}
                >
                  {acceptMutation.isPending ? "..." : "Accept"}
                </Button>
              </div>
            )}

            {invitation.acceptedAt && (
              <p className="text-xs text-green-600">
                Accepted {formatDistanceToNow(new Date(invitation.acceptedAt))} ago
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {type === "received" ? <Inbox className="mr-2" size={20} /> : <Send className="mr-2" size={20} />}
          {type === "received" ? "Received Invitations" : "Sent Invitations"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              {type === "received" ? (
                <Inbox className="h-12 w-12 mx-auto text-gray-300" />
              ) : (
                <Send className="h-12 w-12 mx-auto text-gray-300" />
              )}
            </div>
            <p className="text-sm">
              {type === "received" 
                ? "No invitations received yet" 
                : "No invitations sent yet"
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {invitations.map(renderInvitation)}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}