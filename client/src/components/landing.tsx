import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List, Users, Share2, Smartphone } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-500">
      {/* Hero Section */}
      <div className="px-6 py-12 text-white text-center">
        <div className="mb-8">
          <List className="mx-auto text-6xl mb-6 opacity-90" size={80} />
          <h1 className="text-4xl font-bold mb-3">Shist</h1>
          <p className="text-xl opacity-90 mb-2">Shared Lists Made Simple</p>
          <p className="text-sm opacity-80 leading-relaxed max-w-md mx-auto">
            Never lose those fleeting moments again. Share lists with friends and family instantly.
          </p>
        </div>
        
        <Button 
          onClick={handleLogin}
          size="lg"
          className="bg-white text-indigo-600 hover:bg-gray-100 font-semibold px-8 py-3 text-lg"
          data-testid="button-login"
        >
          Get Started
        </Button>
      </div>

      {/* Features Section */}
      <div className="px-6 py-8 bg-white/10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Why Choose Shist?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
              <CardHeader>
                <Smartphone className="w-8 h-8 mb-2" />
                <CardTitle>Mobile First</CardTitle>
                <CardDescription className="text-white/80">
                  Designed for quick additions on the go
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">
                  Add items instantly when inspiration strikes, whether you're shopping, driving, or just relaxing.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
              <CardHeader>
                <Users className="w-8 h-8 mb-2" />
                <CardTitle>Real-time Collaboration</CardTitle>
                <CardDescription className="text-white/80">
                  Share lists with friends and family
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">
                  Everyone stays synchronized. See updates instantly when someone adds to your shared lists.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
              <CardHeader>
                <Share2 className="w-8 h-8 mb-2" />
                <CardTitle>Organized Sharing</CardTitle>
                <CardDescription className="text-white/80">
                  No more lost messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">
                  Keep your ideas organized in dedicated lists instead of scattered across chat messages.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
              <CardHeader>
                <List className="w-8 h-8 mb-2" />
                <CardTitle>Smart Lists</CardTitle>
                <CardDescription className="text-white/80">
                  Movies, music, gifts, and more
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">
                  Create themed lists for different purposes and never forget those perfect recommendations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-12 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">Ready to get organized?</h3>
        <p className="text-white/80 mb-6 max-w-md mx-auto">
          Join thousands of users who never lose track of their ideas again.
        </p>
        <Button 
          onClick={handleLogin}
          size="lg"
          variant="outline"
          className="bg-transparent border-white text-white hover:bg-white hover:text-indigo-600 font-semibold px-8 py-3"
          data-testid="button-signup"
        >
          Start Sharing Lists Today
        </Button>
      </div>
    </div>
  );
}
