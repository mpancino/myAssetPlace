import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { parseExpenses, convertToComponentFormat } from '@/lib/expense-utils';

interface ExpenseContextType {
  investmentExpenses: Record<string, any>;
  propertyExpenses: Record<string, any>;
  setInvestmentExpenses: (expenses: Record<string, any>) => void;
  setPropertyExpenses: (expenses: Record<string, any>) => void;
  clearExpenses: () => void;
  getInvestmentExpensesForDisplay: () => Record<string, any>;
  getPropertyExpensesForDisplay: () => Record<string, any>;
}

// Create context with default values
const ExpenseContext = createContext<ExpenseContextType>({
  investmentExpenses: {},
  propertyExpenses: {},
  setInvestmentExpenses: () => {},
  setPropertyExpenses: () => {},
  clearExpenses: () => {},
  getInvestmentExpensesForDisplay: () => ({}),
  getPropertyExpensesForDisplay: () => ({}),
});

// Provider component
export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [investmentExpenses, setInvestmentExpensesState] = useState<Record<string, any>>({});
  const [propertyExpenses, setPropertyExpensesState] = useState<Record<string, any>>({});

  // Debug on changes
  useEffect(() => {
    console.log('[EXPENSE_CONTEXT] Investment expenses updated:', 
      Object.keys(investmentExpenses).length, 'items');
  }, [investmentExpenses]);

  useEffect(() => {
    console.log('[EXPENSE_CONTEXT] Property expenses updated:', 
      Object.keys(propertyExpenses).length, 'items');
  }, [propertyExpenses]);

  const setInvestmentExpenses = (expenses: Record<string, any>) => {
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[EXPENSE_CONTEXT:${traceId}] Setting investment expenses:`, 
      typeof expenses === 'object' ? Object.keys(expenses).length : typeof expenses, 'items');
    
    try {
      const parsedExpenses = parseExpenses(expenses);
      console.log(`[EXPENSE_CONTEXT:${traceId}] Parsed investment expenses:`, 
        Object.keys(parsedExpenses).length, 'items');
      setInvestmentExpensesState(parsedExpenses);
    } catch (error) {
      console.error(`[EXPENSE_CONTEXT:${traceId}] Error parsing investment expenses:`, error);
    }
  };

  const setPropertyExpenses = (expenses: Record<string, any>) => {
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[EXPENSE_CONTEXT:${traceId}] Setting property expenses:`, 
      typeof expenses === 'object' ? Object.keys(expenses).length : typeof expenses, 'items');
    
    try {
      const parsedExpenses = parseExpenses(expenses);
      console.log(`[EXPENSE_CONTEXT:${traceId}] Parsed property expenses:`, 
        Object.keys(parsedExpenses).length, 'items');
      setPropertyExpensesState(parsedExpenses);
    } catch (error) {
      console.error(`[EXPENSE_CONTEXT:${traceId}] Error parsing property expenses:`, error);
    }
  };

  const clearExpenses = () => {
    console.log('[EXPENSE_CONTEXT] Clearing all expenses');
    setInvestmentExpensesState({});
    setPropertyExpensesState({});
  };

  // Get expenses in component-friendly format
  const getInvestmentExpensesForDisplay = () => {
    return convertToComponentFormat(investmentExpenses);
  };

  const getPropertyExpensesForDisplay = () => {
    return convertToComponentFormat(propertyExpenses);
  };

  return (
    <ExpenseContext.Provider
      value={{
        investmentExpenses,
        propertyExpenses,
        setInvestmentExpenses,
        setPropertyExpenses,
        clearExpenses,
        getInvestmentExpensesForDisplay,
        getPropertyExpensesForDisplay,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

// Custom hook to use the expense context
export const useExpenses = () => useContext(ExpenseContext);