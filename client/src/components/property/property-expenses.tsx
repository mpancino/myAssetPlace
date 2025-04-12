import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Plus, Trash2, Edit, Check, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency } from "@/lib/utils";

export type PropertyExpense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string; // "monthly" | "quarterly" | "annually"
  annualTotal: number;
};

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

interface PropertyExpensesProps {
  value: Record<string, PropertyExpense>;
  onChange: (value: Record<string, PropertyExpense>) => void;
  currencySymbol?: string;
}

export function PropertyExpenses({ value, onChange, currencySymbol = "$" }: PropertyExpensesProps) {
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [newExpense, setNewExpense] = useState<Omit<PropertyExpense, "id" | "annualTotal">>({
    category: "",
    description: "",
    amount: 0,
    frequency: "monthly",
  });

  const calculateAnnualTotal = (amount: number, frequency: string): number => {
    return amount * (FREQUENCY_MULTIPLIERS[frequency] || 12);
  };

  const handleAddExpense = () => {
    const id = uuidv4();
    const annualTotal = calculateAnnualTotal(newExpense.amount, newExpense.frequency);
    
    const updatedExpenses = {
      ...value,
      [id]: {
        id,
        ...newExpense,
        annualTotal,
      },
    };
    
    onChange(updatedExpenses);
    setNewExpense({
      category: "",
      description: "",
      amount: 0, 
      frequency: "monthly",
    });
    setIsAddingExpense(false);
  };

  const handleUpdateExpense = (expenseId: string) => {
    const expense = value[expenseId];
    if (!expense) return;
    
    const updatedExpense = {
      ...expense,
      ...newExpense,
      annualTotal: calculateAnnualTotal(newExpense.amount, newExpense.frequency),
    };
    
    const updatedExpenses = {
      ...value,
      [expenseId]: updatedExpense,
    };
    
    onChange(updatedExpenses);
    setEditingExpenseId(null);
    setNewExpense({
      category: "",
      description: "",
      amount: 0,
      frequency: "monthly",
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updatedExpenses = { ...value };
    delete updatedExpenses[expenseId];
    onChange(updatedExpenses);
  };

  const handleStartEdit = (expense: PropertyExpense) => {
    setNewExpense({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      frequency: expense.frequency,
    });
    setEditingExpenseId(expense.id);
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setNewExpense({
      category: "",
      description: "",
      amount: 0,
      frequency: "monthly",
    });
  };

  const totalAnnualExpenses = Object.values(value).reduce(
    (total, expense) => total + expense.annualTotal,
    0
  );

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

  return (
    <div className="space-y-4">
      {Object.values(value).length > 0 && (
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
            {Object.values(value).map((expense) => (
              <TableRow key={expense.id}>
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
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCancelEdit}
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteExpense(expense.id)}
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
                onClick={() => {
                  setIsAddingExpense(false);
                  setNewExpense({
                    category: "",
                    description: "",
                    amount: 0,
                    frequency: "monthly",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddExpense}
                disabled={!newExpense.category || newExpense.amount <= 0}
              >
                Add Expense
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setIsAddingExpense(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
      )}
    </div>
  );
}