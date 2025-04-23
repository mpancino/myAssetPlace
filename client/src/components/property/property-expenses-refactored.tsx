import React, { useState, useEffect, useCallback } from 'react';
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

export function PropertyExpenses({
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
  
  // Core state - uses ComponentExpense to include UI display fields
  const [expenses, setExpenses] = useState<Record<string, ComponentExpense>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // New expense form state
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newFrequency, setNewFrequency] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  
  // Process and normalize the input data
  useEffect(() => {
    const traceId = Date.now();
    console.log(`[PROP_EXPENSES:${traceId}] Processing expenses data`);
    
    // First, check if we have data in the context
    if (contextExpenses && Object.keys(contextExpenses).length > 0) {
      console.log(`[PROP_EXPENSES:${traceId}] Using data from context with ${Object.keys(contextExpenses).length} items`);
      
      // Convert context expenses to component format for UI display
      const componentExpenses = convertToComponentFormat(contextExpenses) as Record<string, ComponentExpense>;
      setExpenses(componentExpenses);
      return;
    }
    
    if (!value) {
      console.log(`[PROP_EXPENSES:${traceId}] No value provided, returning early`);
      return;
    }
    
    try {
      // Standardize the input value to ensure it's a proper Record<string, Expense>
      let standardExpenses: Record<string, Expense>;
      
      if (typeof value === 'string') {
        // Parse JSON string
        try {
          const parsedValue = JSON.parse(value);
          // Convert the parsed object to standard Expense format
          standardExpenses = convertToPageFormat(parsedValue);
        } catch (e) {
          console.error(`[PROP_EXPENSES:${traceId}] Error parsing JSON:`, e);
          standardExpenses = {};
        }
      } else {
        // Already an object, but might need standardization
        standardExpenses = convertToPageFormat(value);
      }
      
      // Convert standardized expenses to component format for UI display
      const componentExpenses = convertToComponentFormat(standardExpenses) as Record<string, ComponentExpense>;
      
      // Update state with component expenses for UI display
      setExpenses(componentExpenses);
      
      // Update the global context if we have non-empty expenses
      if (Object.keys(standardExpenses).length > 0) {
        console.log(`[PROP_EXPENSES:${traceId}] Updating context with ${Object.keys(standardExpenses).length} standardized expenses`);
        setContextExpenses(standardExpenses);
      }
    } catch (err) {
      console.error('[PROP_EXPENSES] Failed to process expense data:', err);
      setExpenses({});
    }
  }, [value, contextExpenses, setContextExpenses]);
  
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
  
  // Reset form fields
  const resetForm = useCallback(() => {
    setNewCategory('');
    setNewDescription('');
    setNewAmount('');
    setNewFrequency('monthly');
    setEditingId(null);
    setIsAddingNew(false);
  }, []);
  
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
    setEditingId(expense.id);
    setNewCategory(expense.categoryId);
    setNewDescription(expense.name);
    setNewAmount(expense.amount);
    setNewFrequency(expense.frequency);
  }, []);
  
  // Add a new expense
  const handleAddExpense = useCallback(() => {
    if (!newCategory || !newAmount) {
      toast({
        title: "Missing information",
        description: "Please provide a category and amount",
        variant: "destructive",
      });
      return;
    }
    
    const amount = typeof newAmount === 'string' ? parseFloat(newAmount) : newAmount;
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const traceId = Math.floor(Math.random() * 10000000);
      console.log(`[PROP_EXPENSES:${traceId}] Adding new expense`);
      
      // Create a new standardized expense
      const id = uuidv4();
      
      // Create the standard Expense object
      const standardExpense: Expense = {
        id,
        categoryId: newCategory,
        name: newDescription,
        amount,
        frequency: newFrequency
      };
      
      // Calculate annual total for UI display
      const annualTotal = calculateAnnualTotal(amount, newFrequency);
      
      // Create component expense with display fields
      const componentExpense: ComponentExpense = {
        ...standardExpense,
        category: getCategoryNameFromId(newCategory),
        description: newDescription,
        annualTotal
      };
      
      // Update local state with the new component expense
      const updatedComponentExpenses = {
        ...expenses,
        [id]: componentExpense
      };
      
      // Update local state immediately for responsive UI
      setExpenses(updatedComponentExpenses);
      
      // Convert to standard expenses for storage
      const updatedStandardExpenses = Object.entries(updatedComponentExpenses).reduce(
        (acc, [key, expense]) => {
          acc[key] = {
            id: expense.id,
            categoryId: expense.categoryId,
            name: expense.name,
            amount: expense.amount,
            frequency: expense.frequency,
            notes: expense.notes
          };
          return acc;
        }, 
        {} as Record<string, Expense>
      );
      
      // Update context
      setContextExpenses(updatedStandardExpenses);
      
      // Notify parent component
      onChange(updatedStandardExpenses);
      
      // Reset form
      resetForm();
      
      // Show success message
      toast({
        title: "Success",
        description: "Expense added successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('[PROP_EXPENSES] Error adding expense:', err);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    }
  }, [newCategory, newDescription, newAmount, newFrequency, expenses, onChange, calculateAnnualTotal, resetForm, toast, setContextExpenses, getCategoryNameFromId]);
  
  // Update an existing expense
  const handleUpdateExpense = useCallback(() => {
    if (!editingId || !newCategory || !newAmount) {
      toast({
        title: "Missing information",
        description: "Please provide a category and amount",
        variant: "destructive",
      });
      return;
    }
    
    const amount = typeof newAmount === 'string' ? parseFloat(newAmount) : newAmount;
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const traceId = Math.floor(Math.random() * 10000000);
      console.log(`[PROP_EXPENSES:${traceId}] Updating expense with ID:`, editingId);
      
      // Get existing expense
      const existingExpense = expenses[editingId];
      if (!existingExpense) {
        throw new Error(`Expense with ID ${editingId} not found`);
      }
      
      // Update the standard expense
      const updatedStandardExpense: Expense = {
        id: editingId,
        categoryId: newCategory,
        name: newDescription,
        amount,
        frequency: newFrequency,
        notes: existingExpense.notes
      };
      
      // Calculate annual total for UI display
      const annualTotal = calculateAnnualTotal(amount, newFrequency);
      
      // Create the updated component expense with UI display fields
      const updatedComponentExpense: ComponentExpense = {
        ...updatedStandardExpense,
        category: getCategoryNameFromId(newCategory),
        description: newDescription,
        annualTotal
      };
      
      // Update local state
      const updatedComponentExpenses = {
        ...expenses,
        [editingId]: updatedComponentExpense
      };
      
      // Update local state immediately for responsive UI
      setExpenses(updatedComponentExpenses);
      
      // Convert to standard expenses for storage
      const updatedStandardExpenses = Object.entries(updatedComponentExpenses).reduce(
        (acc, [key, expense]) => {
          acc[key] = {
            id: expense.id,
            categoryId: expense.categoryId,
            name: expense.name,
            amount: expense.amount,
            frequency: expense.frequency,
            notes: expense.notes
          };
          return acc;
        }, 
        {} as Record<string, Expense>
      );
      
      // Update context
      setContextExpenses(updatedStandardExpenses);
      
      // Notify parent component
      onChange(updatedStandardExpenses);
      
      // Reset form
      resetForm();
      
      // Show success message
      toast({
        title: "Success",
        description: "Expense updated successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('[PROP_EXPENSES] Error updating expense:', err);
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
    }
  }, [editingId, newCategory, newDescription, newAmount, newFrequency, expenses, onChange, calculateAnnualTotal, resetForm, toast, setContextExpenses, getCategoryNameFromId]);
  
  // Delete an expense
  const handleDeleteExpense = useCallback((id: string) => {
    try {
      const traceId = Math.floor(Math.random() * 10000000);
      console.log(`[PROP_EXPENSES:${traceId}] Deleting expense with ID:`, id);
      
      // Create a copy of expenses without the deleted one
      const { [id]: _, ...updatedComponentExpenses } = expenses;
      
      // Update local state immediately for responsive UI
      setExpenses(updatedComponentExpenses);
      
      // Convert to standard expenses for storage
      const updatedStandardExpenses = Object.entries(updatedComponentExpenses).reduce(
        (acc, [key, expense]) => {
          acc[key] = {
            id: expense.id,
            categoryId: expense.categoryId,
            name: expense.name,
            amount: expense.amount,
            frequency: expense.frequency,
            notes: expense.notes
          };
          return acc;
        }, 
        {} as Record<string, Expense>
      );
      
      // Update context
      setContextExpenses(updatedStandardExpenses);
      
      // Notify parent component
      onChange(updatedStandardExpenses);
      
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
  }, [expenses, onChange, toast, setContextExpenses]);
  
  const handleAddNew = useCallback(() => {
    setEditingId(null);
    setIsAddingNew(true);
    resetForm();
  }, [resetForm]);
  
  const handleCancelEdit = useCallback(() => {
    resetForm();
  }, [resetForm]);
  
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
      
      {/* Edit form */}
      {isEditMode && (editingId || isAddingNew) && (
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
                  onValueChange={setNewCategory}
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
                  onChange={(e) => setNewDescription(e.target.value)}
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
                  onChange={(e) => setNewAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Frequency</label>
                <Select
                  value={newFrequency}
                  onValueChange={(value) => setNewFrequency(value as 'monthly' | 'quarterly' | 'annually')}
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
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={editingId ? handleUpdateExpense : handleAddExpense}>
                {editingId ? "Update" : "Add"} Expense
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}