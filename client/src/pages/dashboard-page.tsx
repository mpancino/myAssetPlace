import { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import StatsCard from "@/components/dashboard/stats-card";
import AssetAllocation from "@/components/dashboard/asset-allocation";
import RecentAssets from "@/components/dashboard/recent-assets";
import { AssetAllocationChart } from "@/components/dashboard/asset-allocation-chart";
import { ViewToggle } from "@/components/dashboard/view-toggle";
import FloatingActionButton from "@/components/ui/floating-action-button";
import ModeToggle from "@/components/ui/mode-toggle";
import { ProtectedFeature } from "@/components/protected-feature";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Download, MoreHorizontal, Filter, Database, Sparkles, ArrowUpCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Asset, AssetClass, AssetHoldingType, SubscriptionPlan } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define subscription type
interface UserSubscription {
  plan: SubscriptionPlan;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { showUpgradePrompt } = useSubscription();
  const [viewBy, setViewBy] = useState<"assetClass" | "holdingType">("assetClass");

  // Fetch user subscription details
  const { data: subscription = { plan: { allowedInterfaceModes: ["basic"] } } } = useQuery<UserSubscription>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });

  // Fetch all assets
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
    enabled: !!user,
  });
  
  // Fetch asset classes for allocation chart
  const { data: assetClasses = [] } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
    enabled: !!user,
  });

  // Fetch asset holding types for allocation chart
  const { data: holdingTypes = [] } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
    enabled: !!user,
  });
  
  // Instead of using the broken server endpoint, calculate asset class allocation on the client
  // Create a map of asset class totals
  const assetsByClass = assetClasses.map(assetClass => {
    // Sum the total value of assets in this class
    const classAssets = assets.filter(asset => asset.assetClassId === assetClass.id);
    const totalValue = classAssets.reduce((sum, asset) => sum + asset.value, 0);
    
    // Return in the same format as the API would
    return {
      assetClass,
      totalValue
    };
  });
  
  // Add sample data mutation
  const addSampleDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/add-sample-data");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sample data added",
        description: "Sample assets have been added to your account",
        variant: "default",
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
    },
    onError: (error) => {
      toast({
        title: "Error adding sample data",
        description: error.message || "There was an error adding sample data",
        variant: "destructive",
      });
    },
  });

  // Placeholder functions
  const handleExport = () => {
    // In a real app, this would trigger data export
    console.log("Export functionality would be implemented here");
  };

  // Calculate net worth from all assets
  const netWorth = assets.reduce((sum: number, asset: Asset) => sum + asset.value, 0);

  // Calculate monthly income
  const monthlyIncome = assets.reduce((sum: number, asset: Asset) => {
    // Simple calculation based on income yield
    if (asset.incomeYield) {
      return sum + (asset.value * asset.incomeYield / 12);
    }
    return sum;
  }, 0);

  // Calculate average growth rate
  const avgGrowthRate = assets.length ? 
    assets.reduce((sum: number, asset: Asset) => sum + (asset.growthRate || 0), 0) / assets.length :
    0;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs - hide on mobile */}
        <div className="hidden md:block">
          <Breadcrumb className="mb-5">
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
        </div>

        {/* Header section */}
        <header className="bg-white shadow-sm rounded-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold text-slate-900">Financial Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">Overview of your financial health and assets</p>
            </div>
            
            {/* Desktop actions */}
            <div className="hidden md:flex mt-4 md:mt-0 space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSampleDataMutation.mutate()} 
                disabled={addSampleDataMutation.isPending}
              >
                <Database className="mr-2 h-4 w-4" />
                Add Sample Data
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <ModeToggle 
                currentMode={user?.preferredMode || "basic"} 
                allowedModes={subscription.plan.allowedInterfaceModes as string[]} 
              />
            </div>
            
            {/* Mobile actions */}
            <div className="flex md:hidden mt-4 justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="ml-2">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => addSampleDataMutation.mutate()}
                    disabled={addSampleDataMutation.isPending}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Add Sample Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Dashboard stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
          <StatsCard 
            title="Net Worth" 
            value={netWorth} 
            icon="money" 
            href="#" 
          />
          <StatsCard 
            title="Monthly Income" 
            value={monthlyIncome} 
            icon="income" 
            href="#"
            valuePrefix="$"
            colorScheme="success" 
          />
          <StatsCard 
            title="Annual Growth Rate" 
            value={avgGrowthRate} 
            icon="trendingUp" 
            href="#"
            valueSuffix="%" 
          />
        </div>

        {/* Advanced Asset Allocation Chart with View Toggling */}
        <div className="mb-6">
          <ViewToggle view={viewBy} onChange={setViewBy} />
          <ProtectedFeature 
            protection={{ type: "mode", mode: "advanced" }}
            fallback={
              <div className="bg-muted/20 border-2 border-dashed border-muted rounded-lg p-6 my-4 text-center">
                <h3 className="font-medium text-lg mb-2">Advanced Asset Visualization</h3>
                <p className="text-muted-foreground mb-4">
                  Upgrade to Advanced Mode to access detailed asset allocation charts and analysis tools.
                </p>
                <Button 
                  onClick={() => showUpgradePrompt("Advanced Asset Visualization")}
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-primary" />
                  Upgrade Now
                </Button>
              </div>
            }
          >
            <AssetAllocationChart 
              assets={assets} 
              assetClasses={assetClasses} 
              holdingTypes={holdingTypes} 
              viewBy={viewBy} 
            />
          </ProtectedFeature>
        </div>

        {/* Asset allocation and Recent assets in different layouts based on screen size */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset allocation - full width on mobile/tablet, half width on desktop */}
          <div className="lg:col-span-1">
            <AssetAllocation data={assetsByClass} />
          </div>

          {/* Recent assets - full width on mobile/tablet, half width on desktop */}
          <div className="lg:col-span-1">
            <RecentAssets assets={assets} />
          </div>
        </div>

        {/* Add Asset FAB */}
        <FloatingActionButton />
      </div>
    </MainLayout>
  );
}
