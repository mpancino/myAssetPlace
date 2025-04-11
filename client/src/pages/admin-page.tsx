import MainLayout from "@/components/layout/main-layout";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CountryConfig from "@/components/admin/country-config";
import AssetHoldingTypes from "@/components/admin/asset-holding-types";
import LoginSplashConfig from "@/components/admin/login-splash-config";
import SubscriptionPlans from "@/components/admin/subscription-plans";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("countries");

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
            <h1 className="text-2xl font-heading font-bold text-slate-900">Administrator Settings</h1>
            <p className="mt-1 text-sm text-slate-500">Manage system-wide configuration settings</p>
          </div>
        </header>

        {/* Admin Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="countries">Countries</TabsTrigger>
            <TabsTrigger value="holdingTypes">Holding Types</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscription Plans</TabsTrigger>
            <TabsTrigger value="loginSplash">Login Screen</TabsTrigger>
          </TabsList>

          <TabsContent value="countries">
            <CountryConfig />
          </TabsContent>
          
          <TabsContent value="holdingTypes">
            <AssetHoldingTypes />
          </TabsContent>
          
          <TabsContent value="subscriptions">
            <SubscriptionPlans />
          </TabsContent>
          
          <TabsContent value="loginSplash">
            <LoginSplashConfig />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
