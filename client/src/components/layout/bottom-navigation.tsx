import { Link, useLocation } from "wouter";
import { Home, List, Users, Settings, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/lists", icon: List, label: "Lists" },
    { path: "/connections", icon: Users, label: "People" },
    { path: "/invitations", icon: Mail, label: "Invites" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          
          return (
            <Link key={path} href={path}>
              <button 
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
                  isActive 
                    ? "text-indigo-500" 
                    : "text-slate-500 hover:text-gray-700"
                )}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon size={20} className="mb-1" />
                <span className="text-xs">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
