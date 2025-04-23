/**
 * DEPRECATED: This file is kept for backward compatibility but should not be used for new code.
 * Import expense utility functions from expense-utils-new.ts instead, which properly uses 
 * the shared standardized expense utilities.
 * 
 * @deprecated Use expense-utils-new.ts which uses the shared implementation
 */
import {
  parseExpenses,
  calculateAnnualAmount,
  calculateTotalAnnualExpenses as calculateTotalAnnual,
  getMonthlyExpenseBreakdown as getMonthlyBreakdown,
  groupExpensesByCategory as groupByCategory,
  calculateExpenseToValueRatio as calculateRatio,
  getExpenseCount as countExpenses,
  generateExpenseId,
  calculateMonthlyInterestExpense,
  standardizeExpense,
  FREQUENCY_MULTIPLIERS
} from './expense-utils-new';

import {
  convertToPageFormat as convertToPage,
  convertToComponentFormat as convertToComponent,
  calculateAnnualExpenses as calculateAnnual
} from './expense-utils-new';

// Re-export all functions from expense-utils-new to maintain backward compatibility
export {
  parseExpenses,
  standardizeExpense,
  calculateMonthlyInterestExpense,
  generateExpenseId,
  FREQUENCY_MULTIPLIERS
};

// Keep function names the same for backward compatibility
export const calculateAnnualExpenses = calculateAnnual;
export const getMonthlyExpenseBreakdown = getMonthlyBreakdown;
export const groupExpensesByCategory = groupByCategory;
export const calculateExpenseToValueRatio = calculateRatio;
export const getExpenseCount = countExpenses;
export const convertToPageFormat = convertToPage;
export const convertToComponentFormat = convertToComponent;

/**
 * Standardize expense fields (wrapper for standardizeExpense)
 * @deprecated Use standardizeExpense from expense-utils-new.ts instead
 */
export function standardizeExpenseFields(expenses: Record<string, any> | null | undefined): Record<string, any> {
  if (!expenses) return {};
  
  const traceId = Math.floor(Math.random() * 10000);
  console.log(`[DEPRECATED:${traceId}] standardizeExpenseFields is deprecated, use standardizeExpense instead`);
  
  const result: Record<string, any> = {};
  
  // Use standardizeExpense for each expense
  Object.entries(expenses).forEach(([key, expense]) => {
    if (!expense || typeof expense !== 'object') return;
    
    const standardized = standardizeExpense(expense);
    
    // Add UI display fields for backward compatibility
    result[key] = {
      ...standardized,
      category: standardized.categoryId,
      description: standardized.name,
      annualTotal: calculateAnnualAmount(standardized)
    };
  });
  
  return result;
}