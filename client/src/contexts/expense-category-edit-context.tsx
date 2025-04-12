import { createContext, useState, useContext, ReactNode, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ExpenseCategory } from "@shared/schema";

type ExpenseCategoryEditorContextType = {
  isOpen: boolean;
  editingCategory: ExpenseCategory | null;
  allCategories: ExpenseCategory[];
  categoryName: string;
  categoryDescription: string;
  categoryFrequency: 'monthly' | 'quarterly' | 'annually';
  parentOnChange: ((value: string) => void) | null;
  openEditor: (
    category: ExpenseCategory, 
    allCategories: ExpenseCategory[], 
    onChange: (value: string) => void
  ) => void;
  closeEditor: () => void;
  updateCategory: () => void;
  updateCategoryField: (
    field: 'name' | 'description' | 'frequency', 
    value: string
  ) => void;
};

const ExpenseCategoryEditorContext = createContext<ExpenseCategoryEditorContextType | null>(null);

export function ExpenseCategoryEditorProvider({ children }: { children: ReactNode }) {
  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  
  // Category data
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [allCategories, setAllCategories] = useState<ExpenseCategory[]>([]);
  
  // Form fields
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryFrequency, setCategoryFrequency] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  
  // Parent callback
  const [parentOnChange, setParentOnChange] = useState<((value: string) => void) | null>(null);

  // Open the editor with category data
  const openEditor = useCallback((
    category: ExpenseCategory,
    categories: ExpenseCategory[],
    onChange: (value: string) => void
  ) => {
    console.log("Global context: Opening expense category editor with:", { category, categories });
    
    // Set the editing category and all categories
    setEditingCategory(category);
    setAllCategories(categories);
    
    // Set form fields
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryFrequency(category.defaultFrequency || "monthly");
    
    // Set parent callback
    setParentOnChange(() => onChange);
    
    // Open the dialog
    setIsOpen(true);
  }, []);

  // Close the editor and reset state
  const closeEditor = useCallback(() => {
    console.log("Global context: Closing expense category editor");
    setIsOpen(false);
    
    // Clear state with a slight delay to avoid flickering
    setTimeout(() => {
      setEditingCategory(null);
      setAllCategories([]);
      setCategoryName("");
      setCategoryDescription("");
      setCategoryFrequency("monthly");
      setParentOnChange(null);
    }, 100);
  }, []);

  // Update a category field
  const updateCategoryField = useCallback((
    field: 'name' | 'description' | 'frequency', 
    value: string
  ) => {
    console.log(`Global context: Updating ${field} to:`, value);
    
    if (field === 'name') setCategoryName(value);
    else if (field === 'description') setCategoryDescription(value);
    else if (field === 'frequency') setCategoryFrequency(value as 'monthly' | 'quarterly' | 'annually');
  }, []);

  // Save the updated category
  const updateCategory = useCallback(() => {
    console.log("Global context: Saving updated category");
    
    if (!editingCategory || !categoryName.trim() || !parentOnChange) {
      console.error("Cannot update category: missing required data");
      return;
    }
    
    // Check for duplicate names
    const duplicateIndex = allCategories.findIndex(
      cat => cat.name.toLowerCase() === categoryName.trim().toLowerCase() 
        && cat.id !== editingCategory.id
    );
    
    if (duplicateIndex !== -1) {
      console.error("A category with this name already exists");
      return;
    }
    
    // Create updated category
    const updatedCategory: ExpenseCategory = {
      ...editingCategory,
      name: categoryName.trim(),
      description: categoryDescription.trim(),
      defaultFrequency: categoryFrequency
    };
    
    // Update categories array
    const newCategories = allCategories.map(cat => 
      cat.id === editingCategory.id ? updatedCategory : cat
    );
    
    console.log("Global context: Updated categories:", newCategories);
    
    // Notify parent
    parentOnChange(JSON.stringify(newCategories));
    
    // Close the editor
    closeEditor();
  }, [
    editingCategory, 
    categoryName, 
    categoryDescription, 
    categoryFrequency, 
    allCategories, 
    parentOnChange,
    closeEditor
  ]);

  return (
    <ExpenseCategoryEditorContext.Provider
      value={{
        isOpen,
        editingCategory,
        allCategories,
        categoryName,
        categoryDescription,
        categoryFrequency,
        parentOnChange,
        openEditor,
        closeEditor,
        updateCategory,
        updateCategoryField,
      }}
    >
      {children}
    </ExpenseCategoryEditorContext.Provider>
  );
}

export function useExpenseCategoryEditor() {
  const context = useContext(ExpenseCategoryEditorContext);
  if (!context) {
    throw new Error(
      "useExpenseCategoryEditor must be used within an ExpenseCategoryEditorProvider"
    );
  }
  return context;
}