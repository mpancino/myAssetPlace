import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { CashAccountForm } from "@/components/cash/cash-account-form";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetClass, AssetHoldingType } from "@shared/schema";

export default function AddCashAccountPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/add-cash-account");
  
  // Extract classId from query parameters if it exists
  const urlParams = new URLSearchParams(window.location.search);
  const classIdFromUrl = urlParams.get('classId');
  
  console.log("Cash account classId from URL:", classIdFromUrl);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

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

  const isLoading = assetClassesLoading || holdingTypesLoading;

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Add Cash Account</h1>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          assetClasses && holdingTypes ? (
            <CashAccountForm 
              assetClasses={assetClasses}
              holdingTypes={holdingTypes}
              defaultValues={{
                // If classId is in URL, set it as the default asset class
                assetClassId: classIdFromUrl ? parseInt(classIdFromUrl) : undefined,
                assetHoldingTypeId: holdingTypes[0]?.id
              }}
            />
          ) : (
            <div>Error loading data</div>
          )
        )}
      </div>
    </MainLayout>
  );
}