import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { NavLink } from "./nav-link";
import ModeToggle from "@/components/ui/mode-toggle";
import {
  Home,
  User,
  Shield,
  Users,
  Building,
  BarChart3,
  LineChart,
  Settings,
  LogOut,
  BookOpenCheck,
  Wallet,
  Briefcase,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { AssetClass, AssetHoldingType, Asset } from "@shared/schema";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  
  // Fetch asset holding types
  const { data: holdingTypes = [] } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
    enabled: !!user,
  });
  
  // Fetch asset classes
  const { data: assetClasses = [] } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
    enabled: !!user,
  });
  
  // Fetch all assets to display counts in sidebar
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
    enabled: !!user,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className={cn(
      "w-64 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-20",
      "md:fixed md:inset-y-0",
      className
    )}>
      {/* Only show logo header in desktop mode or if not already included in mobile header */}
      {!isMobile && (
        <div className="flex items-center justify-center h-16 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-2xl font-heading font-bold text-primary-600">
            myAssetPlace
          </h1>
        </div>
      )}
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-4 py-4 space-y-1">
          {/* Conditionally render sidebar content based on user role */}
          {user?.role === 'admin' ? (
            // Admin-only sidebar
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Administration
              </h3>
              <NavLink href="/admin" icon={<Settings className="h-5 w-5 mr-3" />}>
                Admin Console
              </NavLink>
            </div>
          ) : (
            // Regular user sidebar
            <>
              <NavLink href="/dashboard" icon={<Home className="h-5 w-5 mr-3" />}>
                Dashboard
              </NavLink>
              
              <div className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">
                  Asset Holding Types
                </h3>
                {holdingTypes ? (
                  holdingTypes.map((type) => (
                    <NavLink 
                      key={type.id} 
                      href={`/holding-types/${type.id}`} 
                      icon={
                        type.name === "Personal" ? <User className="h-5 w-5 mr-3" /> :
                        type.name === "Superannuation" ? <Shield className="h-5 w-5 mr-3" /> :
                        <Users className="h-5 w-5 mr-3" />
                      }
                    >
                      {type.name}
                    </NavLink>
                  ))
                ) : (
                  <>
                    <NavLink href="/holding-types/personal" icon={<User className="h-5 w-5 mr-3" />}>
                      Personal
                    </NavLink>
                    <NavLink href="/holding-types/super" icon={<Shield className="h-5 w-5 mr-3" />}>
                      Superannuation
                    </NavLink>
                    <NavLink href="/holding-types/trust" icon={<Users className="h-5 w-5 mr-3" />}>
                      Family Trust
                    </NavLink>
                  </>
                )}
              </div>
              
              <div className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">
                  Asset Classes
                </h3>
                {assetClasses ? (
                  assetClasses.map((assetClass) => {
                    // Get count of assets in this asset class with intelligent classification
                    let assetsInClass;
                    
                    // Handle the special case for Loans & Liabilities
                    if (assetClass.name === "Loans & Liabilities") {
                      // For Loans, include any asset that is a liability regardless of class
                      assetsInClass = assets.filter(asset => 
                        asset.assetClassId === assetClass.id || asset.isLiability === true
                      );
                    } else if (assetClass.name === "Investments") {
                      // For Investments, exclude any assets that are liabilities
                      assetsInClass = assets.filter(asset => 
                        asset.assetClassId === assetClass.id && asset.isLiability !== true
                      );
                    } else {
                      // For all other classes, use the standard asset class ID
                      assetsInClass = assets.filter(asset => asset.assetClassId === assetClass.id);
                    }
                    
                    const assetCount = assetsInClass.length;
                    
                    // Get appropriate icon based on asset class name
                    let icon;
                    switch(assetClass.name) {
                      case "Real Estate":
                        icon = <Building className="h-5 w-5 mr-3" />;
                        break;
                      case "Stocks & Shares":
                        icon = <BarChart3 className="h-5 w-5 mr-3" />;
                        break;
                      case "Cash & Bank Accounts":
                        icon = <Wallet className="h-5 w-5 mr-3" />;
                        break;
                      case "Loans & Liabilities":
                        icon = <CreditCard className="h-5 w-5 mr-3" />;
                        break;
                      case "Business & Private Equity":
                        icon = <Briefcase className="h-5 w-5 mr-3" />;
                        break;
                      default:
                        icon = <LineChart className="h-5 w-5 mr-3" />;
                    }
                    
                    return (
                      <NavLink 
                        key={assetClass.id} 
                        href={`/asset-classes/${assetClass.id}`} 
                        icon={icon}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span>{assetClass.name}</span>
                          {assetCount > 0 && (
                            <span className="bg-slate-100 text-slate-600 text-xs rounded-full px-2 py-1 ml-2">
                              {assetCount}
                            </span>
                          )}
                        </div>
                      </NavLink>
                    );
                  })
                ) : (
                  <>
                    <NavLink href="/asset-classes/real-estate" icon={<Building className="h-5 w-5 mr-3" />}>
                      Real Estate
                    </NavLink>
                    <NavLink href="/asset-classes/stocks" icon={<BarChart3 className="h-5 w-5 mr-3" />}>
                      Stocks & Shares
                    </NavLink>
                    <NavLink href="/asset-classes/cash" icon={<LineChart className="h-5 w-5 mr-3" />}>
                      Cash & Savings
                    </NavLink>
                  </>
                )}
              </div>
              
              <div className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">
                  Financial Tools
                </h3>
                <NavLink href="/balance-sheet" icon={<BookOpenCheck className="h-5 w-5 mr-3" />}>
                  Balance Sheet
                </NavLink>
                <NavLink href="/projections" icon={<BarChart3 className="h-5 w-5 mr-3" />}>
                  Projections
                </NavLink>
                <NavLink href="/reports" icon={<LineChart className="h-5 w-5 mr-3" />}>
                  Reports
                </NavLink>
              </div>
            </>
          )}
        </nav>
      </div>
      
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="mt-3 space-y-3">
          {/* Interface Mode Toggle */}
          <div className="px-2 py-1">
            <ModeToggle />
          </div>
          
          <NavLink href="/settings" icon={<Settings className="h-5 w-5 mr-3" />}>
            Settings
          </NavLink>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-600 hover:bg-slate-100 hover:text-slate-900 px-2 py-2"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-5 w-5 mr-3 text-slate-500" />
            {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
