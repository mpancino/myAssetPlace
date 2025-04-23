import { Expense, DisplayExpense, ExpenseCategory } from '@shared/schema';
import { v4 as uuid } from 'uuid';

/**
 * Frequency multipliers for calculating annual amounts
 */
export const FREQUENCY_MULTIPLIERS = {
  monthly: 12,
  quarterly: 4, 
  annually: 1
};

/**
 * Calculate the monthly interest expense for a loan/mortgage
 */
export function calculateMonthlyInterestExpense(principal: number, interestRate: number): number {
  if (!principal || !interestRate) return 0;
  return (principal * (interestRate / 100)) / 12;
}

/**
 * Calculate the annual total for an expense based on its frequency
 */
export function calculateAnnualAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'annually':
      return amount;
    default:
      console.warn(`Unknown frequency: ${frequency}, defaulting to annual value`);
      return amount;
  }
}

/**
 * Convert a storage-format expense to a display-format expense for UI rendering
 */
export function formatExpenseForDisplay(
  expense: Expense, 
  categories: ExpenseCategory[]
): DisplayExpense {
  // Find the matching category to get its name
  const category = categories.find(c => c.id === expense.categoryId);
  
  return {
    id: expense.id,
    categoryId: expense.categoryId,
    categoryName: category?.name || 'Unknown Category',
    name: expense.name,
    amount: expense.amount,
    frequency: expense.frequency,
    annualTotal: calculateAnnualAmount(expense.amount, expense.frequency),
    notes: expense.notes,
  };
}

/**
 * Convert a display-format expense back to storage format for saving
 */
export function prepareExpenseForStorage(displayExpense: DisplayExpense): Expense {
  return {
    id: displayExpense.id,
    categoryId: displayExpense.categoryId,
    name: displayExpense.name,
    amount: displayExpense.amount,
    frequency: displayExpense.frequency,
    notes: displayExpense.notes,
  };
}

/**
 * Convert a collection of expenses from storage to display format
 */
export function formatExpensesForDisplay(
  expenses: Record<string, Expense>, 
  categories: ExpenseCategory[]
): Record<string, DisplayExpense> {
  console.log(`\n[CONVERT:${Date.now() % 10000}] Converting ${Object.keys(expenses).length} expenses to display format`);
  
  const result: Record<string, DisplayExpense> = {};
  
  Object.entries(expenses).forEach(([id, expense]) => {
    result[id] = formatExpenseForDisplay(expense, categories);
    console.log(`[CONVERT:${Date.now() % 10000}] Converted expense ${id}`);
  });
  
  console.log(`[CONVERT:${Date.now() % 10000}] Converted ${Object.keys(result).length} expenses`);
  return result;
}

/**
 * Convert a collection of expenses from display to storage format
 */
export function prepareExpensesForStorage(
  expenses: Record<string, DisplayExpense>
): Record<string, Expense> {
  console.log(`\n[CONVERT:${Date.now() % 10000}] Converting ${Object.keys(expenses).length} expenses to standard format`);
  
  const result: Record<string, Expense> = {};
  
  Object.entries(expenses).forEach(([id, expense]) => {
    result[id] = prepareExpenseForStorage(expense);
    console.log(`[CONVERT:${Date.now() % 10000}] Converted expense ${id}`);
  });
  
  console.log(`[CONVERT:${Date.now() % 10000}] Converted ${Object.keys(result).length} expenses`);
  return result;
}

/**
 * Create a new expense with default values
 */
export function createDefaultExpense(
  categoryId: string, 
  categories: ExpenseCategory[]
): DisplayExpense {
  const category = categories.find(c => c.id === categoryId);
  const defaultFrequency = category?.defaultFrequency || 'monthly';
  
  return {
    id: uuid(),
    categoryId,
    categoryName: category?.name || 'Unknown Category',
    name: '',
    amount: 0,
    frequency: defaultFrequency,
    annualTotal: 0,
    notes: '',
  };
}

/**
 * Parse property expenses data from an asset
 */
export function parsePropertyExpenses(data: any): Record<string, Expense> {
  // If the data is already in the correct format, just return it
  if (!data) return {};
  
  try {
    // Handle string format (from JSON)
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("Error parsing property expenses string:", e);
        return {};
      }
    }
    
    // Handle object format
    if (typeof data === 'object') {
      return data;
    }
    
    // Fallback
    console.warn("Unknown property expenses format:", typeof data);
    return {};
  } catch (err) {
    console.error("Error parsing property expenses:", err);
    return {};
  }
}

/**
 * Parse investment expenses data from an asset
 */
export function parseInvestmentExpenses(data: any): Record<string, Expense> {
  // Same implementation as property expenses for now
  return parsePropertyExpenses(data);
}

/**
 * Generic parse expenses function that works for any expense type
 * This is a convenience wrapper around parsePropertyExpenses
 */
export function parseExpenses(data: any): Record<string, Expense> {
  return parsePropertyExpenses(data);
}

/**
 * Calculate the total annual expenses for a collection of expenses
 */
export function calculateAnnualExpenses(expenses: Record<string, Expense>): number {
  return Object.values(expenses).reduce((total, expense) => {
    return total + calculateAnnualAmount(expense.amount, expense.frequency);
  }, 0);
}