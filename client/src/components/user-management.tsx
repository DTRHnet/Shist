import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield, Crown, User, Star, Zap } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'guest' | 'user' | 'pro' | 'mod' | 'god';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const roleConfig = {
  guest: { label: 'Guest', icon: User, color: 'bg-gray-100 text-gray-800' },
  user: { label: 'User', icon: User, color: 'bg-blue-100 text-blue-800' },
  pro: { label: 'Pro', icon: Star, color: 'bg-purple-100 text-purple-800' },
  mod: { label: 'Moderator', icon: Shield, color: 'bg-orange-100 text-orange-800' },
  god: { label: 'Admin', icon: Crown, color: 'bg-red-100 text-red-800' },
};

export function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("/api/users", "PATCH", { userId, role });
    },
    onSuccess: () => {
      toast({
        title: "Role updated!",
        description: "User role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest("/api/users", "PATCH", { userId, isActive });
    },
    onSuccess: () => {
      toast({
        title: "Status updated!",
        description: "User status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleStatusChange = (userId: string, isActive: boolean) => {
    updateStatusMutation.mutate({ userId, isActive });
  };

  const getRoleIcon = (role: string) => {
    const Icon = roleConfig[role as keyof typeof roleConfig]?.icon || User;
    return <Icon size={16} />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="mx-auto h-8 w-8 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Loading users...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage user roles and permissions
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {users.length} users
        </Badge>
      </div>

      <div className="grid gap-4">
        {users.map((user) => {
          const roleInfo = roleConfig[user.role];
          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.firstName?.[0] || user.email?.[0] || 'U'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${roleInfo?.color}`}
                        >
                          {getRoleIcon(user.role)}
                          <span className="ml-1">{roleInfo?.label}</span>
                        </Badge>
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Role Selector */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Role:</span>
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleConfig).map(([role, config]) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center space-x-2">
                                {getRoleIcon(role)}
                                <span>{config.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Active:</span>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={(checked) => handleStatusChange(user.id, checked)}
                        disabled={updateStatusMutation.isPending}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                    {user.lastLoginAt && (
                      <span>Last login: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Users will appear here once they register.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
