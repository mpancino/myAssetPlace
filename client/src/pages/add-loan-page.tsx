import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { LoanForm } from "@/components/loans/loan-form";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetClass, AssetHoldingType, Asset } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function AddLoanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [success, setSuccess] = useState(false);
  const [createdLoan, setCreatedLoan] = useState<Asset | null>(null);

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

  // Handle success with redirect
  useEffect(() => {
    if (success && createdLoan) {
      const timer = setTimeout(() => {
        // Find the loan asset class for redirection
        if (assetClasses) {
          const loansAssetClass = assetClasses.find(
            (assetClass) => 
              assetClass.name.toLowerCase().includes("loan") || 
              assetClass.name.toLowerCase().includes("debt") ||
              assetClass.name.toLowerCase().includes("liability")
          );
          setLocation(`/asset-classes/${loansAssetClass?.id || ''}`);
        }
      }, 2000); // 2 second delay
      
      return () => clearTimeout(timer);
    }
  }, [success, createdLoan, assetClasses, setLocation]);
  
  const handleLoanCreated = (loan: Asset) => {
    setCreatedLoan(loan);
    setSuccess(true);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        {success && createdLoan ? (
          <>
            <h1 className="text-3xl font-bold mb-8">Loan Created</h1>
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Success!</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center space-y-4">
                <div className="bg-green-100 dark:bg-green-900 rounded-full p-4 mb-4">
                  <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xl font-medium">Your loan '{createdLoan.name}' has been created successfully!</p>
                <p>Redirecting you to the loans overview...</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-8">Add Loan</h1>
            
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
                <LoanForm 
                  assetClasses={assetClasses}
                  holdingTypes={holdingTypes}
                  onSuccess={handleLoanCreated}
                />
              ) : (
                <div>Error loading data</div>
              )
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}