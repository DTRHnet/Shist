import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdPlacementProps {
  type: "banner" | "premium";
  className?: string;
  content?: string;
  title?: string;
  description?: string;
  buttonText?: string;
}

export function AdPlacement({ 
  type, 
  className, 
  content,
  title,
  description,
  buttonText
}: AdPlacementProps) {
  if (type === "banner") {
    return (
      <Card className={cn("bg-yellow-50 border-yellow-200", className)}>
        <CardContent className="p-3 text-center">
          <div className="text-xs text-yellow-600 mb-1">Sponsored</div>
          <div className="text-sm text-yellow-800">
            {content || "Ad content placeholder - 300x100"}
          </div>
          <div className="text-xs text-yellow-600 mt-1">Non-intrusive ad placement</div>
        </CardContent>
      </Card>
    );
  }

  if (type === "premium") {
    return (
      <Card className={cn("bg-blue-50 border-blue-200", className)}>
        <CardContent className="p-4 text-center">
          <div className="text-xs text-blue-600 mb-2">Premium Feature</div>
          <div className="text-sm font-medium text-blue-800 mb-1">
            {title || "Upgrade to Shist Premium"}
          </div>
          <div className="text-xs text-blue-600 mb-3">
            {description || "Remove ads, unlimited lists, priority support"}
          </div>
          <Button 
            size="sm" 
            className="bg-blue-600 text-white hover:bg-blue-700"
            data-testid="button-premium-upgrade"
          >
            {buttonText || "Learn More"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
