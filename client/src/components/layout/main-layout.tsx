import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Close sidebar when transitioning from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 fixed top-0 inset-x-0 z-30">
        <h1 className="text-xl font-heading font-bold text-primary-600">
          myAssetPlace
        </h1>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[85%] sm:w-[350px] border-r z-50">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-bold text-primary-600">myAssetPlace</h2>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>
            <Sidebar className="w-full static flex flex-col rounded-none" />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <div className="flex flex-col md:ml-64 flex-1 h-full overflow-hidden">
        {/* Tabs navigation - Only shown if not admin or for regular user sections */}
        {(!user?.role || user.role !== 'admin') && (
          <div className="hidden md:flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Main content area - adjust the top padding for mobile */}
        <main className="flex-1 bg-slate-50 overflow-auto p-4 md:p-6 pt-20 md:pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
