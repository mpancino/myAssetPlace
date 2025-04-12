import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  SubscriptionPlan, 
  UserSubscription 
} from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";
import { useToast } from "./use-toast";

type SubscriptionContextType = {
  userSubscription: (UserSubscription & { plan: SubscriptionPlan }) | null;
  isLoading: boolean;
  isAllowedMode: (mode: 'basic' | 'advanced') => boolean;
  isAllowedAssetClass: (assetClassId: number) => boolean;
  isAllowedHoldingType: (holdingTypeId: number) => boolean;
  canAddMoreAssets: () => boolean;
  getMaxProjectionYears: () => number;
  isAllowedApiAccess: (apiType: string) => boolean;
  showUpgradePrompt: (feature: string) => void;
};

export const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: userSubscription,
    isLoading,
  } = useQuery<(UserSubscription & { plan: SubscriptionPlan }) | null>({
    queryKey: ["/api/user/subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Check if a specific interface mode is allowed
  const isAllowedMode = (mode: 'basic' | 'advanced'): boolean => {
    if (!userSubscription) return mode === 'basic'; // Only allow basic mode with no subscription
    
    if (mode === 'basic') {
      // Basic mode is always allowed if there's any subscription
      return true;
    } else {
      // Advanced mode depends on the plan
      return userSubscription.plan.allowAdvancedMode === true;
    }
  };

  // Check if a specific asset class is allowed by subscription
  const isAllowedAssetClass = (assetClassId: number): boolean => {
    if (!userSubscription) return false;
    
    // If no limitations specified, allow all
    if (!userSubscription.plan.assetClassLimits) return true;
    
    try {
      // Parse the JSON limitations
      const limits = JSON.parse(userSubscription.plan.assetClassLimits);
      // If the asset class is listed in allowed IDs or if limitations is empty, allow
      return !limits.length || limits.includes(assetClassId);
    } catch (error) {
      console.error("Error parsing asset class limits:", error);
      return true; // Default to allowing if parsing fails
    }
  };

  // Similar checks for holding types
  const isAllowedHoldingType = (holdingTypeId: number): boolean => {
    if (!userSubscription) return false;
    
    if (!userSubscription.plan.holdingTypeLimits) return true;
    
    try {
      const limits = JSON.parse(userSubscription.plan.holdingTypeLimits);
      return !limits.length || limits.includes(holdingTypeId);
    } catch (error) {
      console.error("Error parsing holding type limits:", error);
      return true; // Default to allowing if parsing fails
    }
  };

  // Check if user can add more assets based on their limit
  const canAddMoreAssets = (): boolean => {
    if (!userSubscription) return false;
    
    // This would usually query the current asset count and compare
    // For now, return true; implementation will need an asset count query
    return true;
  };

  // Get maximum projection years allowed
  const getMaxProjectionYears = (): number => {
    if (!userSubscription) return 1; // Most restrictive default
    
    return userSubscription.plan.projectionYearLimit || 5; // Default if not specified
  };

  // Check if a specific API access is allowed
  const isAllowedApiAccess = (apiType: string): boolean => {
    if (!userSubscription) return false;
    
    if (!userSubscription.plan.apiAccessLimits) return false;
    
    try {
      const limits = JSON.parse(userSubscription.plan.apiAccessLimits);
      return limits.includes(apiType);
    } catch (error) {
      console.error("Error parsing API access limits:", error);
      return false; // Default to restricting if parsing fails
    }
  };

  // Show upgrade prompt for a specific feature
  const showUpgradePrompt = (feature: string) => {
    // For now, just show a toast with upgrade message
    // Later this will connect to the upgrade modal
    toast({
      title: "Upgrade Required",
      description: `Your current plan doesn't include access to ${feature}. Please upgrade to unlock this feature.`,
      variant: "destructive",
    });
  };

  return (
    <SubscriptionContext.Provider
      value={{
        userSubscription: userSubscription || null,
        isLoading,
        isAllowedMode,
        isAllowedAssetClass,
        isAllowedHoldingType,
        canAddMoreAssets,
        getMaxProjectionYears,
        isAllowedApiAccess,
        showUpgradePrompt,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}