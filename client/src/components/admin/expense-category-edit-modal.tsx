import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpenseCategoryEditor } from "@/contexts/expense-category-edit-context";

/**
 * A global modal for editing expense categories that doesn't depend on parent component tree
 * This component should be mounted once at the app root
 */
export function ExpenseCategoryEditModal() {
  const {
    isOpen,
    categoryName,
    categoryDescription,
    categoryFrequency,
    updateCategoryField,
    updateCategory,
    closeEditor
  } = useExpenseCategoryEditor();

  // Add keyboard event listener for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeEditor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeEditor]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="expense-category-modal">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={closeEditor}
      />
      
      {/* Modal */}
      <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-md mx-4 p-6 overflow-auto max-h-[calc(100vh-2rem)]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Edit Expense Category</h3>
          <p className="text-sm text-muted-foreground">
            Update the details of this expense category
          </p>
        </div>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="editCategoryName" className="text-sm font-medium">
              Category Name
            </label>
            <Input
              id="editCategoryName"
              value={categoryName}
              onChange={(e) => updateCategoryField("name", e.target.value)}
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
              onChange={(e) => updateCategoryField("description", e.target.value)}
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
              onValueChange={(value) => updateCategoryField("frequency", value)}
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
        
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline" 
            onClick={closeEditor}
          >
            Cancel
          </Button>
          <Button 
            onClick={updateCategory} 
            disabled={!categoryName.trim()}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}