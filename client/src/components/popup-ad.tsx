import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PopupAdProps {
  isOpen: boolean;
  onClose: () => void;
}

const AD_MESSAGES = [
  {
    title: "🌟 Upgrade to Premium!",
    description: "Get unlimited lists, priority sync, and no ads for just $2.99/month",
    cta: "Try Premium Free"
  },
  {
    title: "📱 Love Shist?",
    description: "Join thousands creating shared lists. Upgrade for advanced features!",
    cta: "Go Premium"
  },
  {
    title: "⚡ Boost Your Lists",
    description: "Premium users get faster sync, more storage, and exclusive features",
    cta: "Upgrade Now"
  }
];

export function PopupAd({ isOpen, onClose }: PopupAdProps) {
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);
  const [currentAd] = useState(() => AD_MESSAGES[Math.floor(Math.random() * AD_MESSAGES.length)]);

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(5);
    setCanClose(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleClose = () => {
    if (canClose) {
      onClose();
    }
  };

  const handlePremiumClick = () => {
    // In a real app, this would navigate to payment/premium page
    console.log("Premium upgrade clicked");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md mx-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200"
        data-testid="popup-ad-dialog"
        aria-describedby="ad-description"
      >
        <VisuallyHidden>
          <DialogTitle>Premium Upgrade Offer</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col items-center text-center space-y-4">
          {canClose && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0"
              onClick={handleClose}
              data-testid="button-close-ad"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="text-2xl mb-2">{currentAd.title}</div>
          
          <p id="ad-description" className="text-gray-600 text-sm leading-relaxed">
            {currentAd.description}
          </p>

          <div className="flex flex-col gap-3 w-full mt-4">
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={handlePremiumClick}
              data-testid="button-premium-upgrade"
            >
              {currentAd.cta}
            </Button>
            
            {canClose ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClose}
                data-testid="button-maybe-later"
              >
                Maybe Later
              </Button>
            ) : (
              <div className="text-xs text-gray-500" data-testid="text-countdown">
                Can close in {countdown}s
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}