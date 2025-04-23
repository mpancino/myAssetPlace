import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { convertToPageFormat, convertToComponentFormat } from '@/lib/expense-utils-new';
import type { Expense } from '@shared/schema';

// Define the structure of the ExpenseContext
interface ExpenseContextType {
  investmentExpenses: Record<string, Expense>;
  propertyExpenses: Record<string, Expense>;
  currentAssetId: number | null;
  setInvestmentExpenses: (expenses: Record<string, Expense> | string | any, assetId?: number) => void;
  setPropertyExpenses: (expenses: Record<string, Expense> | string | any, assetId?: number) => void;
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
    investmentExpenses: Record<string, Expense>,
    propertyExpenses: Record<string, Expense>
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

  // Update the current asset ID with debounce to prevent race conditions
  const handleSetCurrentAssetId = (assetId: number | null) => {
    console.log(`[EXPENSE_CONTEXT] Setting current asset ID to:`, assetId);
    
    // Clear expenses first when changing to a new asset or null
    if (assetId !== currentAssetId) {
      // This helps prevent flashing old data during transitions
      // We'll load the correct expenses when the component remounts
      if (currentAssetId) {
        console.log(`[EXPENSE_CONTEXT] Clearing expenses from previous asset ID ${currentAssetId} before switching`);
      }
    }
    
    // Then set the new asset ID
    setCurrentAssetId(assetId);
  };

  // Set investment expenses for current asset or specified asset
  const handleSetInvestmentExpenses = (expenses: Record<string, Expense> | string | any, assetId?: number) => {
    const targetAssetId = assetId || currentAssetId;
    if (!targetAssetId) {
      console.error(`[EXPENSE_CONTEXT] Cannot set investment expenses without an asset ID`);
      return;
    }
    
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[EXPENSE_CONTEXT:${traceId}] Setting investment expenses for asset ${targetAssetId}:`, 
      typeof expenses === 'object' ? Object.keys(expenses).length : typeof expenses, 'items');
    
    try {
      // Convert input to standardized expense format
      let standardizedExpenses: Record<string, Expense>;
      
      if (typeof expenses === 'string') {
        try {
          const parsedJson = JSON.parse(expenses);
          standardizedExpenses = convertToPageFormat(parsedJson);
        } catch (e) {
          console.error(`[EXPENSE_CONTEXT:${traceId}] Error parsing JSON:`, e);
          standardizedExpenses = {};
        }
      } else {
        // Already an object, but ensure it's in standard format
        standardizedExpenses = convertToPageFormat(expenses);
      }
      
      console.log(`[EXPENSE_CONTEXT:${traceId}] Standardized investment expenses:`, 
        Object.keys(standardizedExpenses).length, 'items');
      
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
          investmentExpenses: standardizedExpenses
        };
        
        return newState;
      });
    } catch (error) {
      console.error(`[EXPENSE_CONTEXT:${traceId}] Error processing investment expenses:`, error);
    }
  };

  // Set property expenses for current asset or specified asset
  const handleSetPropertyExpenses = (expenses: Record<string, Expense> | string | any, assetId?: number) => {
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
      // Convert input to standardized expense format
      let standardizedExpenses: Record<string, Expense>;
      
      if (typeof expenses === 'string') {
        try {
          const parsedJson = JSON.parse(expenses);
          standardizedExpenses = convertToPageFormat(parsedJson);
        } catch (e) {
          console.error(`[EXPENSE_CONTEXT:${traceId}] Error parsing JSON:`, e);
          standardizedExpenses = {};
        }
      } else if (!expenses || typeof expenses !== 'object') {
        console.error(`[EXPENSE_CONTEXT:${traceId}] Invalid expenses format:`, expenses);
        standardizedExpenses = {};
      } else {
        // Already an object, but ensure it's in standard format
        standardizedExpenses = convertToPageFormat(expenses);
      }
      
      console.log(`[EXPENSE_CONTEXT:${traceId}] Standardized property expenses:`, 
        Object.keys(standardizedExpenses).length, 'items');
      
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
          propertyExpenses: standardizedExpenses
        };
        
        console.log(`[EXPENSE_CONTEXT:${traceId}] Updated state assets:`, Object.keys(newState));
        console.log(`[EXPENSE_CONTEXT:${traceId}] Updated property expenses for asset ${targetAssetId}:`, 
          Object.keys(newState[targetAssetId].propertyExpenses).length, 'items');
        
        return newState;
      });
    } catch (error) {
      console.error(`[EXPENSE_CONTEXT:${traceId}] Error processing property expenses:`, error);
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