import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from "recharts";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  BarChart3, 
  PieChart as PieChartIcon,
  DollarSign,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Asset, AssetClass, AssetHoldingType } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
  "#82CA9D", "#FF6B6B", "#6B66FF", "#FFD166", "#06D6A0"
];

export default function BalanceSheetPage() {
  const { user } = useAuth();
  const [view, setView] = useState<"list" | "chart">("list");
  
  // Fetch all assets
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });
  
  // Fetch asset classes
  const { data: assetClasses = [], isLoading: isLoadingClasses } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });
  
  // Fetch asset holding types
  const { data: holdingTypes = [], isLoading: isLoadingTypes } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
  });
  
  // Loading state
  const isLoading = isLoadingAssets || isLoadingClasses || isLoadingTypes;
  
  // Calculate totals and net worth
  const assetClassMap = new Map(assetClasses.map(c => [c.id, c]));
  const holdingTypeMap = new Map(holdingTypes.map(t => [t.id, t]));
  
  // Separate assets and liabilities
  const allAssets = assets.filter(asset => {
    const assetClass = assetClassMap.get(asset.assetClassId);
    return assetClass && !assetClass.isLiability;
  });
  
  const allLiabilities = assets.filter(asset => {
    const assetClass = assetClassMap.get(asset.assetClassId);
    return assetClass && assetClass.isLiability;
  });
  
  // Calculate totals
  const totalAssets = allAssets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = allLiabilities.reduce((sum, liability) => sum + liability.value, 0);
  const netWorth = totalAssets - totalLiabilities;
  
  // Group assets by class for pie chart
  const assetsByClass = assetClasses
    .filter(c => !c.isLiability)
    .map(assetClass => {
      const classAssets = assets.filter(asset => asset.assetClassId === assetClass.id);
      const value = classAssets.reduce((sum, asset) => sum + asset.value, 0);
      return {
        name: assetClass.name,
        value,
        id: assetClass.id,
        color: assetClass.color || COLORS[assetClass.id % COLORS.length],
      };
    })
    .filter(item => item.value > 0); // Only include non-zero values
  
  // Group liabilities by class for pie chart
  const liabilitiesByClass = assetClasses
    .filter(c => c.isLiability)
    .map(assetClass => {
      const classLiabilities = assets.filter(asset => asset.assetClassId === assetClass.id);
      const value = classLiabilities.reduce((sum, asset) => sum + asset.value, 0);
      return {
        name: assetClass.name,
        value,
        id: assetClass.id,
        color: assetClass.color || COLORS[(assetClass.id + 5) % COLORS.length], // Offset color for liabilities
      };
    })
    .filter(item => item.value > 0); // Only include non-zero values
  
  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading balance sheet data...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Balance Sheet</h1>
            <p className="text-muted-foreground">Overview of your assets, liabilities, and net worth</p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <Button 
              variant={view === "list" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setView("list")}
            >
              <BarChart3 className="h-4 w-4 mr-1" /> List
            </Button>
            <Button 
              variant={view === "chart" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setView("chart")}
            >
              <PieChartIcon className="h-4 w-4 mr-1" /> Chart
            </Button>
            <Button asChild>
              <Link href="/add-asset">
                <PlusCircle className="h-4 w-4 mr-1" /> Add Asset
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-600 dark:text-blue-300">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-200 flex items-center">
                {formatCurrency(totalAssets)}
                <ArrowUpRight className="ml-2 h-5 w-5 text-blue-500" />
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {allAssets.length} Asset{allAssets.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-600 dark:text-red-300">Total Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700 dark:text-red-200 flex items-center">
                {formatCurrency(totalLiabilities)}
                <ArrowDownRight className="ml-2 h-5 w-5 text-red-500" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {allLiabilities.length} Liabilit{allLiabilities.length !== 1 ? 'ies' : 'y'}
              </p>
            </CardContent>
          </Card>
          
          <Card className={`${netWorth >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900' : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900'}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm ${netWorth >= 0 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center ${netWorth >= 0 ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}`}>
                {formatCurrency(netWorth)}
                {netWorth >= 0 ? (
                  <TrendingUp className="ml-2 h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="ml-2 h-5 w-5 text-red-500" />
                )}
              </div>
              <p className={`text-sm mt-1 ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Debt to Asset Ratio: {totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(2) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="assets" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets">
            {view === "list" ? (
              <div className="space-y-4">
                {assetsByClass.length > 0 ? (
                  assetsByClass.map(assetClassGroup => {
                    const classAssets = assets.filter(a => a.assetClassId === assetClassGroup.id);
                    const classPercentage = (assetClassGroup.value / totalAssets) * 100;
                    
                    return (
                      <Card key={assetClassGroup.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center">
                              <div 
                                className="h-3 w-3 rounded-full mr-2" 
                                style={{ backgroundColor: assetClassGroup.color }} 
                              />
                              {assetClassGroup.name}
                            </CardTitle>
                            <div className="text-md font-semibold">
                              {formatCurrency(assetClassGroup.value)}
                              <span className="text-muted-foreground text-sm ml-2">
                                ({classPercentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <table className="w-full">
                            <thead className="text-sm text-muted-foreground">
                              <tr>
                                <th className="text-left py-2">Asset</th>
                                <th className="text-left py-2">Holding Type</th>
                                <th className="text-right py-2">Value</th>
                                <th className="text-right py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {classAssets.map(asset => (
                                <tr key={asset.id} className="border-t border-border">
                                  <td className="py-2">{asset.name}</td>
                                  <td className="py-2">
                                    {holdingTypeMap.get(asset.assetHoldingTypeId)?.name || "N/A"}
                                  </td>
                                  <td className="py-2 text-right">
                                    {formatCurrency(asset.value)}
                                  </td>
                                  <td className="py-2 text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                      <Link href={`/assets/${asset.id}`}>
                                        Details
                                      </Link>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/asset-classes/${assetClassGroup.id}`}>
                              View All {assetClassGroup.name} Assets
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Assets</CardTitle>
                      <CardDescription>
                        You haven't added any assets yet. Start building your portfolio by adding your first asset.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button asChild>
                        <Link href="/add-asset">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Asset
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                  <CardDescription>
                    Breakdown of your assets by category
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {assetsByClass.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetsByClass}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={150}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {assetsByClass.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => formatCurrency(value as number)} 
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No asset data to display</p>
                        <Button className="mt-4" asChild>
                          <Link href="/add-asset">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Asset
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="liabilities">
            {view === "list" ? (
              <div className="space-y-4">
                {liabilitiesByClass.length > 0 ? (
                  liabilitiesByClass.map(liabilityClassGroup => {
                    const classLiabilities = assets.filter(a => a.assetClassId === liabilityClassGroup.id);
                    const classPercentage = (liabilityClassGroup.value / totalLiabilities) * 100;
                    
                    return (
                      <Card key={liabilityClassGroup.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center">
                              <div 
                                className="h-3 w-3 rounded-full mr-2" 
                                style={{ backgroundColor: liabilityClassGroup.color }} 
                              />
                              {liabilityClassGroup.name}
                            </CardTitle>
                            <div className="text-md font-semibold">
                              {formatCurrency(liabilityClassGroup.value)}
                              <span className="text-muted-foreground text-sm ml-2">
                                ({classPercentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <table className="w-full">
                            <thead className="text-sm text-muted-foreground">
                              <tr>
                                <th className="text-left py-2">Liability</th>
                                <th className="text-left py-2">Holding Type</th>
                                <th className="text-right py-2">Amount</th>
                                <th className="text-right py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {classLiabilities.map(liability => (
                                <tr key={liability.id} className="border-t border-border">
                                  <td className="py-2">{liability.name}</td>
                                  <td className="py-2">
                                    {holdingTypeMap.get(liability.assetHoldingTypeId)?.name || "N/A"}
                                  </td>
                                  <td className="py-2 text-right">
                                    {formatCurrency(liability.value)}
                                  </td>
                                  <td className="py-2 text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                      <Link href={`/assets/${liability.id}`}>
                                        Details
                                      </Link>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/asset-classes/${liabilityClassGroup.id}`}>
                              View All {liabilityClassGroup.name}
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Liabilities</CardTitle>
                      <CardDescription>
                        You haven't added any liabilities yet.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button asChild>
                        <Link href="/add-asset">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add a Liability
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Liability Breakdown</CardTitle>
                  <CardDescription>
                    Breakdown of your liabilities by category
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {liabilitiesByClass.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={liabilitiesByClass}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={150}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {liabilitiesByClass.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => formatCurrency(value as number)} 
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No liability data to display</p>
                        <Button className="mt-4" asChild>
                          <Link href="/add-asset">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Liability
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}