import { useSubscription } from "@/hooks/use-subscription";

export function useProtectedFeature() {
  const { 
    isAllowedMode, 
    isAllowedAssetClass, 
    isAllowedHoldingType,
    canAddMoreAssets,
    isAllowedApiAccess,
    showUpgradePrompt
  } = useSubscription();
  
  const checkFeatureAccess = (feature: {
    type: "mode" | "assetClass" | "holdingType" | "assetLimit" | "apiAccess";
    id?: number;
    mode?: "basic" | "advanced";
    apiType?: string;
  }): boolean => {
    switch (feature.type) {
      case "mode":
        return isAllowedMode(feature.mode as "basic" | "advanced");
      case "assetClass":
        return isAllowedAssetClass(feature.id as number);
      case "holdingType":
        return isAllowedHoldingType(feature.id as number);
      case "assetLimit":
        return canAddMoreAssets();
      case "apiAccess":
        return isAllowedApiAccess(feature.apiType as string);
      default:
        return false;
    }
  };
  
  return {
    checkFeatureAccess,
    showUpgradePrompt
  };
}