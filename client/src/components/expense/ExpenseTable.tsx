import React from 'react';
import { useExpenses } from '@/contexts/ExpenseContext';
import { Expense } from '@shared/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateAnnualAmount, FREQUENCY_MULTIPLIERS } from '@/lib/expense-utils-new';

// Interface for UI display version of expense
interface ExpenseWithDisplay extends Expense {
  category: string;  // Display name of the category
  annualTotal: number; // Calculated annual amount
}

interface ExpenseTableProps {
  expenses: Record<string, ExpenseWithDisplay>;
  categoryMap: Record<string, string>; // Maps category IDs to display names
  type: 'property' | 'investment';
  isEditMode?: boolean;
  isSaving?: boolean;
}

/**
 * Unified Expense Table component that uses ExpenseContext for state management
 * This component can be shared between property and investment expenses
 */
export function ExpenseTable({ 
  expenses, 
  categoryMap, 
  type,
  isEditMode = true,
  isSaving = false
}: ExpenseTableProps) {
  const {
    startEditExpense,
    startAddExpense,
    deleteExpense
  } = useExpenses();
  
  const expenseList = Object.values(expenses);
  const totalAnnual = expenseList.reduce((sum, expense) => sum + expense.annualTotal, 0);
  
  // Handle starting to edit an expense
  const handleEdit = (id: string) => {
    startEditExpense(id, type);
  };
  
  // Handle deleting an expense
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteExpense(id, type);
    }
  };
  
  // Handle adding a new expense
  const handleAddNew = () => {
    startAddExpense(type);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{type === 'property' ? 'Property' : 'Investment'} Expenses</h3>
        {isEditMode && (
          <Button 
            size="sm" 
            onClick={handleAddNew}
            disabled={isSaving}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Expense
          </Button>
        )}
      </div>
      
      {expenseList.length > 0 ? (
        <>
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
              {expenseList.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{categoryMap[expense.categoryId] || expense.category || expense.categoryId}</TableCell>
                  <TableCell>{expense.name}</TableCell>
                  <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  <TableCell className="capitalize">{expense.frequency}</TableCell>
                  <TableCell>{formatCurrency(expense.annualTotal)}</TableCell>
                  {isEditMode && (
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleEdit(expense.id)}
                          disabled={isSaving}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleDelete(expense.id)}
                          disabled={isSaving}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="p-4 bg-muted rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Annual Expenses:</span>
              <span className="font-bold text-lg">{formatCurrency(totalAnnual)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md">
          No expenses added yet.
        </div>
      )}
    </div>
  );
}