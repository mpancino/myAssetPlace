import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Plus, Trash2, Edit, Check, X, AlertTriangle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency } from "@/lib/utils";
import { PropertyExpense } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Frequency multiplier constants
type FrequencyMultiplier = {
  [key: string]: number;
  monthly: number;
  quarterly: number;
  annually: number;
};

const FREQUENCY_MULTIPLIERS: FrequencyMultiplier = {
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

// Command pattern for expense operations
type ExpenseCommand = 
  | { type: 'ADD', expense: PropertyExpense }
  | { type: 'UPDATE', id: string, data: Partial<Omit<PropertyExpense, 'id'>> }
  | { type: 'DELETE', id: string }
  | { type: 'SYNC', expenses: Record<string, PropertyExpense> };

interface PropertyExpensesProps {
  value: Record<string, PropertyExpense>;
  onChange: (value: Record<string, PropertyExpense>) => void;
  currencySymbol?: string;
}

// Categories for expense types
const EXPENSE_CATEGORIES = [
  "Insurance",
  "Property Tax",
  "Maintenance",
  "Management Fee",
  "Utilities",
  "Strata/HOA",
  "Council Rates",
  "Land Tax",
  "Gardening",
  "Cleaning",
  "Repairs",
  "Other",
];

export function PropertyExpenses({ value, onChange, currencySymbol = "$" }: PropertyExpensesProps) {
  const { toast } = useToast();
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Record<string, PropertyExpense>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Track if we're in an external update from parent
  const isExternalUpdate = useRef(false);
  
  // Default new expense form data
  const defaultNewExpense = {
    category: "",
    description: "",
    amount: 0,
    frequency: "monthly",
  };
  
  const [newExpense, setNewExpense] = useState<Omit<PropertyExpense, "id" | "annualTotal">>(defaultNewExpense);

  // Calculate annual total based on amount and frequency
  const calculateAnnualTotal = useCallback((amount: number, frequency: string): number => {
    return amount * (FREQUENCY_MULTIPLIERS[frequency as keyof FrequencyMultiplier] || 12);
  }, []);

  // Reset form state
  const resetForm = useCallback(() => {
    setNewExpense(defaultNewExpense);
    setIsAddingExpense(false);
    setEditingExpenseId(null);
  }, []);

  // Handle expense operations with command pattern
  const processExpenseCommand = useCallback((command: ExpenseCommand): Record<string, PropertyExpense> => {
    let updatedExpenses: Record<string, PropertyExpense> = { ...expenses };
    const timestamp = new Date().toISOString();
    
    switch (command.type) {
      case 'ADD':
        console.log(`[${timestamp}] Executing ADD command for expense ID: ${command.expense.id}`);
        updatedExpenses = {
          ...updatedExpenses,
          [command.expense.id]: command.expense,
        };
        break;
        
      case 'UPDATE':
        console.log(`[${timestamp}] Executing UPDATE command for expense ID: ${command.id}`);
        if (updatedExpenses[command.id]) {
          const currentExpense = updatedExpenses[command.id];
          updatedExpenses = {
            ...updatedExpenses,
            [command.id]: {
              ...currentExpense,
              ...command.data,
              annualTotal: calculateAnnualTotal(
                command.data.amount !== undefined ? command.data.amount : currentExpense.amount,
                command.data.frequency !== undefined ? command.data.frequency : currentExpense.frequency
              ),
            },
          };
        }
        break;
        
      case 'DELETE':
        console.log(`[${timestamp}] Executing DELETE command for expense ID: ${command.id}`);
        const { [command.id]: _, ...remainingExpenses } = updatedExpenses;
        updatedExpenses = remainingExpenses;
        break;
        
      case 'SYNC':
        console.log(`[${timestamp}] Executing SYNC command - replacing expenses with external data`);
        console.log(`Previous state had ${Object.keys(expenses).length} expenses`);
        console.log(`New state has ${Object.keys(command.expenses).length} expenses`);
        updatedExpenses = { ...command.expenses };
        break;
    }
    
    return updatedExpenses;
  }, [expenses, calculateAnnualTotal]);

  // Apply a command, update state, and notify parent
  const applyCommand = useCallback((command: ExpenseCommand) => {
    setIsProcessing(true);
    
    // Process the command to get updated expenses
    const updatedExpenses = processExpenseCommand(command);
    
    // Update local state
    setExpenses(updatedExpenses);
    
    // Notify parent
    onChange(updatedExpenses);
    
    // Only log detailed info for non-SYNC operations
    if (command.type !== 'SYNC') {
      console.log(`After ${command.type.toLowerCase()} operation, total expenses: ${Object.keys(updatedExpenses).length}`);
    }
    
    setTimeout(() => {
      setIsProcessing(false);
    }, 100);
    
    return updatedExpenses;
  }, [processExpenseCommand, onChange]);

  // Track if we have recent local changes that should take precedence
  const hasRecentLocalChanges = useRef(false);
  const localChangesTimestamp = useRef<number | null>(null);
  
  // Function to mark that we've made local changes
  const markLocalChanges = useCallback(() => {
    hasRecentLocalChanges.current = true;
    localChangesTimestamp.current = Date.now();
    
    // Automatically clear the local changes flag after a reasonable time
    // This ensures we eventually sync with server if a refetch doesn't happen
    setTimeout(() => {
      hasRecentLocalChanges.current = false;
    }, 2000); // 2 seconds should be enough for most server operations to complete
  }, []);
  
  // Function to check if we should accept external updates
  const shouldAcceptExternalUpdates = useCallback(() => {
    if (!hasRecentLocalChanges.current) return true;
    
    // If it's been more than 1.5 seconds since our local change,
    // we'll accept external updates even if we flagged local changes
    if (localChangesTimestamp.current && 
        Date.now() - localChangesTimestamp.current > 1500) {
      return true;
    }
    
    return false;
  }, []);
  
  // External data sync - with improved logic for handling local vs server state
  useEffect(() => {
    // Always skip sync during active processing
    if (isProcessing) {
      console.log('[SYNC SKIPPED] Skipping sync while processing local operation');
      return;
    }
    
    // Skip sync if we have recent local changes that should take precedence
    if (hasRecentLocalChanges.current && !shouldAcceptExternalUpdates()) {
      console.log('[SYNC SKIPPED] Recent local changes detected, preserving local state');
      return;
    }
    
    // Compare current expenses with incoming value
    const currentKeys = Object.keys(expenses);
    const incomingKeys = Object.keys(value || {});
    const incomingExpenses = value || {};
    
    // Only sync if there's an actual difference
    if (JSON.stringify(currentKeys.sort()) !== JSON.stringify(incomingKeys.sort()) ||
        JSON.stringify(expenses) !== JSON.stringify(incomingExpenses)) {
      
      console.log('[SYNC] External data change detected');
      console.log('Current expense count:', currentKeys.length);
      console.log('Incoming expense count:', incomingKeys.length);
      
      // If we're accepting an update with fewer expenses than we have locally,
      // it might be a race condition where the server hasn't processed our additions yet
      if (incomingKeys.length < currentKeys.length && hasRecentLocalChanges.current) {
        console.log('[SYNC DELAYED] Incoming data has fewer expenses than local state. Delaying sync to prevent data loss.');
        return;
      }
      
      isExternalUpdate.current = true;
      
      applyCommand({ type: 'SYNC', expenses: incomingExpenses });
      
      setTimeout(() => {
        isExternalUpdate.current = false;
      }, 200);
    }
  }, [value, expenses, applyCommand, isProcessing, shouldAcceptExternalUpdates]);

  // Handler for adding a new expense
  const handleAddExpense = useCallback(() => {
    if (!newExpense.category || newExpense.amount <= 0) {
      toast({
        title: "Invalid expense",
        description: "Please provide a category and valid amount",
        variant: "destructive",
      });
      return;
    }
    
    const id = uuidv4();
    const annualTotal = calculateAnnualTotal(newExpense.amount, newExpense.frequency);
    
    const newExpenseWithId: PropertyExpense = {
      id,
      ...newExpense,
      annualTotal,
    };
    
    // Mark that we have a local change that should take precedence
    markLocalChanges();
    
    applyCommand({ type: 'ADD', expense: newExpenseWithId });
    resetForm();
    
    toast({
      title: "Expense added",
      description: `Added ${newExpense.category} expense with annual total of ${formatCurrency(annualTotal)}`
    });
  }, [newExpense, applyCommand, calculateAnnualTotal, resetForm, toast, markLocalChanges]);

  // Handler for updating an existing expense
  const handleUpdateExpense = useCallback((expenseId: string) => {
    if (!newExpense.category || newExpense.amount <= 0) {
      toast({
        title: "Invalid expense",
        description: "Please provide a category and valid amount",
        variant: "destructive",
      });
      return;
    }
    
    // Mark that we have a local change that should take precedence
    markLocalChanges();
    
    applyCommand({ 
      type: 'UPDATE', 
      id: expenseId, 
      data: newExpense 
    });
    
    resetForm();
    
    toast({
      title: "Expense updated",
      description: `Updated ${newExpense.category} expense successfully`
    });
  }, [newExpense, applyCommand, resetForm, toast, markLocalChanges]);

  // Handler for deleting an expense
  const handleDeleteExpense = useCallback((expenseId: string) => {
    const expenseToDelete = expenses[expenseId];
    if (!expenseToDelete) return;
    
    // Mark that we have a local change that should take precedence
    markLocalChanges();
    
    applyCommand({ type: 'DELETE', id: expenseId });
    
    toast({
      title: "Expense deleted",
      description: `Removed ${expenseToDelete.category} expense of ${formatCurrency(expenseToDelete.amount)}`
    });
  }, [expenses, applyCommand, toast, markLocalChanges]);

  // Handler for starting the edit process
  const handleStartEdit = useCallback((expense: PropertyExpense) => {
    setNewExpense({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      frequency: expense.frequency,
    });
    setEditingExpenseId(expense.id);
  }, []);

  // Calculate total annual expenses
  const totalAnnualExpenses = Object.values(expenses).reduce(
    (total, expense) => total + expense.annualTotal,
    0
  );

  return (
    <div className="space-y-4">
      {isExternalUpdate.current && (
        <div className="bg-amber-50 border border-amber-200 p-2 rounded mb-2 flex items-center text-amber-700">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span className="text-sm">Syncing expense data...</span>
        </div>
      )}
    
      {Object.values(expenses).length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Annual Total</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(expenses).map((expense) => (
              <TableRow key={expense.id} className="transition-opacity duration-300">
                {editingExpenseId === expense.id ? (
                  <>
                    <TableCell>
                      <Select
                        value={newExpense.category}
                        onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={newExpense.frequency}
                        onValueChange={(value) => setNewExpense({ ...newExpense, frequency: value })}
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
                    </TableCell>
                    <TableCell>
                      {formatCurrency(calculateAnnualTotal(newExpense.amount, newExpense.frequency))}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateExpense(expense.id)}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={resetForm}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>
                      {expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1)}
                    </TableCell>
                    <TableCell>{formatCurrency(expense.annualTotal)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleStartEdit(expense)}
                          disabled={isProcessing || editingExpenseId !== null}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteExpense(expense.id)}
                          disabled={isProcessing || editingExpenseId !== null}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Total Annual Expenses</TableCell>
              <TableCell className="font-medium">{formatCurrency(totalAnnualExpenses)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <div className="text-center p-4 border rounded border-dashed">
          <p className="text-muted-foreground mb-2">No expenses added yet</p>
        </div>
      )}

      {isAddingExpense ? (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="e.g., Building insurance"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newExpense.amount || ""}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={newExpense.frequency}
                  onValueChange={(value) => setNewExpense({ ...newExpense, frequency: value })}
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
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddExpense}
                disabled={isProcessing || !newExpense.category || newExpense.amount <= 0}
              >
                Add Expense
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button 
            onClick={() => setIsAddingExpense(true)}
            disabled={isProcessing || editingExpenseId !== null}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
      )}
    </div>
  );
}