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
    // Handle both direct amount or using annualTotal from component format
    if ('annualTotal' in expense && typeof expense.annualTotal === 'number') {
      return total + expense.annualTotal;
    }
    
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
    const { category, categoryId, amount, frequency, annualTotal } = expense;
    // Support both formats (category from component, categoryId from page)
    const categoryKey = category || categoryId;
    if (!categoryKey) return grouped;
    
    // Use annualTotal if available, otherwise calculate it
    let yearlyAmount: number;
    if (typeof annualTotal === 'number') {
      yearlyAmount = annualTotal;
    } else if (typeof amount === 'number') {
      const multiplier = FREQUENCY_MULTIPLIERS[frequency] || 12;
      yearlyAmount = amount * multiplier;
    } else {
      return grouped; // Skip if we can't determine an amount
    }
    
    if (!grouped[categoryKey]) grouped[categoryKey] = 0;
    grouped[categoryKey] += yearlyAmount;
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

/**
 * Calculate the monthly interest expense for a loan or mortgage
 * 
 * !! IMPORTANT !!
 * This is the authoritative source for interest expense calculations in myAssetPlace.
 * This function MUST be used wherever interest expenses are displayed to ensure 
 * consistency between the cashflow page, property details, and loan information.
 * The cashflow page will only sum expenses from assets using this function and will NOT recalculate them.
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
  if (asset.interestRate && asset.value) {
    return (asset.interestRate / 100) * asset.value / 12;
  }
  
  // Fallback to an estimation if no interest data is available
  if (asset.isLiability && asset.paymentAmount) {
    // Use a default rate of 5% for estimation purposes
    const estimatedInterestRate = 5;
    return (estimatedInterestRate / 100) * (asset.value || asset.paymentAmount * 12) / 12;
  }
  
  // No interest expense
  return 0;
}

/**
 * Convert from component format (category, description) to page format (categoryId, name)
 * This adapter is used when sending data from InvestmentExpenses component to the asset detail page
 */
export function convertToPageFormat(expenses: Record<string, any>): Record<string, any> {
  const traceId = Math.floor(Math.random() * 10000);
  console.log(`\n[CONVERT:${traceId}] ===== CONVERT TO PAGE FORMAT =====`);
  console.log(`[CONVERT:${traceId}] Converting ${Object.keys(expenses).length} expenses to page format`);
  
  const result: Record<string, any> = {};
  
  Object.entries(expenses).forEach(([key, expense]) => {
    if (!expense || typeof expense !== 'object') {
      console.log(`[CONVERT:${traceId}] Skipping invalid expense at key ${key}`);
      return;
    }
    
    // Create a new object with the page format properties
    result[key] = {
      ...expense,
      categoryId: expense.category || expense.categoryId || '',
      name: expense.description || expense.name || '',
    };
    
    // Remove component format properties to avoid duplication
    if ('category' in result[key]) delete result[key].category;
    if ('description' in result[key]) delete result[key].description;
    
    console.log(`[CONVERT:${traceId}] Converted expense ${key}: ${JSON.stringify(result[key])}`);
  });
  
  console.log(`[CONVERT:${traceId}] Converted ${Object.keys(result).length} expenses to page format`);
  console.log(`[CONVERT:${traceId}] ===== END CONVERT =====\n`);
  return result;
}

/**
 * Convert from page format (categoryId, name) to component format (category, description)
 * This adapter is used when sending data from the asset detail page to InvestmentExpenses component
 */
export function convertToComponentFormat(expenses: Record<string, any>): Record<string, any> {
  const traceId = Math.floor(Math.random() * 10000);
  console.log(`\n[CONVERT:${traceId}] ===== CONVERT TO COMPONENT FORMAT =====`);
  console.log(`[CONVERT:${traceId}] Converting ${Object.keys(expenses).length} expenses to component format`);
  
  const result: Record<string, any> = {};
  
  Object.entries(expenses).forEach(([key, expense]) => {
    if (!expense || typeof expense !== 'object') {
      console.log(`[CONVERT:${traceId}] Skipping invalid expense at key ${key}`);
      return;
    }
    
    // Create a new object with the component format properties
    result[key] = {
      ...expense,
      category: expense.categoryId || expense.category || '',
      description: expense.name || expense.description || '',
    };
    
    // Calculate annual total if it doesn't exist
    if (!('annualTotal' in result[key]) && 'amount' in result[key] && 'frequency' in result[key]) {
      const multiplier = FREQUENCY_MULTIPLIERS[result[key].frequency] || 12;
      result[key].annualTotal = result[key].amount * multiplier;
    }
    
    // Remove page format properties to avoid duplication
    if ('categoryId' in result[key]) delete result[key].categoryId;
    if ('name' in result[key]) delete result[key].name;
    
    console.log(`[CONVERT:${traceId}] Converted expense ${key}: ${JSON.stringify(result[key])}`);
  });
  
  console.log(`[CONVERT:${traceId}] Converted ${Object.keys(result).length} expenses to component format`);
  console.log(`[CONVERT:${traceId}] ===== END CONVERT =====\n`);
  return result;
}