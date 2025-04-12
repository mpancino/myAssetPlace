import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useExpenseEdit } from '@/contexts/expense-edit-context';
import { useAssetClassDetails } from '@/hooks/use-asset-class-details';
import { useToast } from '@/hooks/use-toast';
import { FREQUENCY_MULTIPLIERS } from '@/lib/expense-utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Default expense categories as fallback
const DEFAULT_EXPENSE_CATEGORIES = [
  "Management Fee",
  "Trading Fee", 
  "Advisory Fee",
  "Platform Fee",
  "Tax Preparation",
  "Other",
];

export function ExpenseEditModal() {
  const { isOpen, assetId, expense, onClose, onSave } = useExpenseEdit();
  const { toast } = useToast();
  
  // Get the asset class details to fetch expense categories
  // Assuming Investments is assetClassId 4, but only pass defined values to the hook
  const assetClassId = assetId ? 4 : undefined;
  const { expenseCategories } = useAssetClassDetails(assetClassId);
  
  // Use the asset class expense categories if available, or fall back to defaults
  const availableCategories = expenseCategories && expenseCategories.length > 0
    ? expenseCategories.map((cat: any) => typeof cat === 'string' ? cat : cat.name)
    : DEFAULT_EXPENSE_CATEGORIES;
  
  // Form state
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [frequency, setFrequency] = useState('monthly');
  
  // Initialize form when expense changes
  useEffect(() => {
    if (expense) {
      setCategory(expense.category || '');
      setDescription(expense.description || '');
      setAmount(expense.amount || '');
      setFrequency(expense.frequency || 'monthly');
    } else {
      // Reset form for new expense
      setCategory('');
      setDescription('');
      setAmount('');
      setFrequency('monthly');
    }
  }, [expense, isOpen]);
  
  // Handle save
  const handleSave = () => {
    if (!category || !amount) {
      toast({
        title: "Missing information",
        description: "Please provide a category and amount",
        variant: "destructive",
      });
      return;
    }
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Calculate annual total
      const multiplier = FREQUENCY_MULTIPLIERS[frequency] || 12;
      const annualTotal = numericAmount * multiplier;
      
      // Create or update expense object
      const updatedExpense = {
        id: expense?.id || uuidv4(),
        category,
        description,
        amount: numericAmount,
        frequency,
        annualTotal,
      };
      
      // Save changes
      onSave(updatedExpense);
    } catch (err) {
      console.error('Error saving expense:', err);
      toast({
        title: "Error",
        description: "Failed to save expense",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {expense 
              ? 'Update the expense details below.' 
              : 'Enter the details for the new expense.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <div className="col-span-3">
              <Select
                value={category}
                onValueChange={setCategory}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount === '' ? '' : amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0.00"
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="frequency" className="text-right">
              Frequency
            </Label>
            <div className="col-span-3">
              <Select
                value={frequency}
                onValueChange={setFrequency}
              >
                <SelectTrigger id="frequency">
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
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {expense ? 'Save Changes' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}