import { ReactNode } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { ArrowUpCircle, Sparkles } from "lucide-react";

/**
 * Types of feature protection based on subscription limitations:
 * - mode: Limits access to basic/advanced interface modes
 * - assetClass: Limits access to specific asset classes
 * - holdingType: Limits access to specific holding types (e.g., trust accounts)
 * - assetLimit: Prevents adding more assets if the plan's limit is reached
 * - apiAccess: Controls access to external APIs (property valuation, stock data, etc.)
 */
type ProtectionType = 
  | { type: "mode"; mode: "basic" | "advanced" }
  | { type: "assetClass"; id: number }
  | { type: "holdingType"; id: number }
  | { type: "assetLimit" }
  | { type: "apiAccess"; apiType: string };

interface ProtectedFeatureProps {
  protection: ProtectionType;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedFeature({ 
  protection, 
  children, 
  fallback 
}: ProtectedFeatureProps) {
  const { 
    isAllowedMode, 
    isAllowedAssetClass, 
    isAllowedHoldingType,
    canAddMoreAssets,
    isAllowedApiAccess,
    showUpgradePrompt
  } = useSubscription();
  
  // Check if the feature is allowed based on protection type
  const isAllowed = () => {
    switch (protection.type) {
      case "mode":
        return isAllowedMode(protection.mode);
      case "assetClass":
        return isAllowedAssetClass(protection.id);
      case "holdingType":
        return isAllowedHoldingType(protection.id);
      case "assetLimit":
        return canAddMoreAssets();
      case "apiAccess":
        return isAllowedApiAccess(protection.apiType);
      default:
        return false;
    }
  };
  
  // Get feature name for the upgrade prompt
  const getFeatureName = () => {
    switch (protection.type) {
      case "mode":
        return `${protection.mode === "advanced" ? "Advanced" : "Basic"} Mode`;
      case "assetClass":
        return "This Asset Class";
      case "holdingType":
        return "This Holding Type";
      case "assetLimit":
        return "Adding More Assets";
      case "apiAccess":
        return `${protection.apiType} API Access`;
      default:
        return "This Feature";
    }
  };
  
  // If allowed, render the children
  if (isAllowed()) {
    return <>{children}</>;
  }
  
  // If not allowed and fallback provided, render fallback
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Default upgrade prompt UI
  return (
    <Card className="w-full max-w-md mx-auto border-dashed border-2 bg-muted/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpCircle className="h-5 w-5 text-primary" />
          Upgrade Required
        </CardTitle>
        <CardDescription>
          This feature is not available on your current subscription plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Upgrade your subscription to access {getFeatureName()}.
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => showUpgradePrompt(getFeatureName())}
          className="w-full"
        >
          View Upgrade Options
        </Button>
      </CardFooter>
    </Card>
  );
}