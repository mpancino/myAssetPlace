import { useState, createContext, useContext, ReactNode } from "react";
import { UpgradeModal } from "@/components/upgrade-modal";

interface UpgradePromptContextType {
  showUpgradePrompt: (featureName: string) => void;
}

const UpgradePromptContext = createContext<UpgradePromptContextType | null>(null);

export function UpgradePromptProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [featureName, setFeatureName] = useState("");
  
  const showUpgradePrompt = (feature: string) => {
    setFeatureName(feature);
    setIsModalOpen(true);
  };
  
  return (
    <UpgradePromptContext.Provider value={{ showUpgradePrompt }}>
      {children}
      <UpgradeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        featureName={featureName}
      />
    </UpgradePromptContext.Provider>
  );
}

export function useUpgradePrompt() {
  const context = useContext(UpgradePromptContext);
  if (!context) {
    throw new Error("useUpgradePrompt must be used within an UpgradePromptProvider");
  }
  return context;
}