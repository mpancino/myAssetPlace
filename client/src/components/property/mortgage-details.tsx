import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  Home,
  Landmark,
  PieChart,
  RefreshCcw,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { Asset, Mortgage } from "@shared/schema";
import { calculateLoanPayment, calculatePrincipalAndInterest, generateAmortizationSchedule } from "@shared/calculations";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface MortgageDetailsProps {
  property: Asset;
  mortgages?: Mortgage[];
  isLoading?: boolean;
}

export function MortgageDetails({ property, mortgages = [], isLoading = false }: MortgageDetailsProps) {
  const [showAmortizationTable, setShowAmortizationTable] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12; // Show 1 year of payments
  const [, navigate] = useLocation();
  
  // First check if the mortgage data is still loading
  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-4 w-4" /> Mortgage Information
          </CardTitle>
          <CardDescription>Loading mortgage details...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Add debug logging for the mortgage data
  console.log("MortgageDetails component received:", {
    propertyId: property.id,
    mortgages: mortgages,
    mortgagesCount: mortgages.length,
    isLoading: isLoading
  });
  
  // Get the primary mortgage (should be only one for now, but could be multiple in the future)
  const mortgage = mortgages.length > 0 ? mortgages[0] : null;
  
  // Debug log the mortgage details
  if (mortgage) {
    console.log("Primary mortgage details:", {
      id: mortgage.id,
      originalAmount: mortgage.originalAmount,
      interestRate: mortgage.interestRate,
      loanTerm: mortgage.loanTerm, // Field name in DB is loanTerm, not termMonths
      startDate: mortgage.startDate,
      interestRateType: mortgage.interestRateType
    });
  }
  
  // Extract mortgage details 
  const mortgageAmount = mortgage ? mortgage.originalAmount : 0;
  const interestRate = mortgage ? mortgage.interestRate : 0;
  const termInMonths = mortgage ? mortgage.loanTerm : 0; // Changed from termMonths to loanTerm
  const termInYears = termInMonths / 12;
  const startDate = mortgage ? mortgage.startDate : property.purchaseDate;
  
  // Check if mortgage exists
  const hasMortgage = mortgage !== null && mortgageAmount > 0 && interestRate > 0 && termInMonths > 0;
  
  // Function to navigate to add a new mortgage
  const handleAddNewMortgage = () => {
    // Navigate to add loan page with pre-filled values for a mortgage on this property
    navigate(`/add-loan?type=mortgage&securedAssetId=${property.id}`);
  };
  
  // Function to navigate to the mortgage edit page in the Loans area
  const handleEditMortgage = () => {
    if (mortgage && mortgage.id) {
      // Navigate to the edit loan page with the mortgage ID
      navigate(`/edit-loan/${mortgage.id}`);
    }
  };
  
  // Function to view in Loans & Liabilities
  const handleViewInLoans = () => {
    if (mortgage && mortgage.id) {
      navigate(`/asset-classes/2`);
    }
  };
  
  if (!hasMortgage) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-4 w-4" /> Mortgage Information
          </CardTitle>
          <CardDescription>No mortgage information available for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">
              This property doesn't have mortgage details. It may be owned outright, or you can add a mortgage to track financing information.
            </p>
            <Button onClick={handleAddNewMortgage} className="mx-auto">
              <Edit className="mr-2 h-4 w-4" />
              Add Mortgage
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate monthly payment
  const monthlyPayment = calculateLoanPayment(
    mortgageAmount,
    interestRate / 100,
    termInYears
  );
  
  // Generate amortization schedule
  const schedule = generateAmortizationSchedule(
    mortgageAmount,
    interestRate / 100,
    termInYears
  );
  
  // Current page data for amortization table
  const currentPageData = schedule.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(schedule.length / pageSize);
  
  // Calculate total payments
  const totalPrincipal = schedule.reduce((sum, payment) => sum + payment.principal, 0);
  const totalInterest = schedule.reduce((sum, payment) => sum + payment.interest, 0);
  const totalPayments = totalPrincipal + totalInterest;
  
  // Calculate current loan balance
  const calculateCurrentBalance = () => {
    if (!startDate) return mortgageAmount;
    
    const start = new Date(startDate);
    const current = new Date();
    
    // Calculate months elapsed
    const monthsElapsed = 
      (current.getFullYear() - start.getFullYear()) * 12 + 
      (current.getMonth() - start.getMonth());
    
    if (monthsElapsed <= 0) return mortgageAmount;
    if (monthsElapsed >= schedule.length) return 0;
    
    return schedule[monthsElapsed - 1].balance;
  };
  
  const currentBalance = calculateCurrentBalance();
  const percentagePaid = ((mortgageAmount - currentBalance) / mortgageAmount) * 100;
  
  // Calculate current payment breakdown
  const currentPaymentBreakdown = calculatePrincipalAndInterest(
    currentBalance,
    interestRate / 100,
    monthlyPayment
  );
  
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-4 w-4" /> Mortgage Information
          </CardTitle>
          <CardDescription>View mortgage details and amortization schedule</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 lg:px-3"
            onClick={handleViewInLoans}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">View in Loans</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 lg:px-3"
            onClick={handleEditMortgage}
          >
            <Edit className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Edit Mortgage</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="text-muted-foreground text-sm mb-1 flex items-center">
              <Banknote className="mr-1 h-4 w-4" /> Original Loan
            </div>
            <div className="text-xl font-semibold">{formatCurrency(mortgageAmount, '$', false)}</div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="text-muted-foreground text-sm mb-1 flex items-center">
              <DollarSign className="mr-1 h-4 w-4" /> Monthly Payment
            </div>
            <div className="text-xl font-semibold">{formatCurrency(monthlyPayment, '$', false)}</div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="text-muted-foreground text-sm mb-1 flex items-center">
              <Clock className="mr-1 h-4 w-4" /> Term
            </div>
            <div className="text-xl font-semibold">
              {termInYears.toFixed(termInYears % 1 === 0 ? 0 : 1)} years
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="text-muted-foreground text-sm mb-1 flex items-center">
              <RefreshCcw className="mr-1 h-4 w-4" /> Interest Rate
            </div>
            <div className="text-xl font-semibold">{interestRate.toFixed(2)}%</div>
          </div>
        </div>
        
        <div>
          <div className="text-sm font-medium mb-2">Mortgage Progress</div>
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>{formatCurrency(mortgageAmount - currentBalance, '$', false)} paid</span>
            <span>{formatCurrency(currentBalance, '$', false)} remaining</span>
          </div>
          <Progress value={percentagePaid} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <PieChart className="mr-2 h-4 w-4" />
              Current Payment Breakdown
            </h4>
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Principal</div>
                  <div className="font-medium">
                    {formatCurrency(currentPaymentBreakdown.principal, '$', false)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((currentPaymentBreakdown.principal / monthlyPayment) * 100).toFixed(1)}%
                  </div>
                </div>
                
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Interest Expenses</div>
                  <div className="font-medium text-amber-600">
                    {formatCurrency(currentPaymentBreakdown.interest, '$', false)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((currentPaymentBreakdown.interest / monthlyPayment) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-muted-foreground text-xs mb-1">Total Payment</div>
                <div className="font-medium">
                  {formatCurrency(monthlyPayment, '$', false)}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Loan Totals
            </h4>
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Principal Payments</div>
                  <div className="font-medium">{formatCurrency(totalPrincipal, '$', false)}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Interest Expenses</div>
                  <div className="font-medium text-amber-600">{formatCurrency(totalInterest, '$', false)}</div>
                </div>
                
                <div className="pt-2 border-t border-border">
                  <div className="text-muted-foreground text-xs mb-1">Total Cost of Loan</div>
                  <div className="font-medium">{formatCurrency(totalPayments, '$', false)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((totalInterest / mortgageAmount) * 100).toFixed(1)}% paid as interest expenses
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <Button
            variant="outline"
            onClick={() => setShowAmortizationTable(!showAmortizationTable)}
            className="mb-4"
          >
            {showAmortizationTable ? "Hide" : "Show"} Amortization Schedule
          </Button>
          
          {showAmortizationTable && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest Expenses</TableHead>
                    <TableHead>Remaining Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageData.map((payment, index) => (
                    <TableRow key={`payment-${(page - 1) * pageSize + index + 1}`}>
                      <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                      <TableCell>{formatCurrency(payment.payment, '$', false)}</TableCell>
                      <TableCell>{formatCurrency(payment.principal, '$', false)}</TableCell>
                      <TableCell>{formatCurrency(payment.interest, '$', false)}</TableCell>
                      <TableCell>{formatCurrency(payment.balance, '$', false)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Page {page} of {totalPages}</TableCell>
                    <TableCell colSpan={3} className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => page > 1 && setPage(page - 1)}
                          disabled={page <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => page < totalPages && setPage(page + 1)}
                          disabled={page >= totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}