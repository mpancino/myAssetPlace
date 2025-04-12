import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Plus, Trash2, Edit, Check, X, AlertTriangle, PieChart, Calculator } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency, cn } from "@/lib/utils";
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
  isSaving?: boolean;
  isSaved?: boolean;
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

// A new component to show expense analysis
export function PropertyExpenseAnalysis({ 
  expenses, 
  rentalIncome = 0,
  rentalFrequency = "monthly",
  currencySymbol = "$",
  isSaving = false,
  isSaved = false
}: {
  expenses: Record<string, PropertyExpense>;
  rentalIncome?: number;
  rentalFrequency?: string;
  currencySymbol?: string;
  isSaving?: boolean;
  isSaved?: boolean;
}) {
  // Calculate total annual expenses
  const totalAnnualExpenses = useMemo(() => 
    Object.values(expenses).reduce(
      (total, expense) => total + expense.annualTotal, 0
    ), [expenses]);
  
  // Calculate annual rental income
  const annualRentalIncome = useMemo(() => {
    if (!rentalIncome) return 0;
    const FREQUENCY_MULTIPLIER: {[key: string]: number} = {
      weekly: 52,
      fortnightly: 26,
      monthly: 12,
      quarterly: 4,
      annually: 1
    };
    return rentalIncome * (FREQUENCY_MULTIPLIER[rentalFrequency] || 0);
  }, [rentalIncome, rentalFrequency]);
  
  // Calculate expense ratio
  const expenseRatio = useMemo(() => 
    annualRentalIncome > 0 ? (totalAnnualExpenses / annualRentalIncome) * 100 : 0
  , [totalAnnualExpenses, annualRentalIncome]);
  
  // Calculate net rental income
  const netAnnualRentalIncome = annualRentalIncome - totalAnnualExpenses;
  
  // Group expenses by category for the chart
  const expensesByCategory = useMemo(() => {
    const categories: {[key: string]: number} = {};
    Object.values(expenses).forEach(expense => {
      if (!categories[expense.category]) {
        categories[expense.category] = 0;
      }
      categories[expense.category] += expense.annualTotal;
    });
    return categories;
  }, [expenses]);
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg">
            <PieChart className="mr-2 h-5 w-5 text-primary" /> Expense Analysis
          </CardTitle>
          <CardDescription>
            {Object.keys(expenses).length > 0 
              ? `Summary of ${Object.keys(expenses).length} property expenses`
              : "No expenses added yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Annual Expenses</div>
              <div className="text-xl font-semibold">{formatCurrency(totalAnnualExpenses, currencySymbol)}</div>
            </div>
            {annualRentalIncome > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Expense to Income Ratio</div>
                <div className="text-xl font-semibold">{expenseRatio.toFixed(1)}%</div>
              </div>
            )}
            {annualRentalIncome > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Annual Rental Income</div>
                <div className="text-xl font-semibold text-green-600">
                  {formatCurrency(annualRentalIncome, currencySymbol)}
                </div>
              </div>
            )}
            {annualRentalIncome > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Net Annual Rental Income</div>
                <div className={cn(
                  "text-xl font-semibold",
                  netAnnualRentalIncome >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(netAnnualRentalIncome, currencySymbol)}
                </div>
              </div>
            )}
          </div>
          
          {Object.keys(expensesByCategory).length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Expense Breakdown by Category</div>
              <div className="space-y-2">
                {Object.entries(expensesByCategory).map(([category, amount]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{category}</span>
                      <span className="font-medium">{formatCurrency(amount, currencySymbol)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${(amount / totalAnnualExpenses) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PropertyExpenses({ value, onChange, currencySymbol = "$", isSaving = false, isSaved = false }: PropertyExpensesProps) {
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
  
  // Function to mark that we've made local changes - with much longer persistence
  const markLocalChanges = useCallback(() => {
    hasRecentLocalChanges.current = true;
    localChangesTimestamp.current = Date.now();
    
    console.log('[LOCAL CHANGES] Marked local changes at:', new Date().toISOString());
    
    // Save the current state to localStorage as a backup
    // This creates an additional safety net for our expense data
    try {
      if (Object.keys(expenses).length > 0) {
        const backupKey = `propertyExpenses_backup_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(expenses));
        console.log('[BACKUP] Saved expenses state to localStorage:', backupKey);
        
        // Clean up old backups to prevent storage bloat
        const allKeys = Object.keys(localStorage);
        const expenseBackups = allKeys.filter(k => k.startsWith('propertyExpenses_backup_'));
        if (expenseBackups.length > 5) {
          // Keep only the 5 most recent backups
          expenseBackups
            .sort()
            .slice(0, expenseBackups.length - 5)
            .forEach(k => localStorage.removeItem(k));
        }
      }
    } catch (e) {
      console.error('[BACKUP] Failed to save expenses to localStorage:', e);
    }
    
    // Automatically clear the local changes flag after a much longer time
    // This significantly extends our "protection window" for local changes
    setTimeout(() => {
      console.log('[LOCAL CHANGES] Clearing local changes flag after timeout');
      hasRecentLocalChanges.current = false;
    }, 10000); // 10 seconds gives much more time for server operations to complete
  }, [expenses]);
  
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
  
  // External data sync - with significantly improved logic for handling local vs server state
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
    
    // If we have expenses locally but incoming is empty, preserve our local state
    if (currentKeys.length > 0 && incomingKeys.length === 0) {
      console.log('[SYNC PREVENTED] Incoming data has no expenses but local state has expenses. Preserving local state.');
      // Notify parent of our current state to keep it in sync
      onChange(expenses);
      return;
    }
    
    // Only sync if there's an actual difference
    if (JSON.stringify(currentKeys.sort()) !== JSON.stringify(incomingKeys.sort()) ||
        JSON.stringify(expenses) !== JSON.stringify(incomingExpenses)) {
      
      console.log('[SYNC] External data change detected');
      console.log('Current expense count:', currentKeys.length);
      console.log('Incoming expense count:', incomingKeys.length);
      
      // We need to check if we're in a save operation or a server refresh
      // If the server has fewer expenses but we know we just saved, that means
      // there might be a race condition where the server response hasn't yet
      // included our latest changes
      
      if (currentKeys.length > incomingKeys.length && hasRecentLocalChanges.current) {
        console.log('[SYNC DEFERRED] Deferring sync while server processes changes.');
        
        // We'll proactively log all expenses for debugging
        console.log('Current expenses:', JSON.stringify(expenses));
        console.log('Incoming expenses:', JSON.stringify(incomingExpenses));
        
        // Set a timeout to check back later - giving the server time to process
        setTimeout(() => {
          // This will automatically be handled on the next render cycle
          console.log('[SYNC RECHECK] Re-checking after timeout');
          hasRecentLocalChanges.current = false;
        }, 2000);
        
        return;
      }
      
      // Special case: if incoming has the same number but different expenses,
      // merge rather than replace when we have recent changes
      if (currentKeys.length > 0 && 
          currentKeys.length === incomingKeys.length && 
          hasRecentLocalChanges.current) {
          
        // Check if the sets are actually different
        // Using Array methods instead of Set iteration to avoid TypeScript downlevel iteration issues
        const isDifferent = currentKeys.some(id => !incomingKeys.includes(id)) || 
                           incomingKeys.some(id => !currentKeys.includes(id));
                           
        if (isDifferent) {
          console.log('[SYNC MERGE] Merging local expenses with incoming expenses');
          // Keep our expenses but also add any new ones from incoming
          const mergedExpenses = { ...incomingExpenses, ...expenses };
          
          isExternalUpdate.current = true;
          applyCommand({ type: 'SYNC', expenses: mergedExpenses });
          
          setTimeout(() => {
            isExternalUpdate.current = false;
          }, 200);
          
          return;
        }
      }
      
      // Default case: accept the incoming changes
      isExternalUpdate.current = true;
      applyCommand({ type: 'SYNC', expenses: incomingExpenses });
      
      setTimeout(() => {
        isExternalUpdate.current = false;
      }, 200);
    }
  }, [value, expenses, applyCommand, isProcessing, shouldAcceptExternalUpdates, onChange]);

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