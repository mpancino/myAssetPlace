import MainLayout from "@/components/layout/main-layout";
import StatsCard from "@/components/dashboard/stats-card";
import AssetAllocation from "@/components/dashboard/asset-allocation";
import RecentAssets from "@/components/dashboard/recent-assets";
import FloatingActionButton from "@/components/ui/floating-action-button";
import ModeToggle from "@/components/ui/mode-toggle";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();

  // Fetch user subscription details
  const { data: subscription } = useQuery({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });

  // Fetch all assets
  const { data: assets } = useQuery({
    queryKey: ["/api/assets"],
    enabled: !!user,
  });

  // Fetch assets grouped by class for allocation
  const { data: assetsByClass } = useQuery({
    queryKey: ["/api/assets/by-class"],
    enabled: !!user,
  });

  // Placeholder functions
  const handleExport = () => {
    // In a real app, this would trigger data export
    console.log("Export functionality would be implemented here");
  };

  // Calculate net worth from all assets
  const netWorth = assets?.reduce((sum, asset) => sum + asset.value, 0) || 0;

  // Calculate monthly income
  const monthlyIncome = assets?.reduce((sum, asset) => {
    // Simple calculation based on income yield
    if (asset.incomeYield) {
      return sum + (asset.value * asset.incomeYield / 12);
    }
    return sum;
  }, 0) || 0;

  // Calculate average growth rate
  const avgGrowthRate = assets?.length ? 
    assets.reduce((sum, asset) => sum + (asset.growthRate || 0), 0) / assets.length :
    0;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-5">
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        {/* Header section */}
        <header className="bg-white shadow-sm rounded-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold text-slate-900">Financial Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">Overview of your financial health and assets</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <ModeToggle 
                currentMode={user?.preferredMode || "basic"} 
                allowedModes={(subscription?.plan?.allowedInterfaceModes as string[]) || ["basic"]} 
              />
            </div>
          </div>
        </header>

        {/* Dashboard stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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

        {/* Asset allocation */}
        <AssetAllocation data={assetsByClass || []} />

        {/* Recent assets */}
        <RecentAssets assets={assets || []} />

        {/* Add Asset FAB */}
        <FloatingActionButton />
      </div>
    </MainLayout>
  );
}
