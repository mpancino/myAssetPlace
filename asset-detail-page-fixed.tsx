// Import shared types
import type { Expense, ExpenseCategory } from "../shared/schema";
import { 
  parseExpenses, 
  convertStorageExpenseToComponent, 
  convertComponentExpenseToStorage,
  calculateAnnualAmount
} from "../shared/expense-utils";

// Component-specific expense type from investment-expenses.tsx
interface ComponentInvestmentExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string;
  annualTotal: number;
}

// Convert a collection of storage expenses to component expenses
function convertStorageExpensesToComponent(expenses: Record<string, Expense>): Record<string, ComponentInvestmentExpense> {
  if (!expenses) return {};
  
  const result: Record<string, ComponentInvestmentExpense> = {};
  
  Object.entries(expenses).forEach(([id, expense]) => {
    result[id] = convertStorageExpenseToComponent(expense) as ComponentInvestmentExpense;
  });
  
  return result;
}

// Convert a collection of component expenses to storage expenses
function convertComponentExpensesToStorage(expenses: Record<string, ComponentInvestmentExpense>): Record<string, Expense> {
  if (!expenses) return {};
  
  const result: Record<string, Expense> = {};
  
  Object.entries(expenses).forEach(([id, expense]) => {
    result[id] = convertComponentExpenseToStorage(expense);
  });
  
  return result;
}

// Helper function to safely parse investment expenses data using shared utility
function parseInvestmentExpenses(data: any): Record<string, Expense> {
  try {
    const expenses = parseExpenses(data);
    console.log("Parsed investment expenses:", Object.keys(expenses).length, "items");
    return expenses;
  } catch (err) {
    console.error('[ERROR] Failed to parse investment expenses:', err);
    return {};
  }
}

// Helper function to safely parse property expenses data using shared utility
function parsePropertyExpenses(data: any): Record<string, Expense> {
  try {
    const expenses = parseExpenses(data);
    console.log("Parsed property expenses:", Object.keys(expenses).length, "items");
    return expenses;
  } catch (err) {
    console.error('[ERROR] Failed to parse property expenses:', err);
    return {};
  }
}