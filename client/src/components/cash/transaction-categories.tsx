import { useState } from "react";
import { TransactionCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TransactionCategoriesProps {
  categories: TransactionCategory[];
  onChange: (categories: TransactionCategory[]) => void;
}

export function TransactionCategories({
  categories = [],
  onChange,
}: TransactionCategoriesProps) {
  const { toast } = useToast();
  const [newCategory, setNewCategory] = useState<Partial<TransactionCategory>>({
    id: uuidv4(),
    name: "",
    type: "expense",
    color: "#6366f1", // Default color
  });

  // Available colors for categories
  const colors = [
    { name: "Blue", value: "#6366f1" },
    { name: "Red", value: "#ef4444" },
    { name: "Green", value: "#10b981" },
    { name: "Yellow", value: "#f59e0b" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Pink", value: "#ec4899" },
    { name: "Indigo", value: "#3b82f6" },
    { name: "Teal", value: "#14b8a6" },
  ];

  // Add a new transaction category
  const addCategory = () => {
    if (!newCategory.name) {
      toast({
        title: "Incomplete data",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicate names
    if (categories.some(cat => cat.name.toLowerCase() === newCategory.name?.toLowerCase())) {
      toast({
        title: "Duplicate category",
        description: "A category with this name already exists",
        variant: "destructive",
      });
      return;
    }
    
    onChange([...categories, newCategory as TransactionCategory]);
    setNewCategory({
      id: uuidv4(),
      name: "",
      type: "expense",
      color: "#6366f1",
    });
  };

  // Remove a transaction category
  const removeCategory = (id: string) => {
    onChange(categories.filter(category => category.id !== id));
  };

  return (
    <div className="space-y-6">
      {categories.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2 font-medium text-sm">
            <div>Name</div>
            <div>Type</div>
            <div>Color</div>
            <div></div>
          </div>
          
          {categories.map((category) => (
            <div key={category.id} className="grid grid-cols-4 gap-2 text-sm items-center">
              <div>{category.name}</div>
              <div>
                <Badge 
                  variant={category.type === "income" ? "default" : "outline"}
                >
                  {category.type}
                </Badge>
              </div>
              <div>
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
              </div>
              <div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeCategory(category.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category-name">Category Name</Label>
          <Input
            id="category-name"
            placeholder="e.g., Groceries, Salary"
            value={newCategory.name || ''}
            onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
          />
        </div>

        <div>
          <Label htmlFor="category-type">Category Type</Label>
          <Select
            value={newCategory.type}
            onValueChange={(value) => setNewCategory({...newCategory, type: value as 'income' | 'expense'})}
          >
            <SelectTrigger id="category-type">
              <SelectValue placeholder="Select category type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="category-color">Color</Label>
          <Select
            value={newCategory.color}
            onValueChange={(value) => setNewCategory({...newCategory, color: value})}
          >
            <SelectTrigger id="category-color">
              <SelectValue placeholder="Select color">
                {newCategory.color && (
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: newCategory.color }}
                    />
                    {colors.find(c => c.value === newCategory.color)?.name || 'Custom'}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {colors.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Button
            type="button"
            onClick={addCategory}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>
      </div>
    </div>
  );
}