import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { useState } from "react";
import { ListDetailModal } from "@/components/lists/list-detail-modal";
import { CreateListModal } from "@/components/lists/create-list-modal";
import { InviteModal } from "@/components/connections/invite-modal";
import { AdPlacement } from "@/components/ui/ad-placement";
import { Plus, Music, Film, Gift, Users, UserPlus, Bell, List } from "lucide-react";
import type { ListWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const { user } = useAuth() as { user: User | undefined };
  const [selectedList, setSelectedList] = useState<ListWithDetails | null>(null);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: lists = [], isLoading: listsLoading } = useQuery<ListWithDetails[]>({
    queryKey: ["/api/lists"],
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["/api/connections"],
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ["/api/connections/pending"],
  });

  const getListIcon = (listName: string) => {
    const name = listName.toLowerCase();
    if (name.includes('music')) return <Music className="text-purple-500" size={20} />;
    if (name.includes('movie') || name.includes('film')) return <Film className="text-red-500" size={20} />;
    if (name.includes('gift')) return <Gift className="text-pink-500" size={20} />;
    return <Plus className="text-indigo-500" size={20} />;
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <List className="text-indigo-500 mr-3" size={24} />
          <h1 className="text-xl font-bold text-gray-900">Shist</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            className="p-2 text-slate-500 hover:text-gray-700 relative"
            onClick={() => setShowInviteModal(true)}
            data-testid="button-notifications"
          >
            <Bell size={20} />
            {(pendingInvitations as any[]).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {(pendingInvitations as any[]).length}
              </span>
            )}
          </button>
          <button 
            className="p-2 text-slate-500 hover:text-gray-700"
            onClick={() => window.location.href = "/api/logout"}
            data-testid="button-logout"
          >
            <Users size={20} />
          </button>
        </div>
      </header>

      <main>
        {/* Quick Actions */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <Button 
            className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={() => setShowCreateList(true)}
            data-testid="button-quick-add"
          >
            <Plus className="mr-2" size={16} />
            Quick Add Item
          </Button>
        </div>

        {/* Ad Placement */}
        <AdPlacement 
          type="banner" 
          className="mx-4 my-3" 
          content="Ad content placeholder - 300x100" 
        />

        {/* Active Lists Section */}
        <section className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Lists</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowCreateList(true)}
              data-testid="button-new-list"
            >
              <Plus className="mr-1" size={16} />
              New List
            </Button>
          </div>

          {listsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (lists as ListWithDetails[]).length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <List className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="font-medium text-gray-900 mb-2">No lists yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create your first shared list to get started
                </p>
                <Button onClick={() => setShowCreateList(true)}>
                  Create List
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(lists as ListWithDetails[]).map((list: ListWithDetails) => (
                <Card 
                  key={list.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedList(list)}
                  data-testid={`card-list-${list.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        {getListIcon(list.name)}
                        <div className="ml-3">
                          <h3 className="font-medium text-gray-900" data-testid={`text-list-name-${list.id}`}>
                            {list.name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            Shared with {list.participants.filter(p => p.userId !== user?.id).length} others
                          </p>
                        </div>
                      </div>
                      <Badge variant={list.isPublic ? "default" : "secondary"}>
                        {list.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    {list.lastItem && (
                      <div className="text-sm text-slate-500 mb-2">
                        Last: "{list.lastItem.content}" by {list.lastItem.addedBy.firstName || list.lastItem.addedBy.email}
                      </div>
                    )}
                    <div className="flex items-center text-xs text-slate-500">
                      <span>{list.itemCount} items</span>
                      <span className="mx-2">•</span>
                      <span>
                        Updated {formatDistanceToNow(new Date(list.updatedAt!))} ago
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Connections Section */}
        <section className="p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Connections</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowInviteModal(true)}
              data-testid="button-invite-connection"
            >
              <UserPlus className="mr-1" size={16} />
              Invite
            </Button>
          </div>

          {(connections as any[]).length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="font-medium text-gray-900 mb-2">No connections yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Invite friends to start sharing lists
                </p>
                <Button onClick={() => setShowInviteModal(true)}>
                  Send Invitation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(connections as any[]).map((connection: any) => {
                const otherUser = connection.requesterId === user?.id 
                  ? connection.addressee 
                  : connection.requester;
                const initial = (otherUser.firstName?.[0] || otherUser.email?.[0] || '?').toUpperCase();
                
                return (
                  <Card key={connection.id} className="text-center">
                    <CardContent className="p-3">
                      <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-medium mx-auto mb-2">
                        {initial}
                      </div>
                      <h4 className="font-medium text-sm text-gray-900">
                        {otherUser.firstName && otherUser.lastName 
                          ? `${otherUser.firstName} ${otherUser.lastName}`
                          : otherUser.email}
                      </h4>
                      <p className="text-xs text-slate-500">Connected</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Premium Ad */}
        <AdPlacement 
          type="premium" 
          className="mx-4 my-4"
          title="Upgrade to Shist Premium"
          description="Remove ads, unlimited lists, priority support"
          buttonText="Learn More"
        />
      </main>

      {/* Modals */}
      {selectedList && (
        <ListDetailModal 
          list={selectedList}
          isOpen={!!selectedList}
          onClose={() => setSelectedList(null)}
        />
      )}

      <CreateListModal 
        isOpen={showCreateList}
        onClose={() => setShowCreateList(false)}
      />

      <InviteModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
