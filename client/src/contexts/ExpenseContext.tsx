import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { convertToPageFormat, convertToComponentFormat, calculateAnnualAmount } from '@/lib/expense-utils-new';
import type { Expense } from '@shared/schema';

// Form state for expense editing
interface ExpenseFormState {
  categoryId: string;
  name: string;
  amount: number | '';
  frequency: 'monthly' | 'quarterly' | 'annually';
}

// Expense editor state
interface EditorState {
  isEditing: boolean;
  isAddingNew: boolean;
  editingId: string | null;
  formState: ExpenseFormState;
  expenseType: 'property' | 'investment';
}

// Define the structure of the ExpenseContext
interface ExpenseContextType {
  // Expense data
  investmentExpenses: Record<string, Expense>;
  propertyExpenses: Record<string, Expense>;
  currentAssetId: number | null;
  
  // Data operations
  setInvestmentExpenses: (expenses: Record<string, Expense> | string | any, assetId?: number, isInitialLoad?: boolean) => void;
  setPropertyExpenses: (expenses: Record<string, Expense> | string | any, assetId?: number, isInitialLoad?: boolean) => void;
  clearExpenses: () => void;
  setCurrentAssetId: (assetId: number | null) => void;
  getInvestmentExpensesForDisplay: () => Record<string, any>;
  getPropertyExpensesForDisplay: () => Record<string, any>;
  
  // Editor state and operations
  editorState: EditorState;
  startEditExpense: (id: string, type: 'property' | 'investment') => void;
  startAddExpense: (type: 'property' | 'investment') => void;
  cancelEditExpense: () => void;
  updateFormField: (field: keyof ExpenseFormState, value: any) => void;
  saveExpense: () => void;
  deleteExpense: (id: string, type: 'property' | 'investment') => void;
}

// Default form state
const defaultFormState: ExpenseFormState = {
  categoryId: '',
  name: '',
  amount: '',
  frequency: 'monthly',
};

// Default editor state
const defaultEditorState: EditorState = {
  isEditing: false,
  isAddingNew: false,
  editingId: null,
  formState: { ...defaultFormState },
  expenseType: 'property',
};

