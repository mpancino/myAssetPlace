import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Edit, Trash, Info, Clock } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import type { ExpenseCategory } from "@shared/schema";

interface EnhancedExpenseCategoriesInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function EnhancedExpenseCategoriesInput({ 
  value, 
  onChange 
}: EnhancedExpenseCategoriesInputProps) {
  // State for expense categories
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  // State for category dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  
  // Form states
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryFrequency, setCategoryFrequency] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  
  // Load categories from value
  useEffect(() => {
    console.log("Loading categories from value:", value);
    try {
      const parsed = value ? JSON.parse(value) : [];
      console.log("Parsed value:", parsed);
      
      // Check if the parsed value is an array of strings (old format)
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        console.log("Converting string array to ExpenseCategory objects");
        // Convert to new format
        const converted = parsed.map(name => ({
          id: uuidv4(),
          name,
          description: '',
          defaultFrequency: 'monthly' as const
        }));
        console.log("Converted categories:", converted);
        setCategories(converted);
      } else if (Array.isArray(parsed) && parsed.every(item => typeof item === 'object')) {
        console.log("Using existing ExpenseCategory objects");
        // Already in new format
        setCategories(parsed);
      } else {
        console.log("Invalid format, setting empty categories array");
        setCategories([]);
      }
    } catch (error) {
      console.error("Error parsing expense categories:", error);
      setCategories([]);
    }
  }, [value]);
  
  // Update parent when categories change
  const updateParent = (newCategories: ExpenseCategory[]) => {
    console.log("Updating parent with categories:", newCategories);
    const jsonString = JSON.stringify(newCategories);
    console.log("JSON string being sent to parent:", jsonString);
    onChange(jsonString);
    console.log("Parent update complete");
  };
  
  // Reset form fields
  const resetForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryFrequency("monthly");
    setEditingCategory(null);
  };
  
  // Add new category
  const handleAddCategory = () => {
    if (!categoryName.trim()) return;
    
    // Check if category already exists
    if (categories.some(cat => cat.name.toLowerCase() === categoryName.trim().toLowerCase())) {
      // Maybe show toast or highlight the existing entry
      return;
    }
    
    const newCategory: ExpenseCategory = {
      id: uuidv4(),
      name: categoryName.trim(),
      description: categoryDescription.trim(),
      defaultFrequency: categoryFrequency
    };
    
    const newCategories = [...categories, newCategory];
    setCategories(newCategories);
    updateParent(newCategories);
    resetForm();
    setIsAddDialogOpen(false);
  };
  
  // Start editing a category
  const handleStartEdit = (category: ExpenseCategory) => {
    console.log("Starting edit for category:", category);
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryFrequency(category.defaultFrequency || "monthly");
    setIsEditDialogOpen(true);
    console.log("Edit dialog opened with values:", {
      name: category.name,
      description: category.description || "",
      frequency: category.defaultFrequency || "monthly"
    });
  };
  
  // Update an existing category
  const handleUpdateCategory = () => {
    console.log("Attempting to update category");
    console.log("Current editing category:", editingCategory);
    console.log("Form values:", {
      name: categoryName,
      description: categoryDescription,
      frequency: categoryFrequency
    });
    
    if (!editingCategory) {
      console.error("No category being edited");
      return;
    }
    
    if (!categoryName.trim()) {
      console.error("Category name is empty");
      return;
    }
    
    // Check if category name already exists and it's not the one being edited
    const existingIndex = categories.findIndex(
      cat => cat.name.toLowerCase() === categoryName.trim().toLowerCase() && cat.id !== editingCategory.id
    );
    if (existingIndex !== -1) {
      console.error("A category with this name already exists:", categories[existingIndex]);
      return;
    }
    
    const updatedCategory: ExpenseCategory = {
      ...editingCategory,
      name: categoryName.trim(),
      description: categoryDescription.trim(),
      defaultFrequency: categoryFrequency
    };
    
    console.log("Updated category object:", updatedCategory);
    
    const newCategories = categories.map(cat => {
      if (cat.id === editingCategory.id) {
        console.log("Replacing category", cat, "with", updatedCategory);
        return updatedCategory;
      }
      return cat;
    });
    
    console.log("New categories array:", newCategories);
    setCategories(newCategories);
    updateParent(newCategories);
    console.log("Parent updated with new categories");
    resetForm();
    setIsEditDialogOpen(false);
    console.log("Edit dialog closed and form reset");
  };
  
  // Delete a category
  const handleDeleteCategory = (id: string) => {
    const newCategories = categories.filter(cat => cat.id !== id);
    setCategories(newCategories);
    updateParent(newCategories);
  };
  
  // Get color for frequency badge
  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'monthly':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'quarterly':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'annually':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  // Get displayable frequency text
  const getFrequencyText = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-16 p-2 border rounded-md">
        {categories.length === 0 ? (
          <div className="flex items-center justify-center w-full text-sm text-muted-foreground">
            <Info className="h-4 w-4 mr-2" />
            <span>No expense categories defined. Add categories below.</span>
          </div>
        ) : (
          categories.map(category => (
            <Badge 
              key={category.id} 
              variant="outline"
              className="pl-3 pr-1.5 py-1.5 flex items-center gap-1 hover:bg-accent"
            >
              <span className="font-medium">{category.name}</span>
              
              {category.defaultFrequency && (
                <span className={`text-xs px-1 py-0.5 rounded ${getFrequencyColor(category.defaultFrequency)} ml-1`}>
                  {getFrequencyText(category.defaultFrequency)}
                </span>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => handleDeleteCategory(category.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))
        )}
      </div>
      
      <div className="flex gap-2">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              <Plus className="h-4 w-4 mr-1" /> Add Expense Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense Category</DialogTitle>
              <DialogDescription>
                Create a new expense category with description and default frequency
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="categoryName" className="text-sm font-medium">
                  Category Name
                </label>
                <Input
                  id="categoryName"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Property Tax, Insurance, Utilities"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="categoryDescription" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="categoryDescription"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Description of this expense category"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="categoryFrequency" className="text-sm font-medium">
                  Default Frequency
                </label>
                <Select 
                  value={categoryFrequency} 
                  onValueChange={(value) => setCategoryFrequency(value as 'monthly' | 'quarterly' | 'annually')}
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
                <p className="text-xs text-muted-foreground">
                  This will be the default payment frequency suggested to users for this expense type
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddCategory} disabled={!categoryName.trim()}>
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {categories.map(category => (
          <div 
            key={category.id} 
            className="border rounded-md p-3 hover:border-primary hover:bg-accent/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium">{category.name}</h4>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleStartEdit(category)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Expense Category</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the expense category "{category.name}"?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteCategory(category.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            {category.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {category.description}
              </p>
            )}
            
            <div className="flex items-center mt-1">
              <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Default: {getFrequencyText(category.defaultFrequency || 'monthly')}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense Category</DialogTitle>
            <DialogDescription>
              Update the details of this expense category
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editCategoryName" className="text-sm font-medium">
                Category Name
              </label>
              <Input
                id="editCategoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Property Tax, Insurance, Utilities"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="editCategoryDescription" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="editCategoryDescription"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Description of this expense category"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="editCategoryFrequency" className="text-sm font-medium">
                Default Frequency
              </label>
              <Select 
                value={categoryFrequency} 
                onValueChange={(value) => setCategoryFrequency(value as 'monthly' | 'quarterly' | 'annually')}
              >
                <SelectTrigger id="editCategoryFrequency">
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
          
          <DialogFooter>
            <Button
              variant="outline" 
              onClick={() => {
                resetForm();
                setIsEditDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory} disabled={!categoryName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <small className="text-muted-foreground block mt-4">
        Add relevant expense categories for this asset class. Each category can have a description
        and default frequency which will be suggested to users when they add expenses.
      </small>
    </div>
  );
}