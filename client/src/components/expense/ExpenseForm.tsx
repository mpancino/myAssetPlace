import React, { useEffect } from 'react';
import { useExpenses } from '@/contexts/ExpenseContext';
import { StandardizedExpenseCategory } from '@/hooks/use-asset-class-details';
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

interface ExpenseFormProps {
  availableCategories: StandardizedExpenseCategory[];
  isLoading?: boolean;
}

/**
 * Unified Expense Form component that uses ExpenseContext for state management
 * This component can be shared between property and investment expenses
 */
export function ExpenseForm({ availableCategories, isLoading = false }: ExpenseFormProps) {
  const {
    editorState,
    updateFormField,
    saveExpense,
    cancelEditExpense
  } = useExpenses();
  
  const {
    isEditing,
    isAddingNew,
    editingId,
    formState,
    expenseType
  } = editorState;
  
  const { categoryId, name, amount, frequency } = formState;
  
  // Check if the form should be displayed at all
  if (!isEditing) {
    return null;
  }
  
  return (
    <Card className="expense-form-wrapper" key={`expense-form-${editingId || 'new'}-${expenseType}`}>
      <CardHeader>
        <CardTitle>{editingId ? "Edit Expense" : "Add New Expense"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <Select
              value={categoryId}
              onValueChange={(value) => updateFormField('categoryId', value)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat, index) => {
                  // Handle both string and object categories
                  const id = typeof cat === 'string' ? cat : cat.id;
                  const displayName = typeof cat === 'string' ? cat : 
                    (typeof cat.name === 'string' ? cat.name : String(cat.name));
                  
                  return (
                    <SelectItem key={`${id}-${index}`} value={String(id)}>
                      {displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              placeholder="Description"
              value={name}
              onChange={(e) => updateFormField('name', e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => updateFormField('amount', e.target.value === '' ? '' : parseFloat(e.target.value))}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Frequency</label>
            <Select
              value={frequency}
              onValueChange={(value) => updateFormField('frequency', value as 'monthly' | 'quarterly' | 'annually')}
              disabled={isLoading}
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
          <Button variant="outline" onClick={cancelEditExpense} type="button" disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={saveExpense}
            type="button"
            disabled={isLoading}
          >
            {editingId ? "Update" : "Add"} Expense
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}