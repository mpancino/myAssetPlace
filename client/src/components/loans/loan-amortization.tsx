import React, { useMemo, useState } from "react";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Banknote,
  Clock,
  DollarSign,
  Calendar,
  RefreshCcw,
  Calculator,
  PieChart,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { generateAmortizationSchedule } from "@shared/calculations";

interface LoanAmortizationProps {
  loanAmount: number;
  interestRate: number;
  termInMonths: number;
  startDate?: Date | string;
  currentDate?: Date | string;
}

export function LoanAmortization({
  loanAmount,
  interestRate,
  termInMonths,
  startDate,
  currentDate = new Date(),
}: LoanAmortizationProps) {
  const [page, setPage] = useState(1);
  const pageSize = 12; // Show 1 year at a time
  
  // Convert rates from percentage to decimal
  const rateDecimal = interestRate / 100;
  const termInYears = termInMonths / 12;

  // Generate amortization schedule
  const schedule = useMemo(() => {
    if (!loanAmount || !interestRate || !termInMonths) return [];
    return generateAmortizationSchedule(loanAmount, rateDecimal, termInYears, 12);
  }, [loanAmount, rateDecimal, termInYears]);
  
  // Current page data
  const currentPageData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return schedule.slice(startIndex, startIndex + pageSize);
  }, [schedule, page, pageSize]);
  
  // Calculate total payments
  const totalPayments = useMemo(() => {
    if (schedule.length === 0) return { total: 0, principal: 0, interest: 0 };
    
    const totalPrincipal = schedule.reduce((sum, payment) => sum + payment.principal, 0);
    const totalInterest = schedule.reduce((sum, payment) => sum + payment.interest, 0);
    
    return {
      total: totalPrincipal + totalInterest,
      principal: totalPrincipal,
      interest: totalInterest
    };
  }, [schedule]);
  
  // Calculate remaining payments
  const getEstimatedCurrentBalance = () => {
    if (!schedule.length) return loanAmount;
    
    // If startDate is provided, calculate months elapsed
    if (startDate) {
      const start = new Date(startDate);
      const current = new Date(currentDate);
      
      // Calculate months between dates
      const monthsElapsed = 
        (current.getFullYear() - start.getFullYear()) * 12 + 
        (current.getMonth() - start.getMonth());
      
      // Find appropriate payment in schedule
      if (monthsElapsed <= 0) return loanAmount;
      if (monthsElapsed >= schedule.length) return 0;
      
      return schedule[monthsElapsed - 1].balance;
    }
    
    return loanAmount; // Default if can't calculate
  };
  
  const currentBalance = getEstimatedCurrentBalance();
  const percentagePaid = ((loanAmount - currentBalance) / loanAmount) * 100;
  
  // Calculate upcoming payment breakdown (using current balance)
  const upcomingPayment = useMemo(() => {
    if (!currentBalance || currentBalance <= 0) return null;
    
    const payment = schedule[0].payment;
    const periodicRate = rateDecimal / 12;
    const interestAmount = currentBalance * periodicRate;
    const principalAmount = payment - interestAmount;
    
    return {
      payment,
      principal: principalAmount,
      interest: interestAmount
    };
  }, [currentBalance, rateDecimal, schedule]);
  
  // Navigate through pages
  const totalPages = Math.ceil(schedule.length / pageSize);
  const canGoNext = page < totalPages;
  const canGoPrevious = page > 1;
  
  const nextPage = () => {
    if (canGoNext) setPage(page + 1);
  };
  
  const previousPage = () => {
    if (canGoPrevious) setPage(page - 1);
  };

  if (!loanAmount || !interestRate || !termInMonths) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loan Amortization</CardTitle>
          <CardDescription>
            Incomplete loan information. Please provide all required details.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="mr-2 h-5 w-5" /> Loan Repayment Summary
          </CardTitle>
          <CardDescription>
            Overview of your loan payments and amortization schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-muted-foreground text-sm mb-1 flex items-center">
                <Banknote className="mr-1 h-4 w-4" /> Loan Amount
              </div>
              <div className="text-xl font-semibold">{formatCurrency(loanAmount)}</div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-muted-foreground text-sm mb-1 flex items-center">
                <DollarSign className="mr-1 h-4 w-4" /> Monthly Payment
              </div>
              <div className="text-xl font-semibold">
                {schedule.length > 0 ? formatCurrency(schedule[0].payment) : "N/A"}
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-muted-foreground text-sm mb-1 flex items-center">
                <Clock className="mr-1 h-4 w-4" /> Loan Term
              </div>
              <div className="text-xl font-semibold">
                {termInYears.toFixed(termInYears % 1 === 0 ? 0 : 1)} years ({termInMonths} months)
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-muted-foreground text-sm mb-1 flex items-center">
                <RefreshCcw className="mr-1 h-4 w-4" /> Interest Rate
              </div>
              <div className="text-xl font-semibold">{interestRate.toFixed(2)}%</div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="text-sm font-medium mb-2">Loan Progress</div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{formatCurrency(loanAmount - currentBalance)} paid</span>
              <span>{formatCurrency(currentBalance)} remaining</span>
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
                Payment Breakdown
              </h4>
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Principal</div>
                    <div className="font-medium">
                      {upcomingPayment
                        ? formatCurrency(upcomingPayment.principal)
                        : "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {upcomingPayment
                        ? `${((upcomingPayment.principal / upcomingPayment.payment) * 100).toFixed(1)}%`
                        : ""}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Interest</div>
                    <div className="font-medium">
                      {upcomingPayment
                        ? formatCurrency(upcomingPayment.interest)
                        : "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {upcomingPayment
                        ? `${((upcomingPayment.interest / upcomingPayment.payment) * 100).toFixed(1)}%`
                        : ""}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="text-muted-foreground text-xs mb-1">Total Payment</div>
                  <div className="font-medium">
                    {upcomingPayment ? formatCurrency(upcomingPayment.payment) : "N/A"}
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
                    <div className="font-medium">{formatCurrency(totalPayments.principal)}</div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Interest Payments</div>
                    <div className="font-medium">{formatCurrency(totalPayments.interest)}</div>
                  </div>
                  
                  <div className="pt-2 border-t border-border">
                    <div className="text-muted-foreground text-xs mb-1">Total Cost of Loan</div>
                    <div className="font-medium">{formatCurrency(totalPayments.total)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {loanAmount > 0
                        ? `${((totalPayments.interest / loanAmount) * 100).toFixed(1)}% paid in interest`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Amortization Schedule</CardTitle>
          <CardDescription>
            Showing payments {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, schedule.length)} of {schedule.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageData.map((payment, index) => (
                  <TableRow key={`payment-${(page - 1) * pageSize + index + 1}`}>
                    <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                    <TableCell>{formatCurrency(payment.payment)}</TableCell>
                    <TableCell>{formatCurrency(payment.principal)}</TableCell>
                    <TableCell>{formatCurrency(payment.interest)}</TableCell>
                    <TableCell>{formatCurrency(payment.balance)}</TableCell>
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
                        onClick={previousPage}
                        disabled={!canGoPrevious}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextPage}
                        disabled={!canGoNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}