import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  AssetClass, 
  insertAssetClassSchema,
  ExpenseCategory
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash, Pencil } from "lucide-react";
import { EnhancedExpenseCategoriesInput } from "@/components/admin/enhanced-expense-categories";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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
  DialogClose,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";

// Create a form schema that extends the insert schema with additional validations
const assetClassFormSchema = insertAssetClassSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  defaultLowGrowthRate: z.coerce.number().min(0, "Must be a positive number").max(100, "Cannot exceed 100%").optional(),
  defaultMediumGrowthRate: z.coerce.number().min(0, "Must be a positive number").max(100, "Cannot exceed 100%").optional(),
  defaultHighGrowthRate: z.coerce.number().min(0, "Must be a positive number").max(100, "Cannot exceed 100%").optional(),
  defaultIncomeYield: z.coerce.number().min(0, "Must be a positive number").max(100, "Cannot exceed 100%").optional(),
  expenseCategories: z.string().optional()
    .transform(value => value ? JSON.parse(value) : null)
    .refine(
      value => {
        if (!value) return true;
        if (!Array.isArray(value)) return false;
        
        // Allow both simple string arrays and enhanced expense category objects
        return value.every(item => 
          typeof item === "string" || 
          (typeof item === "object" && 
           item !== null && 
           typeof item.name === "string" && 
           typeof item.id === "string")
        );
      },
      { message: "Expense categories must be an array of strings or valid expense category objects" }
    )
});

// Define the form values type
type AssetClassFormValues = z.infer<typeof assetClassFormSchema>;

