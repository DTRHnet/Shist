import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMonetization } from "@/hooks/useMonetization";
import { UserManagement } from "@/components/user-management";
import type { User } from "@shared/schema";
import { User as UserIcon, Crown, LogOut, Shield, Bell, Smartphone, Star, Gift, Users } from "lucide-react";

export default function Settings() {
  const { user } = useAuth() as { user: User | undefined };
  const { isPremium, upgradeToPremium, resetPremium, adCount } = useMonetization();
  
  // Check if user has admin permissions
  const isAdmin = user?.role === 'god' || user?.role === 'mod';

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handlePremiumToggle = () => {
    if (isPremium) {
      resetPremium();
    } else {
      upgradeToPremium();
    }
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </header>

      <main className="p-4 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="mr-2" size={20} />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white font-medium text-xl mr-4">
                {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email}
                </h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="mr-2" size={20} />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {isPremium ? "Premium Plan" : "Free Plan"}
                </h3>
                <p className="text-sm text-gray-500">
                  {isPremium ? "All premium features unlocked" : "Basic features included"}
                </p>
                {!isPremium && adCount > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {adCount} ads shown so far
                  </p>
                )}
              </div>
              <Badge variant={isPremium ? "default" : "outline"} className={isPremium ? "bg-gradient-to-r from-yellow-400 to-orange-500" : ""}>
                {isPremium ? (
                  <><Star className="mr-1" size={12} />Premium</>
                ) : (
                  "Free"
                )}
              </Badge>
            </div>
            
            {!isPremium ? (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-100">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Gift className="mr-2" size={16} />
                  Upgrade to Premium
                </h4>
                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                  <li>• Remove all advertisements</li>
                  <li>• Unlimited lists and connections</li>
                  <li>• Priority real-time sync</li>
                  <li>• Advanced collaboration features</li>
                  <li>• Premium customer support</li>
                </ul>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-gray-900">$2.99/month</span>
                  <span className="text-sm text-gray-500 line-through">$4.99</span>
                </div>
                <Button 
                  size="sm" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={handlePremiumToggle}
                  data-testid="button-upgrade-premium"
                >
                  <Star className="mr-2" size={16} />
                  Upgrade Now - 40% Off!
                </Button>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Crown className="mr-2" size={16} />
                  Premium Active
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Enjoy ad-free experience and all premium features!
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full"
                  onClick={handlePremiumToggle}
                  data-testid="button-reset-premium"
                >
                  Simulate Free Account (Demo)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="mr-2" size={20} />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Push Notifications</h4>
                <p className="text-sm text-gray-500">Get notified when lists are updated</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Dark Mode</h4>
                <p className="text-sm text-gray-500">Switch to dark theme</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2" size={20} />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              <Bell className="mr-2" size={16} />
              Notification Settings
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Shield className="mr-2" size={16} />
              Privacy Settings
            </Button>
          </CardContent>
        </Card>

        {/* Admin Panel */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2" size={20} />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        )}

        {/* Account Actions */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="mr-2" size={16} />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-sm text-gray-500 pt-4">
          <p>Shist v1.0.0</p>
          <p className="mt-1">Made with ❤️ for better organization</p>
        </div>
      </main>
    </div>
  );
}
