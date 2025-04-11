import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { NavLink } from "./nav-link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  
  // Fetch asset holding types
  const { data: holdingTypes } = useQuery({
    queryKey: ["/api/asset-holding-types"],
    enabled: !!user,
  });
  
  // Fetch asset classes
  const { data: assetClasses } = useQuery({
    queryKey: ["/api/asset-classes"],
    enabled: !!user,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className={cn(
      "hidden md:flex w-64 flex-col fixed inset-y-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-20",
      className
    )}>
      <div className="flex items-center justify-center h-16 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-heading font-bold text-primary-600">
          myAssetPlace
        </h1>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-4 py-4 space-y-1">
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
              assetClasses.map((assetClass) => (
                <NavLink 
                  key={assetClass.id} 
                  href={`/asset-classes/${assetClass.id}`} 
                  icon={
                    assetClass.name === "Real Estate" ? <Building className="h-5 w-5 mr-3" /> :
                    assetClass.name === "Stocks & Shares" ? <BarChart3 className="h-5 w-5 mr-3" /> :
                    <LineChart className="h-5 w-5 mr-3" />
                  }
                >
                  {assetClass.name}
                </NavLink>
              ))
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
            <NavLink href="/projections" icon={<BarChart3 className="h-5 w-5 mr-3" />}>
              Projections
            </NavLink>
            <NavLink href="/reports" icon={<LineChart className="h-5 w-5 mr-3" />}>
              Reports
            </NavLink>
          </div>

          {user?.role === 'admin' && (
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">
                Administration
              </h3>
              <NavLink href="/admin" icon={<Settings className="h-5 w-5 mr-3" />}>
                Admin Console
              </NavLink>
            </div>
          )}
        </nav>
      </div>
      
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="mt-3 space-y-1">
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
