import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PropertyExpense } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertTriangle, BarChart3, Calculator, Check, CheckCircle, Edit, Loader2, PieChart, Plus, Trash2, X } from "lucide-react";

// Type for frequency multiplier to calculate annual totals
type FrequencyMultiplier = {
  [key: string]: number;
  monthly: number;
  quarterly: number;
  annually: number;
};

// Define frequency multipliers for annual calculations
const FREQUENCY_MULTIPLIERS: FrequencyMultiplier = {
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

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

/**
 * Interface for the PropertyExpenses component
 */
interface PropertyExpensesProps {
  value: Record<string, PropertyExpense>;
  onChange: (value: Record<string, PropertyExpense>) => void;
  currencySymbol?: string;
  isSaving?: boolean;
  isSaved?: boolean;
  isEditMode?: boolean;
}

/**
 * Component for displaying property expense analysis
 */
export function PropertyExpenseAnalysis({ 
  expenses, 
  rentalIncome = 0,
  rentalFrequency = "monthly",
  currencySymbol = "$"
}: {
  expenses: Record<string, PropertyExpense>;
  rentalIncome?: number;
  rentalFrequency?: string;
  currencySymbol?: string;
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

/**
 * Component for managing property expenses
 */
export function PropertyExpenses({ 
  value, 
  onChange, 
  currencySymbol = "$", 
  isSaving = false, 
  isSaved = false, 
  isEditMode = true
}: PropertyExpensesProps) {
  const { toast } = useToast();
  
  // State for expense form and list
  const [expenses, setExpenses] = useState<Record<string, PropertyExpense>>({});
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Default new expense form data
  const defaultNewExpense = {
    category: "",
    description: "",
    amount: 0,
    frequency: "monthly",
  };
  
  const [newExpense, setNewExpense] = useState<Omit<PropertyExpense, "id" | "annualTotal">>(defaultNewExpense);

  // Calculate annual total based on amount and frequency
  const calculateAnnualTotal = (amount: number, frequency: string): number => {
    return amount * (FREQUENCY_MULTIPLIERS[frequency as keyof FrequencyMultiplier] || 12);
  };

  // Reset form state - important for cancelling edits
  const resetForm = useCallback(() => {
    console.log('[PROPERTY EXPENSES] Resetting form state');
    setNewExpense(defaultNewExpense);
    setIsAddingExpense(false);
    setEditingExpenseId(null);
  }, []);

  // Function to parse and normalize expense data - used at initialization and after edits
  const parseExpenseData = useCallback((inputValue: any): Record<string, PropertyExpense> => {
    let parsedExpenses: Record<string, PropertyExpense> = {};
    
    try {
      console.log('====== PARSE EXPENSE DATA ======');
      console.log('[PARSE] Called with data type:', typeof inputValue);
      console.log('[PARSE] Stack trace:', new Error().stack);
      
      // Handle string format (needs parsing)
      if (typeof inputValue === 'string') {
        const stringValue = String(inputValue);
        try {
          if (!stringValue || stringValue === '') {
            console.log('[PARSE] Empty string received');
          } else {
            parsedExpenses = JSON.parse(stringValue);
            console.log('[PARSE] Successfully parsed string to object with', Object.keys(parsedExpenses).length, 'expenses');
          }
        } catch (parseError) {
          console.error('[PARSE] JSON parse error:', parseError);
        }
      } 
      // Handle object format (direct use with deep clone)
      else if (inputValue && typeof inputValue === 'object') {
        // Create a deep clone to avoid reference issues
        parsedExpenses = JSON.parse(JSON.stringify(inputValue));
        console.log('[PARSE] Cloned object with', Object.keys(parsedExpenses).length, 'expenses');
      } else {
        console.log('[PARSE] Invalid input type or empty value');
      }
      
      // Ensure each expense has all required properties with the correct types
      const normalizedExpenses: Record<string, PropertyExpense> = {};
      
      // Create deduplication tracker
      const dedupeTracker: Record<string, boolean> = {}; 
      
      // Sort entries to prioritize "expense-N" IDs over random UUIDs
      const sortedEntries = Object.entries(parsedExpenses).sort(([idA], [idB]) => {
        const isOriginalA = idA.startsWith('expense-');
        const isOriginalB = idB.startsWith('expense-');
        if (isOriginalA && !isOriginalB) return -1;
        if (!isOriginalA && isOriginalB) return 1;
        return 0;
      });
      
      // Process entries with deduplication
      sortedEntries.forEach(([id, expense]) => {
        if (expense && typeof expense === 'object' && 'id' in expense) {
          const frequency = ['monthly', 'quarterly', 'annually'].includes(expense.frequency as string) 
            ? expense.frequency as string 
            : 'monthly';
            
          const amount = typeof expense.amount === 'number' ? expense.amount : 0;
          const category = expense.category as string || 'Other';
          
          // DEDUPLICATION: Create unique key to detect duplicates 
          const dedupeKey = `${category}-${amount}-${frequency}`;
          
          // Skip if we've already seen this expense signature
          if (dedupeTracker[dedupeKey]) {
            console.log(`[PARSE] Skipping duplicate expense: ${dedupeKey}`);
            return;
          }
          
          // Mark this signature as seen
          dedupeTracker[dedupeKey] = true;
          
          const annualTotal = typeof expense.annualTotal === 'number' 
            ? expense.annualTotal 
            : calculateAnnualTotal(amount, frequency);
            
          normalizedExpenses[id] = {
            id: expense.id as string,
            category,
            description: expense.description as string || '',
            amount,
            frequency,
            annualTotal
          };
          
          console.log(`[PARSE] Normalized expense ${id}: ${normalizedExpenses[id].category}, ${normalizedExpenses[id].amount}, ${normalizedExpenses[id].frequency}, ${normalizedExpenses[id].annualTotal}`);
        } else {
          console.log(`[PARSE] Skipping invalid expense with ID ${id}:`, expense);
        }
      });
      
      console.log('[PARSE] Normalization complete. Returning', Object.keys(normalizedExpenses).length, 'expenses');
      console.log('[PARSE] Deduplicated from', Object.keys(parsedExpenses).length, 'to', Object.keys(normalizedExpenses).length);
      if (Object.keys(normalizedExpenses).length > 0) {
        console.log('[PARSE] Normalized expense IDs:', Object.keys(normalizedExpenses));
        console.log('[PARSE] Deduplicated signatures:', Object.keys(dedupeTracker).join(', '));
      }
      console.log('====== END PARSE EXPENSE DATA ======');
      
      return normalizedExpenses;
    } catch (err) {
      console.error('[PARSE] Critical error during parsing:', err);
      return {};
    }
  }, [calculateAnnualTotal]);
  
  // Initialize expenses from props - critical for data persistence
  useEffect(() => {
    console.log('====== VALUE CHANGE EFFECT ======');
    console.log('[EFFECT] Value changed in PropertyExpenses component');
    console.log('[EFFECT] Value type:', typeof value);
    console.log('[EFFECT] Raw value:', value);
    
    // FIXED: Parse and set the expenses immediately - don't use setTimeout which can cause race conditions
    const parsedExpenses = parseExpenseData(value);
    console.log('[EFFECT] Parsed expenses count:', Object.keys(parsedExpenses).length);
    console.log('[EFFECT] Parsed expense IDs:', Object.keys(parsedExpenses));
    
    // Update local state with parsed expenses directly
    setExpenses(parsedExpenses);
    console.log('[EFFECT] Updated expenses state');
    console.log('====== END VALUE CHANGE EFFECT ======');
  }, [value, parseExpenseData]);

  // Handler for adding a new expense
  const handleAddExpense = useCallback(() => {
    console.log('====== ADD EXPENSE ======');
    console.log('[ADD] Starting add expense operation');
    console.log('[ADD] Current expense form data:', JSON.stringify(newExpense));
    console.log('[ADD] Current expenses count:', Object.keys(expenses).length);
    
    if (!newExpense.category || newExpense.amount <= 0) {
      console.error('[ADD] Invalid form data:', JSON.stringify(newExpense));
      toast({
        title: "Invalid expense",
        description: "Please provide a category and valid amount",
        variant: "destructive",
      });
      console.log('[ADD] Operation aborted due to validation error');
      return;
    }
    
    // Set processing state to prevent multiple clicks
    setIsProcessing(true);
    
    try {
      // Create new expense with ID and annual total
      const id = uuidv4();
      console.log('[ADD] Generated new ID:', id);
      
      const annualTotal = calculateAnnualTotal(newExpense.amount, newExpense.frequency);
      console.log('[ADD] Calculated annual total:', annualTotal);
      
      const newExpenseWithId: PropertyExpense = {
        id,
        ...newExpense,
        annualTotal,
      };
      
      console.log('[ADD] Created new expense object:', JSON.stringify(newExpenseWithId));
      
      // Create updated expenses object
      const updatedExpenses = {
        ...expenses,
        [id]: newExpenseWithId
      };
      
      console.log('[ADD] All expenses after addition (before normalization):', 
        Object.keys(updatedExpenses).length, 'items');
      
      // Apply the same normalization to ensure consistent data
      console.log('[ADD] Calling parseExpenseData...');
      const normalizedExpenses = parseExpenseData(updatedExpenses);
      console.log('[ADD] Normalization complete. Got back', 
        Object.keys(normalizedExpenses).length, 'expenses');
      
      // Update both local and parent state
      console.log('[ADD] Updating local state and calling onChange...');
      setExpenses(normalizedExpenses);
      onChange(normalizedExpenses);
      
      // We no longer show toast messages to avoid the stuck banner
      // Instead we log the success
      console.log('[ADD] Successfully added expense:', newExpense.category, 'with annual total', annualTotal);
      
      // Reset form
      console.log('[ADD] Resetting form...');
      resetForm();
      console.log('====== END ADD EXPENSE ======');
    } catch (error) {
      console.error('[ADD] Error adding expense:', error);
      toast({
        title: "Error adding expense",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [newExpense, expenses, onChange, resetForm, toast, calculateAnnualTotal, parseExpenseData]);

  // Handler for updating an existing expense
  const handleUpdateExpense = useCallback((expenseId: string) => {
    console.log('====== UPDATE EXPENSE ======');
    console.log('[UPDATE] Start updating expense ID:', expenseId);
    console.log('[UPDATE] Current expenses count:', Object.keys(expenses).length);
    console.log('[UPDATE] Stack trace:', new Error().stack);
    
    if (!expenseId || !expenses[expenseId]) {
      console.error('[UPDATE] Cannot update expense - invalid ID:', expenseId);
      console.log('[UPDATE] Available expense IDs:', Object.keys(expenses));
      toast({
        title: "Error updating expense",
        description: "Invalid expense ID. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newExpense.category || newExpense.amount <= 0) {
      console.error('[UPDATE] Invalid form data:', JSON.stringify(newExpense));
      toast({
        title: "Invalid expense",
        description: "Please provide a category and valid amount",
        variant: "destructive",
      });
      return;
    }
    
    // Set processing state
    setIsProcessing(true);
    
    try {
      // Calculate annual total for updated expense
      const annualTotal = calculateAnnualTotal(newExpense.amount, newExpense.frequency);
      
      // Create updated expense object
      const updatedExpense = {
        id: expenseId,
        ...newExpense,
        annualTotal
      };
      
      console.log('[UPDATE] Creating updated expense:', JSON.stringify(updatedExpense));
      
      // Create new expenses object with updated expense
      const updatedExpenses = {
        ...expenses,
        [expenseId]: updatedExpense
      };
      
      console.log('[UPDATE] All expenses after update (before normalization):', 
        Object.keys(updatedExpenses).length, 'items');
      
      // Apply the same normalization to ensure consistent data
      console.log('[UPDATE] Calling parseExpenseData...');
      const normalizedExpenses = parseExpenseData(updatedExpenses);
      console.log('[UPDATE] Normalization complete. Got back', 
        Object.keys(normalizedExpenses).length, 'expenses');
      
      // Update both local and parent state
      console.log('[UPDATE] Updating local state and calling onChange...');
      setExpenses(normalizedExpenses);
      onChange(normalizedExpenses);
      
      // We no longer show toast messages for expense updates to avoid the stuck banner
      // Instead we log the success
      console.log('[UPDATE] Successfully updated expense:', newExpense.category);
      
      // Reset edit form
      console.log('[UPDATE] Resetting form...');
      resetForm();
      console.log('====== END UPDATE EXPENSE ======');
    } catch (error) {
      console.error('[UPDATE] Error updating expense:', error);
      toast({
        title: "Error updating expense",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [newExpense, expenses, onChange, resetForm, toast, calculateAnnualTotal, parseExpenseData]);

  // Handler for deleting an expense
  const handleDeleteExpense = useCallback((expenseId: string) => {
    console.log('====== DELETE EXPENSE ======');
    console.log('[DELETE] Starting delete operation for expense ID:', expenseId);
    console.log('[DELETE] Current expenses count:', Object.keys(expenses).length);
    console.log('[DELETE] Stack trace:', new Error().stack);
    
    const expenseToDelete = expenses[expenseId];
    if (!expenseToDelete) {
      console.error('[DELETE] Cannot delete expense - not found:', expenseId);
      console.log('[DELETE] Available expense IDs:', Object.keys(expenses));
      toast({
        title: "Error deleting expense",
        description: "Expense not found. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Set processing state
    setIsProcessing(true);
    
    try {
      console.log('[DELETE] Deleting expense data:', JSON.stringify(expenseToDelete));
      
      // Create new expenses object without the deleted expense
      const { [expenseId]: _, ...remainingExpenses } = expenses;
      
      console.log('[DELETE] Remaining expenses after deletion (before normalization):', 
        Object.keys(remainingExpenses).length, 'items');
      
      // Apply the same normalization to ensure consistent data
      console.log('[DELETE] Calling parseExpenseData...');
      const normalizedExpenses = parseExpenseData(remainingExpenses);
      console.log('[DELETE] Normalization complete. Got back', 
        Object.keys(normalizedExpenses).length, 'expenses');
      
      // Update both local and parent state
      console.log('[DELETE] Updating local state and calling onChange...');
      setExpenses(normalizedExpenses);
      onChange(normalizedExpenses);
      
      // We no longer show toast messages to avoid the stuck banner
      // Instead we log the success
      console.log('[DELETE] Successfully deleted expense:', expenseToDelete.category, 
        'with amount', expenseToDelete.amount);
      
      console.log('====== END DELETE EXPENSE ======');
    } catch (error) {
      console.error('[DELETE] Error deleting expense:', error);
      toast({
        title: "Error deleting expense",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [expenses, onChange, toast, parseExpenseData]);

  // Handler for starting the edit process
  const handleStartEdit = useCallback((expense: PropertyExpense) => {
    console.log('====== START EDIT ======');
    console.log('[EDIT] Starting edit for expense ID:', expense.id);
    console.log('[EDIT] Expense data to edit:', JSON.stringify(expense));
    console.log('[EDIT] Stack trace:', new Error().stack);
    
    // Set form data to the expense being edited
    setNewExpense({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      frequency: expense.frequency,
    });
    
    console.log('[EDIT] Set form data with:', 
      expense.category, expense.amount, expense.frequency);
    
    // Set editing ID to track which expense is being edited
    setEditingExpenseId(expense.id);
    console.log('[EDIT] Updated editingExpenseId to:', expense.id);
    console.log('====== END START EDIT ======');
  }, []);

  // Calculate total annual expenses
  const totalAnnualExpenses = useMemo(() => {
    return Object.values(expenses).reduce(
      (total, expense) => total + expense.annualTotal,
      0
    );
  }, [expenses]);

  // Log when the component renders for debugging
  console.log('====== PROPERTY EXPENSES RENDER ======');
  console.log('[RENDER] Current expenses in state:', Object.keys(expenses).length);
  console.log('[RENDER] Expense IDs:', Object.keys(expenses));
  console.log('[RENDER] Edit mode:', isEditMode);
  console.log('[RENDER] Value from parent:', typeof value, 
    typeof value === 'object' ? Object.keys(value || {}).length + ' items' : value);
  console.log('====== END PROPERTY EXPENSES RENDER ======');
    
  return (
    <div className="space-y-4">
      {/* Only show loading indicator - no success banners */}
      {isSaving && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded mb-2 flex items-center text-blue-700">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className="text-sm">Saving expenses to database...</span>
        </div>
      )}
      
      {/* Non-edit mode instruction */}
      {!isEditMode && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded mb-2 flex items-center text-blue-700">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span className="text-sm">Click Edit to make changes to expenses</span>
        </div>
      )}
    
      {/* Expense table */}
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
              <TableRow key={expense.id}>
                {editingExpenseId === expense.id ? (
                  // Edit mode for a row
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
                          title="Save changes"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={resetForm}
                          disabled={isProcessing}
                          title="Cancel editing"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  // View mode for a row
                  <>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>
                      {expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1)}
                    </TableCell>
                    <TableCell>{formatCurrency(expense.annualTotal)}</TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(expense)}
                            disabled={isProcessing || (editingExpenseId !== null && editingExpenseId !== expense.id)}
                            title="Edit expense"
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete the ${expense.category} expense?`)) {
                                handleDeleteExpense(expense.id);
                              }
                            }}
                            disabled={isProcessing || (editingExpenseId !== null && editingExpenseId !== expense.id)}
                            title="Delete expense"
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-16"></div>
                      )}
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

      {/* Add expense form */}
      {isAddingExpense ? (
        <Card className="border border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Add New Expense</CardTitle>
            <CardDescription>Add a recurring expense for this property</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="amount">Amount ({currencySymbol}) <span className="text-red-500">*</span></Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newExpense.amount || ""}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency <span className="text-red-500">*</span></Label>
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
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {isEditMode && (
            <div className="flex justify-end">
              <Button 
                onClick={() => setIsAddingExpense(true)}
                disabled={editingExpenseId !== null || isSaving || isProcessing}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" /> Add New Expense
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}