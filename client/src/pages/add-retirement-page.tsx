import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetClass, AssetHoldingType } from "@shared/schema";
import { RetirementForm } from "@/components/retirement/retirement-form";
import MainLayout from "@/components/layout/main-layout";
import { Loader2 } from "lucide-react";

export default function AddRetirementPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const classId = searchParams.get("classId");
  
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
      // Otherwise, try to find the retirement asset class
      const retirementClass = assetClasses.find(c => 
        c.name.toLowerCase().includes("retirement"));
        
      if (retirementClass) {
        setLocation(`/asset-classes/${retirementClass.id}`);
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
  
  // Find retirement asset class if not using classId
  const retirementClass = selectedClass || 
    assetClasses.find(c => c.name.toLowerCase().includes("retirement"));
    
  // Prepare default values
  const defaultValues = {
    assetClassId: retirementClass?.id,
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
          <h1 className="text-2xl font-bold">Add Retirement Account</h1>
        </div>
        
        <RetirementForm
          assetClasses={assetClasses}
          holdingTypes={holdingTypes}
          defaultValues={defaultValues}
        />
      </div>
    </MainLayout>
  );
}