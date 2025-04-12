import React, { createContext, useState, useContext, ReactNode } from "react";

// Expense edit context interface
interface ExpenseEditContextType {
  isOpen: boolean;
  assetId: number | null;
  expense: any | null; // Using any for flexibility across different expense types
  onOpen: (assetId: number, expense: any | null) => void;
  onClose: () => void;
  onSave: (updatedExpense: any) => void;
}

// Create the context with default values
export const ExpenseEditContext = createContext<ExpenseEditContextType>({
  isOpen: false,
  assetId: null,
  expense: null,
  onOpen: () => {},
  onClose: () => {},
  onSave: () => {},
});

// Hook for accessing the context
export const useExpenseEdit = () => useContext(ExpenseEditContext);

interface ExpenseEditProviderProps {
  children: ReactNode;
}

export function ExpenseEditProvider({ children }: ExpenseEditProviderProps) {
  // State for tracking modal open state
  const [isOpen, setIsOpen] = useState(false);
  
  // State for the current asset and expense being edited
  const [assetId, setAssetId] = useState<number | null>(null);
  const [expense, setExpense] = useState<any | null>(null);
  
  // State for tracking save callback
  const [saveCallback, setSaveCallback] = useState<((updatedExpense: any) => void) | null>(null);
  
  // Handler for opening the edit modal
  const handleOpen = (id: number, expenseData: any | null) => {
    setAssetId(id);
    setExpense(expenseData);
    setIsOpen(true);
  };
  
  // Handler for closing the edit modal
  const handleClose = () => {
    setIsOpen(false);
    // Clear data after animation completes
    setTimeout(() => {
      setAssetId(null);
      setExpense(null);
      setSaveCallback(null);
    }, 300);
  };
  
  // Handler for saving changes
  const handleSave = (updatedExpense: any) => {
    if (saveCallback) {
      saveCallback(updatedExpense);
    }
    handleClose();
  };
  
  // Context value
  const contextValue: ExpenseEditContextType = {
    isOpen,
    assetId,
    expense,
    onOpen: handleOpen,
    onClose: handleClose,
    onSave: handleSave,
  };
  
  return (
    <ExpenseEditContext.Provider value={contextValue}>
      {children}
    </ExpenseEditContext.Provider>
  );
}