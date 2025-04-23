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
  
  // When property expenses in context change, notify parent component
  useEffect(() => {
    if (onChange && Object.keys(propertyExpenses).length > 0) {
      console.log('Notifying parent of property expense changes');
      onChange(propertyExpenses);
    }
  }, [propertyExpenses, onChange]);
  
  // Get expenses in UI-friendly format with display fields
  const displayExpenses = getPropertyExpensesForDisplay();
  
  return (
    <div className="space-y-6">
      {/* Expense analysis */}
      {Object.keys(displayExpenses).length > 0 && (
        <PropertyExpenseAnalysis
          expenses={displayExpenses}
          annualIncome={annualIncome}
        />
      )}
      
      {/* Expense table */}
      <ExpenseTable
        expenses={displayExpenses}
        categoryMap={categoryMap}
        type="property"
        isEditMode={isEditMode}
        isSaving={isSaving}
      />
      
      {/* Expense form - only show when editing is active */}
      {isEditMode && editorState.isEditing && editorState.expenseType === 'property' && (
        <ExpenseForm
          availableCategories={availableCategories}
          isLoading={isLoadingCategories || isSaving}
        />
      )}
    </div>
  );
}