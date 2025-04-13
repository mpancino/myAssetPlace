import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetClass, AssetHoldingType, Asset } from "@shared/schema";
import { EmploymentIncomeForm } from "@/components/employment/employment-income-form";
import MainLayout from "@/components/layout/main-layout";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function EditEmploymentIncomePage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch asset data
  const {
    data: asset,
    isLoading: isLoadingAsset,
    error,
  } = useQuery<Asset>({
    queryKey: [`/api/assets/${id}`],
  });

  // Fetch asset classes
  const { 
    data: assetClasses,
    isLoading: isLoadingClasses
  } = useQuery<AssetClass[]>({
    queryKey: ['/api/asset-classes'],
  });

  // Fetch asset holding types
  const { 
    data: assetHoldingTypes,
    isLoading: isLoadingTypes
  } = useQuery<AssetHoldingType[]>({
    queryKey: ['/api/asset-holding-types'],
  });

  // Verify that this is actually an Employment Income asset (Class ID 8)
  useEffect(() => {
    if (asset && asset.assetClassId !== 8) {
      console.log(`Asset ID ${id} is not an Employment Income asset. Redirecting...`);
      navigate("/dashboard");
    }
  }, [asset, id, navigate]);

  const handleUpdateSuccess = (updatedAsset: Asset) => {
    console.log("Employment Income updated successfully:", updatedAsset);
    setIsSubmitting(false);
    navigate(`/asset/${updatedAsset.id}`);
  };

  // Handle errors
  if (error) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Error</h1>
          </div>
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            Failed to load employment income data. Please try again.
          </div>
          <Button className="mt-4" onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Loading state
  const isLoading = isLoadingAsset || isLoadingClasses || isLoadingTypes;

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <Briefcase className="h-6 w-6 mr-2 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Edit Employment Income</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EmploymentIncomeForm
            defaultValues={asset}
            assetClasses={assetClasses}
            assetHoldingTypes={assetHoldingTypes}
            onSuccess={handleUpdateSuccess}
            isSubmitting={isSubmitting}
            formMode="edit"
          />
        )}
      </div>
    </MainLayout>
  );
}