import React, { useEffect, useState } from 'react';
import { useExpenses } from '@/contexts/ExpenseContext';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { ExpenseTable } from '@/components/expense/ExpenseTable';
import { PropertyExpenseAnalysis } from '@/components/property/property-expenses-refactored';
import { useAssetClassDetails, StandardizedExpenseCategory } from '@/hooks/use-asset-class-details';
import { convertToComponentFormat } from '@/lib/expense-utils-new';
import type { Expense } from '@/../../shared/schema';

// Default expense categories as fallback
const DEFAULT_EXPENSE_CATEGORIES: StandardizedExpenseCategory[] = [
  { id: "insurance", name: "Insurance" },
  { id: "property-tax", name: "Property Tax" },
  { id: "maintenance", name: "Maintenance" },
  { id: "management-fee", name: "Management Fee" },
  { id: "utilities", name: "Utilities" },
  { id: "other", name: "Other" },
];

interface PropertyExpensesProps {
  initialExpenses: Record<string, Expense> | string | null | undefined;
  onChange: (value: Record<string, Expense>) => void;
  assetId?: number;
  assetClassId?: number;
  isEditMode?: boolean;
  isSaving?: boolean;
  annualIncome?: number;
}

export function PropertyExpenses({
  initialExpenses,
  onChange,
  assetId,
  assetClassId,
  isEditMode = true,
  isSaving = false,
  annualIncome = 0,
}: PropertyExpensesProps) {
  // Use the ExpenseContext for context state
  const {
    setPropertyExpenses,
    setCurrentAssetId,
    getPropertyExpensesForDisplay,
    editorState,
  } = useExpenses();
  
  // Add a local useState hook to manage the expenses locally within the component
  const [editableExpenses, setEditableExpenses] = useState<Record<string, any>>(() => {
    // Convert to component format for initialization if needed
    if (initialExpenses) {
      return convertToComponentFormat(
        typeof initialExpenses === 'string'
          ? JSON.parse(initialExpenses)
          : initialExpenses
      );
    }
    return {};
  });

  // Log the initial state setup
  console.log('[PropertyExpenses] Initialized local state with expenses:', 
    Object.keys(editableExpenses).length);
  
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
      console.log('[PropertyExpenses] Setting current asset ID in expense context:', assetId);
      setCurrentAssetId(assetId);
    }
  }, [assetId, setCurrentAssetId]);
  
  // Process incoming expense data and update context - but don't automatically sync back to parent
  useEffect(() => {
    if (assetId && initialExpenses !== undefined && initialExpenses !== null) {
      console.log(`[PropertyExpenses] Processing initial property expenses for asset ${assetId}`);
      setPropertyExpenses(initialExpenses, assetId, true); // true indicates initial load
    }
  }, [initialExpenses, assetId, setPropertyExpenses]);
  
  // Initialize local state only when component mounts or assetId changes
  // This prevents re-initialization when initialExpenses changes due to parent re-renders
  useEffect(() => {
    const traceId = Math.floor(Math.random() * 10000);
    console.log(`[PropertyExpenses:${traceId}] Initializing local state for asset ${assetId}`);
    
    if (initialExpenses) {
      try {
        const parsedExpenses = typeof initialExpenses === 'string'
          ? JSON.parse(initialExpenses)
          : initialExpenses;
          
        const componentExpenses = convertToComponentFormat(parsedExpenses);
        console.log(`[PropertyExpenses:${traceId}] Converted ${Object.keys(componentExpenses).length} expenses to component format`);
        
        setEditableExpenses(componentExpenses);
      } catch (error) {
        console.error(`[PropertyExpenses:${traceId}] Error initializing expenses:`, error);
        setEditableExpenses({});
      }
    } else {
      console.log(`[PropertyExpenses:${traceId}] No initial expenses for asset ${assetId}, using empty object`);
      setEditableExpenses({});
    }
  }, [assetId]); // Only depends on assetId, not initialExpenses
  
  // Get expenses in UI-friendly format with display fields
  const displayExpenses = getPropertyExpensesForDisplay();
  
  // Log component render and props for debugging
  console.log("[PropertyExpenses] Rendering with props:", {
    localExpenseCount: Object.keys(editableExpenses).length,
    contextExpenseCount: Object.keys(displayExpenses).length, 
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
        Debug: PropertyExpenses rendered with {Object.keys(editableExpenses).length} expenses (local state)
      </div>
      
      {/* Expense analysis */}
      {Object.keys(editableExpenses).length > 0 && (
        <div className="mb-6">
          <PropertyExpenseAnalysis
            expenses={editableExpenses}
            annualIncome={annualIncome}
          />
        </div>
      )}
      
      {/* Expense table */}
      <div className="mb-6 bg-card rounded-md border p-4">
        <ExpenseTable
          expenses={editableExpenses}
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