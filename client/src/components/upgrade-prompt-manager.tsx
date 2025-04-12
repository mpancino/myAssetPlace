import { useState, useEffect } from "react";
import { UpgradeModal } from "@/components/upgrade-modal";

/**
 * UpgradePromptManager listens for custom events to show the upgrade modal.
 * This component should be placed at the root level of the app to avoid circular dependencies
 * with the subscription context.
 */
export function UpgradePromptManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [featureName, setFeatureName] = useState("");
  
  useEffect(() => {
    // Listen for the custom event to show the upgrade modal
    const handleShowUpgradePrompt = (event: Event) => {
      const customEvent = event as CustomEvent<{feature: string}>;
      setFeatureName(customEvent.detail.feature);
      setIsModalOpen(true);
    };
    
    // Add event listener
    window.addEventListener('show-upgrade-prompt', handleShowUpgradePrompt);
    
    // Clean up
    return () => {
      window.removeEventListener('show-upgrade-prompt', handleShowUpgradePrompt);
    };
  }, []);
  
  return (
    <UpgradeModal 
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      featureName={featureName}
    />
  );
}