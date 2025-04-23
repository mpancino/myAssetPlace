import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useExpenses } from '@/contexts/ExpenseContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle, 
  Check, 
  Edit, 
  Trash, 
  Plus, 
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAssetClassDetails, StandardizedExpenseCategory } from "@/hooks/use-asset-class-details";
import { formatCurrency } from "@/lib/utils";
import { 
  convertToComponentFormat, 
  convertToPageFormat,
  FREQUENCY_MULTIPLIERS,
  calculateAnnualAmount
} from '@/lib/expense-utils-new';
import { Expense } from '@shared/schema';

// Default expense categories as fallback with standardized structure
const DEFAULT_EXPENSE_CATEGORIES: StandardizedExpenseCategory[] = [
  { id: "insurance", name: "Insurance" },
  { id: "property-tax", name: "Property Tax" },
  { id: "maintenance", name: "Maintenance" },
  { id: "management-fee", name: "Management Fee" },
  { id: "utilities", name: "Utilities" },
  { id: "other", name: "Other" },
];

// Component display version of Expense for UI with additional display fields
interface ComponentExpense extends Expense {
  category: string;    // UI display - maps to categoryId
  description: string; // UI display - maps to name
  annualTotal: number; // calculated field for UI display
}

// Basic property expense analysis component
export function PropertyExpenseAnalysis({ 
  expenses, 
  annualIncome = 0,
}: { 
  expenses: Record<string, ComponentExpense>;
  annualIncome?: number;
}) {
  // Calculate totals
  const totalExpenses = Object.values(expenses).reduce(
    (sum, expense) => sum + expense.annualTotal, 0
  );
  
  const netIncome = annualIncome - totalExpenses;
  const expenseToIncomeRatio = annualIncome > 0 ? (totalExpenses / annualIncome) * 100 : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Expense Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Total Annual Expenses</h4>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
          
          {annualIncome > 0 && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-1">Annual Rental Income</h4>
                <p className="text-2xl font-bold">{formatCurrency(annualIncome)}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Net Annual Income</h4>
                <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netIncome)}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Expense Ratio</h4>
                <p className="text-lg">
                  {expenseToIncomeRatio.toFixed(1)}%
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PropertyExpensesProps {
  value: Record<string, Expense> | string | null | undefined;
  onChange: (value: Record<string, Expense>) => void;
  assetId?: number; // Asset ID for correctly storing expenses
  assetClassId?: number;
  isEditMode?: boolean;
  isSaving?: boolean;
}

// StablePropertyExpenses wrapper to prevent unnecessary rerenders
export function PropertyExpenses({
  value,
  onChange,
  assetId,
  assetClassId,
  isEditMode = true,
  isSaving = false,
}: PropertyExpensesProps) {
  // Wrapped in useMemo to stabilize props
  const stableProps = React.useMemo(() => {
    return {
      value,
      onChange,
      assetId,
      assetClassId,
      isEditMode,
      isSaving
    };
  }, [value, onChange, assetId, assetClassId, isEditMode, isSaving]);
  
  // Use a unique key to force complete remount when asset ID changes
  return <PropertyExpensesInternal key={`property-expenses-${assetId}`} {...stableProps} />;
}

