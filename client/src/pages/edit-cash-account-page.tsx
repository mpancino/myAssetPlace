import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { CashAccountForm } from "@/components/cash/cash-account-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Asset, AssetClass, AssetHoldingType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function EditCashAccountPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const params = useParams();
  const assetId = params.assetId ? parseInt(params.assetId) : undefined;
  
  console.log("Editing cash account with ID:", assetId);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);
  
  // Fetch the specific asset
  const { data: asset, isLoading: isAssetLoading } = useQuery<Asset>({
    queryKey: [`/api/assets/${assetId}`],
    enabled: !!assetId && !!user,
  });

  // Fetch asset classes
  const { 
    data: assetClasses, 
    isLoading: assetClassesLoading 
  } = useQuery<AssetClass[]>({ 
    queryKey: ['/api/asset-classes'],
    enabled: !!user
  });

  // Fetch holding types
  const { 
    data: holdingTypes, 
    isLoading: holdingTypesLoading 
  } = useQuery<AssetHoldingType[]>({ 
    queryKey: ['/api/asset-holding-types'],
    enabled: !!user
  });

  const isLoading = assetClassesLoading || holdingTypesLoading || isAssetLoading;
  
  // Find the cash asset class for navigation
  const cashAssetClass = assetClasses?.find(
    (assetClass) => 
      assetClass.name.toLowerCase().includes("cash") || 
      assetClass.name.toLowerCase().includes("bank")
  );

  const handleBack = () => {
    if (assetId) {
      setLocation(`/assets/${assetId}`);
    } else {
      setLocation(`/asset-classes/${cashAssetClass?.id || 1}`);
    }
  };
  
  // If the asset exists but is not a cash account, redirect to detail page
  useEffect(() => {
    if (asset && assetClasses) {
      const assetClass = assetClasses.find(c => c.id === asset.assetClassId);
      const isCashAccount = assetClass?.name.toLowerCase().includes('cash') || 
                            assetClass?.name.toLowerCase().includes('bank');
      
      if (!isCashAccount) {
        console.log("This is not a cash account, redirecting to detail page");
        setLocation(`/assets/${assetId}`);
      }
    }
  }, [asset, assetClasses, assetId, setLocation]);

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Cash Account</h1>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          assetClasses && holdingTypes && asset ? (
            <CashAccountForm 
              assetClasses={assetClasses}
              holdingTypes={holdingTypes}
              defaultValues={{
                ...asset,
                // Explicitly pass all cash account fields from the asset
                name: asset.name,
                description: asset.description || undefined,
                value: asset.value,
                assetClassId: asset.assetClassId,
                assetHoldingTypeId: asset.assetHoldingTypeId,
                institution: asset.institution || '',
                accountNumber: asset.accountNumber || undefined,
                // Convert accountType to enum type
                accountType: (asset.accountType || 'savings') as "savings" | "checking" | "term_deposit" | "other",
                interestRate: asset.interestRate || 0,
                // Convert accountPurpose to enum type
                accountPurpose: (asset.accountPurpose || 'general') as "general" | "emergency" | "savings" | "investment" | "other",
                isOffsetAccount: asset.isOffsetAccount || false,
                offsetLinkedLoanId: asset.offsetLinkedLoanId || undefined,
                // Handle arrays with proper typing
                balanceHistory: Array.isArray(asset.balanceHistory) ? asset.balanceHistory : [],
                transactionCategories: Array.isArray(asset.transactionCategories) ? asset.transactionCategories : [],
              }}
              isEditing={true}
              assetId={assetId}
            />
          ) : (
            <div>Error loading data</div>
          )
        )}
      </div>
    </MainLayout>
  );
}