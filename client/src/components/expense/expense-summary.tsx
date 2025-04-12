import { useMemo } from 'react';
import { 
  calculateAnnualExpenses, 
  getExpenseCount, 
  getMonthlyExpenseBreakdown 
} from '@/lib/expense-utils';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CircleDollarSign, BarChart3 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExpenseSummaryProps {
  expenses: Record<string, any> | null | undefined;
  assetValue?: number;
  compact?: boolean;
  className?: string;
}

/**
 * A reusable component for displaying expense summaries that can be used
 * within asset cards, detail pages, and dashboard widgets
 */
export function ExpenseSummary({ 
  expenses, 
  assetValue,
  compact = false,
  className = '' 
}: ExpenseSummaryProps) {
  // Calculate key metrics
  const expenseCount = useMemo(() => getExpenseCount(expenses), [expenses]);
  const annualTotal = useMemo(() => calculateAnnualExpenses(expenses), [expenses]);
  const monthlyTotal = useMemo(() => getMonthlyExpenseBreakdown(expenses), [expenses]);
  
  // Skip rendering if no expenses
  if (expenseCount === 0) {
    return null;
  }

  // For compact display (used in cards and table rows)
  if (compact) {
    return (
      <div className={`text-sm flex items-center gap-1.5 ${className}`}>
        <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-medium">
                {formatCurrency(monthlyTotal)}/mo
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <p>{expenseCount} expense{expenseCount !== 1 ? 's' : ''}</p>
                <p className="font-semibold">{formatCurrency(annualTotal)}/year</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // For detailed display (used in detail pages)
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          Expenses
        </h4>
        <Badge variant="outline">
          {expenseCount} item{expenseCount !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Monthly</div>
          <div className="text-base font-semibold">{formatCurrency(monthlyTotal)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Annual</div>
          <div className="text-base font-semibold">{formatCurrency(annualTotal)}</div>
        </div>
      </div>
      
      {assetValue && assetValue > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>{((annualTotal / assetValue) * 100).toFixed(1)}% of asset value</span>
        </div>
      )}
    </div>
  );
}