import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Save, Home, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AssetClass, AssetHoldingType, insertAssetSchema, Asset } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

// Step indicator component
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="flex items-center space-x-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div 
          key={index} 
          className={`flex items-center ${index > 0 ? 'ml-2' : ''}`}
        >
          <div 
            className={`rounded-full h-8 w-8 flex items-center justify-center ${
              index < currentStep 
                ? 'bg-primary text-primary-foreground' 
                : index === currentStep 
                  ? 'bg-primary/90 text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {index < currentStep ? (
              <Check className="h-4 w-4" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
          {index < totalSteps - 1 && (
            <div className={`h-[2px] w-12 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
};

// Main component
export default function AddAssetPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const classId = searchParams.get("classId");
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 3;
  
  // Fetch asset classes
  const { data: assetClasses = [] } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });
  
  // Fetch asset holding types
  const { data: holdingTypes = [] } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
  });
  
  // Fetch specific asset class if classId is provided
  const { data: selectedClass } = useQuery<AssetClass>({
    queryKey: ["/api/asset-classes", parseInt(classId || "0")],
    enabled: !!classId,
  });
  
  // Create validation schema based on the insertAssetSchema
  const formSchema = z.object({
    name: z.string().min(1, "Asset name is required"),
    description: z.string().optional(),
    assetClassId: z.number({ 
      required_error: "Please select an asset class" 
    }).optional().refine(val => val !== undefined, {
      message: "Please select an asset class"
    }),
    assetHoldingTypeId: z.number({ 
      required_error: "Please select a holding type" 
    }).optional().refine(val => val !== undefined, {
      message: "Please select a holding type"
    }),
    value: z.number().positive("Value must be positive"),
    purchaseDate: z.date().optional().nullable(),
    purchasePrice: z.number().optional().nullable(),
    growthRate: z.number().optional().nullable(),
    incomeYield: z.number().optional().nullable(),
    isHidden: z.boolean().default(false),
  });
  
  type FormValues = z.infer<typeof formSchema>;
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      assetClassId: classId ? parseInt(classId) : undefined,
      assetHoldingTypeId: undefined,
      value: undefined,
      purchaseDate: null,
      purchasePrice: null,
      growthRate: null,
      incomeYield: null,
      isHidden: false,
    },
  });
  
  // Prefill the form with default values from the selected asset class
  useEffect(() => {
    if (selectedClass) {
      // Set default values from selected asset class
      form.setValue("assetClassId", selectedClass.id);
      
      // Only set these if they're not already set by the user
      if (form.getValues("growthRate") === null && selectedClass.defaultMediumGrowthRate !== null) {
        form.setValue("growthRate", selectedClass.defaultMediumGrowthRate);
      }
      
      if (form.getValues("incomeYield") === null && selectedClass.defaultIncomeYield !== null) {
        form.setValue("incomeYield", selectedClass.defaultIncomeYield);
      }
    }
  }, [selectedClass, form]);
  
  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/assets", values);
      const data = await res.json();
      return data as Asset;
    },
    onSuccess: (asset) => {
      toast({
        title: "Asset Created",
        description: `${asset.name} has been added successfully`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      
      // Redirect to the asset class page
      setLocation(`/asset-classes/${asset.assetClassId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Submit handler
  const onSubmit = (values: FormValues) => {
    console.log("Form submitted with data:", values);
    
    const selectedAssetClass = getSelectedAssetClassDetails();
    console.log("Selected asset class for form submission:", selectedAssetClass);
    
    // Make sure the asset is associated with a class and holding type
    if (!values.assetClassId || !values.assetHoldingTypeId) {
      console.error("Missing required fields:", { 
        assetClassId: values.assetClassId, 
        assetHoldingTypeId: values.assetHoldingTypeId 
      });
      
      toast({
        title: "Missing information",
        description: "Please select both an asset class and holding type",
        variant: "destructive",
      });
      setCurrentStep(0);
      return;
    }
    
    // If we have a Cash & Bank Account, check if the handling was correct
    if (selectedAssetClass && 
        (selectedAssetClass.name.toLowerCase().includes("cash") || 
         selectedAssetClass.name.toLowerCase().includes("bank"))) {
      console.log("Cash account detected, should have been redirected to special form");
    }
    
    // Log the final data being sent
    console.log("Submitting asset data to API:", values);
    createAssetMutation.mutate(values);
  };
  
  // Handle cancel button
  const handleCancel = () => {
    if (classId) {
      setLocation(`/asset-classes/${classId}`);
    } else {
      setLocation("/dashboard");
    }
  };
  
  // Move to next step
  const handleNext = async () => {
    console.log("handleNext called, currentStep:", currentStep);
    let shouldProceed = false;
    
    // Validate fields based on current step
    if (currentStep === 0) {
      // Validate asset class selection
      const assetClassId = form.getValues("assetClassId");
      const assetHoldingTypeId = form.getValues("assetHoldingTypeId");
      
      console.log("Validating step 0 - Asset Class ID:", assetClassId, "Holding Type ID:", assetHoldingTypeId);
      
      const assetClassValid = await form.trigger("assetClassId");
      const assetHoldingTypeValid = await form.trigger("assetHoldingTypeId");
      
      console.log("Validation results - Asset Class:", assetClassValid, "Holding Type:", assetHoldingTypeValid);
      
      shouldProceed = assetClassValid && assetHoldingTypeValid;
      console.log("Should proceed to next step:", shouldProceed);
      
      // If this is the first step and it's a specialized asset type, redirect to the appropriate form
      if (shouldProceed) {
        const selectedAssetClass = getSelectedAssetClassDetails();
        console.log("Selected asset class for redirection:", selectedAssetClass);
        
        if (selectedAssetClass) {
          console.log(`Asset class name: "${selectedAssetClass.name}", ID: ${selectedAssetClass.id}`);
          
          // First check for asset class ID direct routing
          if (selectedAssetClass.id === 9) {
            // Employee Stock Options (ID 9) should always go to the stock options form
            console.log(`Routing BY ID: Stock Option Form (/add-stock-option/${selectedAssetClass.id}) for ID: 9`);
            setLocation(`/add-stock-option/${selectedAssetClass.id}`);
            return; // Exit early
          } 
          else if (selectedAssetClass.id === 4) {
            // Investments (ID 4) should always go to the share form
            console.log(`Routing BY ID: Share Form (/add-share/${selectedAssetClass.id}) for ID: 4`);
            setLocation(`/add-share/${selectedAssetClass.id}`);
            return; // Exit early
          }
          
          // Then check asset class name-based routing for backward compatibility
          if (selectedAssetClass.name.toLowerCase() === 'real estate') {
            console.log("Redirecting to property form");
            // Redirect to property-specific form
            setLocation(`/add-property/${selectedAssetClass.id}`);
            return; // Exit early to prevent further processing
          } else if (selectedAssetClass.name.toLowerCase().includes('cash') || 
                     selectedAssetClass.name.toLowerCase().includes('bank')) {
            console.log(`Redirecting to cash account form with classId=${selectedAssetClass.id}`);
            // Redirect to cash account-specific form with a more reliable parameter format
            console.log(`Full redirect URL: /add-cash-account?classId=${selectedAssetClass.id}`);
            setLocation(`/add-cash-account?classId=${selectedAssetClass.id}`);
            return; // Exit early to prevent further processing
          } else if (selectedAssetClass.name.toLowerCase().includes('loan') || 
                     selectedAssetClass.name.toLowerCase().includes('liabilit') || 
                     selectedAssetClass.name.toLowerCase().includes('debt')) {
            // Redirect to loan-specific form
            setLocation(`/add-loan?classId=${selectedAssetClass.id}`);
            return; // Exit early to prevent further processing
          } else if (selectedAssetClass.name.toLowerCase().includes('share') || 
                     selectedAssetClass.name.toLowerCase().includes('stock') || 
                     selectedAssetClass.name.toLowerCase().includes('equit')) {
            console.log(`Redirecting to share form for ID: ${selectedAssetClass.id}`);
            setLocation(`/add-share/${selectedAssetClass.id}`);
            return; // Exit early
          } else if (selectedAssetClass.name.toLowerCase().includes('option')) {
            console.log(`Redirecting to stock option form for ID: ${selectedAssetClass.id}`);
            setLocation(`/add-stock-option/${selectedAssetClass.id}`);
            return; // Exit early
          } else if (selectedAssetClass.name.toLowerCase().includes('retirement') || 
                     selectedAssetClass.name.toLowerCase().includes('superannuation') || 
                     selectedAssetClass.name.toLowerCase().includes('pension')) {
            console.log(`Redirecting to retirement form for ID: ${selectedAssetClass.id}`);
            setLocation(`/add-retirement/${selectedAssetClass.id}`);
            return; // Exit early
          }
          // For other asset types, continue with the generic form
        }
      }
    } else if (currentStep === 1) {
      // Validate asset details
      const nameValid = await form.trigger("name");
      const valueValid = await form.trigger("value");
      
      shouldProceed = nameValid && valueValid;
    } else if (currentStep === 2) {
      // Validate optional fields or just allow moving to final step
      shouldProceed = true;
    }
    
    if (shouldProceed && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Move to previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Get selected asset class details
  const getSelectedAssetClassDetails = () => {
    const assetClassId = form.getValues("assetClassId");
    return assetClasses.find(c => c.id === assetClassId);
  };
  
  // Get selected holding type details
  const getSelectedHoldingTypeDetails = () => {
    const holdingTypeId = form.getValues("assetHoldingTypeId");
    return holdingTypes.find(t => t.id === holdingTypeId);
  };
  
  // Render form step based on current step
  const renderFormStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <CardHeader>
              <CardTitle>Select Asset Type</CardTitle>
              <CardDescription>
                First, choose the type of asset you want to add
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="assetClassId"
                  render={({ field }) => {
                    console.log("Asset Class field value:", field.value);
                    console.log("Asset Classes available:", assetClasses);
                    
                    return (
                      <FormItem>
                        <FormLabel>Asset Class*</FormLabel>
                        <Select 
                          value={field.value !== undefined ? field.value.toString() : undefined} 
                          onValueChange={value => {
                            console.log("Asset Class selected:", value);
                            field.onChange(parseInt(value));
                            console.log("Form values after asset class change:", form.getValues());
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-20">
                              <SelectValue placeholder="Select an asset class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assetClasses?.map(assetClass => (
                              <SelectItem 
                                key={assetClass.id} 
                                value={assetClass.id.toString()}
                                className="h-16 py-2"
                              >
                                <div>
                                  <div className="font-semibold">{assetClass.name}</div>
                                  {assetClass.description && (
                                    <div className="text-xs text-muted-foreground">{assetClass.description}</div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="assetHoldingTypeId"
                  render={({ field }) => {
                    console.log("Holding Type field value:", field.value);
                    console.log("Holding Types available:", holdingTypes);
                    
                    return (
                      <FormItem>
                        <FormLabel>Holding Type*</FormLabel>
                        <Select 
                          value={field.value !== undefined ? field.value.toString() : undefined} 
                          onValueChange={value => {
                            console.log("Holding Type selected:", value);
                            field.onChange(parseInt(value));
                            console.log("Form values after holding type change:", form.getValues());
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-20">
                              <SelectValue placeholder="Select a holding type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {holdingTypes?.map(type => (
                              <SelectItem 
                                key={type.id} 
                                value={type.id.toString()}
                                className="h-16 py-2"
                              >
                                <div>
                                  <div className="font-semibold">{type.name}</div>
                                  {type.description && (
                                    <div className="text-xs text-muted-foreground">{type.description}</div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </CardContent>
          </>
        );
      case 1:
        return (
          <>
            <CardHeader>
              <CardTitle>
                {getSelectedAssetClassDetails()?.name || "Asset"} Details
              </CardTitle>
              <CardDescription>
                Enter the basic information for your {getSelectedAssetClassDetails()?.name.toLowerCase() || "asset"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name*</FormLabel>
                      <FormControl>
                        <Input placeholder={`Enter ${getSelectedAssetClassDetails()?.name.toLowerCase() || "asset"} name`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value*</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={`Enter a description for this ${getSelectedAssetClassDetails()?.name.toLowerCase() || "asset"} (optional)`} 
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Dynamic fields based on asset class type */}
                {getSelectedAssetClassDetails()?.name === "Property" && (
                  <div className="space-y-4 p-4 border rounded-md">
                    <h3 className="font-medium">Property Information</h3>
                    {/* Additional property fields could be added here */}
                  </div>
                )}
                
                {getSelectedAssetClassDetails()?.name === "Shares" && (
                  <div className="space-y-4 p-4 border rounded-md">
                    <h3 className="font-medium">Stock Information</h3>
                    {/* Additional shares fields could be added here */}
                  </div>
                )}
              </div>
            </CardContent>
          </>
        );
      case 2:
        return (
          <>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>
                Add purchase information and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Purchase Information</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Purchase Date</FormLabel>
                        <DatePicker
                          date={field.value || null}
                          setDate={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price</FormLabel>
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
                </div>
                
                <Separator />
                
                <h3 className="text-lg font-medium">Performance Metrics</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="growthRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Growth Rate (%)</FormLabel>
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
                        <FormDescription>
                          Leave blank to use default class growth rate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="incomeYield"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Income Yield (%)</FormLabel>
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
                        <FormDescription>
                          Leave blank to use default class income yield
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="isHidden"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
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
              </div>
            </CardContent>
          </>
        );
      default:
        return null;
    }
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancel} 
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <h1 className="text-2xl font-bold">Add New Asset</h1>
        </div>
        
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="mb-8">
              {renderFormStep()}
              <CardFooter className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStep === 0 ? handleCancel : handlePrevious}
                >
                  {currentStep === 0 ? (
                    <>
                      <Home className="mr-2 h-4 w-4" /> Dashboard
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </>
                  )}
                </Button>
                
                {currentStep < totalSteps - 1 ? (
                  <Button 
                    type="button" 
                    onClick={handleNext}
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit"
                    disabled={createAssetMutation.isPending}
                  >
                    {createAssetMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        Save Asset <Save className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}