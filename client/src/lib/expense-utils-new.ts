/**
 * Client-side expense utility functions that use the shared implementation.
 * This file re-exports functions from the shared expense-utils.ts for use in the client.
 */
import {
  parseExpenses,
  calculateAnnualAmount,
  calculateTotalAnnualExpenses,
  getMonthlyExpenseBreakdown,
  groupExpensesByCategory,
  calculateExpenseToValueRatio,
  getExpenseCount,
  generateExpenseId,
  calculateMonthlyInterestExpense,
  standardizeExpense,
  convertComponentExpenseToStorage,
  convertStorageExpenseToComponent,
  FREQUENCY_MULTIPLIERS
} from '../../../shared/expense-utils';

export {
  parseExpenses,
  calculateAnnualAmount,
  calculateTotalAnnualExpenses,
  getMonthlyExpenseBreakdown,
  groupExpensesByCategory,
  calculateExpenseToValueRatio,
  getExpenseCount,
  generateExpenseId,
  calculateMonthlyInterestExpense,
  standardizeExpense,
  convertComponentExpenseToStorage,
  convertStorageExpenseToComponent,
  FREQUENCY_MULTIPLIERS
};

// Legacy conversion functions for backward compatibility
export function convertToPageFormat(expenses: Record<string, any>): Record<string, any> {
  // Use the standardized conversion function
  return Object.entries(expenses).reduce((result, [key, expense]) => {
    if (!expense || typeof expense !== 'object') return result;
    result[key] = convertComponentExpenseToStorage(expense);
    return result;
  }, {} as Record<string, any>);
}

export function convertToComponentFormat(expenses: Record<string, any>): Record<string, any> {
  // Use the standardized conversion function
  return Object.entries(expenses).reduce((result, [key, expense]) => {
    if (!expense || typeof expense !== 'object') return result;
    result[key] = convertStorageExpenseToComponent(expense);
    return result;
  }, {} as Record<string, any>);
}

// Legacy calculation function with wider input type support
export function calculateAnnualExpenses(expenses: Record<string, any> | null | undefined): number {
  if (!expenses) return 0;
  
  return Object.values(expenses).reduce((total, expense) => {
    // Handle both direct amount or using annualTotal from component format
    if ('annualTotal' in expense && typeof expense.annualTotal === 'number') {
      return total + expense.annualTotal;
    }
    
    // Otherwise calculate using the standard approach
    const standardized = standardizeExpense(expense);
    return total + calculateAnnualAmount(standardized);
  }, 0);
}