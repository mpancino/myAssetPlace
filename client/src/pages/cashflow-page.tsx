import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { calculateMonthlyInterestExpense } from "@/lib/expense-utils";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { PlusCircle, ArrowDownUp, TrendingUp, Download } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Asset, Mortgage } from "@shared/schema";

// Define the structure for expense objects
interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string;
  annualTotal: number;
}

// Define the structure for category breakdowns
interface CategoryBreakdown {
  category: string;
  amount: number;
}

export default function CashflowPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState("summary");
  
  // Fetch user assets
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });
  
  // Fetch user mortgages separately - mortgages are standalone entities 
  // that will be included in the cashflow calculations
  const { data: mortgages = [], isLoading: isLoadingMortgages } = useQuery<Mortgage[]>({
    queryKey: ['/api/mortgages'],
  });
  
  // Extract income-generating assets
  const incomeAssets = assets.filter((asset: Asset) => {
    // Consider rental properties
    if (asset.isRental) return true;
    
    // Consider employment income
    if (asset.assetClassId === 8) return true; // Assuming 8 is Employment Income
    
    // Consider dividend-generating investments
    if (asset.dividendYield && asset.dividendYield > 0) return true;
    
    // Consider interest-bearing accounts
    if (asset.interestRate && asset.interestRate > 0) return true;
    
    return false;
  });

  // Extract expense-generating assets
  const expenseAssets = assets.filter((asset: Asset) => {
    // Asset has expenses in property expenses
    if (asset.propertyExpenses && Object.keys(asset.propertyExpenses).length > 0) return true;
    
    // Asset has expenses in investment expenses
    if (asset.investmentExpenses && Object.keys(asset.investmentExpenses).length > 0) return true;
    
    // Asset is a liability with ongoing payments
    if (asset.isLiability && asset.paymentAmount) return true;
    
    return false;
  });
  
  // Calculate total monthly income from all assets
  const calculateTotalIncome = () => {
    let total = 0;
    
    incomeAssets.forEach((asset: Asset) => {
      // Rental income
      if (asset.isRental && asset.rentalIncome) {
        // Convert to monthly if needed
        let monthlyAmount = asset.rentalIncome;
        if (asset.rentalFrequency === "weekly") {
          monthlyAmount = asset.rentalIncome * 52 / 12;
        } else if (asset.rentalFrequency === "fortnightly") {
          monthlyAmount = asset.rentalIncome * 26 / 12;
        }
        total += monthlyAmount;
      }
      
      // Employment income (assuming it's stored as annual)
      if (asset.assetClassId === 8 && asset.value) {
        total += asset.value / 12; // Convert annual to monthly
      }
      
      // Dividend income
      if (asset.dividendYield && asset.value) {
        // Assume dividends are paid quarterly, convert to monthly
        const annualDividend = (asset.dividendYield / 100) * asset.value;
        total += annualDividend / 12;
      }
      
      // Interest income
      if (asset.interestRate && asset.value) {
        // Assume interest is calculated monthly
        const annualInterest = (asset.interestRate / 100) * asset.value;
        total += annualInterest / 12;
      }
    });
    
    return total;
  };
  
  // Calculate total monthly expenses from all assets by SUMMING existing expenses
  // - We don't recalculate expense values here, just collect and aggregate them
  const calculateTotalExpenses = () => {
    const categories = getExpenseCategories();
    // Sum all the expense category amounts to get the total monthly expenses
    return categories.reduce((total, cat) => total + cat.amount, 0);
  };
  
  const getIncomeCategories = () => {
    const categories: Record<string, number> = {
      "Rental Income": 0,
      "Employment Income": 0,
      "Dividend Income": 0,
      "Interest Income": 0,
      "Other Income": 0,
    };
    
    incomeAssets.forEach((asset: Asset) => {
      // Rental income
      if (asset.isRental && asset.rentalIncome) {
        let monthlyAmount = asset.rentalIncome;
        if (asset.rentalFrequency === "weekly") {
          monthlyAmount = asset.rentalIncome * 52 / 12;
        } else if (asset.rentalFrequency === "fortnightly") {
          monthlyAmount = asset.rentalIncome * 26 / 12;
        }
        categories["Rental Income"] += monthlyAmount;
      }
      
      // Employment income
      if (asset.assetClassId === 8 && asset.value) {
        categories["Employment Income"] += asset.value / 12;
      }
      
      // Dividend income
      if (asset.dividendYield && asset.value) {
        const annualDividend = (asset.dividendYield / 100) * asset.value;
        categories["Dividend Income"] += annualDividend / 12;
      }
      
      // Interest income
      if (asset.interestRate && asset.value) {
        const annualInterest = (asset.interestRate / 100) * asset.value;
        categories["Interest Income"] += annualInterest / 12;
      }
    });
    
    return Object.entries(categories)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount }));
  };
  
  // This function extracts and categorizes expenses from assets across the application
  // It collects expenses directly from the various assets rather than recalculating them
  // This ensures the cashflow page just sums up expenses that are already calculated elsewhere
  const getExpenseCategories = () => {
    // Initialize expense categories for accumulation
    const categories: Record<string, number> = {
      "Mortgage Payments": 0,
      "Property Expenses": 0,
      "Investment Fees": 0,
      "Interest Expenses": 0,
      "Other Loan Payments": 0,
      "Other Expenses": 0,
    };
    
    // First handle standalone mortgage entities
    mortgages.forEach((mortgage: Mortgage) => {
      if (mortgage.paymentAmount) {
        // Convert payment to monthly equivalent based on frequency
        let monthlyPayment = mortgage.paymentAmount;
        if (mortgage.paymentFrequency === "weekly") {
          monthlyPayment = mortgage.paymentAmount * 52 / 12;
        } else if (mortgage.paymentFrequency === "fortnightly") {
          monthlyPayment = mortgage.paymentAmount * 26 / 12;
        } else if (mortgage.paymentFrequency === "quarterly") {
          monthlyPayment = mortgage.paymentAmount / 3;
        } else if (mortgage.paymentFrequency === "annually") {
          monthlyPayment = mortgage.paymentAmount / 12;
        }
        
        // Calculate interest component
        const monthlyRate = mortgage.interestRate / 100 / 12;
        const principal = mortgage.originalAmount;
        // This is a simplified calculation; a more accurate one would use the current balance
        const monthlyInterest = principal * monthlyRate;
        
        // Add interest to Interest Expenses
        categories["Interest Expenses"] += monthlyInterest;
        
        // Add principal component to Mortgage Payments
        const principalPayment = monthlyPayment - monthlyInterest;
        categories["Mortgage Payments"] += principalPayment;
      }
    });
    
    // Then handle expenses associated with assets
    expenseAssets.forEach((asset: Asset) => {
      // Property expenses
      if (asset.propertyExpenses) {
        Object.values(asset.propertyExpenses).forEach((expense: any) => {
          let monthlyAmount = expense.amount;
          if (expense.frequency === "weekly") {
            monthlyAmount = expense.amount * 52 / 12;
          } else if (expense.frequency === "fortnightly") {
            monthlyAmount = expense.amount * 26 / 12;
          } else if (expense.frequency === "quarterly") {
            monthlyAmount = expense.amount / 3;
          } else if (expense.frequency === "annually") {
            monthlyAmount = expense.amount / 12;
          }
          categories["Property Expenses"] += monthlyAmount;
        });
      }
      
      // Investment expenses
      if (asset.investmentExpenses) {
        Object.values(asset.investmentExpenses).forEach((expense: any) => {
          let monthlyAmount = expense.amount;
          if (expense.frequency === "weekly") {
            monthlyAmount = expense.amount * 52 / 12;
          } else if (expense.frequency === "fortnightly") {
            monthlyAmount = expense.amount * 26 / 12;
          } else if (expense.frequency === "quarterly") {
            monthlyAmount = expense.amount / 3;
          } else if (expense.frequency === "annually") {
            monthlyAmount = expense.amount / 12;
          }
          categories["Investment Fees"] += monthlyAmount;
        });
      }
      
      // Get interest expense from utility function
      // This also ensures isLiability flag is set for any asset with interest
      const monthlyInterest = calculateMonthlyInterestExpense(asset);
      
      // Add interest expense to the appropriate category
      if (monthlyInterest > 0) {
        categories["Interest Expenses"] += monthlyInterest;
      }
      
      // Handle loan payments, separating principal from interest
      if (asset.isLiability && asset.paymentAmount) {
        let monthlyPayment = asset.paymentAmount;
        if (asset.paymentFrequency === "weekly") {
          monthlyPayment = asset.paymentAmount * 52 / 12;
        } else if (asset.paymentFrequency === "fortnightly") {
          monthlyPayment = asset.paymentAmount * 26 / 12;
        } else if (asset.paymentFrequency === "quarterly") {
          monthlyPayment = asset.paymentAmount / 3;
        } else if (asset.paymentFrequency === "annually") {
          monthlyPayment = asset.paymentAmount / 12;
        }
        
        // Calculate principal portion (payment minus interest)
        const principalPayment = monthlyPayment - monthlyInterest;
        
        // Categorize principal portion of mortgage vs other loans
        if (asset.propertyType) {
          categories["Mortgage Payments"] += principalPayment;
        } else {
          categories["Other Loan Payments"] += principalPayment;
        }
      }
    });
    
    return Object.entries(categories)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount }));
  };
  
  // Calculate totals
  const monthlyIncome = calculateTotalIncome();
  const monthlyExpenses = calculateTotalExpenses();
  const monthlyCashflow = monthlyIncome - monthlyExpenses;
  
  // Scale to selected period
  const getScaledValues = () => {
    let incomeScaled = monthlyIncome;
    let expensesScaled = monthlyExpenses;
    let cashflowScaled = monthlyCashflow;
    
    if (selectedPeriod === "annually") {
      incomeScaled *= 12;
      expensesScaled *= 12;
      cashflowScaled *= 12;
    } else if (selectedPeriod === "quarterly") {
      incomeScaled *= 3;
      expensesScaled *= 3;
      cashflowScaled *= 3;
    }
    
    return { income: incomeScaled, expenses: expensesScaled, cashflow: cashflowScaled };
  };
  
  const { income, expenses, cashflow } = getScaledValues();
  
  // Get income and expense breakdowns
  const incomeCategories = getIncomeCategories();
  const expenseCategories = getExpenseCategories();
  
  // Scale category amounts based on selected period
  const scaleAmount = (amount: number) => {
    if (selectedPeriod === "annually") return amount * 12;
    if (selectedPeriod === "quarterly") return amount * 3;
    return amount;
  };

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cashflow Statement</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your income, expenses, and net cashflow
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-2">
              <Label htmlFor="period-select">View Period</Label>
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger id="period-select" className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="year-select">Year</Label>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
              >
                <SelectTrigger id="year-select" className="w-[120px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                  <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                  <SelectItem value={(new Date().getFullYear() + 1).toString()}>{new Date().getFullYear() + 1}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Manual Entry
            </Button>
          </div>
        </div>
        
        {isLoadingAssets || isLoadingMortgages ? (
          <div className="flex items-center justify-center h-60">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Total Income</CardTitle>
                  <CardDescription>
                    {selectedPeriod === "monthly" ? "Monthly" : selectedPeriod === "quarterly" ? "Quarterly" : "Annual"} income
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(income)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Total Expenses</CardTitle>
                  <CardDescription>
                    {selectedPeriod === "monthly" ? "Monthly" : selectedPeriod === "quarterly" ? "Quarterly" : "Annual"} expenses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(expenses)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Net Cashflow</CardTitle>
                  <CardDescription>
                    {selectedPeriod === "monthly" ? "Monthly" : selectedPeriod === "quarterly" ? "Quarterly" : "Annual"} difference
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${cashflow >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {formatCurrency(cashflow)}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="pt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Income Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">% of Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomeCategories.map((cat: CategoryBreakdown, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{cat.category}</TableCell>
                              <TableCell className="text-right">{formatCurrency(scaleAmount(cat.amount))}</TableCell>
                              <TableCell className="text-right">{((cat.amount / monthlyIncome) * 100).toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className="font-bold">Total</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(income)}</TableCell>
                            <TableCell className="text-right font-bold">100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">% of Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseCategories.map((cat: CategoryBreakdown, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{cat.category}</TableCell>
                              <TableCell className="text-right">{formatCurrency(scaleAmount(cat.amount))}</TableCell>
                              <TableCell className="text-right">{((cat.amount / monthlyExpenses) * 100).toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className="font-bold">Total</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(expenses)}</TableCell>
                            <TableCell className="text-right font-bold">100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="income" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Income Sources</CardTitle>
                    <CardDescription>
                      Detailed breakdown of all income sources
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeAssets.map((asset: Asset, i) => {
                          // Rental income
                          if (asset.isRental && asset.rentalIncome) {
                            return (
                              <TableRow key={`rental-${i}`}>
                                <TableCell className="font-medium">{asset.name}</TableCell>
                                <TableCell>Rental Income</TableCell>
                                <TableCell>{asset.rentalFrequency || "Monthly"}</TableCell>
                                <TableCell className="text-right">{formatCurrency(asset.rentalIncome)}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(scaleAmount(
                                    asset.rentalFrequency === "weekly" 
                                      ? asset.rentalIncome * 52 / 12
                                      : asset.rentalFrequency === "fortnightly"
                                        ? asset.rentalIncome * 26 / 12
                                        : asset.rentalIncome
                                  ))}
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          // Employment income
                          if (asset.assetClassId === 8 && asset.value) {
                            return (
                              <TableRow key={`employment-${i}`}>
                                <TableCell className="font-medium">{asset.name}</TableCell>
                                <TableCell>Employment Income</TableCell>
                                <TableCell>Annual</TableCell>
                                <TableCell className="text-right">{formatCurrency(asset.value)}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(scaleAmount(asset.value / 12))}
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          // Dividend income
                          if (asset.dividendYield && asset.value) {
                            const annualDividend = (asset.dividendYield / 100) * asset.value;
                            return (
                              <TableRow key={`dividend-${i}`}>
                                <TableCell className="font-medium">{asset.name}</TableCell>
                                <TableCell>Dividend Income</TableCell>
                                <TableCell>Quarterly</TableCell>
                                <TableCell className="text-right">{`${asset.dividendYield}% (${formatCurrency(annualDividend / 4)} quarterly)`}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(scaleAmount(annualDividend / 12))}
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          // Interest income
                          if (asset.interestRate && asset.value) {
                            const annualInterest = (asset.interestRate / 100) * asset.value;
                            return (
                              <TableRow key={`interest-${i}`}>
                                <TableCell className="font-medium">{asset.name}</TableCell>
                                <TableCell>Interest Income</TableCell>
                                <TableCell>Monthly</TableCell>
                                <TableCell className="text-right">{`${asset.interestRate}% (${formatCurrency(annualInterest / 12)} monthly)`}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(scaleAmount(annualInterest / 12))}
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          return null;
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="expenses" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Details</CardTitle>
                    <CardDescription>
                      Detailed breakdown of all expenses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Expense</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* First display standalone mortgage expenses */}
                        {mortgages.map((mortgage: Mortgage) => {
                          if (mortgage.paymentAmount) {
                            // Convert payment to monthly equivalent based on frequency
                            let monthlyPayment = mortgage.paymentAmount;
                            if (mortgage.paymentFrequency === "weekly") {
                              monthlyPayment = mortgage.paymentAmount * 52 / 12;
                            } else if (mortgage.paymentFrequency === "fortnightly") {
                              monthlyPayment = mortgage.paymentAmount * 26 / 12;
                            } else if (mortgage.paymentFrequency === "quarterly") {
                              monthlyPayment = mortgage.paymentAmount / 3;
                            } else if (mortgage.paymentFrequency === "annually") {
                              monthlyPayment = mortgage.paymentAmount / 12;
                            }
                            
                            // Calculate interest component
                            const monthlyRate = mortgage.interestRate / 100 / 12;
                            const principal = mortgage.originalAmount;
                            const monthlyInterest = principal * monthlyRate;
                            
                            // Get the property name if available
                            let propertyName = "Unknown Property";
                            if (mortgage.securedAssetId) {
                              const securedAsset = assets.find(a => a.id === mortgage.securedAssetId);
                              if (securedAsset) {
                                propertyName = securedAsset.name;
                              }
                            }
                            
                            return (
                              <TableRow key={`mortgage-${mortgage.id}`}>
                                <TableCell className="font-medium">{propertyName}</TableCell>
                                <TableCell>{mortgage.lender} Mortgage</TableCell>
                                <TableCell>Mortgage Payment</TableCell>
                                <TableCell>{mortgage.paymentFrequency}</TableCell>
                                <TableCell className="text-right">{formatCurrency(mortgage.paymentAmount)}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(scaleAmount(monthlyPayment))}
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return null;
                        })}
                        
                        {/* Then display expenses associated with assets */}
                        {expenseAssets.map((asset: Asset) => {
                          // Property expenses
                          if (asset.propertyExpenses) {
                            return Object.entries(asset.propertyExpenses).map(([id, expense]: [string, any], i) => (
                              <TableRow key={`property-${asset.id}-${id}`}>
                                <TableCell className="font-medium">{asset.name}</TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell>Property Expense</TableCell>
                                <TableCell>{expense.frequency}</TableCell>
                                <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(scaleAmount(
                                    expense.frequency === "weekly" 
                                      ? expense.amount * 52 / 12
                                      : expense.frequency === "fortnightly"
                                        ? expense.amount * 26 / 12
                                        : expense.frequency === "quarterly"
                                          ? expense.amount / 3
                                          : expense.frequency === "annually"
                                            ? expense.amount / 12
                                            : expense.amount
                                  ))}
                                </TableCell>
                              </TableRow>
                            ));
                          }
                          
                          // Investment expenses
                          if (asset.investmentExpenses) {
                            return Object.entries(asset.investmentExpenses).map(([id, expense]: [string, any], i) => (
                              <TableRow key={`investment-${asset.id}-${id}`}>
                                <TableCell className="font-medium">{asset.name}</TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell>Investment Fee</TableCell>
                                <TableCell>{expense.frequency}</TableCell>
                                <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(scaleAmount(
                                    expense.frequency === "weekly" 
                                      ? expense.amount * 52 / 12
                                      : expense.frequency === "fortnightly"
                                        ? expense.amount * 26 / 12
                                        : expense.frequency === "quarterly"
                                          ? expense.amount / 3
                                          : expense.frequency === "annually"
                                            ? expense.amount / 12
                                            : expense.amount
                                  ))}
                                </TableCell>
                              </TableRow>
                            ));
                          }
                          
                          // Interest expenses
                          // Get interest expense from utility function
                          // This also ensures the isLiability flag is set for any asset with interest
                          const monthlyInterest = calculateMonthlyInterestExpense(asset);
                          
                          // If we have interest data and payment data, show payment split
                          if (asset.isLiability && monthlyInterest > 0 && asset.paymentAmount) {
                            // Convert payment to monthly if needed
                            let monthlyPayment = asset.paymentAmount;
                            if (asset.paymentFrequency === "weekly") {
                              monthlyPayment = asset.paymentAmount * 52 / 12;
                            } else if (asset.paymentFrequency === "fortnightly") {
                              monthlyPayment = asset.paymentAmount * 26 / 12;
                            } else if (asset.paymentFrequency === "quarterly") {
                              monthlyPayment = asset.paymentAmount / 3;
                            } else if (asset.paymentFrequency === "annually") {
                              monthlyPayment = asset.paymentAmount / 12;
                            }
                            
                            const monthlyPrincipal = monthlyPayment - monthlyInterest;
                            
                            // Return both interest and principal rows
                            return (
                                <>
                                  <TableRow key={`loan-principal-${asset.id}`}>
                                    <TableCell className="font-medium">{asset.name}</TableCell>
                                    <TableCell>Principal Payment</TableCell>
                                    <TableCell>{asset.propertyType ? "Mortgage" : "Other Loan"}</TableCell>
                                    <TableCell>{asset.paymentFrequency}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(monthlyPrincipal)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(scaleAmount(monthlyPrincipal))}</TableCell>
                                  </TableRow>
                                  <TableRow key={`loan-interest-${asset.id}`}>
                                    <TableCell className="font-medium">{asset.name}</TableCell>
                                    <TableCell>Interest Expenses</TableCell>
                                    <TableCell>{asset.propertyType ? "Mortgage" : "Other Loan"}</TableCell>
                                    <TableCell>Monthly</TableCell>
                                    <TableCell className="text-right">{formatCurrency(monthlyInterest)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(scaleAmount(monthlyInterest))}</TableCell>
                                  </TableRow>
                                </>
                              );
                          }
                          
                          // Show just interest expense if we have interest but no payment data
                          if (asset.isLiability && monthlyInterest > 0 && !asset.paymentAmount) {
                            return (
                              <TableRow key={`interest-only-${asset.id}`}>
                                <TableCell className="font-medium">{asset.name}</TableCell>
                                <TableCell>Interest Expenses</TableCell>
                                <TableCell>{asset.propertyType ? "Mortgage" : "Other Loan"}</TableCell>
                                <TableCell>Monthly</TableCell>
                                <TableCell className="text-right">{formatCurrency(monthlyInterest)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(scaleAmount(monthlyInterest))}</TableCell>
                              </TableRow>
                            );
                          }
                          
                          return null;
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}