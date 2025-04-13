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
import EditCashAccountPage from "@/pages/edit-cash-account-page";
import AddLoanPage from "@/pages/add-loan-page";
import AddPropertyPage from "@/pages/add-property-page";
import AddSharePage from "@/pages/add-share-page";
import EditSharePage from "@/pages/edit-share-page"; 
import AddStockOptionPage from "@/pages/add-stock-option-page";
import EditStockOptionPage from "@/pages/edit-stock-option-page";
import AddRetirementPage from "@/pages/add-retirement-page";
import EditRetirementPage from "@/pages/edit-retirement-page";
import AddEmploymentIncomePage from "@/pages/add-employment-income-page";
import EditEmploymentIncomePage from "@/pages/edit-employment-income-page";
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
// Import the global expense context
import { ExpenseProvider } from "@/contexts/ExpenseContext";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/asset-classes/:classId" component={AssetClassPage} />
      <ProtectedRoute path="/add-asset" component={AddAssetPage} />
      <ProtectedRoute path="/add-cash-account" component={AddCashAccountPage} />
      <ProtectedRoute path="/edit-cash-account/:assetId" component={EditCashAccountPage} />
      <ProtectedRoute path="/add-loan" component={AddLoanPage} />
      <ProtectedRoute path="/add-property" component={AddPropertyPage} />
      <ProtectedRoute path="/add-property/:classId" component={AddPropertyPage} />
      <ProtectedRoute path="/add-share" component={AddSharePage} />
      <ProtectedRoute path="/add-share/:classId" component={AddSharePage} />
      <ProtectedRoute path="/add-stock-option" component={AddStockOptionPage} />
      <ProtectedRoute path="/add-stock-option/:classId" component={AddStockOptionPage} />
      <ProtectedRoute path="/edit-stock-option/:assetId" component={EditStockOptionPage} />
      <ProtectedRoute path="/edit-share/:assetId" component={EditSharePage} />
      <ProtectedRoute path="/add-retirement" component={AddRetirementPage} />
      <ProtectedRoute path="/add-retirement/:classId" component={AddRetirementPage} />
      <ProtectedRoute path="/edit-retirement/:assetId" component={EditRetirementPage} />
      <ProtectedRoute path="/add-employment-income" component={AddEmploymentIncomePage} />
      <ProtectedRoute path="/edit-employment-income/:id" component={EditEmploymentIncomePage} />
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
        <ExpenseProvider>
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
        </ExpenseProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
