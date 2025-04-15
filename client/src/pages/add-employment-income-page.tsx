import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetClass, AssetHoldingType } from "@shared/schema";
import { EmploymentIncomeForm } from "@/components/employment/employment-income-form";
import MainLayout from "@/components/layout/main-layout";
import { CardLoading } from "@/components/ui/loading-state";
import { logInfo } from "@/lib/logger";

export default function AddEmploymentIncomePage() {
  logInfo("navigation", "AddEmploymentIncomePage loaded - for Salary & Income");
  
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("classId");
  
  logInfo("navigation", `URL classId param: ${classId}`);

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

  // Handle the case when classId is not employment income
  useEffect(() => {
    if (assetClasses && classId) {
      const selectedClass = assetClasses.find(c => c.id === parseInt(classId));
      if (selectedClass && selectedClass.id !== 8) { // Employment Income is ID 8
        console.log(`Selected class ${selectedClass.name} is not Employment Income. Redirecting...`);
        setLocation("/add-asset");
      }
    }
  }, [assetClasses, classId, setLocation]);

  // Loading state
  const isLoading = isLoadingClasses || isLoadingTypes;
  
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
            <h1 className="text-2xl font-bold">Add Employment Income</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64">
            <CardLoading message="Loading form..." />
          </div>
        ) : (
          <EmploymentIncomeForm 
            assetClasses={assetClasses} 
            assetHoldingTypes={assetHoldingTypes}
            defaultValues={{
              assetClassId: 8, // Employment Income asset class ID
              assetHoldingTypeId: 1, // Default to Personal
              description: "",
              value: 0,
              employer: "", // Required - this will be used as name
              jobTitle: "",
              employmentType: "full-time" as const, // Type casting as const to match enum
              baseSalary: 0, // Required
              paymentFrequency: "fortnightly" as const, // Type casting as const to match enum
              bonusType: "none" as const, // Type casting as const to match enum
              bonusFixedAmount: 0,
              bonusPercentage: 0,
              bonusFrequency: "annually" as const, // Type casting as const to match enum
              bonusLikelihood: 80, // Default 80% likelihood
              taxWithholdingRate: 30,
              superContributionRate: 11,
              salaryGrowthRate: 2.5,
              salaryReviewFrequency: "annually" as const, // Type casting as const to match enum
              additionalDeductions: []
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}