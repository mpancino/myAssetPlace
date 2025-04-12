import { createContext, ReactNode, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  SubscriptionPlan, 
  UserSubscription 
} from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  
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
      // Parse the allowed interface modes
      let allowedModes = ["basic"]; // Default to basic mode only
      
      if (userSubscription.plan.allowedInterfaceModes) {
        try {
          // When it's stored as a JSON string
          if (typeof userSubscription.plan.allowedInterfaceModes === 'string') {
            allowedModes = JSON.parse(userSubscription.plan.allowedInterfaceModes);
          } 
          // When it's already an array (sometimes happens with ORMs)
          else if (Array.isArray(userSubscription.plan.allowedInterfaceModes)) {
            allowedModes = userSubscription.plan.allowedInterfaceModes;
          }
        } catch (error) {
          console.error("Error parsing allowed interface modes:", error);
          // Keep the default
        }
      }
      
      return allowedModes.includes("advanced");
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

  // Check if user can add more assets based on their subscription limit
  const canAddMoreAssets = (): boolean => {
    if (!userSubscription) return false;
    
    // If there's no limit set, user can add unlimited assets
    if (!userSubscription.plan.maxAssetsPerClass) return true;
    
    // Note: In a complete implementation, this function would:
    // 1. Take an assetClassId parameter
    // 2. Query the current asset count for that specific class
    // 3. Compare against the plan limit
    // 4. Return false if the class exceeds its limit
    
    // For now, we return true since the asset count check will be
    // implemented more thoroughly when the asset classes are built out
    // This allows users to add assets during development
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
    
    // Parse allowed APIs
    let allowedApis: string[] = [];
    
    try {
      // Handle different data types
      if (typeof userSubscription.plan.allowedApis === 'string') {
        allowedApis = JSON.parse(userSubscription.plan.allowedApis);
      } else if (Array.isArray(userSubscription.plan.allowedApis)) {
        allowedApis = userSubscription.plan.allowedApis;
      }
      
      return allowedApis.includes(apiType);
    } catch (error) {
      console.error("Error parsing API access limits:", error);
      return false; // Default to restricting if parsing fails
    }
  };

  // This will be exposed so components can trigger the upgrade modal
  const showUpgradePrompt = (feature: string) => {
    try {
      // Use the upgrade prompt manager
      // In a real implementation, we would have an import at the top
      // But for now, we'll work with window-level events to avoid circular dependencies
      const event = new CustomEvent('show-upgrade-prompt', { detail: { feature } });
      window.dispatchEvent(event);
      
      // Also show a toast to give immediate feedback
      toast({
        title: "Upgrade Required",
        description: `Your current plan doesn't include access to ${feature}. Please upgrade to unlock this feature.`,
      });
    } catch (error) {
      console.error("Failed to trigger upgrade prompt:", error);
      // Fallback to toast only
      toast({
        title: "Subscription Required",
        description: `Your current plan doesn't include access to ${feature}.`,
        variant: "destructive",
      });
    }
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