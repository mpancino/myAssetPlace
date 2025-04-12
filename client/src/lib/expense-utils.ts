/**
 * Utility functions for expense calculations and handling
 */

// Frequency multipliers for annual total calculation
export const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

/**
 * Calculate total annual expenses from different frequencies
 */
export function calculateAnnualExpenses(expenses: Record<string, any> | null | undefined): number {
  if (!expenses) return 0;
  
  return Object.values(expenses).reduce((total, expense) => {
    const { amount, frequency } = expense;
    if (!amount) return total;
    
    const multiplier = FREQUENCY_MULTIPLIERS[frequency] || 12;
    return total + (amount * multiplier);
  }, 0);
}

/**
 * Get monthly expense breakdown
 */
export function getMonthlyExpenseBreakdown(expenses: Record<string, any> | null | undefined): number {
  return calculateAnnualExpenses(expenses) / 12;
}

/**
 * Group expenses by category for visualization
 */
export function groupExpensesByCategory(expenses: Record<string, any> | null | undefined): Record<string, number> {
  if (!expenses) return {};
  
  return Object.values(expenses).reduce((grouped: Record<string, number>, expense: any) => {
    const { category, amount, frequency } = expense;
    if (!category || !amount) return grouped;
    
    const multiplier = FREQUENCY_MULTIPLIERS[frequency] || 12;
    const annualAmount = amount * multiplier;
    
    if (!grouped[category]) grouped[category] = 0;
    grouped[category] += annualAmount;
    return grouped;
  }, {});
}

/**
 * Calculate expense-to-value ratio (as a percentage)
 */
export function calculateExpenseToValueRatio(expenses: Record<string, any> | null | undefined, assetValue: number): number {
  if (!expenses || !assetValue || assetValue <= 0) return 0;
  
  const annualExpenses = calculateAnnualExpenses(expenses);
  return (annualExpenses / assetValue) * 100;
}

/**
 * Format expenses for display in a consistent way
 * Handles different storage formats
 */
export function parseExpenses(expensesData: string | Record<string, any> | null | undefined): Record<string, any> {
  if (!expensesData) return {};
  
  try {
    // If it's a string, try to parse it as JSON
    if (typeof expensesData === 'string') {
      return JSON.parse(expensesData);
    }
    
    // Otherwise, assume it's already an object
    return expensesData;
  } catch (err) {
    console.error('[PARSE:EXPENSES] Error parsing expenses data:', err);
    return {};
  }
}

/**
 * Get the count of expenses
 */
export function getExpenseCount(expenses: Record<string, any> | null | undefined): number {
  if (!expenses) return 0;
  return Object.keys(expenses).length;
}