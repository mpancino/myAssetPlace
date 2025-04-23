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
  TableFooter
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
  Loader2,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAssetClassDetails } from "@/hooks/use-asset-class-details";
import { formatCurrency } from "@/lib/utils";
import { parseExpenses, calculateAnnualExpenses, FREQUENCY_MULTIPLIERS } from '@/lib/expense-utils';
import type { Expense } from '@shared/schema';

// Default expense categories as fallback
const DEFAULT_EXPENSE_CATEGORIES = [
  "Management Fee",
  "Trading Fee", 
  "Advisory Fee",
  "Platform Fee",
  "Tax Preparation",
  "Other",
];

// Investment expense object structure
export interface InvestmentExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string;
  annualTotal: number;
}

// Basic investment expense analysis component
export function InvestmentExpenseAnalysis({ 
  expenses, 
  annualIncome = 0,
}: { 
  expenses: Record<string, InvestmentExpense>;
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
        <CardTitle>Investment Expense Analysis</CardTitle>
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
                <h4 className="text-sm font-medium mb-1">Annual Investment Income</h4>
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

interface InvestmentExpensesFixedProps {
  value: Record<string, InvestmentExpense> | string | null | undefined;
  onChange: (value: Record<string, InvestmentExpense>) => void;
  assetId?: number; // Asset ID for correctly storing expenses
  assetClassId?: number;
  isEditMode?: boolean;
  isSaving?: boolean;
}

export function InvestmentExpensesFixed({
  value,
  onChange,
  assetId,
  assetClassId,
  isEditMode = true,
  isSaving = false,
}: InvestmentExpensesFixedProps) {
  const { toast } = useToast();
  const { 
    investmentExpenses: contextExpenses, 
    setInvestmentExpenses: setContextExpenses,
    setCurrentAssetId,
    editorState
  } = useExpenses();
  
  // Fetch expense categories from the asset class
  const { expenseCategories, isLoading: isLoadingCategories } = useAssetClassDetails(assetClassId);
  
  // Use the asset class expense categories if available, or fall back to defaults
  const availableCategories = expenseCategories && expenseCategories.length > 0
    ? expenseCategories.map((cat) => typeof cat === 'string' ? cat : cat.name) 
    : DEFAULT_EXPENSE_CATEGORIES;
  
  // Core state
  const [expenses, setExpenses] = useState<Record<string, InvestmentExpense>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // New expense form state
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newFrequency, setNewFrequency] = useState('monthly');
  
  // Initialize the expense context with the current asset ID
  useEffect(() => {
    if (assetId) {
      console.log('Setting current asset ID in investment expense context:', assetId);
      setCurrentAssetId(assetId);
    }
  }, [assetId, setCurrentAssetId]);
  
  // Process incoming expense data and update context
  useEffect(() => {
    if (assetId && value !== undefined && value !== null) {
      console.log(`[INV_EXPENSES_FIXED] Processing investment expenses for asset ${assetId}`);
      setContextExpenses(value, assetId);
    }
  }, [value, assetId, setContextExpenses]);
  
  // Modified: Don't automatically notify parent form on every expense change
  // This prevents triggering form-wide automatic saves when only expenses change
  useEffect(() => {
    if (isEditMode && onChange && Object.keys(contextExpenses).length > 0) {
      console.log('[INV_EXPENSES_FIXED] Investment expenses changed in context, but NOT auto-updating parent form');
      console.log('[INV_EXPENSES_FIXED] This prevents unnecessary automatic form saves');
      // Removed onChange(contextExpenses) to prevent triggering parent form updates
      // Parent form will get the values when explicitly saved or during form submission
    }
  }, [contextExpenses, isEditMode]);
  
  // Process and normalize the input data
  useEffect(() => {
    console.log(`[INV_EXPENSES_FIXED:${Date.now()}] useEffect triggered with value:`, value);
    console.log(`[INV_EXPENSES_FIXED:${Date.now()}] Type of value:`, typeof value);
    console.log(`[INV_EXPENSES_FIXED:${Date.now()}] isEditMode:`, isEditMode);
    console.log(`[INV_EXPENSES_FIXED:${Date.now()}] assetId:`, assetId);
    
    // First, check if we have data in the context
    if (Object.keys(contextExpenses).length > 0) {
      console.log(`[INV_EXPENSES_FIXED:${Date.now()}] Using data from context with ${Object.keys(contextExpenses).length} items`);
      setExpenses(contextExpenses);
      return;
    }
    
    if (value === undefined || value === null) {
      console.log(`[INV_EXPENSES_FIXED:${Date.now()}] Value is null/undefined, returning early`);
      return;
    }
    
    try {
      // Parse input if needed
      console.log(`[INV_EXPENSES_FIXED:${Date.now()}] Attempting to parse expenses`);
      const parsedExpenses = parseExpenses(value);
      console.log(`[INV_EXPENSES_FIXED:${Date.now()}] Parsed expenses:`, parsedExpenses);
      console.log(`[INV_EXPENSES_FIXED:${Date.now()}] Number of parsed expenses:`, Object.keys(parsedExpenses).length);
      
      // Normalize the expense objects to ensure they have all required fields
      const normalizedExpenses: Record<string, InvestmentExpense> = {};
      
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
        console.log(`[INV_EXPENSES_FIXED:${Date.now()}] Setting context with ${Object.keys(normalizedExpenses).length} expenses`);
        
        // Make sure to associate these expenses with the correct asset ID if available
        if (assetId) {
          console.log(`[INV_EXPENSES_FIXED:${Date.now()}] Associating expenses with asset ID ${assetId}`);
          setContextExpenses(normalizedExpenses, assetId);
        } else {
          console.log(`[INV_EXPENSES_FIXED:${Date.now()}] No asset ID available to associate expenses`);
          setContextExpenses(normalizedExpenses);
        }
      }
      
      setExpenses(normalizedExpenses);
    } catch (err) {
      console.error('Failed to parse investment expenses data:', err);
      setExpenses({});
    }
  }, [value, contextExpenses, setContextExpenses, assetId]);
  
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

  // Start editing an expense
  const handleStartEdit = useCallback((expense: InvestmentExpense) => {
    setEditingId(expense.id);
    setNewCategory(expense.category);
    setNewDescription(expense.description);
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
      console.log('[INV_EXPENSES_FIXED] Adding new expense');
      console.log('[INV_EXPENSES_FIXED] Current asset ID:', assetId);
      
      // Create a new expense object
      const id = uuidv4();
      const annualTotal = calculateAnnualTotal(amount, newFrequency);
      
      const newExpense: InvestmentExpense = {
        id,
        category: newCategory,
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
      
      // Update local state
      setExpenses(updatedExpenses);
      
      // Update global context - explicitly pass the asset ID to ensure proper association
      if (assetId) {
        console.log(`[INV_EXPENSES_FIXED] Updating expenses context with asset ID: ${assetId}`);
        setContextExpenses(updatedExpenses, assetId);
      } else {
        console.log('[INV_EXPENSES_FIXED] Warning: No asset ID available for context update');
        setContextExpenses(updatedExpenses);
      }
      
      // Modified: Do not automatically notify parent form to prevent triggering asset-wide saves
      if (isEditMode) {
        console.log('[INV_EXPENSES_FIXED] Investment expenses changed, but NOT auto-updating parent form');
        console.log('[INV_EXPENSES_FIXED] This prevents unnecessary automatic form saves');
        // Removed onChange(updatedExpenses) to prevent triggering parent form updates
      }
      
      // Reset form
      resetForm();
    } catch (err) {
      console.error('Error adding expense:', err);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    }
  }, [newCategory, newDescription, newAmount, newFrequency, expenses, onChange, calculateAnnualTotal, resetForm, toast, setContextExpenses, assetId, isEditMode]);
  
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
      console.log('[INV_EXPENSES_FIXED] Updating expense with id:', editingId);
      console.log('[INV_EXPENSES_FIXED] Using asset ID:', assetId);
      
      // Get the existing expense
      const existingExpense = expenses[editingId];
      if (!existingExpense) {
        throw new Error(`Expense with ID ${editingId} not found`);
      }
      
      // Create updated expense
      const annualTotal = calculateAnnualTotal(amount, newFrequency);
      
      const updatedExpense: InvestmentExpense = {
        ...existingExpense,
        category: newCategory,
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
      
      // Update global context - explicitly pass the asset ID to ensure proper association
      if (assetId) {
        console.log(`[INV_EXPENSES_FIXED] Updating expenses context with asset ID: ${assetId}`);
        setContextExpenses(updatedExpenses, assetId);
      } else {
        console.log('[INV_EXPENSES_FIXED] Warning: No asset ID available for context update');
        setContextExpenses(updatedExpenses);
      }
      
      // Modified: Do not automatically notify parent form to prevent triggering asset-wide saves
      if (isEditMode) {
        console.log('[INV_EXPENSES_FIXED] Investment expenses changed, but NOT auto-updating parent form');
        console.log('[INV_EXPENSES_FIXED] This prevents unnecessary automatic form saves');
        // Removed onChange(updatedExpenses) to prevent triggering parent form updates
      }
      
      // Reset form
      resetForm();
    } catch (err) {
      console.error('Error updating expense:', err);
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
    }
  }, [editingId, newCategory, newDescription, newAmount, newFrequency, expenses, onChange, calculateAnnualTotal, resetForm, toast, setContextExpenses, assetId, isEditMode]);
  
  // Delete an expense
  const handleDeleteExpense = useCallback((id: string) => {
    try {
      console.log('[INV_EXPENSES_FIXED] Deleting expense with id:', id);
      console.log('[INV_EXPENSES_FIXED] Current asset ID:', assetId);
      
      // Check if expense exists
      if (!expenses[id]) {
        throw new Error(`Expense with ID ${id} not found`);
      }
      
      // Create a copy without the deleted expense
      const { [id]: _, ...updatedExpenses } = expenses;
      
      // Update local state
      setExpenses(updatedExpenses);
      
      // Update global context - explicitly pass the asset ID to ensure proper association
      if (assetId) {
        console.log(`[INV_EXPENSES_FIXED] Updating expenses context with asset ID: ${assetId}`);
        setContextExpenses(updatedExpenses, assetId);
      } else {
        console.log('[INV_EXPENSES_FIXED] Warning: No asset ID available for context update');
        setContextExpenses(updatedExpenses);
      }
      
      // Modified: Do not automatically notify parent form to prevent triggering asset-wide saves
      if (isEditMode) {
        console.log('[INV_EXPENSES_FIXED] Investment expenses changed, but NOT auto-updating parent form');
        console.log('[INV_EXPENSES_FIXED] This prevents unnecessary automatic form saves');
        // Removed onChange(updatedExpenses) to prevent triggering parent form updates
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  }, [expenses, onChange, toast, setContextExpenses, assetId, isEditMode]);
  
  // Calculate the total annual expenses
  const totalAnnualExpenses = Object.values(expenses).reduce(
    (total, expense) => total + expense.annualTotal, 0
  );

  // Function to explicitly save expenses to the parent form
  const handleSaveExpensesToParent = useCallback(() => {
    if (isEditMode && onChange) {
      console.log('[INV_EXPENSES_FIXED] Explicitly saving expenses to parent form');
      console.log('[INV_EXPENSES_FIXED] Number of expenses being saved:', Object.keys(expenses).length);
      
      // Now we explicitly call onChange to update the parent form
      onChange(expenses);
      
      toast({
        title: "Expenses Updated",
        description: "Investment expenses have been updated in the form",
        duration: 2000,
      });
    }
  }, [expenses, isEditMode, onChange, toast]);
  
  return (
    <div className="space-y-4">
      {/* Debug and save controls - only show in edit mode */}
      {isEditMode && (
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Debug: InvestmentExpensesFixed rendered with {Object.keys(expenses).length} expenses
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveExpensesToParent}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            Update Form
          </Button>
        </div>
      )}
      
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
              {isEditMode && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(expenses).map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.category}</TableCell>
                <TableCell>{expense.description}</TableCell>
                <TableCell>{formatCurrency(expense.amount)}</TableCell>
                <TableCell className="capitalize">{expense.frequency}</TableCell>
                <TableCell>{formatCurrency(expense.annualTotal)}</TableCell>
                {isEditMode && (
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleStartEdit(expense)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Total Annual Expenses</TableCell>
              <TableCell colSpan={isEditMode ? 2 : 1}>{formatCurrency(totalAnnualExpenses)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <div className="text-center py-10 border rounded-md">
          <AlertTriangle className="h-10 w-10 mx-auto text-yellow-500 mb-2" />
          <p>No expenses have been added yet.</p>
          {isEditMode && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setIsAddingNew(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Expense
            </Button>
          )}
        </div>
      )}
      
      {/* Add/Edit expense form - only show in edit mode */}
      {isEditMode && (editingId || isAddingNew) && (
        <div className="border p-4 rounded-md bg-muted">
          <h3 className="font-medium text-base mb-4">
            {editingId ? "Edit Expense" : "Add New Expense"}
          </h3>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="category">
                  Category
                </label>
                <Select
                  value={newCategory}
                  onValueChange={setNewCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem 
                        key={typeof category === 'string' ? category : category.id} 
                        value={typeof category === 'string' ? category : category.name}
                      >
                        {typeof category === 'string' ? category : category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="description">
                  Description
                </label>
                <Input
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Expense description"
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="amount">
                  Amount
                </label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="frequency">
                  Frequency
                </label>
                <Select
                  value={newFrequency}
                  onValueChange={setNewFrequency}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                variant="outline" 
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setIsAddingNew(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={editingId ? handleUpdateExpense : handleAddExpense}
              >
                {editingId ? 'Update' : 'Add'} Expense
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Expense management buttons when not in edit mode */}
      {isEditMode && !editingId && !isAddingNew && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => setIsAddingNew(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </div>
      )}
    </div>
  );
}