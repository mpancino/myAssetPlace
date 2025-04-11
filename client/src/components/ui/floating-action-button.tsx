import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";

export default function FloatingActionButton() {
  const isMobile = useIsMobile();
  const [_, navigate] = useLocation();

  const handleAddAsset = () => {
    navigate("/add-asset");
  };

  return (
    <div className={`fixed z-50 ${isMobile ? 'right-4 bottom-4' : 'right-6 bottom-6'}`}>
      <Button 
        size="icon" 
        className={`${isMobile ? 'h-12 w-12' : 'h-14 w-14'} rounded-full shadow-lg`}
        onClick={handleAddAsset}
      >
        <Plus className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
        <span className="sr-only">Add Asset</span>
      </Button>
    </div>
  );
}
