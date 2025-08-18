import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useMonetization } from "@/hooks/useMonetization";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { PopupAd } from "@/components/monetization/popup-ad";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Lists from "@/pages/lists";
import Connections from "@/pages/connections";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import LocalLogin from "@/pages/local-login";

// Check if we're in local development mode
const isLocalDev = !import.meta.env.VITE_REPL_ID || import.meta.env.VITE_LOCAL_DEV === 'true';

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { showAd, closeAd, isPremium } = useMonetization();

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative">
      <Switch>
        {isLoading ? (
          <Route path="/">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          </Route>
        ) : !isAuthenticated ? (
          <>
            {isLocalDev ? (
              <Route path="/">
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Auto-login in progress...</p>
                  </div>
                </div>
              </Route>
            ) : (
              <Route path="/" component={Landing} />
            )}
          </>
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/lists" component={Lists} />
            <Route path="/connections" component={Connections} />
            <Route path="/settings" component={Settings} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
      
      {isAuthenticated && !isLoading && <BottomNavigation />}
      
      {/* Monetization - Popup ads for free users only */}
      {!isPremium && <PopupAd isOpen={showAd} onClose={closeAd} />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
