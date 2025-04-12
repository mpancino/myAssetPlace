import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { X, Plus, Edit, Trash, Info } from "lucide-react";

interface ExpenseCategoriesInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ExpenseCategoriesInput({ value, onChange }: ExpenseCategoriesInputProps) {
  // Parse the JSON string to get an array of categories
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  
  // Load categories from value
  useEffect(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      setCategories(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Error parsing expense categories:", error);
      setCategories([]);
    }
  }, [value]);
  
  // Update parent when categories change
  const updateParent = (newCategories: string[]) => {
    onChange(JSON.stringify(newCategories));
  };
  
  // Add new category
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    const trimmedCategory = newCategory.trim();
    
    // Check if category already exists
    if (categories.includes(trimmedCategory)) {
      // Maybe show toast or highlight the existing entry
      return;
    }
    
    const newCategories = [...categories, trimmedCategory];
    setCategories(newCategories);
    updateParent(newCategories);
    setNewCategory("");
  };
  
  // Remove category
  const handleRemoveCategory = (index: number) => {
    const newCategories = categories.filter((_, i) => i !== index);
    setCategories(newCategories);
    updateParent(newCategories);
  };
  
  // Edit category - start
  const handleStartEdit = (index: number) => {
    setEditIndex(index);
    setNewCategory(categories[index]);
  };
  
  // Edit category - submit
  const handleSubmitEdit = () => {
    if (editIndex === null || !newCategory.trim()) return;
    
    const trimmedCategory = newCategory.trim();
    
    // Check if category already exists and it's not the one being edited
    const existingIndex = categories.findIndex(cat => cat === trimmedCategory);
    if (existingIndex !== -1 && existingIndex !== editIndex) {
      // Maybe show toast or highlight the existing entry
      return;
    }
    
    const newCategories = [...categories];
    newCategories[editIndex] = trimmedCategory;
    setCategories(newCategories);
    updateParent(newCategories);
    setNewCategory("");
    setEditIndex(null);
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditIndex(null);
    setNewCategory("");
  };
  
  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editIndex !== null) {
        handleSubmitEdit();
      } else {
        handleAddCategory();
      }
    } else if (e.key === 'Escape' && editIndex !== null) {
      handleCancelEdit();
    }
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
          categories.map((category, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="pl-3 pr-1.5 py-1.5"
            >
              {category}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1"
                onClick={() => handleRemoveCategory(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))
        )}
      </div>
      
      <div className="flex gap-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={editIndex !== null ? "Edit category..." : "Add expense category..."}
          className="flex-1"
        />
        {editIndex !== null ? (
          <div className="flex gap-1">
            <Button onClick={handleSubmitEdit} size="sm">
              Update
            </Button>
            <Button onClick={handleCancelEdit} size="sm" variant="outline">
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={handleAddCategory} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {categories.map((category, index) => (
          <div key={index} className="text-xs flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 p-1"
              onClick={() => handleStartEdit(index)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit "{category}"
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 p-1 text-destructive"
                >
                  <Trash className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Expense Category</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the expense category "{category}"?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleRemoveCategory(index)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
      
      <small className="text-muted-foreground">
        Add relevant expense categories for this asset class (e.g., maintenance for property, brokerage fees for shares).
      </small>
    </div>
  );
}