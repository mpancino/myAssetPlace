/**
 * Shared expense utility functions
 * 
 * This file provides standardized utility functions for handling expense data
 * consistently across the application (both frontend and backend).
 */
import { Expense } from './schema';

// Frequency multipliers for annual total calculation
export const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

/**
 * Safely parse expenses from any source format (string or object)
 * @param data The expense data (can be string JSON or object)
 * @returns A record of expense objects
 */
export function parseExpenses(data: any): Record<string, Expense> {
  if (!data) return {};
  
  try {
    // If it's a string, try to parse it as JSON
    if (typeof data === 'string') {
      if (data.trim() === '') return {};
      return JSON.parse(data) as Record<string, Expense>;
    }
    
    // If it's already an object, create a deep clone to avoid reference issues
    if (typeof data === 'object') {
      return JSON.parse(JSON.stringify(data)) as Record<string, Expense>;
    }
    
    return {};
  } catch (err) {
    console.error('Error parsing expenses:', err);
    return {};
  }
}

/**
 * Calculate annual amount for a single expense
 * @param expense The expense object
 * @returns The annual amount
 */
export function calculateAnnualAmount(expense: Expense): number {
  if (!expense?.amount || !expense?.frequency) return 0;
  
  const multiplier = FREQUENCY_MULTIPLIERS[expense.frequency] || 12;
  return expense.amount * multiplier;
}

/**
 * Calculate total annual expenses
 * @param expenses Record of expenses
 * @returns Total annual amount
 */
export function calculateTotalAnnualExpenses(expenses: Record<string, Expense>): number {
  if (!expenses) return 0;
  
  return Object.values(expenses).reduce((total, expense) => {
    return total + calculateAnnualAmount(expense);
  }, 0);
}

/**
 * Get monthly expense breakdown
 * @param expenses Record of expenses
 * @returns Monthly expense amount
 */
export function getMonthlyExpenseBreakdown(expenses: Record<string, Expense>): number {
  return calculateTotalAnnualExpenses(expenses) / 12;
}

/**
 * Group expenses by category
 * @param expenses Record of expenses
 * @returns Grouped expenses by category
 */
export function groupExpensesByCategory(expenses: Record<string, Expense>): Record<string, number> {
  if (!expenses) return {};
  
  return Object.values(expenses).reduce((grouped: Record<string, number>, expense) => {
    const categoryKey = expense.categoryId;
    if (!categoryKey) return grouped;
    
    const yearlyAmount = calculateAnnualAmount(expense);
    
    if (!grouped[categoryKey]) grouped[categoryKey] = 0;
    grouped[categoryKey] += yearlyAmount;
    return grouped;
  }, {});
}

/**
 * Calculate expense-to-value ratio as a percentage
 * @param expenses Record of expenses
 * @param assetValue The asset value
 * @returns The expense-to-value ratio as a percentage
 */
export function calculateExpenseToValueRatio(expenses: Record<string, Expense>, assetValue: number): number {
  if (!expenses || !assetValue || assetValue <= 0) return 0;
  
  const annualExpenses = calculateTotalAnnualExpenses(expenses);
  return (annualExpenses / assetValue) * 100;
}

/**
 * Get the count of expenses
 * @param expenses Record of expenses
 * @returns Number of expenses
 */
export function getExpenseCount(expenses: Record<string, Expense>): number {
  if (!expenses) return 0;
  return Object.keys(expenses).length;
}

/**
 * Generate a unique ID for an expense
 * @returns A unique ID string
 */
export function generateExpenseId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Calculate the monthly interest expense for a loan or mortgage
 * 
 * !! IMPORTANT !!
 * This is the authoritative source for interest expense calculations.
 * This function MUST be used wherever interest expenses are displayed to ensure 
 * consistency between the cashflow page, property details, and loan information.
 * 
 * @param asset The asset object containing loan/mortgage data
 * @returns The monthly interest expense amount in currency units
 */
export function calculateMonthlyInterestExpense(asset: any): number {
  // If we have a mortgage with its own interest rate and amount
  if (asset.mortgageInterestRate && asset.mortgageAmount) {
    return (asset.mortgageInterestRate / 100) * asset.mortgageAmount / 12;
  }
  
  // If we have a loan with interest rate and value
  if (asset.interestRate && Math.abs(asset.value) > 0) {
    // Use the absolute value of the loan amount since liabilities can be stored as negative values
    return (asset.interestRate / 100) * Math.abs(asset.value) / 12;
  }
  
  // Special case for loans with interest rate but zero payment amount
  if (asset.interestRate && asset.originalAmount) {
    return (asset.interestRate / 100) * asset.originalAmount / 12;
  }
  
  // Fallback to an estimation if there's a payment amount but no explicit interest data
  if (asset.isLiability && asset.paymentAmount) {
    // Use a default rate of 5% for estimation purposes
    const estimatedInterestRate = 5;
    return (estimatedInterestRate / 100) * (Math.abs(asset.value) || asset.paymentAmount * 12) / 12;
  }
  
  // No interest expense
  return 0;
}

/**
 * Standardize an expense format
 * @param expense An expense-like object that may not conform to the standard format
 * @returns A standardized expense object
 */
export function standardizeExpense(expense: any): Expense {
  if (!expense) throw new Error('Cannot standardize undefined expense');
  
  // Create a standardized expense object
  return {
    id: expense.id || generateExpenseId(),
    categoryId: expense.categoryId || expense.category || '',
    name: expense.name || expense.description || '',
    amount: typeof expense.amount === 'number' ? expense.amount : 0,
    frequency: ['monthly', 'quarterly', 'annually'].includes(expense.frequency) 
      ? expense.frequency as 'monthly' | 'quarterly' | 'annually'
      : 'monthly',
    notes: expense.notes || ''
  };
}

/**
 * Convert expense from component format to storage format
 * @param expense Expense in component format
 * @returns Standardized expense
 */
export function convertComponentExpenseToStorage(expense: any): Expense {
  return standardizeExpense({
    id: expense.id,
    categoryId: expense.category,
    name: expense.description,
    amount: expense.amount,
    frequency: expense.frequency,
    notes: expense.notes
  });
}

/**
 * Convert expense from storage format to component format
 * @param expense Expense in storage format
 * @returns Component-compatible expense object
 */
export function convertStorageExpenseToComponent(expense: Expense): any {
  return {
    id: expense.id,
    category: expense.categoryId,
    description: expense.name,
    amount: expense.amount,
    frequency: expense.frequency,
    annualTotal: calculateAnnualAmount(expense),
    notes: expense.notes
  };
}