import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 fixed top-0 inset-x-0 z-10">
        <h1 className="text-xl font-heading font-bold text-primary-600">
          myAssetPlace
        </h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <Sidebar className="w-full static flex flex-col" />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:ml-64 flex-1 h-full overflow-hidden">
        {/* Tabs navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="h-full">
              <TabsTrigger 
                value="dashboard" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 px-6 py-4"
              >
                Dashboard
              </TabsTrigger>
              {user?.role === 'admin' && (
                <TabsTrigger 
                  value="administrator" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 px-6 py-4"
                >
                  Administrator
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* Main content area - adjust the top padding for mobile */}
        <main className="flex-1 bg-slate-50 overflow-auto p-4 md:p-6 pt-20 md:pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
