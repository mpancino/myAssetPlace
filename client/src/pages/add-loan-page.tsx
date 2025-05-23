import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { LoanForm } from "@/components/loans/loan-form";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetClass, AssetHoldingType, Asset } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Building } from "lucide-react";

export default function AddLoanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [success, setSuccess] = useState(false);
  const [createdLoan, setCreatedLoan] = useState<Asset | null>(null);
  const searchParams = new URLSearchParams(useSearch());
  
  // Check if this is a mortgage for a property or editing an existing mortgage
  const loanType = searchParams.get('type');
  const securedAssetId = searchParams.get('securedAssetId') ? 
    parseInt(searchParams.get('securedAssetId') || '0') : null;
  const mortgageId = searchParams.get('mortgageId') ? 
    parseInt(searchParams.get('mortgageId') || '0') : null;
  const isEditing = searchParams.get('edit') === 'true';
  const isMortgage = loanType === 'mortgage' && !!securedAssetId;

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
  
  // If this is a mortgage, fetch the property details
  const {
    data: securedAsset,
    isLoading: securedAssetLoading
  } = useQuery<Asset>({
    queryKey: isMortgage ? [`/api/assets/${securedAssetId}`] : ['no-asset'],
    enabled: isMortgage && !!securedAssetId
  });
  
  // If we're editing a mortgage, fetch the mortgage details
  const {
    data: existingMortgage,
    isLoading: mortgageLoading
  } = useQuery({
    queryKey: isEditing && mortgageId ? [`/api/mortgages/${mortgageId}`] : ['no-mortgage'],
    enabled: isEditing && !!mortgageId
  });

  const isLoading = 
    assetClassesLoading || 
    holdingTypesLoading || 
    (isMortgage && securedAssetLoading) ||
    (isEditing && mortgageId && mortgageLoading);

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
  
  // Special handling for redirect if this is a mortgage
  useEffect(() => {
    if (success && createdLoan && isMortgage && securedAssetId) {
      const timer = setTimeout(() => {
        // Redirect back to the property details
        setLocation(`/assets/${securedAssetId}`);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [success, createdLoan, isMortgage, securedAssetId, setLocation]);

  const handleLoanCreated = (loan: Asset) => {
    setCreatedLoan(loan);
    setSuccess(true);
  };
  
  // Prepare mortgage defaults if we're adding a mortgage for a property
  const getMortgageDefaults = () => {
    // Find the loans/liabilities asset class
    const loansAssetClass = assetClasses?.find(
      (assetClass) => 
        assetClass.name.toLowerCase().includes("loan") || 
        assetClass.name.toLowerCase().includes("debt") ||
        assetClass.name.toLowerCase().includes("liability")
    );
    
    // Case 1: We're editing an existing mortgage
    if (isEditing && existingMortgage) {
      // Use existing mortgage data
      const mortgageData = existingMortgage as any;
      
      // Cast to any to bypass TypeScript strict checks
      const defaults: any = {
        name: mortgageData.name,
        description: mortgageData.description || "",
        value: mortgageData.value,
        assetClassId: loansAssetClass?.id,
        isLiability: true,
        securedAssetId: mortgageData.securedAssetId,
        loanProvider: mortgageData.lender || "",
        interestRate: mortgageData.interestRate || 0,
        interestRateType: (mortgageData.interestRateType as "fixed" | "variable") || "variable",
        loanTerm: mortgageData.loanTerm || 0,
        paymentFrequency: (mortgageData.paymentFrequency as "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually") || "monthly",
        paymentAmount: mortgageData.paymentAmount || 0,
        startDate: mortgageData.startDate ? new Date(mortgageData.startDate) : new Date(),
        originalLoanAmount: mortgageData.originalAmount || 0
      };
      
      return defaults;
    }
    
    // Case 2: We're adding a new mortgage for a property
    if (isMortgage && securedAsset) {
      // Create a default loan name based on the property
      const defaultName = `Mortgage for ${securedAsset.name}`;
      
      // Default to a 30-year fixed rate mortgage
      // Cast to any to bypass TypeScript strict checks
      const defaults: any = {
        name: defaultName,
        assetClassId: loansAssetClass?.id,
        isLiability: true,
        securedAssetId: securedAsset.id,
        loanProvider: "",
        interestRate: 4.5, // Default interest rate
        interestRateType: "fixed",
        loanTerm: 360, // 30 years in months
        paymentFrequency: "monthly",
        originalLoanAmount: securedAsset.value * 0.8, // Default to 80% LTV
        value: -(securedAsset.value * 0.8), // Stored as negative for liabilities
        description: `Mortgage secured by ${securedAsset.name}`,
        startDate: new Date() // Required field
      };
      
      return defaults;
    }
    
    // Case 3: Regular loan with no defaults
    return undefined;
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        {success && createdLoan ? (
          <>
            <h1 className="text-3xl font-bold mb-8">
              {isEditing 
                ? (isMortgage ? "Mortgage Updated" : "Loan Updated") 
                : (isMortgage ? "Mortgage Created" : "Loan Created")
              }
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
                  Your {isMortgage ? "mortgage" : "loan"} '{createdLoan.name}' has been {isEditing ? "updated" : "created"} successfully!
                </p>
                <p>
                  {isMortgage && securedAssetId 
                    ? "Redirecting you back to the property details..." 
                    : "Redirecting you to the loans overview..."}
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-8 flex items-center">
              {isEditing ? (
                <>
                  <Building className="mr-2 h-6 w-6" /> 
                  {isMortgage ? "Edit Mortgage" : "Edit Loan"}
                  {securedAsset && isMortgage ? ` for ${securedAsset.name}` : ""}
                </>
              ) : isMortgage && securedAsset ? (
                <>
                  <Building className="mr-2 h-6 w-6" /> 
                  Add Mortgage for {securedAsset.name}
                </>
              ) : (
                "Add Loan"
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
            ) : (
              assetClasses && holdingTypes ? (
                <LoanForm 
                  assetClasses={assetClasses}
                  holdingTypes={holdingTypes}
                  defaultValues={getMortgageDefaults()}
                  onSuccess={handleLoanCreated}
                  isEditing={isEditing}
                  mortgageId={mortgageId || undefined}
                  isMortgage={isMortgage}
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