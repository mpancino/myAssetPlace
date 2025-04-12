import { useState, useEffect } from "react";
import { PlusCircle, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

// Define expense categories
const EXPENSE_CATEGORIES = [
  "Council Rates",
  "Strata Fees",
  "Insurance",
  "Maintenance",
  "Utilities",
  "Management Fees",
  "Land Tax",
  "Water Rates",
  "Other"
];

// Define expense frequency options
const EXPENSE_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "once", label: "One Time" }
];

// Define types for property expenses
export interface PropertyExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string;
  annualTotal: number;
}

export interface PropertyExpensesProps {
  value: Record<string, PropertyExpense>;
  onChange: (expenses: Record<string, PropertyExpense>) => void;
  currencySymbol?: string;
}

export function PropertyExpenses({ 
  value = {}, 
  onChange,
  currencySymbol = "$"
}: PropertyExpensesProps) {
  const [expenses, setExpenses] = useState<Record<string, PropertyExpense>>(value);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<PropertyExpense>({
    id: "",
    category: EXPENSE_CATEGORIES[0],
    description: "",
    amount: 0,
    frequency: "yearly",
    annualTotal: 0
  });
  const [isEditing, setIsEditing] = useState(false);

  // Calculate annual total from expense amount and frequency
  const calculateAnnualTotal = (amount: number, frequency: string) => {
    switch (frequency) {
      case "weekly":
        return amount * 52;
      case "fortnightly":
        return amount * 26;
      case "monthly":
        return amount * 12;
      case "quarterly":
        return amount * 4;
      case "yearly":
        return amount;
      case "once":
        return amount; // One-time expenses are just counted as they are
      default:
        return amount;
    }
  };

  // Calculate total annual expenses
  const totalAnnualExpenses = Object.values(expenses).reduce(
    (sum, expense) => sum + expense.annualTotal, 
    0
  );

  // Handle adding a new expense
  const handleAddExpense = () => {
    // Calculate annual total based on amount and frequency
    const annualTotal = calculateAnnualTotal(currentExpense.amount, currentExpense.frequency);
    
    // Create a new expense with a unique ID
    const newExpense = {
      ...currentExpense,
      id: isEditing ? currentExpense.id : Date.now().toString(),
      annualTotal
    };
    
    // Update expenses state
    const updatedExpenses = {
      ...expenses,
      [newExpense.id]: newExpense
    };
    
    setExpenses(updatedExpenses);
    onChange(updatedExpenses);
    
    // Reset form and close dialog
    setCurrentExpense({
      id: "",
      category: EXPENSE_CATEGORIES[0],
      description: "",
      amount: 0,
      frequency: "yearly",
      annualTotal: 0
    });
    setIsEditing(false);
    setDialogOpen(false);
  };

  // Handle removing an expense
  const handleRemoveExpense = (id: string) => {
    const { [id]: removedExpense, ...updatedExpenses } = expenses;
    setExpenses(updatedExpenses);
    onChange(updatedExpenses);
  };

  // Handle editing an expense
  const handleEditExpense = (expense: PropertyExpense) => {
    setCurrentExpense(expense);
    setIsEditing(true);
    setDialogOpen(true);
  };

  // Update current expense when amount or frequency changes
  useEffect(() => {
    if (currentExpense.amount && currentExpense.frequency) {
      const annualTotal = calculateAnnualTotal(currentExpense.amount, currentExpense.frequency);
      setCurrentExpense(prev => ({ ...prev, annualTotal }));
    }
  }, [currentExpense.amount, currentExpense.frequency]);

  // Update local state when value prop changes
  useEffect(() => {
    setExpenses(value || {});
  }, [value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <DollarSign className="mr-2 h-5 w-5" />
          Property Expenses
        </CardTitle>
        <CardDescription>
          Track regular and one-time expenses associated with this property
        </CardDescription>
      </CardHeader>
      <CardContent>
        {Object.keys(expenses).length > 0 ? (
          <>
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
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      {formatCurrency(expense.amount, currencySymbol)}
                    </TableCell>
                    <TableCell>
                      {EXPENSE_FREQUENCIES.find(f => f.value === expense.frequency)?.label}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(expense.annualTotal, currencySymbol)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditExpense(expense)}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveExpense(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Total Annual Expenses:</span>
              <span className="font-bold">
                {formatCurrency(totalAnnualExpenses, currencySymbol)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No expenses added yet. Click the button below to add property expenses.
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              {isEditing ? "Update Expense" : "Add Expense"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              <DialogDescription>
                Enter the details of the property expense below.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={currentExpense.category}
                  onValueChange={(value) =>
                    setCurrentExpense({ ...currentExpense, category: value })
                  }
                >
                  <SelectTrigger>
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

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of expense"
                  value={currentExpense.description}
                  onChange={(e) =>
                    setCurrentExpense({
                      ...currentExpense,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentExpense.amount || ""}
                    onChange={(e) =>
                      setCurrentExpense({
                        ...currentExpense,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={currentExpense.frequency}
                    onValueChange={(value) =>
                      setCurrentExpense({ ...currentExpense, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_FREQUENCIES.map((frequency) => (
                        <SelectItem key={frequency.value} value={frequency.value}>
                          {frequency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Annual Total</Label>
                <div className="p-2 border rounded-md bg-muted/20">
                  {formatCurrency(currentExpense.annualTotal, currencySymbol)}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExpense}>
                {isEditing ? "Update" : "Add"} Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}