import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, PieChart, LineChart, BarChart, Settings } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ProjectionConfig, 
  ProjectionPeriod, 
  ProjectionScenario,
  ProjectionResult
} from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "wouter";
import ProjectionChart from "@/components/projections/projection-chart";
import AssetClassBreakdown from "@/components/projections/asset-class-breakdown";
import CashflowProjection from "@/components/projections/cashflow-projection";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function ProjectionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch default projection config
  const { 
    data: defaultConfig, 
    isLoading: configLoading,
    error: configError
  } = useQuery({
    queryKey: ['/api/projections/config'],
    queryFn: async () => {
      const res = await fetch('/api/projections/config');
      if (!res.ok) throw new Error('Failed to load default configuration');
      return res.json();
    }
  });
  
  // State for projection configuration
  const [config, setConfig] = useState<ProjectionConfig | null>(null);
  
  // Update config when default config is loaded
  useEffect(() => {
    if (defaultConfig) {
      setConfig(defaultConfig);
    }
  }, [defaultConfig]);
  
  // Mutation for generating projections
  const { 
    mutate: generateProjections, 
    data: projections,
    isPending: projectionLoading,
    error: projectionError
  } = useMutation({
    mutationFn: async (config: ProjectionConfig) => {
      const res = await apiRequest('POST', '/api/projections/generate', config);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to generate projections');
      }
      return res.json() as Promise<ProjectionResult>;
    },
    onSuccess: () => {
      toast({
        title: "Projections generated",
        description: "Financial projections have been calculated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate projections",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Trigger projections generation when config changes or on button click
  const handleGenerateProjections = () => {
    if (!config) return;
    generateProjections(config);
  };
  
  // Handle config changes
  const updateConfig = (updates: Partial<ProjectionConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };
  
  // Handle period change which also affects years to project
  const handlePeriodChange = (period: ProjectionPeriod) => {
    if (!config) return;
    
    let yearsToProject = config.yearsToProject;
    
    // Update years based on period
    switch (period) {
      case 'annually':
        yearsToProject = 1;
        break;
      case '5-years':
        yearsToProject = 5;
        break;
      case '10-years':
        yearsToProject = 10;
        break;
      case '20-years':
        yearsToProject = 20;
        break;
      case '30-years':
        yearsToProject = 30;
        break;
      case 'retirement':
        // Calculate based on user's current age and target retirement age
        const currentAge = user?.age || 35;
        const targetRetirementAge = user?.targetRetirementAge || 65;
        
        if (targetRetirementAge > currentAge) {
          yearsToProject = targetRetirementAge - currentAge;
        } else {
          // Already at or past retirement age, use a default
          yearsToProject = 30;
        }
        break;
    }
    
    updateConfig({ period, yearsToProject });
  };
  
  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading projection settings...</span>
      </div>
    );
  }
  
  if (configError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">Failed to load projection configuration</div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projections/config'] })}>
          Retry
        </Button>
      </div>
    );
  }
  
  if (!config) return null;
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Financial Projections</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Projection Settings Sidebar */}
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Projection Settings</CardTitle>
              <CardDescription>Configure your financial projections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="period">Projection Period</Label>
                <Select 
                  value={config.period} 
                  onValueChange={(value) => handlePeriodChange(value as ProjectionPeriod)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annually">Annual (1 year)</SelectItem>
                    <SelectItem value="5-years">5 Years</SelectItem>
                    <SelectItem value="10-years">10 Years</SelectItem>
                    <SelectItem value="20-years">20 Years</SelectItem>
                    <SelectItem value="30-years">30 Years</SelectItem>
                    <SelectItem value="retirement">Until Retirement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scenario">Growth Rate Scenario</Label>
                <Select 
                  value={config.growthRateScenario} 
                  onValueChange={(value) => updateConfig({ growthRateScenario: value as ProjectionScenario })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Conservative (Low)</SelectItem>
                    <SelectItem value="medium">Balanced (Medium)</SelectItem>
                    <SelectItem value="high">Aggressive (High)</SelectItem>
                    {user?.preferredMode === 'advanced' && (
                      <SelectItem value="custom">Custom</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inflation">Inflation Rate (%)</Label>
                <Input
                  id="inflation"
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={config.inflationRate}
                  onChange={(e) => updateConfig({ inflationRate: parseFloat(e.target.value) || 0 })}
                  disabled={user?.preferredMode !== 'advanced'}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-4">
                <Checkbox 
                  id="includeIncome" 
                  checked={config.includeIncome}
                  onCheckedChange={(checked) => updateConfig({ includeIncome: !!checked })}
                />
                <Label htmlFor="includeIncome">Include Income</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeExpenses" 
                  checked={config.includeExpenses}
                  onCheckedChange={(checked) => updateConfig({ includeExpenses: !!checked })}
                />
                <Label htmlFor="includeExpenses">Include Expenses</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="reinvestIncome" 
                  checked={config.reinvestIncome}
                  onCheckedChange={(checked) => updateConfig({ reinvestIncome: !!checked })}
                />
                <Label htmlFor="reinvestIncome">Reinvest Income</Label>
              </div>
              
              {user?.preferredMode === 'advanced' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeHiddenAssets" 
                      checked={config.includeHiddenAssets}
                      onCheckedChange={(checked) => updateConfig({ includeHiddenAssets: !!checked })}
                    />
                    <Label htmlFor="includeHiddenAssets">Include Hidden Assets</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="excludeLiabilities" 
                      checked={config.excludeLiabilities}
                      onCheckedChange={(checked) => updateConfig({ excludeLiabilities: !!checked })}
                    />
                    <Label htmlFor="excludeLiabilities">Exclude Liabilities</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="calculateAfterTax" 
                      checked={config.calculateAfterTax}
                      onCheckedChange={(checked) => updateConfig({ calculateAfterTax: !!checked })}
                    />
                    <Label htmlFor="calculateAfterTax">Calculate After-Tax</Label>
                  </div>
                </>
              )}
              
              <Button 
                className="w-full mt-4"
                onClick={handleGenerateProjections}
                disabled={projectionLoading}
              >
                {projectionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    Generate Projections
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          {user?.preferredMode === 'advanced' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/projections/asset-filter')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Asset Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Projection Results Section */}
        <div className="lg:col-span-3">
          {projectionError ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl text-red-500">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{projectionError.message || 'Failed to generate projections. Please try again.'}</p>
                <Button variant="outline" className="mt-4" onClick={handleGenerateProjections}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : !projections ? (
            <Card className="mb-6 min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center p-8">
                <h3 className="text-xl font-semibold mb-4">No Projections Generated Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Configure your projection settings and click "Generate Projections" to see your financial future.
                </p>
                <Button onClick={handleGenerateProjections}>
                  Generate Projections
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Card with Key Metrics */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Projection Summary</CardTitle>
                  <CardDescription>
                    {config.inflationAdjusted ? 'Values adjusted for inflation' : 'Nominal values (not adjusted for inflation)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Starting Net Worth</h3>
                      <p className="text-2xl font-bold">{formatCurrency(projections.netWorth[0])}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Projected Net Worth</h3>
                      <p className="text-2xl font-bold">
                        {formatCurrency(projections.netWorth[projections.netWorth.length - 1])}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        in {config.yearsToProject} years ({projections.dates[projections.dates.length - 1]})
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Annual Growth Rate</h3>
                      <p className="text-2xl font-bold">
                        {((Math.pow(
                          projections.netWorth[projections.netWorth.length - 1] / 
                          Math.max(projections.netWorth[0], 1), 
                          1 / config.yearsToProject
                        ) - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Projection Charts */}
              <Card>
                <CardHeader>
                  <Tabs 
                    defaultValue="overview" 
                    value={activeTab} 
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-3">
                      <TabsTrigger value="overview">
                        <LineChart className="h-4 w-4 mr-2" /> 
                        Net Worth
                      </TabsTrigger>
                      <TabsTrigger value="breakdown">
                        <PieChart className="h-4 w-4 mr-2" />
                        Asset Breakdown
                      </TabsTrigger>
                      <TabsTrigger value="cashflow">
                        <BarChart className="h-4 w-4 mr-2" />
                        Cashflow
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  <TabsContent value="overview" className="h-[400px]">
                    <ProjectionChart 
                      projections={projections} 
                      period={config.period}
                    />
                  </TabsContent>
                  <TabsContent value="breakdown" className="h-[400px]">
                    <AssetClassBreakdown 
                      projections={projections}
                    />
                  </TabsContent>
                  <TabsContent value="cashflow" className="h-[400px]">
                    <CashflowProjection 
                      projections={projections} 
                      period={config.period}
                    />
                  </TabsContent>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}