import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ListDetailModal } from "@/components/lists/list-detail-modal";
import { CreateListModal } from "@/components/lists/create-list-modal";
import { Plus, Search, Filter } from "lucide-react";
import type { ListWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Lists() {
  const [selectedList, setSelectedList] = useState<ListWithDetails | null>(null);
  const [showCreateList, setShowCreateList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPrivacy, setFilterPrivacy] = useState<"all" | "public" | "private">("all");

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["/api/lists"],
  });

  const filteredLists = lists.filter((list: ListWithDetails) => {
    const matchesSearch = list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         list.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterPrivacy === "all" || 
                         (filterPrivacy === "public" && list.isPublic) ||
                         (filterPrivacy === "private" && !list.isPublic);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">All Lists</h1>
          <Button 
            size="sm"
            onClick={() => setShowCreateList(true)}
            data-testid="button-create-list"
          >
            <Plus className="mr-1" size={16} />
            New
          </Button>
        </div>
      </header>

      <main className="p-4">
        {/* Search and Filter */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Search lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-lists"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={filterPrivacy === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPrivacy("all")}
              data-testid="button-filter-all"
            >
              All
            </Button>
            <Button
              variant={filterPrivacy === "public" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPrivacy("public")}
              data-testid="button-filter-public"
            >
              Public
            </Button>
            <Button
              variant={filterPrivacy === "private" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPrivacy("private")}
              data-testid="button-filter-private"
            >
              Private
            </Button>
          </div>
        </div>

        {/* Lists Grid */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLists.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Filter className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="font-medium text-gray-900 mb-2">
                {searchQuery || filterPrivacy !== "all" ? "No lists found" : "No lists yet"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterPrivacy !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Create your first list to get started"
                }
              </p>
              {!searchQuery && filterPrivacy === "all" && (
                <Button onClick={() => setShowCreateList(true)}>
                  Create List
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLists.map((list: ListWithDetails) => (
              <Card 
                key={list.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedList(list)}
                data-testid={`card-list-${list.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h3 className="font-medium text-gray-900 mr-2" data-testid={`text-list-name-${list.id}`}>
                          {list.name}
                        </h3>
                        <Badge variant={list.isPublic ? "default" : "secondary"} className="text-xs">
                          {list.isPublic ? "Public" : "Private"}
                        </Badge>
                      </div>
                      {list.description && (
                        <p className="text-sm text-gray-600 mb-2">{list.description}</p>
                      )}
                      <p className="text-sm text-slate-500">
                        Created by {list.creator.firstName || list.creator.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{list.itemCount} items</span>
                    <span>
                      Updated {formatDistanceToNow(new Date(list.updatedAt!))} ago
                    </span>
                  </div>

                  {list.lastItem && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <span className="text-gray-600">Latest: </span>
                      <span className="font-medium">"{list.lastItem.content}"</span>
                      <span className="text-slate-500"> by {list.lastItem.addedBy.firstName || list.lastItem.addedBy.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
    </div>
  );
}
