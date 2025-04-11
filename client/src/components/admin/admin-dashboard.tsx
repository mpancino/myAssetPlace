import { useQuery } from "@tanstack/react-query";
import { User, Country, AssetHoldingType, AssetClass, SubscriptionPlan } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Users, 
  Globe, 
  FolderKanban, 
  BarChart3, 
  CreditCard, 
  Settings,
  Palette
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();

  // Query counts for stats
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const { data: holdingTypes = [] } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
  });

  const { data: assetClasses = [] } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });

  const { data: subscriptionPlans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  // Card component for metrics
  const MetricCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon 
  }: { 
    title: string, 
    value: number | string, 
    description: string, 
    icon: React.ElementType 
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="bg-gradient-to-r from-primary/90 to-primary-600/90 rounded-lg shadow-md p-6 text-white">
        <h2 className="text-xl font-bold">Welcome, {user?.firstName || user?.username || "Administrator"}</h2>
        <p className="mt-1 opacity-90">Manage your platform's settings and configuration</p>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Countries" 
          value={countries.length} 
          description="Configured countries"
          icon={Globe} 
        />
        <MetricCard 
          title="Holding Types" 
          value={holdingTypes.length} 
          description="Asset holding classifications"
          icon={FolderKanban} 
        />
        <MetricCard 
          title="Asset Classes" 
          value={assetClasses.length} 
          description="Available asset categories"
          icon={BarChart3} 
        />
        <MetricCard 
          title="Subscription Plans" 
          value={subscriptionPlans.length} 
          description="Configured subscription tiers"
          icon={CreditCard} 
        />
      </div>

      {/* Admin quick navigation grid */}
      <h3 className="text-lg font-semibold mt-8 mb-4">Quick Navigation</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Countries</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Configure country-specific settings, currencies, tax rules, and defaults
            </CardDescription>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            {countries.length} countries configured
          </CardFooter>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Holding Types</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Manage asset holding types like Personal, Superannuation, Family Trust
            </CardDescription>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            {holdingTypes.length} holding types configured
          </CardFooter>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Asset Classes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Define asset classes with growth rates, income yield parameters
            </CardDescription>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            {assetClasses.length} asset classes configured
          </CardFooter>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Subscription Plans</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Configure subscription tiers, feature access, and pricing
            </CardDescription>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            {subscriptionPlans.length} subscription plans configured
          </CardFooter>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Login Screen</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Customize the login splash screen content and appearance
            </CardDescription>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            Branding and messaging
          </CardFooter>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">System Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Configure global system settings and parameters
            </CardDescription>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            Global configuration
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}