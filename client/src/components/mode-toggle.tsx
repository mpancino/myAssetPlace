import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface ModeToggleProps {
  className?: string;
}

export default function ModeToggle({ className }: ModeToggleProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAllowedMode } = useSubscription();
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Set initial state based on user preference
  useEffect(() => {
    if (user) {
      setIsAdvanced(user.preferredMode === "advanced");
    }
  }, [user]);
  
  // Handle mode toggle
  const handleToggleMode = async () => {
    if (!user) return;
    
    const nextMode = isAdvanced ? "basic" : "advanced";
    
    // Check if the mode switch is allowed by the subscription
    if (!isAllowedMode(nextMode)) {
      toast({
        title: "Subscription Required",
        description: `Your current plan doesn't include access to ${nextMode} mode.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Update user preferences in the API
      const result = await apiRequest("PUT", "/api/user/profile", { 
        preferredMode: nextMode 
      });
      
      if (result.ok) {
        const updatedUser = await result.json() as User;
        
        // Update local state
        setIsAdvanced(updatedUser.preferredMode === "advanced");
        
        // Invalidate user data in the query cache
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        toast({
          title: "Mode Updated",
          description: `You are now using ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)} Mode.`,
        });
      } else {
        throw new Error("Failed to update mode");
      }
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
    <div className={`flex items-center space-x-2 ${className || ""}`}>
      <Switch
        id="mode-toggle"
        checked={isAdvanced}
        onCheckedChange={handleToggleMode}
        disabled={isUpdating || !isAllowedMode("advanced")}
      />
      <Label htmlFor="mode-toggle" className="flex items-center gap-2">
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
        {isAdvanced ? "Advanced Mode" : "Basic Mode"}
      </Label>
    </div>
  );
}