import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionPlan } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { Check, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export function UpgradeModal({ 
  isOpen, 
  onClose,
  featureName 
}: UpgradeModalProps) {
  const { toast } = useToast();
  const { userSubscription } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // Fetch available subscription plans
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
    queryFn: getQueryFn(),
  });
  
  // Get plans better than current
  const betterPlans = plans?.filter(plan => 
    !userSubscription || plan.id !== userSubscription.subscriptionPlanId
  ) || [];
  
  // Handle plan upgrade
  const handleUpgrade = async (planId: number) => {
    setIsUpgrading(true);
    
    try {
      // Call API to upgrade subscription
      await apiRequest("POST", "/api/user/subscription/upgrade", { planId });
      
      // Invalidate subscription data
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
      
      toast({
        title: "Subscription Updated",
        description: "Your subscription has been successfully updated.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade Your Subscription
          </DialogTitle>
          <DialogDescription>
            Upgrade your plan to access {featureName} and more features.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-4">Loading plans...</div>
        ) : (
          <div className="grid gap-4 mt-4">
            {betterPlans.length > 0 ? (
              betterPlans.map((plan) => (
                <div 
                  key={plan.id} 
                  className="border rounded-md p-4 flex justify-between items-center hover:border-primary hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                    <ul className="text-sm mt-2 space-y-1">
                      {/* Show interface modes */}
                      {plan.allowedInterfaceModes && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          {JSON.parse(String(plan.allowedInterfaceModes)).includes("advanced") 
                            ? "Advanced Mode" 
                            : "Basic Mode"}
                        </li>
                      )}
                      {/* Show asset limits */}
                      {plan.maxAssetsPerClass && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Up to {plan.maxAssetsPerClass} assets per class
                        </li>
                      )}
                      {/* Show projection years */}
                      {plan.maxProjectionYears && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          {plan.maxProjectionYears} year projections
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      ${Number(plan.price).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {plan.interval}
                    </div>
                    <Button 
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? "Upgrading..." : "Select Plan"}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-4">
                No upgrade plans available.
              </p>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}