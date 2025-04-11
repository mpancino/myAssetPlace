import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ModeToggleProps {
  currentMode: string;
  allowedModes: string[];
}

export default function ModeToggle({ currentMode, allowedModes }: ModeToggleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const canToggle = allowedModes.includes("basic") && allowedModes.includes("advanced");
  const nextMode = currentMode === "basic" ? "advanced" : "basic";
  
  const toggleModeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/user/profile", {
        preferredMode: nextMode
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: `Mode Changed`,
        description: `You are now using ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)} Mode.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to change mode",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleToggleMode = () => {
    if (!canToggle) {
      toast({
        title: "Cannot change mode",
        description: `Your subscription doesn't allow access to ${nextMode} mode.`,
        variant: "destructive",
      });
      return;
    }
    
    toggleModeMutation.mutate();
  };

  // Button content based on current mode
  const buttonContent = (
    <>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="-ml-1 mr-2 h-5 w-5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
        />
      </svg>
      {currentMode === "basic" ? "Basic Mode" : "Advanced Mode"}
    </>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleToggleMode}
            disabled={!canToggle || toggleModeMutation.isPending}
          >
            {toggleModeMutation.isPending ? "Changing..." : buttonContent}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {canToggle 
            ? `Toggle to ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)} Mode` 
            : `Your subscription does not allow ${nextMode} mode`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