export default function AssetClasses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Core asset classes are protected and cannot be deleted:
  // 1=Cash, 2=Loans, 3=Real Estate, 4=Investments, 5=Retirement, 
  // 8=Employment Income, 9=Employee Stock Options
  // (Only including asset classes explicitly mentioned in the PDD)
  const protectedAssetClassIds = [1, 2, 3, 4, 5, 8, 9];
  
  // Query to fetch asset classes
  const { data: assetClasses = [], isLoading: isLoadingAssetClasses } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });

  // Form for adding new asset class
  const addForm = useForm<AssetClassFormValues>({
    resolver: zodResolver(assetClassFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultLowGrowthRate: 2.0,
      defaultMediumGrowthRate: 6.0,
      defaultHighGrowthRate: 10.0,
      defaultIncomeYield: 3.0,
      expenseCategories: "[]"
    },
  });
  
  // Form for editing asset class
  const editForm = useForm<AssetClassFormValues>({
    resolver: zodResolver(assetClassFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultLowGrowthRate: 0,
      defaultMediumGrowthRate: 0,
      defaultHighGrowthRate: 0,
      defaultIncomeYield: 0,
      expenseCategories: "[]"
    },
  });

  // Mutation for creating asset class
  const createAssetClassMutation = useMutation({
    mutationFn: async (data: AssetClassFormValues) => {
      // Parse expense categories to a JSON string format
      const expenseCategories = typeof data.expenseCategories === 'string' 
        ? data.expenseCategories 
        : JSON.stringify(data.expenseCategories);
        
      // Create the new asset class
      const response = await apiRequest("POST", "/api/asset-classes", {
        ...data,
        expenseCategories
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-classes"] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Asset Class Created",
        description: "The asset class was created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Asset Class",
        description: error.message || "An error occurred while creating the asset class",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating asset class
  const updateAssetClassMutation = useMutation({
    mutationFn: async (data: AssetClassFormValues & { id: number }) => {
      const { id, ...updateData } = data;
      
      // Parse expense categories to a JSON string format
      const expenseCategories = typeof updateData.expenseCategories === 'string' 
        ? updateData.expenseCategories 
        : JSON.stringify(updateData.expenseCategories);
      
      const response = await apiRequest("PATCH", `/api/asset-classes/${id}`, {
        ...updateData,
        expenseCategories
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-classes"] });
      setIsEditDialogOpen(false);
      setSelectedAssetClass(null);
      editForm.reset();
      toast({
        title: "Asset Class Updated",
        description: "The asset class was updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Asset Class",
        description: error.message || "An error occurred while updating the asset class",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting asset class
  const deleteAssetClassMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/asset-classes/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-classes"] });
      setSelectedAssetClass(null);
      toast({
        title: "Asset Class Deleted",
        description: "The asset class was deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Asset Class",
        description: error.message || "An error occurred while deleting the asset class",
        variant: "destructive",
      });
    },
  });

  // Handle form submission for creating a new asset class
  const onAddSubmit = (values: AssetClassFormValues) => {
    createAssetClassMutation.mutate(values);
  };

  // Handle form submission for editing an asset class
  const onEditSubmit = (values: AssetClassFormValues) => {
    if (!selectedAssetClass) return;
    updateAssetClassMutation.mutate({
      ...values,
      id: selectedAssetClass.id,
    });
  };

  // Set up the edit form when an asset class is selected
  useEffect(() => {
    if (selectedAssetClass) {
      // Format expense categories as a string for the form
      const expenseCategories = selectedAssetClass.expenseCategories 
        ? JSON.stringify(selectedAssetClass.expenseCategories) 
        : "[]";
      
      editForm.reset({
        name: selectedAssetClass.name,
        description: selectedAssetClass.description || "",
        defaultLowGrowthRate: selectedAssetClass.defaultLowGrowthRate || 0,
        defaultMediumGrowthRate: selectedAssetClass.defaultMediumGrowthRate || 0,
        defaultHighGrowthRate: selectedAssetClass.defaultHighGrowthRate || 0,
        defaultIncomeYield: selectedAssetClass.defaultIncomeYield || 0,
        expenseCategories
      });
    }
  }, [selectedAssetClass, editForm]);

  // Handle selecting an asset class for editing
  const handleEditClick = (assetClass: AssetClass) => {
    setSelectedAssetClass(assetClass);
    setIsEditDialogOpen(true);
  };

  // Function to check if an asset class is protected (core)
  const isProtectedAssetClass = (assetClassId: number) => {
    return protectedAssetClassIds.includes(assetClassId);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Asset Classes</CardTitle>
            <CardDescription>
              Manage asset classes used throughout the system
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Asset Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Asset Class</DialogTitle>
                <DialogDescription>
                  Create a new asset class with default growth rates and income yield.
                </DialogDescription>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Cash, Real Estate, Stocks" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe this asset class"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="defaultLowGrowthRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Growth Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value || 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="defaultMediumGrowthRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medium Growth Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value || 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="defaultHighGrowthRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>High Growth Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value || 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="defaultIncomeYield"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Income Yield (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value || 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={addForm.control}
                    name="expenseCategories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Categories</FormLabel>
                        <FormControl>
                          <EnhancedExpenseCategoriesInput
                            value={field.value || "[]"}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={createAssetClassMutation.isPending}
                    >
                      {createAssetClassMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Asset Class
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoadingAssetClasses ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : assetClasses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No asset classes found. Add one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Low Growth</TableHead>
                  <TableHead>Med Growth</TableHead>
                  <TableHead>High Growth</TableHead>
                  <TableHead>Income Yield</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetClasses.map((assetClass) => (
                  <TableRow key={assetClass.id}>
                    <TableCell className="font-medium">{assetClass.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {assetClass.description || "-"}
                    </TableCell>
                    <TableCell>{assetClass.defaultLowGrowthRate?.toFixed(2)}%</TableCell>
                    <TableCell>{assetClass.defaultMediumGrowthRate?.toFixed(2)}%</TableCell>
                    <TableCell>{assetClass.defaultHighGrowthRate?.toFixed(2)}%</TableCell>
                    <TableCell>{assetClass.defaultIncomeYield?.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(assetClass)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        {/* Only show delete button for non-core asset classes */}
                        {!isProtectedAssetClass(assetClass.id) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Asset Class</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this asset class? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteAssetClassMutation.mutate(assetClass.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteAssetClassMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Asset Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset Class</DialogTitle>
            <DialogDescription>
              Update the asset class details and default values.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cash, Real Estate, Stocks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this asset class"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="defaultLowGrowthRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Growth Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="defaultMediumGrowthRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medium Growth Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="defaultHighGrowthRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>High Growth Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="defaultIncomeYield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Income Yield (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="expenseCategories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Categories</FormLabel>
                    <FormControl>
                      <EnhancedExpenseCategoriesInput
                        value={field.value || "[]"}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button"
                    onClick={() => {
                      setSelectedAssetClass(null);
                    }}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={updateAssetClassMutation.isPending}
                >
                  {updateAssetClassMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Asset Class
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}