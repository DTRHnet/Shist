import { useState, useEffect } from "react";

interface MonetizationState {
  showAd: boolean;
  isPremium: boolean;
  adCount: number;
  lastAdShown: number;
}

const AD_INTERVAL = 3 * 60 * 1000; // Show ad every 3 minutes of usage
const AD_STORAGE_KEY = 'shist_monetization';

export function useMonetization() {
  const [state, setState] = useState<MonetizationState>(() => {
    const stored = localStorage.getItem(AD_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to default
      }
    }
    return {
      showAd: false,
      isPremium: false,
      adCount: 0,
      lastAdShown: 0,
    };
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(AD_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Set up ad timer for free users
  useEffect(() => {
    if (state.isPremium) return;

    const now = Date.now();
    const timeSinceLastAd = now - state.lastAdShown;
    
    // If enough time has passed or this is the first visit, show ad soon
    // First ad appears after 30 seconds, then every 3 minutes
    const initialDelay = timeSinceLastAd >= AD_INTERVAL ? 30000 : Math.max(30000, AD_INTERVAL - timeSinceLastAd);

    const timer = setTimeout(() => {
      setState(prev => ({
        ...prev,
        showAd: true,
        lastAdShown: now,
      }));

      // Set up recurring ads
      const recurringTimer = setInterval(() => {
        setState(prev => ({
          ...prev,
          showAd: true,
          lastAdShown: Date.now(),
        }));
      }, AD_INTERVAL);

      return () => clearInterval(recurringTimer);
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [state.isPremium, state.lastAdShown]);

  const closeAd = () => {
    setState(prev => ({
      ...prev,
      showAd: false,
      adCount: prev.adCount + 1,
    }));
  };

  const upgradeToPremium = () => {
    setState(prev => ({
      ...prev,
      isPremium: true,
      showAd: false,
    }));
  };

  const resetPremium = () => {
    setState(prev => ({
      ...prev,
      isPremium: false,
      lastAdShown: 0,
    }));
  };

  return {
    showAd: state.showAd,
    isPremium: state.isPremium,
    adCount: state.adCount,
    closeAd,
    upgradeToPremium,
    resetPremium,
  };
}