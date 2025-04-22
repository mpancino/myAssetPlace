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
import { parseExpenses, FREQUENCY_MULTIPLIERS } from '@/lib/expense-utils';

// Default expense categories as fallback with standardized structure
const DEFAULT_EXPENSE_CATEGORIES: StandardizedExpenseCategory[] = [
  { id: "insurance", name: "Insurance" },
  { id: "property-tax", name: "Property Tax" },
  { id: "maintenance", name: "Maintenance" },
  { id: "management-fee", name: "Management Fee" },
  { id: "utilities", name: "Utilities" },
  { id: "other", name: "Other" },
];

// Property expense object structure
export interface PropertyExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string;
  annualTotal: number;
}

// Basic property expense analysis component
export function PropertyExpenseAnalysis({ 
  expenses, 
  annualIncome = 0,
}: { 
  expenses: Record<string, PropertyExpense>;
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
  value: Record<string, PropertyExpense> | string | null | undefined;
  onChange: (value: Record<string, PropertyExpense>) => void;
  assetClassId?: number;
  isEditMode?: boolean;
  isSaving?: boolean;
}

export function PropertyExpenses({
  value,
  onChange,
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
  
  // Core state
  const [expenses, setExpenses] = useState<Record<string, PropertyExpense>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // New expense form state
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newFrequency, setNewFrequency] = useState('monthly');
  
  // Process and normalize the input data
  useEffect(() => {
    console.log(`[PROP_EXPENSES:${Date.now()}] useEffect triggered with value:`, value);
    console.log(`[PROP_EXPENSES:${Date.now()}] Type of value:`, typeof value);
    console.log(`[PROP_EXPENSES:${Date.now()}] isEditMode:`, isEditMode);
    
    // First, check if we have data in the context
    if (Object.keys(contextExpenses).length > 0) {
      console.log(`[PROP_EXPENSES:${Date.now()}] Using data from context with ${Object.keys(contextExpenses).length} items`);
      setExpenses(contextExpenses);
      return;
    }
    
    if (value === undefined || value === null) {
      console.log(`[PROP_EXPENSES:${Date.now()}] Value is null/undefined, returning early`);
      return;
    }
    
    try {
      // Parse input if needed
      console.log(`[PROP_EXPENSES:${Date.now()}] Attempting to parse expenses`);
      const parsedExpenses = parseExpenses(value);
      console.log(`[PROP_EXPENSES:${Date.now()}] Parsed expenses:`, parsedExpenses);
      console.log(`[PROP_EXPENSES:${Date.now()}] Number of parsed expenses:`, Object.keys(parsedExpenses).length);
      
      // Normalize the expense objects to ensure they have all required fields
      const normalizedExpenses: Record<string, PropertyExpense> = {};
      
      Object.entries(parsedExpenses).forEach(([id, expense]) => {
        // Skip if expense is not a proper object
        if (!expense || typeof expense !== 'object') return;
        
        // Get amount and ensure it's a number
        const amount = typeof expense.amount === 'string' 
          ? parseFloat(expense.amount) 
          : (expense.amount || 0);
        
        // Get frequency or default to monthly
        const frequency = expense.frequency || 'monthly';
        
        // Recalculate annual total based on amount and frequency
        const multiplier = FREQUENCY_MULTIPLIERS[frequency] || 12;
        const annualTotal = amount * multiplier;
        
        // Create a normalized expense object
        normalizedExpenses[id] = {
          id,
          category: expense.category || '',
          description: expense.description || '',
          amount,
          frequency,
          annualTotal,
        };
      });
      
      // Only update context if we got meaningful data and didn't already have context data
      if (Object.keys(normalizedExpenses).length > 0) {
        console.log(`[PROP_EXPENSES:${Date.now()}] Setting context with ${Object.keys(normalizedExpenses).length} expenses`);
        setContextExpenses(normalizedExpenses);
      }
      
      setExpenses(normalizedExpenses);
    } catch (err) {
      console.error('[PROP_EXPENSES] Failed to parse property expenses data:', err);
      setExpenses({});
    }
  }, [value, contextExpenses, setContextExpenses]);
  
  // Calculate annual total based on amount and frequency
  const calculateAnnualTotal = useCallback((amount: number, frequency: string): number => {
    const multiplier = FREQUENCY_MULTIPLIERS[frequency] || 12;
    return amount * multiplier;
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
    console.log('Getting category name for ID:', categoryId);
    
    if (!categoryId) {
      console.log('Empty categoryId provided, returning Unknown');
      return 'Unknown Category';
    }
    
    // Convert any non-string ID to string for comparison
    const stringCategoryId = String(categoryId);
    
    // Find the category object
    const category = availableCategories.find(cat => 
      (typeof cat === 'string' && cat === stringCategoryId) || 
      (typeof cat === 'object' && cat && String(cat.id) === stringCategoryId)
    );
    
    console.log('Found category:', category);
    
    if (!category) {
      console.log('No matching category found, using ID as name');
      return stringCategoryId; // Fallback to ID if not found
    }
    
    // Handle string categories
    if (typeof category === 'string') {
      return category;
    } 
    
    // Handle missing name property
    if (!category || category.name === undefined || category.name === null) {
      console.log('Category has no name property, using ID');
      return stringCategoryId;
    }
    
    // Handle nested objects in category name
    if (typeof category.name === 'object') {
      // Try to extract name from nested object
      if (category.name && typeof category.name === 'object' && 'name' in (category.name as any)) {
        const extractedName = String((category.name as any).name);
        console.log('Extracted nested category name:', extractedName);
        return extractedName;
      } else {
        // Fallback if we can't extract a name - try other properties
        console.log('Cannot extract name from nested object, checking alternatives');
        if (category.description && category.description.length > 0) {
          return category.description;
        } else if (category.category) {
          return String(category.category);
        } else if (category.defaultFrequency) {
          const frequency = category.defaultFrequency.charAt(0).toUpperCase() + category.defaultFrequency.slice(1);
          return `${frequency} Expense`;
        }
        return "Category " + stringCategoryId;
      }
    }
    
    // Check for [object Object] string
    const nameStr = String(category.name);
    if (nameStr === "[object Object]") {
      // Try other properties for display
      if (category.description && category.description.length > 0) {
        return category.description;
      } else if (category.category) {
        return String(category.category);
      } else if (category.defaultFrequency) {
        const frequency = category.defaultFrequency.charAt(0).toUpperCase() + category.defaultFrequency.slice(1);
        return `${frequency} Expense`;
      }
      return `Category ${stringCategoryId}`;
    }
    
    // Normal case
    console.log('Using normal category name:', nameStr);
    return nameStr;
  }, [availableCategories]);

  // Start editing an expense
  const handleStartEdit = useCallback((expense: PropertyExpense) => {
    setEditingId(expense.id);
    // Find category ID by name to ensure we use proper ID for selection
    const categoryObject = availableCategories.find(cat => {
      const catName = typeof cat === 'string' ? cat : 
        (typeof cat.name === 'string' ? cat.name : String(cat.name));
      return catName === expense.category;
    });
    
    // Use the found category ID or the string itself as fallback
    if (categoryObject) {
      const catId = typeof categoryObject === 'string' ? categoryObject : categoryObject.id;
      console.log('Found category ID for', expense.category, ':', catId);
      setNewCategory(catId);
    } else {
      // If we can't find the category, use the category string directly
      console.log('Could not find category ID for', expense.category, 'using it directly');
      setNewCategory(expense.category);
    }
    
    setNewDescription(expense.description);
    setNewAmount(expense.amount);
    setNewFrequency(expense.frequency);
  }, [availableCategories]);
  
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
      console.log('[PROP_EXPENSES] Adding new expense');
      
      // Create a new expense object
      const id = uuidv4();
      const annualTotal = calculateAnnualTotal(amount, newFrequency);
      
      const newExpense: PropertyExpense = {
        id,
        category: getCategoryNameFromId(newCategory),
        description: newDescription,
        amount,
        frequency: newFrequency,
        annualTotal,
      };
      
      // Create updated expenses with the new one
      const updatedExpenses = {
        ...expenses,
        [id]: newExpense
      };
      
      console.log('[PROP_EXPENSES] New expenses collection:', updatedExpenses);
      
      // Update local state
      setExpenses(updatedExpenses);
      
      // Update global context
      setContextExpenses(updatedExpenses);
      
      // Notify parent component
      onChange(updatedExpenses);
      
      // Reset form
      resetForm();
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
      console.log('[PROP_EXPENSES] Updating expense with id:', editingId);
      
      // Get the existing expense
      const existingExpense = expenses[editingId];
      if (!existingExpense) {
        throw new Error(`Expense with ID ${editingId} not found`);
      }
      
      // Create updated expense
      const annualTotal = calculateAnnualTotal(amount, newFrequency);
      
      const updatedExpense: PropertyExpense = {
        ...existingExpense,
        category: getCategoryNameFromId(newCategory),
        description: newDescription,
        amount,
        frequency: newFrequency,
        annualTotal,
      };
      
      // Create updated expenses with the modified one
      const updatedExpenses = {
        ...expenses,
        [editingId]: updatedExpense
      };
      
      // Update local state
      setExpenses(updatedExpenses);
      
      // Update global context
      setContextExpenses(updatedExpenses);
      
      // Notify parent component
      onChange(updatedExpenses);
      
      // Reset form
      resetForm();
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
      console.log('[PROP_EXPENSES] Deleting expense with id:', id);
      
      // Check if expense exists
      if (!expenses[id]) {
        throw new Error(`Expense with ID ${id} not found`);
      }
      
      // Create a copy without the deleted expense
      const { [id]: _, ...updatedExpenses } = expenses;
      
      console.log('[PROP_EXPENSES] Updated expenses after deletion:', updatedExpenses);
      
      // Update local state
      setExpenses(updatedExpenses);
      
      // Update global context
      setContextExpenses(updatedExpenses);
      
      // Notify parent component
      onChange(updatedExpenses);
    } catch (err) {
      console.error('[PROP_EXPENSES] Error deleting expense:', err);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  }, [expenses, onChange, toast, setContextExpenses]);
  
  // Calculate the total annual expenses
  const totalAnnualExpenses = Object.values(expenses).reduce(
    (total, expense) => total + expense.annualTotal, 0
  );
  
  return (
    <div className="space-y-4">
      {/* Show loading indicator when saving */}
      {isSaving && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded flex items-center text-blue-700">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className="text-sm">Saving expenses...</span>
        </div>
      )}
      
      {/* Expenses table */}
      {Object.values(expenses).length > 0 ? (
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
                  value={newCategory ? String(newCategory) : undefined}
                  onValueChange={setNewCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => {
                      // Ensure we always have a string ID
                      const categoryId = typeof category === 'string' 
                        ? category 
                        : (category && category.id ? String(category.id) : `cat-${Math.random().toString(36).substring(2, 9)}`);
                      
                      // Safely handle category name, ensuring it's always a string
                      let categoryName: string;
                      
                      if (typeof category === 'string') {
                        categoryName = category;
                      } else if (!category || category.name === undefined || category.name === null) {
                        // Fallback to ID if name is not available
                        categoryName = categoryId;
                      } else if (typeof category.name === 'object') {
                        // Handle nested objects in category name
                        if (category.name && typeof category.name === 'object' && 'name' in (category.name as any)) {
                          categoryName = String((category.name as any).name);
                          console.log('Extracted nested name:', categoryName);
                        } else {
                          // Last resort fallback - convert object to string representation
                          categoryName = "Category " + categoryId;
                        }
                      } else {
                        // Normal case
                        categoryName = String(category.name);
                      }
                      
                      console.log(`Rendering category: ID=${categoryId}, Name=${categoryName}`);
                      
                      return (
                        <SelectItem key={categoryId} value={categoryId}>
                          {categoryName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amount</label>
                <Input
                  type="number"
                  value={newAmount === '' ? '' : newAmount}
                  onChange={(e) => setNewAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Frequency</label>
                <Select
                  value={newFrequency}
                  onValueChange={setNewFrequency}
                >
                  <SelectTrigger>
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
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={editingId ? handleUpdateExpense : handleAddExpense}
                disabled={!newCategory || !newAmount}
              >
                {editingId ? 'Save Changes' : 'Add Expense'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Add expense button */}
      {isEditMode && !editingId && !isAddingNew && (
        <Button 
          onClick={() => setIsAddingNew(true)}
          className="w-full"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      )}
    </div>
  );
}