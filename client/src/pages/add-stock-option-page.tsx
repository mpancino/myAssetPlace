import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetClass, AssetHoldingType } from "@shared/schema";
import { StockOptionForm } from "@/components/stock-options/stock-option-form";
import MainLayout from "@/components/layout/main-layout";
import { Loader2 } from "lucide-react";

export default function AddStockOptionPage() {
  console.log("PAGE LOADED: AddStockOptionPage - for Stock Options with vesting schedules");
  
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("classId");
  
  console.log("URL classId param:", classId);

  // Fetch asset classes
  const { data: assetClasses = [], isLoading: assetClassesLoading } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });

  // Fetch asset holding types
  const { data: holdingTypes = [], isLoading: holdingTypesLoading } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
  });

  // Fetch specific asset class if classId is provided
  const { data: selectedClass, isLoading: selectedClassLoading } = useQuery<AssetClass>({
    queryKey: ["/api/asset-classes", parseInt(classId || "0")],
    enabled: !!classId,
  });

  // Handle cancel button
  const handleCancel = () => {
    // If we have a class ID, navigate back to that asset class page
    if (classId) {
      setLocation(`/asset-classes/${classId}`);
    } else {
      // Otherwise, try to find the stock options asset class
      const stockOptionsClass = assetClasses.find(c => 
        c.name.toLowerCase().includes("stock option"));
        
      if (stockOptionsClass) {
        setLocation(`/asset-classes/${stockOptionsClass.id}`);
      } else {
        // Default fallback
        setLocation("/dashboard");
      }
    }
  };

  // Check if data is loading
  const isLoading = assetClassesLoading || holdingTypesLoading || 
    (!!classId && selectedClassLoading);
    
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Find stock options asset class if not using classId
  const stockOptionsClass = selectedClass || 
    assetClasses.find(c => c.name.toLowerCase().includes("stock option") || c.name.toLowerCase().includes("options"));
    
  // Prepare default values
  const defaultValues = {
    assetClassId: stockOptionsClass?.id,
    // Other defaults will be handled by the form component
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancel} 
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <h1 className="text-2xl font-bold">Add Stock Options</h1>
        </div>
        
        <StockOptionForm
          assetClasses={assetClasses}
          holdingTypes={holdingTypes}
          defaultValues={defaultValues}
        />
      </div>
    </MainLayout>
  );
}