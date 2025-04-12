import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { Loader2 } from "lucide-react";

export function ModeToggle() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    isAllowedMode, 
    showUpgradePrompt, 
    isLoading: isSubscriptionLoading 
  } = useSubscription();
  
  const [isAdvanced, setIsAdvanced] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Update the state when user data is loaded
  useEffect(() => {
    if (user) {
      setIsAdvanced(user.preferredMode === "advanced");
    }
  }, [user]);
  
  if (isAuthLoading || isSubscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-10">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const handleModeChange = async (checked: boolean) => {
    const newMode = checked ? "advanced" : "basic";
    
    if (newMode === "advanced" && !isAllowedMode("advanced")) {
      // Show upgrade prompt if advanced mode not allowed
      showUpgradePrompt("Advanced Mode");
      return;
    }
    
    try {
      setIsUpdating(true);
      const response = await apiRequest("POST", "/api/user/mode", { mode: newMode });
      const updatedUser = await response.json() as User;
      
      // Update the UI and invalidate the user query
      setIsAdvanced(updatedUser.preferredMode === "advanced");
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Mode Updated",
        description: `You are now using ${newMode === "advanced" ? "Advanced" : "Basic"} mode.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update mode. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="flex items-center space-x-2 py-2">
      <Switch
        id="mode-toggle"
        checked={isAdvanced}
        onCheckedChange={handleModeChange}
        disabled={isUpdating || !isAllowedMode("advanced")}
      />
      <Label htmlFor="mode-toggle" className="cursor-pointer select-none">
        {isAdvanced ? "Advanced Mode" : "Basic Mode"}
      </Label>
      {!isAllowedMode("advanced") && (
        <span className="text-xs text-muted-foreground ml-2">
          Upgrade to access Advanced Mode
        </span>
      )}
    </div>
  );
}