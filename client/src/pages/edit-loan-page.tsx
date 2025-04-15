import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { LoanForm } from "@/components/loans/loan-form";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetClass, AssetHoldingType, Asset, InsertLoan } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Building } from "lucide-react";
import { logError as loggerError } from "@/lib/logger";

export default function EditLoanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [success, setSuccess] = useState(false);
  const [updatedLoan, setUpdatedLoan] = useState<Asset | null>(null);
  const params = useParams();
  const loanId = params.id ? parseInt(params.id) : null;
  
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

  // Determine if this is a mortgage by ID range (based on observed ID patterns in the system)
  const isMortgageByIdRange = loanId && loanId < 100;
  
  // Fetch the loan data - handle both regular loans and mortgages
  const {
    data: loan,
    isLoading: loanLoading,
    error: loanError
  } = useQuery<Asset>({
    queryKey: [isMortgageByIdRange ? `/api/mortgages/${loanId}` : `/api/assets/${loanId}`],
    enabled: !!loanId && !!user,
  });

  // Determine if this is a mortgage by checking mortgage specific fields
  const isMortgage = loan && ('securedAssetId' in loan || loan.loanProvider);

  // Handle when a loan is successfully updated
  const handleLoanUpdated = (updatedLoan: Asset) => {
    setUpdatedLoan(updatedLoan);
    setSuccess(true);
  };

  // Handle success with redirect
  useEffect(() => {
    if (success && updatedLoan) {
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
  }, [success, updatedLoan, assetClasses, setLocation]);
  
  // Special handling for redirect if this is a mortgage
  useEffect(() => {
    if (success && updatedLoan && isMortgage) {
      const securedAssetId = (loan as any).securedAssetId;
      if (securedAssetId) {
        const timer = setTimeout(() => {
          // Redirect back to the property details
          setLocation(`/assets/${securedAssetId}`);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [success, updatedLoan, isMortgage, loan, setLocation]);

  // Convert loan data to form default values
  const getFormDefaults = () => {
    if (!loan) return undefined;

    // Use type assertion to access potential mortgage-specific fields
    const loanData = loan as any;

    // Create properly typed default values
    // Cast to any first to bypass TypeScript strict checks
    const defaults: any = {
      name: loan.name,
      description: loan.description || "",
      value: loan.value,
      assetClassId: loan.assetClassId,
      assetHoldingTypeId: loan.assetHoldingTypeId,
      isLiability: true,
      loanProvider: loanData.loanProvider || "",
      interestRate: loanData.interestRate || 0,
      interestRateType: (loanData.interestRateType as "fixed" | "variable") || "variable",
      loanTerm: loanData.loanTerm || 0,
      paymentFrequency: (loanData.paymentFrequency as "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually") || "monthly",
      paymentAmount: loanData.paymentAmount || 0,
      startDate: loanData.startDate ? new Date(loanData.startDate) : new Date(),
      originalLoanAmount: loanData.originalAmount || 0,
      securedAssetId: loanData.securedAssetId
    };

    return defaults;
  };

  // Determine if the page is still loading
  const isLoading = assetClassesLoading || holdingTypesLoading || loanLoading;

  // Handle errors
  if (loanError) {
    // Use the logError function properly
    console.error("Error loading loan data:", loanError);
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        {success && updatedLoan ? (
          <>
            <h1 className="text-3xl font-bold mb-8">
              {isMortgage ? "Mortgage Updated" : "Loan Updated"}
            </h1>
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Success!</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center space-y-4">
                <div className="bg-green-100 dark:bg-green-900 rounded-full p-4 mb-4">
                  <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xl font-medium">
                  Your {isMortgage ? "mortgage" : "loan"} '{updatedLoan.name}' has been updated successfully!
                </p>
                <p>
                  {isMortgage && (loan as any)?.securedAssetId 
                    ? "Redirecting you back to the property details..." 
                    : "Redirecting you to the loans overview..."}
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-8 flex items-center">
              {isMortgage ? (
                <>
                  <Building className="mr-2 h-6 w-6" /> 
                  Edit Mortgage
                </>
              ) : (
                "Edit Loan"
              )}
            </h1>
            
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : loan && assetClasses && holdingTypes ? (
              <LoanForm 
                assetClasses={assetClasses}
                holdingTypes={holdingTypes}
                defaultValues={getFormDefaults()}
                isEditing={true}
                assetId={loan.id}
                onSuccess={handleLoanUpdated}
              />
            ) : (
              <div>Error loading loan data</div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}