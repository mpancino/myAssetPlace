import { useState, useEffect } from 'react';
import { Expense, DisplayExpense, ExpenseCategory } from '@shared/schema';
import { 
  formatExpensesForDisplay, 
  prepareExpensesForStorage, 
  createDefaultExpense
} from '@/lib/expense-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Pencil, ArrowDownUp, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

// Form schema for expense editing
const expenseSchema = z.object({
  id: z.string(),
  categoryId: z.string().min(1, { message: "Please select a category" }),
  name: z.string().min(1, { message: "Description is required" }),
  amount: z.coerce.number().min(0, { message: "Amount must be positive" }),
  frequency: z.enum(["monthly", "quarterly", "annually"]),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// ExpenseForm Component
function ExpenseForm({ 
  expense, 
  categories, 
  onSave, 
  onCancel 
}: { 
  expense: DisplayExpense; 
  categories: ExpenseCategory[]; 
  onSave: (expense: DisplayExpense) => void; 
  onCancel: () => void; 
}) {
  const { toast } = useToast();
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      id: expense.id,
      categoryId: expense.categoryId,
      name: expense.name,
      amount: expense.amount,
      frequency: expense.frequency,
      notes: expense.notes || '',
    },
  });

  const onSubmit = (values: ExpenseFormValues) => {
    // Find the category name for display
    const category = categories.find(c => c.id === values.categoryId);
    
    // Calculate the annual total
    let annualTotal = 0;
    switch (values.frequency) {
      case 'monthly': annualTotal = values.amount * 12; break;
      case 'quarterly': annualTotal = values.amount * 4; break;
      case 'annually': annualTotal = values.amount; break;
    }
    
    // Create the updated expense with display information
    const updatedExpense: DisplayExpense = {
      ...values,
      categoryName: category?.name || 'Unknown Category',
      annualTotal
    };
    
    onSave(updatedExpense);
    toast({
      title: "Expense updated",
      description: "Your expense has been saved successfully.",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormDescription>Optional additional information</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} className="mr-2">
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Define the props for the ExpensesContainer component
export interface ExpensesContainerProps {
  assetId: number;
  assetClassId: number;
  propertyExpenses: Record<string, Expense>;
  investmentExpenses: Record<string, Expense>;
  expenseCategories: ExpenseCategory[];
  readOnly?: boolean;
  onExpensesChange?: (propertyExpenses: Record<string, Expense>, investmentExpenses: Record<string, Expense>) => void;
}

// Main ExpensesContainer component
export function ExpensesContainer({
  assetId,
  assetClassId,
  propertyExpenses: initialPropertyExpenses,
  investmentExpenses: initialInvestmentExpenses,
  expenseCategories,
  readOnly = false,
  onExpensesChange
}: ExpensesContainerProps) {
  // Convert expenses from storage format to display format for UI
  const [propertyExpenses, setPropertyExpenses] = useState<Record<string, DisplayExpense>>(
    formatExpensesForDisplay(initialPropertyExpenses || {}, expenseCategories)
  );
  
  const [investmentExpenses, setInvestmentExpenses] = useState<Record<string, DisplayExpense>>(
    formatExpensesForDisplay(initialInvestmentExpenses || {}, expenseCategories)
  );
  
  // Track UI state
  const [currentTab, setCurrentTab] = useState<'property' | 'investment'>('property');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<DisplayExpense | null>(null);
  const [sortField, setSortField] = useState<'categoryName' | 'name' | 'amount' | 'annualTotal'>('categoryName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const { toast } = useToast();
  
  // Update parent component when expenses change
  useEffect(() => {
    if (onExpensesChange) {
      // Convert back to storage format for API calls
      const propertyExpensesStorage = prepareExpensesForStorage(propertyExpenses);
      const investmentExpensesStorage = prepareExpensesForStorage(investmentExpenses);
      
      onExpensesChange(propertyExpensesStorage, investmentExpensesStorage);
    }
  }, [propertyExpenses, investmentExpenses, onExpensesChange]);
  
  // Get the current expenses based on active tab
  const getCurrentExpenses = () => {
    return currentTab === 'property' ? propertyExpenses : investmentExpenses;
  };
  
  // Set the current expenses based on active tab
  const setCurrentExpenses = (expenses: Record<string, DisplayExpense>) => {
    if (currentTab === 'property') {
      setPropertyExpenses(expenses);
    } else {
      setInvestmentExpenses(expenses);
    }
  };
  
  // Add a new expense
  const handleAddExpense = () => {
    // Get property categories if on property tab, otherwise investment categories
    const relevantCategories = expenseCategories.filter(c => 
      currentTab === 'property' 
        ? c.name.toLowerCase().includes('property') 
        : !c.name.toLowerCase().includes('property')
    );
    
    if (relevantCategories.length === 0) {
      toast({
        title: "No categories available",
        description: "No expense categories are available for this type of expense.",
        variant: "destructive"
      });
      return;
    }
    
    // Create a default expense with the first available category
    const newExpense = createDefaultExpense(relevantCategories[0].id, expenseCategories);
    setCurrentExpense(newExpense);
    setIsAddingExpense(true);
  };
  
  // Edit an existing expense
  const handleEditExpense = (expenseId: string) => {
    const expense = getCurrentExpenses()[expenseId];
    if (expense) {
      setCurrentExpense(expense);
      setIsEditingExpense(true);
    }
  };
  
  // Delete an expense
  const handleDeleteExpense = (expenseId: string) => {
    const expenses = { ...getCurrentExpenses() };
    delete expenses[expenseId];
    setCurrentExpenses(expenses);
    
    toast({
      title: "Expense deleted",
      description: "The expense has been removed."
    });
  };
  
  // Save an expense (new or edited)
  const handleSaveExpense = (expense: DisplayExpense) => {
    const expenses = { ...getCurrentExpenses() };
    expenses[expense.id] = expense;
    setCurrentExpenses(expenses);
    
    // Clear the editing state
    setIsAddingExpense(false);
    setIsEditingExpense(false);
    setCurrentExpense(null);
  };
  
  // Cancel expense editing
  const handleCancelExpense = () => {
    setIsAddingExpense(false);
    setIsEditingExpense(false);
    setCurrentExpense(null);
  };
  
  // Toggle sort direction or change sort field
  const handleSort = (field: 'categoryName' | 'name' | 'amount' | 'annualTotal') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Get sorted expenses
  const getSortedExpenses = () => {
    const expenses = Object.values(getCurrentExpenses());
    
    return expenses.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'amount' || sortField === 'annualTotal') {
        comparison = a[sortField] - b[sortField];
      } else {
        comparison = String(a[sortField]).localeCompare(String(b[sortField]));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Calculate total annual expenses
  const calculateTotalAnnual = () => {
    const expenses = getCurrentExpenses();
    return Object.values(expenses).reduce((total, expense) => total + expense.annualTotal, 0);
  };
  
  return (
    <div className="space-y-4">
      {/* Tabs to switch between property and investment expenses */}
      <div className="flex space-x-2 border-b">
        <Button
          variant={currentTab === 'property' ? 'default' : 'ghost'}
          onClick={() => setCurrentTab('property')}
          className="rounded-t-lg rounded-b-none"
        >
          Property Expenses
        </Button>
        <Button
          variant={currentTab === 'investment' ? 'default' : 'ghost'}
          onClick={() => setCurrentTab('investment')}
          className="rounded-t-lg rounded-b-none"
        >
          Investment Expenses
        </Button>
      </div>
      
      {/* Card to display expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{currentTab === 'property' ? 'Property' : 'Investment'} Expenses</CardTitle>
          {!readOnly && (
            <Button onClick={handleAddExpense} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {getSortedExpenses().length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('categoryName')}>
                      Category {sortField === 'categoryName' && (
                        <ArrowDownUp className={`inline h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                      Description {sortField === 'name' && (
                        <ArrowDownUp className={`inline h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                      Amount {sortField === 'amount' && (
                        <ArrowDownUp className={`inline h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('annualTotal')}>
                      Annual {sortField === 'annualTotal' && (
                        <ArrowDownUp className={`inline h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedExpenses().map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.categoryName}</TableCell>
                      <TableCell>{expense.name}</TableCell>
                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(expense.annualTotal)}</TableCell>
                      {!readOnly && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditExpense(expense.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  
                  {/* Total row */}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Total Annual Expenses</TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell>{formatCurrency(calculateTotalAnnual())}</TableCell>
                    {!readOnly && <TableCell></TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No expenses added yet.</p>
              {!readOnly && (
                <Button onClick={handleAddExpense} variant="outline" className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add your first expense
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog for adding/editing expenses */}
      <Dialog
        open={isAddingExpense || isEditingExpense}
        onOpenChange={(open) => {
          if (!open) handleCancelExpense();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isAddingExpense ? 'Add Expense' : 'Edit Expense'}</DialogTitle>
            <DialogDescription>
              {isAddingExpense
                ? 'Add a new expense to track your costs.'
                : 'Edit the details of this expense.'}
            </DialogDescription>
          </DialogHeader>
          
          {currentExpense && (
            <ExpenseForm
              expense={currentExpense}
              categories={expenseCategories}
              onSave={handleSaveExpense}
              onCancel={handleCancelExpense}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}