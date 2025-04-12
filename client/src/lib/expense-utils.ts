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
  const traceId = Math.floor(Math.random() * 10000);
  console.log(`\n[PARSE:${traceId}] ===== PARSE EXPENSES =====`);
  console.log(`[PARSE:${traceId}] Input type:`, typeof expensesData);
  
  if (!expensesData) {
    console.log(`[PARSE:${traceId}] Input value:`, "null/undefined");
    console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack);
    console.log(`[PARSE:${traceId}] Fallback: returning empty object`);
    console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
    return {};
  }
  
  try {
    // If it's a string, try to parse it as JSON
    if (typeof expensesData === 'string') {
      console.log(`[PARSE:${traceId}] Input value is string of length:`, expensesData.length);
      console.log(`[PARSE:${traceId}] String content preview:`, 
        expensesData.length > 100 ? expensesData.substring(0, 100) + '...' : expensesData);
      console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack);
      
      const parsed = JSON.parse(expensesData);
      console.log(`[PARSE:${traceId}] Successfully parsed string to object with keys:`, Object.keys(parsed));
      console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
      return parsed;
    }
    
    // Otherwise, assume it's already an object
    console.log(`[PARSE:${traceId}] Input value:`, expensesData ? `Object with keys: ${Object.keys(expensesData).join(', ')}` : "Empty object");
    console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack);
    
    if (expensesData && typeof expensesData === 'object') {
      console.log(`[PARSE:${traceId}] Received object with ${Object.keys(expensesData).length} items`);
      console.log(`[PARSE:${traceId}] Keys:`, Object.keys(expensesData));
      
      // Create a deep clone to ensure we don't have any reference issues
      const cloned = JSON.parse(JSON.stringify(expensesData));
      console.log(`[PARSE:${traceId}] Created deep clone with ${Object.keys(cloned).length} items`);
      console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
      return cloned;
    }
    
    console.log(`[PARSE:${traceId}] Fallback: returning empty object`);
    console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
    return {};
  } catch (err) {
    console.error(`[PARSE:${traceId}] Error parsing expenses data:`, err);
    console.log(`[PARSE:${traceId}] Call stack:`, new Error().stack);
    console.log(`[PARSE:${traceId}] Fallback: returning empty object due to error`);
    console.log(`[PARSE:${traceId}] ===== END PARSE =====\n`);
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