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
  FREQUENCY_MULTIPLIERS
} from '../../../shared/expense-utils';
import type { Expense } from '../../../shared/schema';

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
  FREQUENCY_MULTIPLIERS
};

/**
 * Convert legacy component format expenses to standard Expense format
 * This adapter function helps with the transition to the standard Expense interface
 * 
 * @param expenses Record of expenses in component format (with category, description)
 * @returns Record of expenses in standard Expense format
 */
export function convertToPageFormat(expenses: Record<string, any>): Record<string, Expense> {
  const traceId = Math.floor(Math.random() * 10000);
  console.log(`\n[CONVERT:${traceId}] Converting ${Object.keys(expenses).length} expenses to standard format`);
  
  const result: Record<string, Expense> = {};
  
  Object.entries(expenses).forEach(([key, expense]) => {
    if (!expense || typeof expense !== 'object') {
      console.log(`[CONVERT:${traceId}] Skipping invalid expense at key ${key}`);
      return;
    }
    
    // Use standardizeExpense to ensure Expense interface compliance
    result[key] = standardizeExpense(expense);
    console.log(`[CONVERT:${traceId}] Converted expense ${key}`);
  });
  
  console.log(`[CONVERT:${traceId}] Converted ${Object.keys(result).length} expenses`);
  return result;
}

/**
 * Convert standard Expense format to component display format
 * Adds annualTotal property for UI display purposes
 * 
 * @param expenses Record of expenses in standard Expense format
 * @returns Record of expenses with additional UI display properties
 */
export function convertToComponentFormat(expenses: Record<string, Expense | any>): Record<string, any> {
  const traceId = Math.floor(Math.random() * 10000);
  console.log(`\n[CONVERT:${traceId}] Converting ${Object.keys(expenses).length} expenses to component display format`);
  
  const result: Record<string, any> = {};
  
  Object.entries(expenses).forEach(([key, expense]) => {
    if (!expense || typeof expense !== 'object') {
      console.log(`[CONVERT:${traceId}] Skipping invalid expense at key ${key}`);
      return;
    }
    
    // First standardize to ensure we have a valid Expense object
    const standardized = standardizeExpense(expense);
    
    // Then add UI-specific fields for display purposes
    result[key] = {
      ...standardized,
      // Add UI display field mappings
      // Just pass through the categoryId for now - the component will look it up in categoryMap
      category: standardized.categoryId,
      description: standardized.name,
      // Calculate annual total for display
      annualTotal: calculateAnnualAmount(standardized)
    };
    
    console.log(`[CONVERT:${traceId}] Converted expense ${key}`);
  });
  
  console.log(`[CONVERT:${traceId}] Converted ${Object.keys(result).length} expenses`);
  return result;
}

/**
 * Calculate total annual expenses with support for both standard and legacy formats
 * @param expenses Record of expenses (can be in any format)
 * @returns Total annual expense amount
 */
export function calculateAnnualExpenses(expenses: Record<string, any> | null | undefined): number {
  if (!expenses) return 0;
  
  return Object.values(expenses).reduce((total, expense) => {
    // Handle component format with annualTotal property
    if ('annualTotal' in expense && typeof expense.annualTotal === 'number') {
      return total + expense.annualTotal;
    }
    
    // Otherwise standardize and calculate using the standard approach
    const standardized = standardizeExpense(expense);
    return total + calculateAnnualAmount(standardized);
  }, 0);
}