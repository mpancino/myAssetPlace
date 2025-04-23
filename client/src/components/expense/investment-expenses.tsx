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
import { useAssetClassDetails } from "@/hooks/use-asset-class-details";
import { formatCurrency } from "@/lib/utils";
import { parseExpenses, calculateAnnualExpenses, FREQUENCY_MULTIPLIERS } from '@/lib/expense-utils';

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

interface InvestmentExpensesProps {
  value: Record<string, InvestmentExpense> | string | null | undefined;
  onChange: (value: Record<string, InvestmentExpense>) => void;
  assetId?: number; // Asset ID for correctly storing expenses
  assetClassId?: number;
  isEditMode?: boolean;
  isSaving?: boolean;
}

export function InvestmentExpenses({
  value,
  onChange,
  assetId,
  assetClassId,
  isEditMode = true,
  isSaving = false,
}: InvestmentExpensesProps) {
  const { toast } = useToast();
  const { 
    investmentExpenses: contextExpenses, 
    setInvestmentExpenses: setContextExpenses 
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
  
  // Process and normalize the input data
  useEffect(() => {
    console.log(`[INV_EXPENSES:${Date.now()}] useEffect triggered with value:`, value);
    console.log(`[INV_EXPENSES:${Date.now()}] Type of value:`, typeof value);
    console.log(`[INV_EXPENSES:${Date.now()}] isEditMode:`, isEditMode);
    console.log(`[INV_EXPENSES:${Date.now()}] assetId:`, assetId);
    
    // First, check if we have data in the context
    if (Object.keys(contextExpenses).length > 0) {
      console.log(`[INV_EXPENSES:${Date.now()}] Using data from context with ${Object.keys(contextExpenses).length} items`);
      setExpenses(contextExpenses);
      return;
    }
    
    if (value === undefined || value === null) {
      console.log(`[INV_EXPENSES:${Date.now()}] Value is null/undefined, returning early`);
      return;
    }
    
    try {
      // Parse input if needed
      console.log(`[INV_EXPENSES:${Date.now()}] Attempting to parse expenses`);
      const parsedExpenses = parseExpenses(value);
      console.log(`[INV_EXPENSES:${Date.now()}] Parsed expenses:`, parsedExpenses);
      console.log(`[INV_EXPENSES:${Date.now()}] Number of parsed expenses:`, Object.keys(parsedExpenses).length);
      
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
        console.log(`[INV_EXPENSES:${Date.now()}] Setting context with ${Object.keys(normalizedExpenses).length} expenses`);
        
        // Make sure to associate these expenses with the correct asset ID if available
        if (assetId) {
          console.log(`[INV_EXPENSES:${Date.now()}] Associating expenses with asset ID ${assetId}`);
          setContextExpenses(normalizedExpenses, assetId);
        } else {
          console.log(`[INV_EXPENSES:${Date.now()}] No asset ID available to associate expenses`);
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
      console.log('[INV_EXPENSES] Adding new expense');
      console.log('[INV_EXPENSES] Current asset ID:', assetId);
      
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
        console.log(`[INV_EXPENSES] Updating expenses context with asset ID: ${assetId}`);
        setContextExpenses(updatedExpenses, assetId);
      } else {
        console.log('[INV_EXPENSES] Warning: No asset ID available for context update');
        setContextExpenses(updatedExpenses);
      }
      
      // Notify parent component if in edit mode
      if (isEditMode) {
        console.log('[INV_EXPENSES] Notifying parent of expense changes (edit mode only)');
        onChange(updatedExpenses);
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
      console.log('[INV_EXPENSES] Updating expense with id:', editingId);
      console.log('[INV_EXPENSES] Using asset ID:', assetId);
      
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
        console.log(`[INV_EXPENSES] Updating expenses context with asset ID: ${assetId}`);
        setContextExpenses(updatedExpenses, assetId);
      } else {
        console.log('[INV_EXPENSES] Warning: No asset ID available for context update');
        setContextExpenses(updatedExpenses);
      }
      
      // Notify parent component if in edit mode
      if (isEditMode) {
        console.log('[INV_EXPENSES] Notifying parent of expense changes (edit mode only)');
        onChange(updatedExpenses);
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
      console.log('[INV_EXPENSES] Deleting expense with id:', id);
      console.log('[INV_EXPENSES] Current asset ID:', assetId);
      
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
        console.log(`[INV_EXPENSES] Updating expenses context with asset ID: ${assetId}`);
        setContextExpenses(updatedExpenses, assetId);
      } else {
        console.log('[INV_EXPENSES] Warning: No asset ID available for context update');
        setContextExpenses(updatedExpenses);
      }
      
      // Notify parent component if in edit mode
      if (isEditMode) {
        console.log('[INV_EXPENSES] Notifying parent of expense changes (edit mode only)');
        onChange(updatedExpenses);
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
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(expense)}
                        disabled={isSaving}
                      >
                        <Edit className="h-4 w-4 text-primary" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExpense(expense.id)}
                        disabled={isSaving}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            
            {/* Total row */}
            <TableRow className="font-medium bg-muted/50">
              <TableCell colSpan={4} className="text-right">Total Annual:</TableCell>
              <TableCell colSpan={isEditMode ? 2 : 1}>{formatCurrency(totalAnnualExpenses)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <div className="text-center p-4 border rounded border-dashed">
          <p className="text-muted-foreground">No expenses added yet.</p>
          {isEditMode && <p className="text-sm mt-1">Use the form below to add expenses.</p>}
        </div>
      )}
      
      {/* Add new expense form - only show in edit mode */}
      {isEditMode && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">
              {editingId ? "Edit Expense" : (isAddingNew ? "Add New Expense" : "")}
            </h3>
            
            {!isAddingNew && !editingId && (
              <Button 
                variant="outline" 
                onClick={() => setIsAddingNew(true)}
                disabled={isSaving}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            )}
          </div>
          
          {(isAddingNew || editingId) && (
            <div className="bg-muted rounded-md p-4 border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select 
                    value={newCategory} 
                    onValueChange={setNewCategory}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Input
                    placeholder="Brief description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newAmount === '' ? '' : newAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAmount(val === '' ? '' : parseFloat(val));
                    }}
                    disabled={isSaving}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Frequency</label>
                  <Select 
                    value={newFrequency} 
                    onValueChange={setNewFrequency}
                    disabled={isSaving}
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
                  variant="outline"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingId ? handleUpdateExpense : handleAddExpense}
                  disabled={isSaving || !newCategory || !newAmount}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {editingId ? "Update" : "Add"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}