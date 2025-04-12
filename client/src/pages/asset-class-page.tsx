import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import MainLayout from "@/components/layout/main-layout";
import { PlusCircle, Edit, Trash2, ArrowRight, Wallet, Home, Briefcase, LineChart, CreditCard, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AssetClass, Asset, Country, AssetHoldingType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PropertyCard } from "@/components/property/property-card";

export default function AssetClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [totalValue, setTotalValue] = useState<number>(0);

  // Fetch the specific asset class
  const { 
    data: assetClass, 
    isLoading: assetClassLoading 
  } = useQuery<AssetClass>({ 
    queryKey: ['/api/asset-classes', parseInt(classId)],
    enabled: !!classId
  });

  // Fetch assets for this asset class
  const { 
    data: assets, 
    isLoading: assetsLoading 
  } = useQuery<Asset[]>({ 
    queryKey: ['/api/assets'],
    queryFn: async () => {
      const res = await fetch(`/api/assets?assetClassId=${classId}`);
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    },
    enabled: !!classId
  });
  
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
      const sum = assets.reduce((total, asset) => total + asset.value, 0);
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
    // Navigate to the appropriate add asset page based on asset class type
    if (assetClass?.name?.toLowerCase() === 'real estate') {
      setLocation(`/add-property/${classId}`);
    } else if (assetClass?.name?.toLowerCase() === 'cash' || assetClass?.name?.toLowerCase() === 'bank accounts') {
      setLocation(`/add-cash-account?classId=${classId}`);
    } else if (assetClass?.name?.toLowerCase() === 'loans' || assetClass?.name?.toLowerCase() === 'debts') {
      setLocation(`/add-loan?classId=${classId}`);
    } else {
      setLocation(`/add-asset?classId=${classId}`);
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
                  <dt className="text-sm text-muted-foreground">Total Assets</dt>
                  <dd className="text-2xl font-semibold">{assets?.length || 0}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Total Value</dt>
                  <dd className="text-2xl font-semibold">
                    {formatCurrency(totalValue, userCountry?.currencySymbol || '$')}
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
              </dl>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold mb-4">Your {assetClass.name} Assets</h2>

        {assetsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : assets?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => {
              // If this is a real estate asset class, use the PropertyCard component
              if (assetClass?.name?.toLowerCase() === 'real estate') {
                // Find the asset's holding type
                const holdingType = holdingTypes?.find(ht => ht.id === asset.assetHoldingTypeId);
                
                // Handle property deletion
                const handleDelete = () => {
                  setLocation(`/assets/${asset.id}`);
                };
                
                return (
                  <PropertyCard 
                    key={asset.id} 
                    property={asset} 
                    holdingType={holdingType}
                    onDelete={handleDelete}
                  />
                );
              }
              
              // For other asset types, use the default card
              return (
                <Card key={asset.id} className="group hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{asset.name}</CardTitle>
                      {asset.isHidden && (
                        <Badge variant="outline" className="ml-2">
                          Hidden
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
                          {formatCurrency(asset.value, userCountry?.currencySymbol || '$')}
                        </p>
                      </div>
                      {asset.purchasePrice && (
                        <div>
                          <span className="text-sm text-muted-foreground">Purchase Price:</span>
                          <p>
                            {formatCurrency(asset.purchasePrice, userCountry?.currencySymbol || '$')}
                          </p>
                        </div>
                      )}
                      {asset.purchaseDate && (
                        <div>
                          <span className="text-sm text-muted-foreground">Purchase Date:</span>
                          <p>{new Date(asset.purchaseDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <Separator />
                  <CardFooter className="flex justify-between pt-4">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/assets/${asset.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => setLocation(`/assets/${asset.id}`)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLocation(`/assets/${asset.id}`)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Details <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-lg mb-4">You don't have any {assetClass?.name?.toLowerCase() || 'such'} assets yet.</p>
              <Button onClick={handleAddAsset}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add Your First {assetClass?.name || 'Asset'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}