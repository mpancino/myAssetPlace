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
      try {
        // Parse the allowed interface modes
        const allowedModes = userSubscription.plan.allowedInterfaceModes 
          ? JSON.parse(String(userSubscription.plan.allowedInterfaceModes))
          : ["basic"];
        
        return allowedModes.includes("advanced");
      } catch (error) {
        console.error("Error parsing allowed interface modes:", error);
        return false; // Default to restricting if parsing fails
      }
    }
  };

  // Check if a specific asset class is allowed by subscription
  const isAllowedAssetClass = (assetClassId: number): boolean => {
    if (!userSubscription) return false;
    
    // Check if there's a max asset classes limit
    if (!userSubscription.plan.maxAssetClasses) return true; // No limit
    
    try {
      // For now, we'll simply check if the max is greater than 0
      // In a more complete implementation, we would store allowed asset class IDs
      return userSubscription.plan.maxAssetClasses > 0;
    } catch (error) {
      console.error("Error checking asset class limits:", error);
      return true; // Default to allowing if check fails
    }
  };

  // Similar checks for holding types
  const isAllowedHoldingType = (holdingTypeId: number): boolean => {
    if (!userSubscription) return false;
    
    // Check if there's a max holding types limit
    if (!userSubscription.plan.maxAssetHoldingTypes) return true; // No limit
    
    try {
      // For now, we'll simply check if the max is greater than 0
      // In a more complete implementation, we would store allowed holding type IDs
      return userSubscription.plan.maxAssetHoldingTypes > 0;
    } catch (error) {
      console.error("Error checking holding type limits:", error);
      return true; // Default to allowing if check fails
    }
  };

  // Check if user can add more assets based on their limit
  const canAddMoreAssets = (): boolean => {
    if (!userSubscription) return false;
    
    // This will query the current asset count and compare against the plan limit
    // in a future implementation
    // For now, return true
    return true;
  };

  // Get maximum projection years allowed
  const getMaxProjectionYears = (): number => {
    if (!userSubscription) return 1; // Most restrictive default
    
    return userSubscription.plan.maxProjectionYears || 5; // Default if not specified
  };

  // Check if a specific API access is allowed
  const isAllowedApiAccess = (apiType: string): boolean => {
    if (!userSubscription) return false;
    
    if (!userSubscription.plan.allowedApis) return false;
    
    try {
      const allowedApis = JSON.parse(String(userSubscription.plan.allowedApis));
      return allowedApis.includes(apiType);
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