// Internal implementation that handles actual expense management
function PropertyExpensesInternal({
  value,
  onChange,
  assetId,
  assetClassId,
  isEditMode = true,
  isSaving = false,
}: PropertyExpensesProps) {
  const { toast } = useToast();
  const { 
    propertyExpenses: contextExpenses, 
    setPropertyExpenses: setContextExpenses 
  } = useExpenses();
  
  // Fetch expense categories from the asset class
  const { expenseCategories, isLoading: isLoadingCategories } = useAssetClassDetails(assetClassId);
  
  // Use the asset class expense categories if available, or fall back to defaults
  const availableCategories = expenseCategories && expenseCategories.length > 0
    ? expenseCategories 
    : DEFAULT_EXPENSE_CATEGORIES;
  
  // Use the context editor state instead of local component state
  const { 
    editorState,
    startEditExpense,
    startAddExpense,
    cancelEditExpense,
    updateFormField,
    saveExpense,
    deleteExpense
  } = useExpenses();
  
  // Destructure editor state for easier access
  const { 
    editingId, 
    isAddingNew, 
    formState,
    isEditing
  } = editorState;
  
  // Aliases for form state fields for better readability
  const newCategory = formState.categoryId;
  const newDescription = formState.name;
  const newAmount = formState.amount;
  const newFrequency = formState.frequency;
  
  // Process and normalize the input data
  useEffect(() => {
    if (!assetId) {
      console.error('[PROP_EXPENSES] No asset ID provided, cannot process expenses');
      return;
    }
    
    const traceId = Date.now();
    console.log(`[PROP_EXPENSES:${traceId}] Processing expenses data for asset ${assetId}`);
    
    // Set the current asset ID to ensure we're working with the correct asset
    setCurrentAssetId(assetId);
    
    // If we already have data in the context, we don't need to reprocess it
    if (contextExpenses && Object.keys(contextExpenses).length > 0) {
      console.log(`[PROP_EXPENSES:${traceId}] Using data from context with ${Object.keys(contextExpenses).length} items`);
      return;
    }
    
    if (!value) {
      console.log(`[PROP_EXPENSES:${traceId}] No value provided`);
      return;
    }
    
    try {
      // Update the context with the input value
      // The context will handle normalization and standardization
      console.log(`[PROP_EXPENSES:${traceId}] Updating context with input data`);
      setContextExpenses(value, assetId);
      
      // Context update will trigger a re-render, no need to update local state
    } catch (err) {
      console.error('[PROP_EXPENSES] Failed to process expense data:', err);
    }
  }, [value, setContextExpenses, setCurrentAssetId, assetId, contextExpenses]);
  
  // Calculate annual total based on amount and frequency
  const calculateAnnualTotal = useCallback((amount: number, frequency: 'monthly' | 'quarterly' | 'annually'): number => {
    // Create a minimal expense object that has the required fields for calculateAnnualAmount
    const dummyExpense: Expense = {
      id: '',
      categoryId: '',
      name: '',
      amount,
      frequency
    };
    return calculateAnnualAmount(dummyExpense);
  }, []);
  
  // Reset form fields by canceling the edit in the context
  const resetForm = useCallback(() => {
    cancelEditExpense();
  }, [cancelEditExpense]);
  
  // Helper to find the category name from ID
  const getCategoryNameFromId = useCallback((categoryId: string): string => {
    if (!categoryId) return 'Unknown Category';
    
    // Find the category in available categories
    const category = availableCategories.find(cat => 
      (typeof cat === 'string' && cat === categoryId) || 
      (typeof cat === 'object' && cat && String(cat.id) === categoryId)
    );
    
    if (!category) return categoryId; // Fallback to ID
    
    if (typeof category === 'string') return category;
    if (typeof category.name === 'string') return category.name;
    
    // Handle object or complex name types
    return String(category.name || categoryId);
  }, [availableCategories]);
  
  // Start editing an expense
  const handleStartEdit = useCallback((expense: ComponentExpense) => {
    console.log('[PROP_EXPENSES] Starting to edit expense:', expense.id, expense);
    startEditExpense(expense.id, 'property');
  }, [startEditExpense]);
  
  // Delete an expense
  const handleDeleteExpense = useCallback((id: string) => {
    try {
      console.log(`[PROP_EXPENSES] Deleting expense with ID:`, id);
      
      // Use the context function to delete the expense
      deleteExpense(id);
      
      // Show success message
      toast({
        title: "Success",
        description: "Expense deleted successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('[PROP_EXPENSES] Error deleting expense:', err);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  }, [deleteExpense, toast]);
  
  const handleAddNew = useCallback(() => {
    console.log('[PROP_EXPENSES] Starting to add new expense for property');
    startAddExpense('property');
  }, [startAddExpense]);
  
  const handleCancelEdit = useCallback(() => {
    console.log('[PROP_EXPENSES] Cancelling expense edit operation');
    cancelEditExpense();
  }, [cancelEditExpense]);
  
  // Calculate the total annual expenses
  const totalAnnualExpenses = Object.values(expenses).reduce(
    (total, expense) => total + expense.annualTotal, 0
  );
  
  return (
    <div className="space-y-4">
      {/* Show loading indicator when categories are loading */}
      {isLoadingCategories && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded flex items-center text-blue-700">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className="text-sm">Loading expense categories...</span>
        </div>
      )}
      
      {/* Show loading indicator when saving */}
      {isSaving && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded flex items-center text-blue-700">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className="text-sm">Saving expenses...</span>
        </div>
      )}
      
      {/* Show add button in edit mode */}
      {isEditMode && !isAddingNew && !editingId && (
        <Button 
          variant="outline" 
          className="mb-2"
          onClick={handleAddNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      )}
      
      {/* Expenses table */}
      {Object.values(expenses).length > 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Annual Total</TableHead>
                  {isEditMode && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(expenses).map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="capitalize">{expense.frequency}</TableCell>
                    <TableCell>{formatCurrency(expense.annualTotal)}</TableCell>
                    {isEditMode && (
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleStartEdit(expense)}
                            title="Edit expense"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteExpense(expense.id)}
                            title="Delete expense"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                
                {/* Total row */}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="font-medium">
                    Total Annual Expenses
                  </TableCell>
                  <TableCell className="font-bold">
                    {formatCurrency(totalAnnualExpenses)}
                  </TableCell>
                  {isEditMode && <TableCell></TableCell>}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-4 border rounded text-muted-foreground">
          No expenses added yet.
        </div>
      )}
      
      {/* Edit form - using React.useMemo to prevent it from disappearing during re-renders */}
      {isEditMode && React.useMemo(() => {
        const shouldShowForm = editingId || isAddingNew;
        
        if (!shouldShowForm) {
          return null;
        }
        
        // The form is wrapped in a div with a key to force remounting when editing state changes
        return (
          <div key={`expense-form-${editingId || 'new'}`}>
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Expense" : "Add New Expense"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Category</label>
                    <Select
                      value={newCategory}
                      onValueChange={(value) => {
                        console.log('[PROP_EXPENSES] Updating category field to:', value);
                        updateFormField('categoryId', value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((cat, index) => {
                          // Handle both string and object categories
                          const id = typeof cat === 'string' ? cat : cat.id;
                          const name = typeof cat === 'string' ? cat : 
                            (typeof cat.name === 'string' ? cat.name : String(cat.name));
                          
                          return (
                            <SelectItem key={`${id}-${index}`} value={String(id)}>
                              {name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Description</label>
                    <Input
                      placeholder="Description"
                      value={newDescription}
                      onChange={(e) => {
                        console.log('[PROP_EXPENSES] Updating description field to:', e.target.value);
                        updateFormField('name', e.target.value);
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Amount</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newAmount}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                        console.log('[PROP_EXPENSES] Updating amount field to:', value);
                        updateFormField('amount', value);
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Frequency</label>
                    <Select
                      value={newFrequency}
                      onValueChange={(value) => {
                        console.log('[PROP_EXPENSES] Updating frequency field to:', value);
                        updateFormField('frequency', value as 'monthly' | 'quarterly' | 'annually');
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleCancelEdit} type="button">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('[PROP_EXPENSES] Saving expense with data:', { 
                        id: editingId,
                        type: 'property', 
                        categoryId: newCategory, 
                        name: newDescription, 
                        amount: newAmount, 
                        frequency: newFrequency 
                      });
                      saveExpense();
                    }}
                    type="button"
                  >
                    {editingId ? "Update" : "Add"} Expense
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }, [editingId, isAddingNew, newCategory, newDescription, newAmount, newFrequency, availableCategories, saveExpense, handleCancelEdit])}
    </div>
  );
}