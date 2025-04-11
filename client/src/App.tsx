import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard-page";
import AdminPage from "@/pages/admin-page";
import AssetClassPage from "@/pages/asset-class-page";
import AddAssetPage from "@/pages/add-asset-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import DemoOnboardingDialog from "@/components/onboarding/demo-onboarding-dialog";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/asset-classes/:classId" component={AssetClassPage} />
      <ProtectedRoute path="/add-asset" component={AddAssetPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
      <DemoOnboardingDialog />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
