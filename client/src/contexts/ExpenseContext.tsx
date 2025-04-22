import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { parseExpenses, convertToComponentFormat } from '@/lib/expense-utils';

// Define the structure of the ExpenseContext
interface ExpenseContextType {
  investmentExpenses: Record<string, any>;
  propertyExpenses: Record<string, any>;
  currentAssetId: number | null;
  setInvestmentExpenses: (expenses: Record<string, any>, assetId?: number) => void;
  setPropertyExpenses: (expenses: Record<string, any>, assetId?: number) => void;
  clearExpenses: () => void;
  setCurrentAssetId: (assetId: number | null) => void;
  getInvestmentExpensesForDisplay: () => Record<string, any>;
  getPropertyExpensesForDisplay: () => Record<string, any>;
}

// Create expense context with default values
const ExpenseContext = createContext<ExpenseContextType>({
  investmentExpenses: {},
  propertyExpenses: {},
  currentAssetId: null,
  setInvestmentExpenses: () => {},
  setPropertyExpenses: () => {},
  clearExpenses: () => {},
  setCurrentAssetId: () => {},
  getInvestmentExpensesForDisplay: () => ({}),
  getPropertyExpensesForDisplay: () => ({}),
});

// Provider component
export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Store expenses by asset ID to prevent cross-contamination between properties
  const [expensesByAsset, setExpensesByAsset] = useState<Record<number, {
    investmentExpenses: Record<string, any>,
    propertyExpenses: Record<string, any>
  }>>({});
  
  // Track the current asset being viewed/edited
  const [currentAssetId, setCurrentAssetId] = useState<number | null>(null);
  
  // Get current asset's expenses or empty objects if not available
  // Use optional chaining and nullish coalescing to safely access properties
  const investmentExpenses = currentAssetId 
    ? (expensesByAsset[currentAssetId]?.investmentExpenses ?? {})
    : {};
    
  const propertyExpenses = currentAssetId 
    ? (expensesByAsset[currentAssetId]?.propertyExpenses ?? {})
    : {};

  // Log changes to expenses for debugging
  useEffect(() => {
    if (currentAssetId) {
      console.log(`[EXPENSE_CONTEXT] Investment expenses for asset ${currentAssetId} updated:`, 
        Object.keys(investmentExpenses).length, 'items');
    }
  }, [investmentExpenses, currentAssetId]);

  useEffect(() => {
    if (currentAssetId) {
      console.log(`[EXPENSE_CONTEXT] Property expenses for asset ${currentAssetId} updated:`, 
        Object.keys(propertyExpenses).length, 'items');
    }
  }, [propertyExpenses, currentAssetId]);

  // Update the current asset ID
  const handleSetCurrentAssetId = (assetId: number | null) => {
    console.log(`[EXPENSE_CONTEXT] Setting current asset ID to:`, assetId);
    setCurrentAssetId(assetId);
  };

  // Set investment expenses for current asset or specified asset
  const handleSetInvestmentExpenses = (expenses: Record<string, any>, assetId?: number) => {
    const targetAssetId = assetId || currentAssetId;
    if (!targetAssetId) {
      console.error(`[EXPENSE_CONTEXT] Cannot set investment expenses without an asset ID`);
      return;
    }
    
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[EXPENSE_CONTEXT:${traceId}] Setting investment expenses for asset ${targetAssetId}:`, 
      typeof expenses === 'object' ? Object.keys(expenses).length : typeof expenses, 'items');
    
    try {
      const parsedExpenses = parseExpenses(expenses);
      console.log(`[EXPENSE_CONTEXT:${traceId}] Parsed investment expenses:`, 
        Object.keys(parsedExpenses).length, 'items');
      
      // Update the expenses by asset ID to maintain isolation
      setExpensesByAsset(prev => {
        // Create a safe copy of the previous state
        const newState = { ...prev };
        
        // Initialize the asset entry if it doesn't exist
        if (!newState[targetAssetId]) {
          newState[targetAssetId] = {
            investmentExpenses: {},
            propertyExpenses: {}
          };
        }
        
        // Update the investment expenses
        newState[targetAssetId] = {
          ...newState[targetAssetId],
          investmentExpenses: parsedExpenses
        };
        
        return newState;
      });
    } catch (error) {
      console.error(`[EXPENSE_CONTEXT:${traceId}] Error parsing investment expenses:`, error);
    }
  };

  // Set property expenses for current asset or specified asset
  const handleSetPropertyExpenses = (expenses: Record<string, any>, assetId?: number) => {
    const targetAssetId = assetId || currentAssetId;
    if (!targetAssetId) {
      console.error(`[EXPENSE_CONTEXT] Cannot set property expenses without an asset ID`);
      return;
    }
    
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[EXPENSE_CONTEXT:${traceId}] Setting property expenses for asset ${targetAssetId}:`, 
      typeof expenses === 'object' ? Object.keys(expenses).length : typeof expenses, 'items');
    console.log(`[EXPENSE_CONTEXT:${traceId}] Current asset ID: ${currentAssetId}, Target asset ID: ${targetAssetId}`);
    
    try {
      // Check if expenses is not a valid object
      if (!expenses || typeof expenses !== 'object') {
        console.error(`[EXPENSE_CONTEXT:${traceId}] Invalid expenses format:`, expenses);
        return;
      }
      
      const parsedExpenses = parseExpenses(expenses);
      console.log(`[EXPENSE_CONTEXT:${traceId}] Parsed property expenses:`, 
        Object.keys(parsedExpenses).length, 'items');
      
      // Update the expenses by asset ID to maintain isolation
      setExpensesByAsset(prev => {
        // Create a safe copy of the previous state
        const newState = { ...prev };
        console.log(`[EXPENSE_CONTEXT:${traceId}] Previous state assets:`, Object.keys(newState));
        
        // Initialize the asset entry if it doesn't exist
        if (!newState[targetAssetId]) {
          console.log(`[EXPENSE_CONTEXT:${traceId}] Creating new entry for asset ${targetAssetId}`);
          newState[targetAssetId] = {
            investmentExpenses: {},
            propertyExpenses: {}
          };
        } else {
          console.log(`[EXPENSE_CONTEXT:${traceId}] Updating existing entry for asset ${targetAssetId}`);
        }
        
        // Update the property expenses
        newState[targetAssetId] = {
          ...newState[targetAssetId],
          propertyExpenses: parsedExpenses
        };
        
        console.log(`[EXPENSE_CONTEXT:${traceId}] Updated state assets:`, Object.keys(newState));
        console.log(`[EXPENSE_CONTEXT:${traceId}] Updated property expenses for asset ${targetAssetId}:`, 
          Object.keys(newState[targetAssetId].propertyExpenses).length, 'items');
        
        return newState;
      });
    } catch (error) {
      console.error(`[EXPENSE_CONTEXT:${traceId}] Error parsing property expenses:`, error);
    }
  };

  // Clear expenses for the current asset
  const handleClearExpenses = () => {
    if (!currentAssetId) {
      console.error(`[EXPENSE_CONTEXT] Cannot clear expenses without a current asset ID`);
      return;
    }
    
    console.log(`[EXPENSE_CONTEXT] Clearing all expenses for asset ${currentAssetId}`);
    
    setExpensesByAsset(prev => {
      // Create a copy without the current asset's expenses
      const newExpensesByAsset = { ...prev };
      delete newExpensesByAsset[currentAssetId];
      return newExpensesByAsset;
    });
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
        currentAssetId,
        setInvestmentExpenses: handleSetInvestmentExpenses,
        setPropertyExpenses: handleSetPropertyExpenses,
        clearExpenses: handleClearExpenses,
        setCurrentAssetId: handleSetCurrentAssetId,
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