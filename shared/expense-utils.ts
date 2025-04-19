/**
 * Shared expense utility functions
 * 
 * This file provides standardized utility functions for handling expense data
 * consistently across the application (both frontend and backend).
 */
import type { Expense } from "./schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Constants for frequency multipliers to calculate annual amounts
 */
export const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  'daily': 365,
  'weekly': 52,
  'fortnightly': 26,
  'monthly': 12,
  'quarterly': 4,
  'semi-annual': 2,
  'annually': 1
};

/**
 * Safely parse expenses from any source format (string or object)
 * @param data The expense data (can be string JSON or object)
 * @returns A record of expense objects
 */
export function parseExpenses(data: any): Record<string, Expense> {
  const traceId = Math.floor(Math.random() * 10000);
  console.log(`\n[PARSE:${traceId}] ===== PARSE EXPENSES =====`);
  console.log(`[PARSE:${traceId}] Input type:`, typeof data);
  
  try {
    // If null or undefined, return empty object
    if (!data) {
      console.log(`[PARSE:${traceId}] Input value: null/undefined`);
      console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));
      console.log(`[PARSE:${traceId}] Returning empty object`);
      console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
      return {};
    }
    
    // If it's a string, try to parse it
    if (typeof data === 'string') {
      // Handle empty string
      if (data.trim() === '') {
        console.log(`[PARSE:${traceId}] Input value: empty string`);
        console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));
        console.log(`[PARSE:${traceId}] Returning empty object`);
        console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
        return {};
      }
      
      console.log(`[PARSE:${traceId}] Input value: string of length ${data.length}`);
      console.log(`[PARSE:${traceId}] String preview:`, 
        data.length > 100 ? data.substring(0, 100) + '...' : data);
      console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));
      
      // Try to parse as JSON
      const parsed = JSON.parse(data);
      console.log(`[PARSE:${traceId}] Successfully parsed string to object with ${Object.keys(parsed).length} keys`);
      console.log(`[PARSE:${traceId}] Keys:`, Object.keys(parsed));
      console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
      return parsed;
    }
    
    // If it's already an object, create a deep clone
    if (typeof data === 'object') {
      console.log(`[PARSE:${traceId}] Input value: object with ${Object.keys(data).length} keys`);
      console.log(`[PARSE:${traceId}] Keys:`, Object.keys(data));
      console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));
      
      // Create a deep clone to ensure we're not affected by reference issues
      const cloned = JSON.parse(JSON.stringify(data));
      console.log(`[PARSE:${traceId}] Created deep clone with ${Object.keys(cloned).length} keys`);
      console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
      return cloned;
    }
    
    // Fallback for unexpected formats
    console.log(`[PARSE:${traceId}] Unhandled input format: ${typeof data}`);
    console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));
    console.log(`[PARSE:${traceId}] Returning empty object`);
    console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
    return {};
  } catch (error) {
    console.error(`[PARSE:${traceId}] Error parsing expenses:`, error);
    console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));
    console.log(`[PARSE:${traceId}] Returning empty object due to error`);
    console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
    return {};
  }
}

/**
 * Calculate annual amount for a single expense
 * @param expense The expense object
 * @returns The annual amount
 */
export function calculateAnnualAmount(expense: Expense): number {
  const frequency = expense.frequency || 'monthly';
  const multiplier = FREQUENCY_MULTIPLIERS[frequency] || 12; // Default to monthly if frequency is not recognized
  return expense.amount * multiplier;
}

/**
 * Calculate total annual expenses
 * @param expenses Record of expenses
 * @returns Total annual amount
 */
export function calculateTotalAnnualExpenses(expenses: Record<string, Expense>): number {
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
  // Calculate annual total and divide by 12 to get monthly average
  return calculateTotalAnnualExpenses(expenses) / 12;
}

/**
 * Group expenses by category
 * @param expenses Record of expenses
 * @returns Grouped expenses by category
 */
export function groupExpensesByCategory(expenses: Record<string, Expense>): Record<string, number> {
  const groupedExpenses: Record<string, number> = {};
  
  Object.values(expenses).forEach(expense => {
    const categoryId = expense.categoryId;
    const annualAmount = calculateAnnualAmount(expense);
    
    if (groupedExpenses[categoryId]) {
      groupedExpenses[categoryId] += annualAmount;
    } else {
      groupedExpenses[categoryId] = annualAmount;
    }
  });
  
  return groupedExpenses;
}

/**
 * Calculate expense-to-value ratio as a percentage
 * @param expenses Record of expenses
 * @param assetValue The asset value
 * @returns The expense-to-value ratio as a percentage
 */
export function calculateExpenseToValueRatio(expenses: Record<string, Expense>, assetValue: number): number {
  if (!assetValue || assetValue === 0) return 0;
  
  const totalAnnualExpenses = calculateTotalAnnualExpenses(expenses);
  return (totalAnnualExpenses / assetValue) * 100;
}

/**
 * Get the count of expenses
 * @param expenses Record of expenses
 * @returns Number of expenses
 */
export function getExpenseCount(expenses: Record<string, Expense>): number {
  return Object.keys(expenses).length;
}

/**
 * Generate a unique ID for an expense
 * @returns A unique ID string
 */
export function generateExpenseId(): string {
  return uuidv4();
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
  // Extract mortgage data from either legacy fields or via relation
  const mortgageAmount = asset.mortgageAmount || 0;
  const interestRate = asset.mortgageInterestRate || 0;
  
  if (!mortgageAmount || !interestRate) return 0;
  
  // Convert annual interest rate to monthly (divide by 12)
  const monthlyInterestRate = interestRate / 100 / 12;
  
  // Calculate monthly interest expense
  return mortgageAmount * monthlyInterestRate;
}

/**
 * Standardize an expense format
 * @param expense An expense-like object that may not conform to the standard format
 * @returns A standardized expense object
 */
export function standardizeExpense(expense: any): Expense {
  // Ensure we have an object to work with
  if (!expense || typeof expense !== 'object') {
    return {
      id: generateExpenseId(),
      categoryId: 'uncategorized',
      name: 'Unknown Expense',
      amount: 0,
      frequency: 'monthly'
    };
  }
  
  // Map legacy or component fields to standard format
  return {
    id: expense.id || generateExpenseId(),
    categoryId: expense.categoryId || expense.category || 'uncategorized',
    name: expense.name || expense.description || 'Untitled Expense',
    amount: typeof expense.amount === 'number' ? expense.amount : 0,
    frequency: expense.frequency || 'monthly',
    notes: expense.notes || ''
  };
}

/**
 * Convert expense from component format to storage format
 * @param expense Expense in component format
 * @returns Standardized expense
 */
export function convertComponentExpenseToStorage(expense: any): Expense {
  return {
    id: expense.id || generateExpenseId(),
    categoryId: expense.category || 'uncategorized',
    name: expense.description || 'Untitled Expense',
    amount: typeof expense.amount === 'number' ? expense.amount : 0,
    frequency: expense.frequency || 'monthly',
    notes: expense.notes || ''
  };
}

/**
 * Convert expense from storage format to component format
 * @param expense Expense in storage format
 * @returns Component-compatible expense object
 */
export function convertStorageExpenseToComponent(expense: Expense): any {
  // Calculate annual total based on frequency
  const annualTotal = calculateAnnualAmount(expense);
  
  return {
    id: expense.id,
    category: expense.categoryId,
    description: expense.name,
    amount: expense.amount,
    frequency: expense.frequency,
    annualTotal: annualTotal,
    notes: expense.notes
  };
}