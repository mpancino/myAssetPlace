import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import MainLayout from "@/components/layout/main-layout";
import { 
  PlusCircle, Edit, Trash2, ArrowRight, Wallet, Home, Briefcase, 
  LineChart, CreditCard, DollarSign, MapPin, BedDouble, Bath, Car 
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AssetClass, Asset, Country, AssetHoldingType, Mortgage } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { calculateMonthlyInterestExpense } from "@/lib/expense-utils";
import { PropertyCard } from "@/components/property/property-card";
import { useAssetClassDetails } from "@/hooks/use-asset-class-details";
import { isLegacyMortgageProperty, asLegacyAsset } from "@/lib/legacy-asset-utils";

export default function AssetClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [totalValue, setTotalValue] = useState<number>(0);

  // Fetch the specific asset class
  const { 
    data: assetClass, 
    isLoading: assetClassLoading,
    error: assetClassError,
    refetch: refetchAssetClass
  } = useQuery<AssetClass>({ 
    queryKey: [`/api/asset-classes/${classId}`],
    enabled: !!classId,
    // Refresh data when component mounts - ensures up-to-date data when navigating back
    refetchOnMount: true,
    // Less stale time so data refreshes more frequently
    staleTime: 5 * 1000 // 5 seconds
  });
  
  // Fetch all assets
  const { 
    data: allAssets = [], 
    isLoading: assetsLoading,
    refetch: refetchAssets
  } = useQuery<Asset[]>({ 
    queryKey: ['/api/assets'],
    enabled: !!classId,
    // Refresh data when component mounts - ensures up-to-date data when navigating back
    refetchOnMount: true,
    // Less stale time so data refreshes more frequently
    staleTime: 5 * 1000 // 5 seconds
  });
  
  // Fetch mortgages if we're in the Loans & Liabilities class
  const { 
    data: mortgages = [],
    isLoading: mortgagesLoading,
    refetch: refetchMortgages
  } = useQuery<Mortgage[]>({ 
    queryKey: ['/api/mortgages'],
    enabled: !!classId && (assetClass?.name === "Loans & Liabilities" || parseInt(classId) === 2),
    // Refresh data when component mounts - ensures up-to-date data when navigating back
    refetchOnMount: true,
    staleTime: 5 * 1000 // 5 seconds
  });
  
  // Force refetch on mount
  useEffect(() => {
    if (classId) {
      refetchAssetClass();
      refetchAssets();
      if (assetClass?.name === "Loans & Liabilities" || parseInt(classId) === 2) {
        refetchMortgages();
      }
    }
  }, [classId, refetchAssetClass, refetchAssets, refetchMortgages, assetClass]);
  
  // Get expense categories using our hook
  const { expenseCategories, isLoading: isLoadingExpenseCategories } = useAssetClassDetails(parseInt(classId));
  
  // Convert mortgages to asset format for display if in Loans & Liabilities
  const mortgageAssets = useMemo(() => {
    // Only convert if this is the Loans & Liabilities section
    if (assetClass?.name === "Loans & Liabilities" || parseInt(classId) === 2) {
      return mortgages.map((mortgage) => {
        // Create an asset-like object from mortgage data
        const assetFromMortgage: Partial<Asset> & { 
          // Legacy mortgage property replaced with mortgageId reference
          mortgageId?: number;
          securedAssetId?: number;
          lender?: string;
        } = {
          id: mortgage.id + 10000, // Prefix with 10000 to avoid ID conflicts
          name: mortgage.name,
          description: mortgage.description || '',
          userId: mortgage.userId,
          assetClassId: parseInt(classId),
          assetHoldingTypeId: 1, // Default holding type
          value: mortgage.value,
          isLiability: true,
          loanProvider: mortgage.lender,
          lender: mortgage.lender, // Add lender separately for direct access
          interestRate: mortgage.interestRate,
          interestRateType: mortgage.interestRateType,
          loanTerm: mortgage.loanTerm,
          paymentFrequency: mortgage.paymentFrequency,
          paymentAmount: mortgage.paymentAmount || 0,
          startDate: mortgage.startDate,
          endDate: mortgage.endDate,
          originalLoanAmount: mortgage.originalAmount,
          // No need for hasMortgage flag - modern mortgages are identified by mortgageId
          mortgageId: mortgage.id, // Store the original mortgage ID
          securedAssetId: mortgage.securedAssetId // Add the secured asset ID for linking to property
        };
        return assetFromMortgage as unknown as Asset;
      });
    }
    return [];
  }, [mortgages, assetClass, classId]);
  
  // Filter assets by class ID and make additional adjustments for misclassified assets
  const filteredAssets = allAssets.filter(asset => {
    // First filter by the asset class ID
    const matchesClassId = asset.assetClassId === parseInt(classId);
    
    // Additional corrections for misclassified assets
    if (assetClass?.name === "Loans & Liabilities") {
      // Include any assets that are marked as liabilities, regardless of their class ID
      return matchesClassId || asset.isLiability === true;
    } else if (assetClass?.name === "Investments" && asset.isLiability === true) {
      // Don't show liabilities in the investments class
      return false;
    } else {
      // For all other asset classes, use the standard class ID matching
      return matchesClassId;
    }
  });
  
  // Combine regular assets with mortgage assets for Loans & Liabilities
  const assets = useMemo(() => {
    if (assetClass?.name === "Loans & Liabilities" || parseInt(classId) === 2) {
      return [...filteredAssets, ...mortgageAssets];
    }
    return filteredAssets;
  }, [filteredAssets, mortgageAssets, assetClass, classId]);
  
  // Fetch the user's country for currency information
  const {
    data: userCountry
  } = useQuery<Country>({
    queryKey: ['/api/countries', user?.countryId],
    enabled: !!user?.countryId
  });
  
  // Fetch asset holding types for property cards
  const {
    data: holdingTypes
  } = useQuery<AssetHoldingType[]>({
    queryKey: ['/api/asset-holding-types'],
    enabled: assetClass?.name?.toLowerCase() === 'real estate'
  });

  useEffect(() => {
    if (assets?.length) {
      const sum = assets.reduce((total: number, asset: Asset) => total + asset.value, 0);
      setTotalValue(sum);
    }
  }, [assets]);

  // Get appropriate icon for the asset class
  const getAssetClassIcon = (name?: string) => {
    switch (name?.toLowerCase()) {
      case 'real estate':
        return <Home className="h-6 w-6" />;
      case 'stocks':
      case 'equities':
        return <LineChart className="h-6 w-6" />;
      case 'cash':
      case 'bank accounts':
        return <Wallet className="h-6 w-6" />;
      case 'loans':
      case 'debts':
        return <CreditCard className="h-6 w-6" />;
      case 'business':
        return <Briefcase className="h-6 w-6" />;
      default:
        return <DollarSign className="h-6 w-6" />;
    }
  };

  // Handle add asset button
  const handleAddAsset = () => {
    if (!assetClass) return;
    
    console.log(`BUTTON PRESS: Adding asset for class ID: ${assetClass.id}, name: ${assetClass.name}`);
    
    // Navigate to the appropriate add asset page based on asset class type
    const lowerCaseName = assetClass.name?.toLowerCase() || '';
    console.log(`ASSET CLASS NAME: "${lowerCaseName}"`);
    
    // First, check for asset class ID direct routing
    // This ensures that specific asset classes always go to their dedicated forms regardless of name
    if (assetClass.id === 9) {
      // Employee Stock Options (ID 9) should always go to the stock options form
      console.log(`ROUTING BY ID: Stock Option Form (/add-stock-option/${assetClass.id}) for ID: 9`);
      setLocation(`/add-stock-option/${assetClass.id}`);
    }
    else if (assetClass.id === 8) {
      // Employment Income (ID 8) should always go to the employment income form
      console.log(`ROUTING BY ID: Employment Income Form (/add-employment-income) for ID: 8`);
      setLocation(`/add-employment-income`);
    }
    else if (assetClass.id === 4) {
      // Investments (ID 4) should always go to the share form
      console.log(`ROUTING BY ID: Share Form (/add-share/${assetClass.id}) for ID: 4`);
      setLocation(`/add-share/${assetClass.id}`);
    }
    // Then check for name-based routing as fallback
    // For Cash & Bank Accounts, we use a query parameter
    else if (lowerCaseName.includes('cash') || lowerCaseName.includes('bank')) {
      console.log(`ROUTING TO: Cash Account Form (/add-cash-account?classId=${assetClass.id})`);
      setLocation(`/add-cash-account?classId=${assetClass.id}`);
    } 
    // For Property/Real Estate, we use a path parameter
    else if (lowerCaseName.includes('property') || lowerCaseName.includes('real estate')) {
      console.log(`ROUTING TO: Property Form (/add-property/${assetClass.id})`);
      setLocation(`/add-property/${assetClass.id}`);
    } 
    // For Loans, we use a query parameter
    else if (lowerCaseName.includes('loan') || lowerCaseName.includes('liabilit') || lowerCaseName.includes('debt')) {
      console.log(`ROUTING TO: Loan Form (/add-loan?classId=${assetClass.id})`);
      setLocation(`/add-loan?classId=${assetClass.id}`);
    }
    // For Shares, we use a path parameter
    else if (lowerCaseName.includes('share') || lowerCaseName.includes('stock') || lowerCaseName.includes('equit')) {
      console.log(`ROUTING TO: Share Form (/add-share/${assetClass.id})`);
      setLocation(`/add-share/${assetClass.id}`);
    }
    // For Stock Options
    else if (lowerCaseName.includes('option')) {
      console.log(`ROUTING TO: Stock Option Form (/add-stock-option/${assetClass.id})`);
      setLocation(`/add-stock-option/${assetClass.id}`);
    }
    // For Retirement accounts
    else if (lowerCaseName.includes('retirement') || lowerCaseName.includes('superannuation') || lowerCaseName.includes('pension')) {
      console.log(`ROUTING TO: Retirement Form (/add-retirement/${assetClass.id})`);
      setLocation(`/add-retirement/${assetClass.id}`);
    }
    // For Employment Income
    else if (lowerCaseName.includes('employment') || lowerCaseName.includes('income') || lowerCaseName.includes('salary')) {
      console.log(`ROUTING TO: Employment Income Form (/add-employment-income)`);
      setLocation('/add-employment-income');
    }
    // For other asset types, redirect to the generic form with the classId parameter
    else {
      console.log(`ROUTING TO: Generic Asset Form (/add-asset?classId=${assetClass.id})`);
      setLocation(`/add-asset?classId=${assetClass.id}`);
    }
  };

  if (assetClassLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-24 w-full mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!assetClass) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Asset Class Not Found</h2>
          <p className="mb-6">The asset class you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <div className="flex flex-wrap justify-between items-center mb-6">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="mr-4 p-2 bg-primary/10 rounded-full">
              {getAssetClassIcon(assetClass.name)}
            </div>
            <h1 className="text-3xl font-bold">{assetClass.name}</h1>
          </div>
          <Button onClick={handleAddAsset} className="flex items-center">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Asset
          </Button>
        </div>

        {assetClass.description && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p>{assetClass.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-lg text-primary font-bold uppercase tracking-wide">
                    TOTAL {assetClass.name === "Loans & Liabilities" ? "LIABILITIES" : "ASSETS"}
                  </dt>
                  <dd className="text-2xl font-semibold">{assets?.length || 0}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Total Value</dt>
                  <dd className="text-2xl font-semibold">
                    {formatCurrency(totalValue, userCountry?.currencySymbol || '$', false)}
                  </dd>
                </div>
                {assetClass.defaultLowGrowthRate !== null && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Low Growth Rate</dt>
                    <dd className="text-lg font-medium">{(assetClass.defaultLowGrowthRate * 100).toFixed(2)}%</dd>
                  </div>
                )}
                {assetClass.defaultMediumGrowthRate !== null && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Medium Growth Rate</dt>
                    <dd className="text-lg font-medium">{(assetClass.defaultMediumGrowthRate * 100).toFixed(2)}%</dd>
                  </div>
                )}
                {assetClass.defaultHighGrowthRate !== null && (
                  <div>
                    <dt className="text-sm text-muted-foreground">High Growth Rate</dt>
                    <dd className="text-lg font-medium">{(assetClass.defaultHighGrowthRate * 100).toFixed(2)}%</dd>
                  </div>
                )}
                {assetClass.defaultIncomeYield !== null && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Default Income Yield</dt>
                    <dd className="text-lg font-medium">{(assetClass.defaultIncomeYield * 100).toFixed(2)}%</dd>
                  </div>
                )}
                
                {/* Display expense categories if this is a real estate asset class */}
                {assetClass.name?.toLowerCase() === 'real estate' && (
                  <div className="col-span-2 mt-4 border-t pt-4">
                    <dt className="text-sm text-muted-foreground mb-2">Expense Categories</dt>
                    <dd>
                      {isLoadingExpenseCategories ? (
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      ) : expenseCategories && expenseCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {expenseCategories.map((category, index) => (
                            <Badge key={index} variant="outline">
                              {typeof category === 'string' ? 
                                category : 
                                (typeof category === 'object' && category !== null && 'name' in category && typeof category.name === 'string') ? 
                                  category.name : 
                                  'Expense Category'
                              }
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No expense categories defined.</p>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 inline-block text-transparent bg-clip-text">
          {assetClass.name === "Loans & Liabilities" 
            ? "YOUR LOANS & MORTGAGES" 
            : `Your ${assetClass.name} Assets`
          }
        </h2>

        {assetsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : assets?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => {
              // Check if we're in the real estate asset class
              const isRealEstate = assetClass?.name?.toLowerCase() === 'real estate';
              
              // If this is a real estate asset class, use the PropertyCard component
              if (isRealEstate) {
                // Find the asset's holding type
                const holdingType = holdingTypes?.find(ht => ht.id === asset.assetHoldingTypeId);
                
                // Construct a new object with mortgage information to ensure it's passed correctly
                // Convert to legacy asset with proper mortgage properties if needed
                const legacyAsset = asLegacyAsset(asset);
                const propertyWithMortgage = {
                  ...asset,
                  // Use utility function to check if asset has legacy mortgage data
                  hasMortgage: isLegacyMortgageProperty(legacyAsset),
                  mortgageAmount: legacyAsset?.mortgageAmount || 0
                };
                
                // Use PropertyCard component for real estate with explicit mortgage props
                return (
                  <PropertyCard 
                    key={asset.id} 
                    property={propertyWithMortgage} 
                    holdingType={holdingType}
                    onDelete={() => setLocation(`/assets/${asset.id}`)}
                  />
                );
              }
              
              // For other asset types, use the default card
              return (
                <Card key={asset.id} className="group hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{asset.name}</CardTitle>
                      {(asset as any).mortgageId && (
                        <Badge variant="outline" className="ml-2 bg-blue-100">
                          Mortgage
                        </Badge>
                      )}
                      {asset.isHidden && (
                        <Badge variant="outline" className="ml-2">
                          Hidden
                        </Badge>
                      )}
                      {asset.isLiability && (
                        <Badge variant="outline" className="ml-2 bg-destructive/10 text-destructive">
                          Liability
                        </Badge>
                      )}
                    </div>
                    {asset.description && (
                      <CardDescription className="line-clamp-2">{asset.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Current Value:</span>
                        <p className="text-xl font-semibold">
                          {formatCurrency(asset.value, userCountry?.currencySymbol || '$', false)}
                        </p>
                      </div>
                      
                      {asset.purchasePrice && (
                        <div>
                          <span className="text-sm text-muted-foreground">Purchase Price:</span>
                          <p>
                            {formatCurrency(asset.purchasePrice, userCountry?.currencySymbol || '$', false)}
                          </p>
                        </div>
                      )}
                      {asset.purchaseDate && (
                        <div>
                          <span className="text-sm text-muted-foreground">Purchase Date:</span>
                          <p>{new Date(asset.purchaseDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      
                      {/* Show loan/mortgage-specific fields */}
                      {((asset as any).mortgageId || asset.isLiability || asset.interestRate) && (
                        <>
                          {/* Lender information */}
                          {(asset.loanProvider || (asset as any).lender) && (
                            <div>
                              <span className="text-sm text-muted-foreground">Lender:</span>
                              <p>{asset.loanProvider || (asset as any).lender}</p>
                            </div>
                          )}
                          
                          {/* Interest Rate */}
                          {asset.interestRate && asset.interestRate > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Interest Rate:</span>
                              <p>{asset.interestRate}% {asset.interestRateType && `(${asset.interestRateType})`}</p>
                            </div>
                          )}
                          
                          {/* Loan Term */}
                          {asset.loanTerm && asset.loanTerm > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Loan Term:</span>
                              <p>{asset.loanTerm} months ({Math.round(asset.loanTerm/12)} years)</p>
                            </div>
                          )}
                          
                          {/* Monthly Payment Amount */}
                          {asset.paymentAmount && asset.paymentAmount > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Payment:</span>
                              <p>{formatCurrency(asset.paymentAmount)}/{asset.paymentFrequency || 'month'}</p>
                            </div>
                          )}
                          
                          {/* Interest Expense - show for all liability assets with interest expenses */}
                          {(() => {
                            const monthlyInterest = calculateMonthlyInterestExpense(asset);
                            return monthlyInterest > 0 ? (
                              <div>
                                <span className="text-sm text-muted-foreground">Interest Expense:</span>
                                <p className="font-medium text-amber-600">
                                  {formatCurrency(monthlyInterest)}/month
                                </p>
                              </div>
                            ) : null;
                          })()}
                        </>
                      )}
                    </div>
                  </CardContent>
                  <Separator />
                  <CardFooter className="flex justify-between pt-4">
                    {/* For mortgages, show an Edit button instead of View Details */}
                    {(asset as any).mortgageId ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/edit-loan/${(asset as any).mortgageId}`)}
                        >
                          <Edit className="mr-1 h-4 w-4" /> Edit Mortgage
                        </Button>
                        {(asset as any).securedAssetId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/assets/${(asset as any).securedAssetId}`)}
                          >
                            <Home className="mr-1 h-4 w-4" /> View Property
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/assets/${asset.id}`)}
                      >
                        View Details <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-lg mb-4">
                {assetClass.name === "Loans & Liabilities" 
                  ? "You don't have any loans or mortgages yet."
                  : `You don't have any ${assetClass?.name?.toLowerCase() || 'such'} assets yet.`
                }
              </p>
              <Button onClick={handleAddAsset}>
                <PlusCircle className="mr-2 h-5 w-5" /> 
                {assetClass.name === "Loans & Liabilities"
                  ? "Add Your First Loan or Mortgage"
                  : `Add Your First ${assetClass?.name || 'Asset'}`
                }
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}