// Create expense context with default values
const ExpenseContext = createContext<ExpenseContextType>({
  // Data
  investmentExpenses: {},
  propertyExpenses: {},
  currentAssetId: null,
  
  // Data operations
  setInvestmentExpenses: () => {},
  setPropertyExpenses: () => {},
  clearExpenses: () => {},
  setCurrentAssetId: () => {},
  getInvestmentExpensesForDisplay: () => ({}),
  getPropertyExpensesForDisplay: () => ({}),
  
  // Editor state and operations
  editorState: defaultEditorState,
  startEditExpense: () => {},
  startAddExpense: () => {},
  cancelEditExpense: () => {},
  updateFormField: () => {},
  saveExpense: () => {},
  deleteExpense: () => {},
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
  
  // Track editor state in context instead of component state
  const [editorState, setEditorState] = useState<EditorState>(defaultEditorState);
  
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
  const handleSetInvestmentExpenses = (expenses: Record<string, Expense> | string | any, assetId?: number, isInitialLoad: boolean = false) => {
    const targetAssetId = assetId || currentAssetId;
    if (!targetAssetId) {
      console.error(`[EXPENSE_CONTEXT] Cannot set investment expenses without an asset ID`);
      return;
    }
    
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[EXPENSE_CONTEXT:${traceId}] Setting investment expenses for asset ${targetAssetId}:`, 
      typeof expenses === 'object' ? Object.keys(expenses).length : typeof expenses, 'items',
      isInitialLoad ? '(INITIAL LOAD)' : '(USER EDIT)');
    
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
  const handleSetPropertyExpenses = (expenses: Record<string, Expense> | string | any, assetId?: number, isInitialLoad: boolean = false) => {
    const targetAssetId = assetId || currentAssetId;
    if (!targetAssetId) {
      console.error(`[EXPENSE_CONTEXT] Cannot set property expenses without an asset ID`);
      return;
    }
    
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[EXPENSE_CONTEXT:${traceId}] Setting property expenses for asset ${targetAssetId}:`, 
      typeof expenses === 'object' ? Object.keys(expenses).length : typeof expenses, 'items',
      isInitialLoad ? '(INITIAL LOAD)' : '(USER EDIT)');
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
  const getInvestmentExpensesForDisplay = useCallback(() => {
    return convertToComponentFormat(investmentExpenses);
  }, [investmentExpenses]);

  const getPropertyExpensesForDisplay = useCallback(() => {
    return convertToComponentFormat(propertyExpenses);
  }, [propertyExpenses]);
  
  // Editor state operations
  const startEditExpense = useCallback((id: string, type: 'property' | 'investment') => {
    console.log(`[EXPENSE_CONTEXT] Starting edit of ${type} expense with ID ${id}`);
    
    // Get the expense collection based on type
    const expenses = type === 'property' ? propertyExpenses : investmentExpenses;
    
    // Find the expense to edit
    const expense = expenses[id];
    if (!expense) {
      console.error(`[EXPENSE_CONTEXT] Cannot find ${type} expense with ID ${id}`);
      return;
    }
    
    // Set editor state
    setEditorState({
      isEditing: true,
      isAddingNew: false,
      editingId: id,
      formState: {
        categoryId: expense.categoryId,
        name: expense.name,
        amount: expense.amount,
        frequency: expense.frequency
      },
      expenseType: type
    });
  }, [propertyExpenses, investmentExpenses]);
  
  const startAddExpense = useCallback((type: 'property' | 'investment') => {
    console.log(`[EXPENSE_CONTEXT] Starting to add new ${type} expense`);
    
    // Set editor state for adding new expense
    setEditorState({
      isEditing: true,
      isAddingNew: true,
      editingId: null,
      formState: { ...defaultFormState },
      expenseType: type
    });
  }, []);
  
  const cancelEditExpense = useCallback(() => {
    console.log(`[EXPENSE_CONTEXT] Canceling expense edit`);
    
    // Reset editor state
    setEditorState(defaultEditorState);
  }, []);
  
  const updateFormField = useCallback((field: keyof ExpenseFormState, value: any) => {
    // Update a single form field while preserving other fields
    setEditorState(prev => ({
      ...prev,
      formState: {
        ...prev.formState,
        [field]: value
      }
    }));
  }, []);
  
  const saveExpense = useCallback(() => {
    const { isAddingNew, editingId, formState, expenseType } = editorState;
    console.log(`[EXPENSE_CONTEXT] Saving ${isAddingNew ? 'new' : 'existing'} ${expenseType} expense`);
    
    if (!currentAssetId) {
      console.error('[EXPENSE_CONTEXT] Cannot save expense without current asset ID');
      return;
    }
    
    // Validate form data
    if (!formState.categoryId || formState.amount === '' || parseFloat(String(formState.amount)) <= 0) {
      console.error('[EXPENSE_CONTEXT] Invalid expense data:', formState);
      return;
    }
    
    try {
      // Get current expenses based on type
      const currentExpenses = expenseType === 'property' 
        ? {...propertyExpenses} 
        : {...investmentExpenses};
      
      // Create or update expense
      const expenseId = isAddingNew ? uuidv4() : editingId as string;
      
      // Create standardized expense object
      const expense: Expense = {
        id: expenseId,
        categoryId: formState.categoryId,
        name: formState.name,
        amount: typeof formState.amount === 'string' ? parseFloat(formState.amount) : formState.amount,
        frequency: formState.frequency
      };
      
      // Update expenses collection
      currentExpenses[expenseId] = expense;
      
      // Dispatch update to the appropriate expense state
      if (expenseType === 'property') {
        handleSetPropertyExpenses(currentExpenses);
      } else {
        handleSetInvestmentExpenses(currentExpenses);
      }
      
      // Reset editor state
      setEditorState(defaultEditorState);
      
    } catch (error) {
      console.error('[EXPENSE_CONTEXT] Error saving expense:', error);
    }
  }, [
    editorState, 
    currentAssetId, 
    propertyExpenses, 
    investmentExpenses, 
    handleSetPropertyExpenses, 
    handleSetInvestmentExpenses
  ]);
  
  const deleteExpense = useCallback((id: string, type: 'property' | 'investment') => {
    console.log(`[EXPENSE_CONTEXT] Deleting ${type} expense with ID ${id}`);
    
    if (!currentAssetId) {
      console.error('[EXPENSE_CONTEXT] Cannot delete expense without current asset ID');
      return;
    }
    
    try {
      // Get current expenses based on type
      const currentExpenses = type === 'property' 
        ? {...propertyExpenses} 
        : {...investmentExpenses};
      
      // Verify expense exists
      if (!currentExpenses[id]) {
        console.error(`[EXPENSE_CONTEXT] Cannot find ${type} expense with ID ${id} to delete`);
        return;
      }
      
      // Remove the expense
      delete currentExpenses[id];
      
      // Update the state
      if (type === 'property') {
        handleSetPropertyExpenses(currentExpenses);
      } else {
        handleSetInvestmentExpenses(currentExpenses);
      }
      
      // If we're currently editing this expense, cancel editing
      if (editorState.editingId === id && editorState.expenseType === type) {
        setEditorState(defaultEditorState);
      }
      
    } catch (error) {
      console.error('[EXPENSE_CONTEXT] Error deleting expense:', error);
    }
  }, [
    currentAssetId, 
    propertyExpenses, 
    investmentExpenses, 
    handleSetPropertyExpenses, 
    handleSetInvestmentExpenses, 
    editorState
  ]);

  return (
    <ExpenseContext.Provider
      value={{
        // Data
        investmentExpenses,
        propertyExpenses,
        currentAssetId,
        
        // Data operations
        setInvestmentExpenses: handleSetInvestmentExpenses,
        setPropertyExpenses: handleSetPropertyExpenses,
        clearExpenses: handleClearExpenses,
        setCurrentAssetId: handleSetCurrentAssetId,
        getInvestmentExpensesForDisplay,
        getPropertyExpensesForDisplay,
        
        // Editor state and operations
        editorState,
        startEditExpense,
        startAddExpense,
        cancelEditExpense,
        updateFormField,
        saveExpense,
        deleteExpense,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

// Custom hook to use the expense context
export const useExpenses = () => useContext(ExpenseContext);