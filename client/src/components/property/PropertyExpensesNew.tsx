import React, { useEffect } from 'react';
import { useExpenses } from '@/contexts/ExpenseContext';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { ExpenseTable } from '@/components/expense/ExpenseTable';
import { PropertyExpenseAnalysis } from '@/components/property/property-expenses-refactored';
import { useAssetClassDetails, StandardizedExpenseCategory } from '@/hooks/use-asset-class-details';

// Default expense categories as fallback with standardized structure
const DEFAULT_EXPENSE_CATEGORIES: StandardizedExpenseCategory[] = [
  { id: "insurance", name: "Insurance" },
  { id: "property-tax", name: "Property Tax" },
  { id: "maintenance", name: "Maintenance" },
  { id: "management-fee", name: "Management Fee" },
  { id: "utilities", name: "Utilities" },
  { id: "other", name: "Other" },
];

interface PropertyExpensesNewProps {
  value: Record<string, any> | string | null | undefined;
  onChange: (value: Record<string, any>) => void;
  assetId?: number;
  assetClassId?: number;
  isEditMode?: boolean;
  isSaving?: boolean;
  annualIncome?: number;
}

export function PropertyExpensesNew({
  value,
  onChange,
  assetId,
  assetClassId,
  isEditMode = true,
  isSaving = false,
  annualIncome = 0,
}: PropertyExpensesNewProps) {
  // Use the ExpenseContext for state management
  const {
    propertyExpenses,
    setPropertyExpenses,
    setCurrentAssetId,
    getPropertyExpensesForDisplay,
    editorState,
  } = useExpenses();
  
  // Fetch expense categories from the asset class
  const { expenseCategories, isLoading: isLoadingCategories } = useAssetClassDetails(assetClassId);
  
  // Use the asset class expense categories if available, or fall back to defaults
  const availableCategories = expenseCategories && expenseCategories.length > 0
    ? expenseCategories 
    : DEFAULT_EXPENSE_CATEGORIES;
  
  // Build a map of category IDs to names for display purposes
  const categoryMap = availableCategories.reduce((map, cat) => {
    const id = typeof cat === 'string' ? cat : cat.id;
    const name = typeof cat === 'string' ? cat : 
      (typeof cat.name === 'string' ? cat.name : String(cat.name));
    map[String(id)] = name;
    return map;
  }, {} as Record<string, string>);
  
  // Initialize the expense context with the current asset ID
  useEffect(() => {
    if (assetId) {
      console.log('Setting current asset ID in expense context:', assetId);
      setCurrentAssetId(assetId);
    }
  }, [assetId, setCurrentAssetId]);
  
  // Process incoming expense data and update context
  useEffect(() => {
    if (assetId && value !== undefined && value !== null) {
      console.log(`Processing property expenses for asset ${assetId}`);
      setPropertyExpenses(value, assetId);
    }
  }, [value, assetId, setPropertyExpenses]);
  
  // Modified: Don't automatically notify parent form on every expense change
  // This prevents triggering form-wide automatic saves when only expenses change
  // Instead, we'll notify the parent only when explicitly saving expenses
  useEffect(() => {
    if (isEditMode && onChange && Object.keys(propertyExpenses).length > 0) {
      console.log('[EXPENSE CHANGE] Property expenses changed in context, but NOT auto-updating parent form');
      console.log('[EXPENSE CHANGE] This prevents unnecessary automatic form saves');
      // Removed onChange(propertyExpenses) to prevent triggering parent form updates
      // Parent form will get the values when explicitly saved or during form submission
    }
  }, [propertyExpenses, isEditMode]);
  
  // Get expenses in UI-friendly format with display fields
  const displayExpenses = getPropertyExpensesForDisplay();
  
  // Log component render and props for debugging
  console.log("[PropertyExpensesNew] Rendering with props:", {
    expenseCount: Object.keys(displayExpenses).length,
    assetId, 
    isEditMode,
    editorState: {
      isEditing: editorState.isEditing,
      expenseType: editorState.expenseType
    }
  });

  return (
    <div id="property-expenses-container" className="expense-management-container border rounded-md p-4 bg-background">
      {/* DEBUG MARKER - helps identify if container is rendering */}
      <div className="text-xs text-muted-foreground mb-2">
        Debug: PropertyExpensesNew rendered with {Object.keys(displayExpenses).length} expenses
      </div>
      
      {/* Expense analysis */}
      {Object.keys(displayExpenses).length > 0 && (
        <div className="mb-6">
          <PropertyExpenseAnalysis
            expenses={displayExpenses}
            annualIncome={annualIncome}
          />
        </div>
      )}
      
      {/* Expense table */}
      <div className="mb-6 bg-card rounded-md border p-4">
        <ExpenseTable
          expenses={displayExpenses}
          categoryMap={categoryMap}
          type="property"
          isEditMode={isEditMode}
          isSaving={isSaving}
        />
      </div>
      
      {/* Expense form - only show when editing is active */}
      {isEditMode && editorState.isEditing && editorState.expenseType === 'property' && (
        <div className="mt-6 bg-muted rounded-md border p-4">
          <ExpenseForm
            availableCategories={availableCategories}
            isLoading={isLoadingCategories || isSaving}
          />
        </div>
      )}
    </div>
  );
}