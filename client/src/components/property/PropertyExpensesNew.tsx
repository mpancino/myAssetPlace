import React, { useEffect } from 'react';
import { useExpenses } from '@/contexts/ExpenseContext';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { ExpenseTable } from '@/components/expense/ExpenseTable';
import { PropertyExpenseAnalysis } from '@/components/property/property-expenses-refactored';
import { useAssetClassDetails, StandardizedExpenseCategory } from '@/hooks/use-asset-class-details';
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

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
  
  // We no longer automatically save changes to the parent form - instead
  // we'll use the explicit Save Changes buttons to notify the parent when ready
  
  // Get expenses in UI-friendly format with display fields
  const displayExpenses = getPropertyExpensesForDisplay();
  
  // Handle saving all expense changes to the parent component
  const handleSaveChanges = () => {
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[PropertyExpensesNew:${traceId}] Saving expense changes to parent component`);
    
    if (onChange) {
      console.log(`[PropertyExpensesNew:${traceId}] Notifying parent component of ${Object.keys(propertyExpenses).length} expense changes`);
      onChange(propertyExpenses);
    } else {
      console.warn(`[PropertyExpensesNew:${traceId}] Cannot save changes - no onChange handler provided`);
    }
  };

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
      {/* Header with debug info and save button */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-muted-foreground">
          Debug: PropertyExpensesNew rendered with {Object.keys(displayExpenses).length} expenses
        </div>
        
        {/* Save Changes button - only show in edit mode */}
        {isEditMode && (
          <Button 
            onClick={handleSaveChanges} 
            disabled={isSaving}
            variant="outline"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Expense Changes
          </Button>
        )}
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
      
      {/* Footer with save button again, for convenience */}
      {isEditMode && Object.keys(displayExpenses).length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSaveChanges} 
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save All Expense Changes
          </Button>
        </div>
      )}
    </div>
  );
}