import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
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

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative">
      <Switch>
        {isLoading || !isAuthenticated ? (
          <>
            {isLocalDev ? (
              <Route path="/" component={LocalLogin} />
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
