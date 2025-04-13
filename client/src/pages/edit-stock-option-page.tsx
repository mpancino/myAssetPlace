import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Asset, AssetClass, AssetHoldingType } from "@shared/schema";
import { StockOptionForm } from "@/components/stock-options/stock-option-form";
import MainLayout from "@/components/layout/main-layout";
import { Loader2 } from "lucide-react";

export default function EditStockOptionPage() {
  const [, params] = useRoute("/edit-stock-option/:assetId");
  const assetId = params ? parseInt(params.assetId) : undefined;
  const [location, setLocation] = useLocation();
  
  // Fetch asset classes
  const { data: assetClasses = [], isLoading: assetClassesLoading } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });
  
  // Fetch asset holding types
  const { data: holdingTypes = [], isLoading: holdingTypesLoading } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
  });
  
  // Fetch the asset to edit
  const { 
    data: asset, 
    isLoading: isAssetLoading,
    error: assetError
  } = useQuery<Asset>({
    queryKey: [`/api/assets/${assetId}`],
    enabled: !!assetId,
  });
  
  const isLoading = assetClassesLoading || holdingTypesLoading || isAssetLoading;
  
  // Find the stock options asset class for navigation
  const stockOptionsAssetClass = assetClasses?.find(
    (assetClass) => assetClass.name.toLowerCase().includes("stock option")
  );

  const handleBack = () => {
    if (assetId) {
      setLocation(`/assets/${assetId}`);
    } else {
      setLocation(`/asset-classes/${stockOptionsAssetClass?.id || 9}`);
    }
  };
  
  // If the asset exists but is not a stock option, redirect to detail page
  useEffect(() => {
    if (asset && assetClasses) {
      const assetClass = assetClasses.find(c => c.id === asset.assetClassId);
      const isStockOption = assetClass?.name.toLowerCase().includes('stock option');
      
      if (!isStockOption) {
        console.log("This is not a stock option, redirecting to detail page");
        setLocation(`/assets/${assetId}`);
      }
    }
  }, [asset, assetClasses, assetId, setLocation]);
  
  // Handle errors or loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }
  
  if (assetError || !asset) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/dashboard")} 
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Error</h1>
            <p className="mt-2">Failed to load stock options or asset not found.</p>
            <Button 
              className="mt-4" 
              onClick={() => setLocation("/dashboard")}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack} 
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Edit Stock Options</h1>
        </div>
        
        <StockOptionForm
          assetClasses={assetClasses}
          holdingTypes={holdingTypes}
          defaultValues={asset}
          isEditing={true}
          assetId={assetId}
        />
      </div>
    </MainLayout>
  );
}