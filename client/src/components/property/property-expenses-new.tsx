import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import type { PropertyExpense } from '@shared/schema';
import { formatCurrency } from "@/lib/utils";

// Default expense categories as fallback
const DEFAULT_EXPENSE_CATEGORIES = [
  "Insurance",
  "Utilities",
  "Property Tax",
  "Maintenance",
  "Management Fee",
  "Cleaning",
  "Gardening",
  "Repairs",
  "Other"
];

// Frequency multipliers for annual total calculation
const FREQUENCY_MULTIPLIERS = {
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

// Basic property expense analysis component
export function PropertyExpenseAnalysis({ 
  expenses, 
  rentalIncome = 0,
  rentalFrequency = "monthly"
}: { 
  expenses: Record<string, PropertyExpense>;
  rentalIncome?: number;
  rentalFrequency?: string;
}) {
  // Calculate totals
  const totalExpenses = Object.values(expenses).reduce(
    (sum, expense) => sum + expense.annualTotal, 0
  );
  
  const annualRental = rentalIncome * 
    (FREQUENCY_MULTIPLIERS[rentalFrequency as keyof typeof FREQUENCY_MULTIPLIERS] || 12);
  
  const netIncome = annualRental - totalExpenses;
  
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
          
          {annualRental > 0 && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-1">Annual Rental Income</h4>
                <p className="text-2xl font-bold">{formatCurrency(annualRental)}</p>
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
                  {annualRental > 0 ? ((totalExpenses / annualRental) * 100).toFixed(1) : 0}%
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
  value: Record<string, PropertyExpense>;
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
    if (!value) return;
    
    try {
      // Parse string input if needed
      let data = value;
      if (typeof value === 'string') {
        data = value ? JSON.parse(value) : {};
      }
      
      // Set the expenses state
      setExpenses(data);
    } catch (err) {
      console.error('Failed to parse expenses data:', err);
      setExpenses({});
    }
  }, [value]);
  
  // Calculate annual total based on amount and frequency
  const calculateAnnualTotal = useCallback((amount: number, frequency: string): number => {
    const multiplier = FREQUENCY_MULTIPLIERS[frequency as keyof typeof FREQUENCY_MULTIPLIERS] || 12;
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
  const handleStartEdit = useCallback((expense: PropertyExpense) => {
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
      // Create a new expense object
      const id = uuidv4();
      const annualTotal = calculateAnnualTotal(amount, newFrequency);
      
      const newExpense: PropertyExpense = {
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
      
      // Update state
      setExpenses(updatedExpenses);
      
      // Notify parent
      onChange(updatedExpenses);
      
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
  }, [newCategory, newDescription, newAmount, newFrequency, expenses, onChange, calculateAnnualTotal, resetForm, toast]);
  
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
      // Get the existing expense
      const existingExpense = expenses[editingId];
      if (!existingExpense) {
        throw new Error(`Expense with ID ${editingId} not found`);
      }
      
      // Create updated expense
      const annualTotal = calculateAnnualTotal(amount, newFrequency);
      
      const updatedExpense: PropertyExpense = {
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
      
      // Update state
      setExpenses(updatedExpenses);
      
      // Notify parent
      onChange(updatedExpenses);
      
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
  }, [editingId, newCategory, newDescription, newAmount, newFrequency, expenses, onChange, calculateAnnualTotal, resetForm, toast]);
  
  // Delete an expense
  const handleDeleteExpense = useCallback((id: string) => {
    try {
      // Check if expense exists
      if (!expenses[id]) {
        throw new Error(`Expense with ID ${id} not found`);
      }
      
      // Create a copy without the deleted expense
      const { [id]: _, ...updatedExpenses } = expenses;
      
      // Update state
      setExpenses(updatedExpenses);
      
      // Notify parent
      onChange(updatedExpenses);
    } catch (err) {
      console.error('Error deleting expense:', err);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  }, [expenses, onChange, toast]);
  
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
                  value={newCategory}
                  onValueChange={setNewCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
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