import MainLayout from "@/components/layout/main-layout";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CountryConfig from "@/components/admin/country-config";
import AssetHoldingTypes from "@/components/admin/asset-holding-types";
import AssetClasses from "@/components/admin/asset-classes";
import LoginSplashConfig from "@/components/admin/login-splash-config";
import SubscriptionPlans from "@/components/admin/subscription-plans";
import SystemSettings from "@/components/admin/system-settings";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { ExpenseStandardizer } from "@/components/admin/expense-standardizer";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Globe, 
  FolderKanban, 
  BarChart3, 
  CreditCard, 
  Settings,
  Palette,
  WrenchIcon
} from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    return <Redirect to="/dashboard" />;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-5">
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Administrator</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        {/* Header section */}
        <header className="bg-white shadow-sm rounded-lg p-4 md:p-6 mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900">Administrator Console</h1>
            <p className="mt-1 text-sm text-slate-500">Manage system-wide configuration settings</p>
          </div>
        </header>

        {/* Admin Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6 w-full justify-start rounded-lg p-1 bg-muted/20">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-background rounded-md flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="countries" className="data-[state=active]:bg-background rounded-md flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Countries</span>
            </TabsTrigger>
            <TabsTrigger value="holdingTypes" className="data-[state=active]:bg-background rounded-md flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Holding Types</span>
            </TabsTrigger>
            <TabsTrigger value="assetClasses" className="data-[state=active]:bg-background rounded-md flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Asset Classes</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-background rounded-md flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Subscription Plans</span>
            </TabsTrigger>
            <TabsTrigger value="systemSettings" className="data-[state=active]:bg-background rounded-md flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">System Settings</span>
            </TabsTrigger>
            <TabsTrigger value="loginSplash" className="data-[state=active]:bg-background rounded-md flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Login Screen</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-background rounded-md flex items-center gap-2">
              <WrenchIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="countries">
            <CountryConfig />
          </TabsContent>
          
          <TabsContent value="holdingTypes">
            <AssetHoldingTypes />
          </TabsContent>
          
          <TabsContent value="assetClasses">
            <AssetClasses />
          </TabsContent>
          
          <TabsContent value="subscriptions">
            <SubscriptionPlans />
          </TabsContent>
          
          <TabsContent value="systemSettings">
            <SystemSettings />
          </TabsContent>
          
          <TabsContent value="loginSplash">
            <LoginSplashConfig />
          </TabsContent>
          
          <TabsContent value="maintenance">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">System Maintenance</h2>
                <p className="text-muted-foreground mb-6">
                  Perform system maintenance tasks such as data standardization and cleanup.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                  <ExpenseStandardizer />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
