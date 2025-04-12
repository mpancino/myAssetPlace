import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Edit, 
  Calendar, 
  DollarSign, 
  Percent, 
  Tag, 
  Building, 
  CreditCard, 
  AlertTriangle,
  Link,
  Receipt,
  BedDouble,
  Bath,
  Car,
  Map as MapIcon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AssetClass, AssetHoldingType, Asset } from "@shared/schema";
import { OffsetAccountSection } from "@/components/loans/offset-account-section";
import { type PropertyExpense } from "@/components/property/property-expenses";
import { formatCurrency } from "@/lib/utils";
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

// Asset detail validation schema
const assetDetailSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional().nullable(),
  assetClassId: z.number({ 
    required_error: "Please select an asset class" 
  }),
  assetHoldingTypeId: z.number({ 
    required_error: "Please select a holding type" 
  }),
  value: z.number().positive("Value must be positive"),
  purchaseDate: z.date().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  growthRate: z.number().optional().nullable(),
  incomeYield: z.number().optional().nullable(),
  isHidden: z.boolean().default(false),
});

type AssetDetailFormValues = z.infer<typeof assetDetailSchema>;

export default function AssetDetailPage() {
  const [location, setLocation] = useLocation();
  const params = useParams();
  const assetId = params.assetId ? parseInt(params.assetId) : undefined;
  const { user } = useAuth();
  const { toast } = useToast();
  
  // View states
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch the asset details
  const { data: asset, isLoading: isLoadingAsset } = useQuery<Asset>({
    queryKey: [`/api/assets/${assetId}`],
    enabled: !!assetId,
  });
  
  // Fetch asset classes
  const { data: assetClasses = [] } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });
  
  // Fetch asset holding types
  const { data: holdingTypes = [] } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
  });
  
  // Find the selected asset class and holding type
  const selectedClass = asset?.assetClassId 
    ? assetClasses.find(c => c.id === asset.assetClassId) 
    : undefined;
    
  const selectedHoldingType = asset?.assetHoldingTypeId 
    ? holdingTypes.find(t => t.id === asset.assetHoldingTypeId) 
    : undefined;
    
  // Debug information
  console.log("Asset class ID:", asset?.assetClassId);
  console.log("Selected class:", selectedClass);
  console.log("Is Real Estate?", selectedClass?.name === "Real Estate");
  
  // Initialize form with asset data
  const form = useForm<AssetDetailFormValues>({
    resolver: zodResolver(assetDetailSchema),
    defaultValues: {
      name: asset?.name || "",
      description: asset?.description || "",
      assetClassId: asset?.assetClassId,
      assetHoldingTypeId: asset?.assetHoldingTypeId,
      value: asset?.value,
      purchaseDate: asset?.purchaseDate ? new Date(asset.purchaseDate) : null,
      purchasePrice: asset?.purchasePrice || null,
      growthRate: asset?.growthRate || null,
      incomeYield: asset?.incomeYield || null,
      isHidden: asset?.isHidden || false,
    },
  });
  
  // Update form values when asset data is loaded
  useEffect(() => {
    if (asset) {
      form.reset({
        name: asset.name,
        description: asset.description,
        assetClassId: asset.assetClassId,
        assetHoldingTypeId: asset.assetHoldingTypeId,
        value: asset.value,
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
        purchasePrice: asset.purchasePrice,
        growthRate: asset.growthRate,
        incomeYield: asset.incomeYield,
        isHidden: asset.isHidden,
      });
    }
  }, [asset, form]);
  
  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async (values: AssetDetailFormValues) => {
      if (!assetId) return null;
      
      const res = await apiRequest("PATCH", `/api/assets/${assetId}`, values);
      const data = await res.json();
      return data as Asset;
    },
    onSuccess: (updatedAsset) => {
      if (!updatedAsset) return;
      
      toast({
        title: "Asset Updated",
        description: `${updatedAsset.name} has been updated successfully`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      queryClient.invalidateQueries({ queryKey: [`/api/assets/${assetId}`] });
      
      // Exit edit mode
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async () => {
      if (!assetId) return null;
      
      const res = await apiRequest("DELETE", `/api/assets/${assetId}`);
      return res.status === 200;
    },
    onSuccess: (success) => {
      if (!success) return;
      
      toast({
        title: "Asset Deleted",
        description: "The asset has been deleted successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      
      // Navigate back to the asset class page or dashboard
      if (asset?.assetClassId) {
        setLocation(`/asset-classes/${asset.assetClassId}`);
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form submission
  const onSubmit = (values: AssetDetailFormValues) => {
    updateAssetMutation.mutate(values);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    // Reset form to original values
    if (asset) {
      form.reset({
        name: asset.name,
        description: asset.description,
        assetClassId: asset.assetClassId,
        assetHoldingTypeId: asset.assetHoldingTypeId,
        value: asset.value,
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
        purchasePrice: asset.purchasePrice,
        growthRate: asset.growthRate,
        incomeYield: asset.incomeYield,
        isHidden: asset.isHidden,
      });
    }
    setIsEditing(false);
  };
  
  // Handle delete
  const handleDelete = () => {
    deleteAssetMutation.mutate();
  };
  
  // Handle back navigation
  const handleBack = () => {
    if (asset?.assetClassId) {
      setLocation(`/asset-classes/${asset.assetClassId}`);
    } else {
      setLocation("/dashboard");
    }
  };
  
  // Calculate metrics
  const calculateGain = () => {
    if (!asset || !asset.purchasePrice) return null;
    return asset.value - asset.purchasePrice;
  };
  
  const calculateGainPercentage = () => {
    if (!asset || !asset.purchasePrice || asset.purchasePrice === 0) return null;
    return ((asset.value - asset.purchasePrice) / asset.purchasePrice) * 100;
  };
  
  const gainValue = calculateGain();
  const gainPercentage = calculateGainPercentage();
  
  // Loading state
  if (isLoadingAsset) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading asset details...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Not found state
  if (!asset && !isLoadingAsset) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Asset Not Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>The asset you're looking for doesn't exist or has been deleted.</p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setLocation("/dashboard")}>
                  Return to Dashboard
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack} 
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold">{asset?.name}</h1>
          </div>
          
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this asset? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDelete}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button 
                variant="outline"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                {selectedClass?.name?.toLowerCase() === "real estate" && (
                  <TabsTrigger value="property">Property Info</TabsTrigger>
                )}
                {(selectedClass?.name?.toLowerCase() === "loans & liabilities" || 
                  asset?.assetClassId === 5) && (
                  <TabsTrigger value="loan">Loan Info</TabsTrigger>
                )}
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Current Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          formatCurrency(asset?.value || 0)
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Asset Class</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-medium">
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="assetClassId"
                            render={({ field }) => (
                              <FormItem>
                                <Select 
                                  value={field.value?.toString()} 
                                  onValueChange={value => field.onChange(parseInt(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select asset class" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {assetClasses?.map(assetClass => (
                                      <SelectItem 
                                        key={assetClass.id} 
                                        value={assetClass.id.toString()}
                                      >
                                        {assetClass.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          selectedClass?.name || "N/A"
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Holding Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-medium">
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="assetHoldingTypeId"
                            render={({ field }) => (
                              <FormItem>
                                <Select 
                                  value={field.value?.toString()} 
                                  onValueChange={value => field.onChange(parseInt(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select holding type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {holdingTypes?.map(type => (
                                      <SelectItem 
                                        key={type.id} 
                                        value={type.id.toString()}
                                      >
                                        {type.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          selectedHoldingType?.name || "N/A"
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Asset Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter a description for this asset (optional)" 
                                className="min-h-[100px]"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        {asset?.description || "No description provided."}
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Purchase Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Purchase Date</div>
                          {isEditing ? (
                            <FormField
                              control={form.control}
                              name="purchaseDate"
                              render={({ field }) => (
                                <FormItem>
                                  <DatePicker
                                    date={field.value || null}
                                    setDate={field.onChange}
                                  />
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="font-medium flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                              {asset?.purchaseDate 
                                ? new Date(asset.purchaseDate).toLocaleDateString() 
                                : "Not provided"
                              }
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Purchase Price</div>
                          {isEditing ? (
                            <FormField
                              control={form.control}
                              name="purchasePrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      placeholder="0.00" 
                                      {...field}
                                      value={(field.value === null || field.value === undefined) ? "" : field.value}
                                      onChange={(e) => {
                                        const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="font-medium flex items-center">
                              <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                              {asset?.purchasePrice 
                                ? formatCurrency(asset.purchasePrice)
                                : "Not provided"
                              }
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {!isEditing && asset?.purchasePrice && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Gain/Loss</div>
                              <div className={`font-medium ${gainValue && gainValue > 0 ? 'text-green-600' : gainValue && gainValue < 0 ? 'text-red-600' : ''}`}>
                                {gainValue !== null 
                                  ? formatCurrency(gainValue)
                                  : "N/A"
                                }
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Gain/Loss %</div>
                              <div className={`font-medium ${gainPercentage && gainPercentage > 0 ? 'text-green-600' : gainPercentage && gainPercentage < 0 ? 'text-red-600' : ''}`}>
                                {gainPercentage !== null 
                                  ? `${gainPercentage.toFixed(2)}%`
                                  : "N/A"
                                }
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Growth Rate</div>
                          {isEditing ? (
                            <FormField
                              control={form.control}
                              name="growthRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      placeholder={selectedClass && selectedClass.defaultMediumGrowthRate !== null 
                                        ? `Default: ${(selectedClass.defaultMediumGrowthRate * 100).toFixed(2)}%` 
                                        : "Enter growth rate"} 
                                      {...field}
                                      value={(field.value === null || field.value === undefined) ? "" : field.value * 100}
                                      onChange={(e) => {
                                        const value = e.target.value === "" ? null : parseFloat(e.target.value) / 100;
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="font-medium flex items-center">
                              <Percent className="mr-2 h-4 w-4 text-muted-foreground" />
                              {asset?.growthRate !== null && asset?.growthRate !== undefined
                                ? `${(asset.growthRate * 100).toFixed(2)}%`
                                : selectedClass?.defaultMediumGrowthRate !== null && selectedClass?.defaultMediumGrowthRate !== undefined
                                  ? `${(selectedClass.defaultMediumGrowthRate * 100).toFixed(2)}% (Default)`
                                  : "Not set"
                              }
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Income Yield</div>
                          {isEditing ? (
                            <FormField
                              control={form.control}
                              name="incomeYield"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      placeholder={selectedClass && selectedClass.defaultIncomeYield !== null 
                                        ? `Default: ${(selectedClass.defaultIncomeYield * 100).toFixed(2)}%` 
                                        : "Enter income yield"} 
                                      {...field}
                                      value={(field.value === null || field.value === undefined) ? "" : field.value * 100}
                                      onChange={(e) => {
                                        const value = e.target.value === "" ? null : parseFloat(e.target.value) / 100;
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="font-medium flex items-center">
                              <Percent className="mr-2 h-4 w-4 text-muted-foreground" />
                              {asset?.incomeYield !== null && asset?.incomeYield !== undefined
                                ? `${(asset.incomeYield * 100).toFixed(2)}%`
                                : selectedClass?.defaultIncomeYield !== null && selectedClass?.defaultIncomeYield !== undefined
                                  ? `${(selectedClass.defaultIncomeYield * 100).toFixed(2)}% (Default)`
                                  : "Not set"
                              }
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm text-muted-foreground mb-1">Visibility</div>
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="isHidden"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Hide from dashboard</FormLabel>
                                  <FormDescription>
                                    Hidden assets won't appear in your dashboard summary, but will still be included in total calculations
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        ) : (
                          <div className="font-medium flex items-center">
                            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                            {asset?.isHidden 
                              ? "Hidden from dashboard"
                              : "Visible on dashboard"
                            }
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                {/* Extended asset details go here - can be customized based on asset class */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedClass?.name || "Asset"} Specific Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedClass?.name === "Property" && (
                      <div className="space-y-6">
                        <div className="flex items-center">
                          <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Property Type</p>
                            <p className="font-medium">{asset?.propertyType ? asset.propertyType.charAt(0).toUpperCase() + asset.propertyType.slice(1) : "Residential"}</p>
                          </div>
                        </div>
                        
                        {/* Property Details */}
                        <div className="grid grid-cols-2 gap-4">
                          {asset && asset.bedrooms && asset.bedrooms > 0 && (
                            <div className="flex items-center">
                              <BedDouble className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Bedrooms</p>
                                <p className="font-medium">{asset.bedrooms}</p>
                              </div>
                            </div>
                          )}
                          
                          {asset && asset.bathrooms && asset.bathrooms > 0 && (
                            <div className="flex items-center">
                              <Bath className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Bathrooms</p>
                                <p className="font-medium">{asset.bathrooms}</p>
                              </div>
                            </div>
                          )}
                          
                          {asset && asset.parkingSpaces && asset.parkingSpaces > 0 && (
                            <div className="flex items-center">
                              <Car className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Parking Spaces</p>
                                <p className="font-medium">{asset.parkingSpaces}</p>
                              </div>
                            </div>
                          )}
                          
                          {asset && asset.landSize && asset.landSize > 0 && (
                            <div className="flex items-center">
                              <MapIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Land Size</p>
                                <p className="font-medium">{asset.landSize} m²</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Property Expenses */}
                        {asset && asset.propertyExpenses && Object.keys(asset.propertyExpenses).length > 0 && (
                          <div className="mt-4">
                            <h3 className="font-medium mb-2 flex items-center">
                              <Receipt className="mr-2 h-4 w-4" /> Property Expenses
                            </h3>
                            <div className="bg-muted p-4 rounded-md">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead>Annual Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.values(asset.propertyExpenses).map((expense: PropertyExpense) => (
                                    <TableRow key={expense.id}>
                                      <TableCell>{expense.category}</TableCell>
                                      <TableCell>{expense.description}</TableCell>
                                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                      <TableCell>
                                        {expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1)}
                                      </TableCell>
                                      <TableCell>{formatCurrency(expense.annualTotal)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                                <TableFooter>
                                  <TableRow>
                                    <TableCell colSpan={4}>Total Annual Expenses</TableCell>
                                    <TableCell className="font-medium">
                                      {formatCurrency(
                                        Object.values(asset.propertyExpenses).reduce(
                                          (sum, expense) => sum + expense.annualTotal, 
                                          0
                                        )
                                      )}
                                    </TableCell>
                                  </TableRow>
                                </TableFooter>
                              </Table>
                            </div>
                          </div>
                        )}
                        
                        {/* Rental Information */}
                        {asset && asset.isRental && (
                          <div className="mt-4">
                            <h3 className="font-medium mb-2 flex items-center">
                              <DollarSign className="mr-2 h-4 w-4" /> Rental Information
                            </h3>
                            <div className="bg-muted p-4 rounded-md space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Rental Income</span>
                                <span className="font-medium">
                                  {formatCurrency(asset.rentalIncome || 0)} 
                                  /{asset.rentalFrequency || 'month'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Vacancy Rate</span>
                                <span className="font-medium">
                                  {asset.vacancyRate || 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedClass?.name === "Loans" && (
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Loan Type</p>
                            <p className="font-medium">Personal Loan</p>
                          </div>
                        </div>
                        
                        {/* Only show offset accounts if this is a liability */}
                        {asset?.isLiability && asset?.id && (
                          <div className="mt-6">
                            <OffsetAccountSection 
                              loanId={asset.id} 
                              loanInterestRate={asset.incomeYield ? asset.incomeYield * 100 : undefined}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {(!selectedClass?.name || (selectedClass?.name !== "Property" && selectedClass?.name !== "Loans")) && (
                      <p className="text-muted-foreground">
                        No specific details available for this asset type.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Property Info Tab */}
              <TabsContent value="property" className="space-y-4 pt-4">
                {asset && selectedClass?.name?.toLowerCase() === "real estate" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Property Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                          {/* Property Features */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {asset.bedrooms && (
                              <div className="flex items-center">
                                <BedDouble className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                                  <p className="font-medium">{asset.bedrooms}</p>
                                </div>
                              </div>
                            )}
                            
                            {asset.bathrooms && (
                              <div className="flex items-center">
                                <Bath className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                                  <p className="font-medium">{asset.bathrooms}</p>
                                </div>
                              </div>
                            )}
                            
                            {asset.parkingSpaces && asset.parkingSpaces > 0 && (
                              <div className="flex items-center">
                                <Car className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Parking Spaces</p>
                                  <p className="font-medium">{asset.parkingSpaces}</p>
                                </div>
                              </div>
                            )}
                            
                            {asset.landSize && asset.landSize > 0 && (
                              <div className="flex items-center">
                                <MapIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Land Size</p>
                                  <p className="font-medium">{asset.landSize} m²</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Property address information */}
                          {asset.address && (
                            <div className="mt-4">
                              <h3 className="font-medium mb-2">Property Address</h3>
                              <div className="bg-muted p-4 rounded-md">
                                <p>{asset.address}</p>
                                {asset.suburb && <p>{asset.suburb}</p>}
                                {asset.state && asset.postcode && <p>{asset.state}, {asset.postcode}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Rental Income Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Rental Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Rental status */}
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Rental Status</div>
                          <div className="font-medium">
                            {asset.isRental ? "Investment Property" : "Owner-Occupied"}
                          </div>
                        </div>
                        
                        {/* Show rental details only if it's a rental property */}
                        {asset.isRental && (
                          <>
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Weekly Rent</div>
                              <div className="font-medium">{(asset as any).weeklyRent ? formatCurrency((asset as any).weeklyRent) : "Not specified"}</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Annual Rental Income</div>
                              <div className="font-medium">{(asset as any).weeklyRent ? formatCurrency((asset as any).weeklyRent * 52) : "Not specified"}</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Rental Yield</div>
                              <div className="font-medium">
                                {(asset as any).weeklyRent && asset.value
                                  ? `${(((asset as any).weeklyRent * 52 / asset.value) * 100).toFixed(2)}%`
                                  : "Not available"
                                }
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Property Expenses Table */}
                    {(asset as any).propertyExpenses && Object.keys((asset as any).propertyExpenses).length > 0 && (
                      <Card className="col-span-1 md:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Receipt className="mr-2 h-4 w-4" /> Property Expenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Annual Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.values((asset as any).propertyExpenses).map((expense: PropertyExpense) => (
                                <TableRow key={expense.id}>
                                  <TableCell>{expense.category}</TableCell>
                                  <TableCell>{expense.description}</TableCell>
                                  <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                  <TableCell>
                                    {expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1)}
                                  </TableCell>
                                  <TableCell>{formatCurrency(expense.annualTotal)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={4}>Total Annual Expenses</TableCell>
                                <TableCell>
                                  {formatCurrency(
                                    Object.values((asset as any).propertyExpenses).reduce(
                                      (total, expense: PropertyExpense) => total + expense.annualTotal,
                                      0
                                    )
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="performance" className="space-y-4 pt-4">
                {/* Performance charts and trends would go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Historical Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Performance tracking will be available in a future update.
                    </p>
                    {gainValue !== null && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Total Gain/Loss</div>
                          <div className={`text-xl font-semibold ${gainValue > 0 ? 'text-green-600' : gainValue < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(gainValue)} ({gainPercentage !== null ? `${gainPercentage.toFixed(2)}%` : "N/A"})
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {isEditing && (
              <div className="flex justify-end space-x-2 mt-6">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateAssetMutation.isPending}
                >
                  {updateAssetMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}