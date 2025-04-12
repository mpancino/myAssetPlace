import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard-page";
import AdminPage from "@/pages/admin-page";
import AssetClassPage from "@/pages/asset-class-page";
import AddAssetPage from "@/pages/add-asset-page";
import AddCashAccountPage from "@/pages/add-cash-account-page";
import AddLoanPage from "@/pages/add-loan-page";
import AddPropertyPage from "@/pages/add-property-page";
import AssetDetailPage from "@/pages/asset-detail-page";
import BalanceSheetPage from "@/pages/balance-sheet-page";
import ExpenseGeneratorPage from "@/pages/expense-generator-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import { UpgradePromptManager } from "@/components/upgrade-prompt-manager";
import DemoOnboardingDialog from "@/components/onboarding/demo-onboarding-dialog";
import { ExpenseCategoryEditorProvider } from "@/contexts/expense-category-edit-context";
import { ExpenseCategoryEditModal } from "@/components/admin/expense-category-edit-modal";
// Import expense management components
import { ExpenseEditProvider } from "@/contexts/expense-edit-context";
import { ExpenseEditModal } from "@/components/expense/expense-edit-modal";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/asset-classes/:classId" component={AssetClassPage} />
      <ProtectedRoute path="/add-asset" component={AddAssetPage} />
      <ProtectedRoute path="/add-cash-account" component={AddCashAccountPage} />
      <ProtectedRoute path="/add-loan" component={AddLoanPage} />
      <ProtectedRoute path="/add-property" component={AddPropertyPage} />
      <ProtectedRoute path="/add-property/:classId" component={AddPropertyPage} />
      <ProtectedRoute path="/assets/:assetId" component={AssetDetailPage} />
      <ProtectedRoute path="/balance-sheet" component={BalanceSheetPage} />
      <ProtectedRoute path="/expense-generator" component={ExpenseGeneratorPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ExpenseCategoryEditorProvider>
          <ExpenseEditProvider>
            <Router />
            <DemoOnboardingDialog />
            <UpgradePromptManager />
            <ExpenseCategoryEditModal />
            <ExpenseEditModal />
            <Toaster />
          </ExpenseEditProvider>
        </ExpenseCategoryEditorProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
