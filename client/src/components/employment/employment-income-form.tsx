import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Briefcase, Plus, Trash2, PlusCircle, Percent, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Asset,
  AssetClass,
  AssetHoldingType,
  insertEmploymentIncomeSchema,
  InsertEmploymentIncome
} from "@shared/schema";

type EmploymentIncomeFormProps = {
  defaultValues?: Partial<InsertEmploymentIncome>;
  assetClasses?: AssetClass[];
  assetHoldingTypes?: AssetHoldingType[];
  onSuccess?: (data: any) => void;
  isSubmitting?: boolean;
  formMode?: "create" | "edit";
};

type AdditionalDeduction = {
  id: string;
  name: string;
  amount: number;
  isPercentage: boolean;
  frequency: "per-payment" | "monthly" | "annually";
};

export function EmploymentIncomeForm({
  defaultValues,
  assetClasses,
  assetHoldingTypes,
  onSuccess,
  isSubmitting,
  formMode = "create",
}: EmploymentIncomeFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic-info");
  
  // Initialize additional deductions
  const [additionalDeductions, setAdditionalDeductions] = useState<AdditionalDeduction[]>(
    defaultValues?.additionalDeductions as AdditionalDeduction[] || []
  );

  // Create form with schema validation
  const form = useForm({
    resolver: zodResolver(insertEmploymentIncomeSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      value: defaultValues?.value || 0,
      assetClassId: defaultValues?.assetClassId || 8, // Employment Income class ID
      assetHoldingTypeId: defaultValues?.assetHoldingTypeId || 1, // Default to Personal
      employer: defaultValues?.employer || "",
      jobTitle: defaultValues?.jobTitle || "",
      employmentType: defaultValues?.employmentType || "full-time",
      baseSalary: defaultValues?.baseSalary || 0,
      paymentFrequency: defaultValues?.paymentFrequency || "fortnightly",
      bonusType: defaultValues?.bonusType || "none",
      bonusFixedAmount: defaultValues?.bonusFixedAmount || 0,
      bonusPercentage: defaultValues?.bonusPercentage || 0,
      bonusFrequency: defaultValues?.bonusFrequency || "annually",
      bonusLikelihood: defaultValues?.bonusLikelihood || 80, // Default to 80% likelihood
      taxWithholdingRate: defaultValues?.taxWithholdingRate || 30,
      superContributionRate: defaultValues?.superContributionRate || 11,
      salaryGrowthRate: defaultValues?.salaryGrowthRate || 2.5,
      salaryReviewFrequency: defaultValues?.salaryReviewFrequency || "annually",
      startDate: defaultValues?.startDate ? new Date(defaultValues.startDate) : undefined,
      endDate: defaultValues?.endDate ? new Date(defaultValues.endDate) : undefined,
    },
  });

  // Calculate the annual income for the value field
  const calculateAnnualIncome = () => {
    const baseSalary = form.getValues("baseSalary");
    const paymentFrequency = form.getValues("paymentFrequency");
    const bonusType = form.getValues("bonusType");
    const bonusFixedAmount = form.getValues("bonusFixedAmount") || 0;
    const bonusPercentage = form.getValues("bonusPercentage") || 0;
    const bonusFrequency = form.getValues("bonusFrequency");
    const bonusLikelihood = form.getValues("bonusLikelihood") || 100; // Get bonus likelihood percentage
    
    // Calculate annual base salary
    let annualSalary = 0;
    switch (paymentFrequency) {
      case "weekly":
        annualSalary = baseSalary * 52;
        break;
      case "fortnightly":
        annualSalary = baseSalary * 26;
        break;
      case "monthly":
        annualSalary = baseSalary * 12;
        break;
      case "annually":
        annualSalary = baseSalary;
        break;
      default:
        annualSalary = baseSalary;
    }
    
    // Calculate annual bonus
    let annualBonus = 0;
    if (bonusType === "fixed" || bonusType === "mixed") {
      switch (bonusFrequency) {
        case "monthly":
          annualBonus += bonusFixedAmount * 12;
          break;
        case "quarterly":
          annualBonus += bonusFixedAmount * 4;
          break;
        case "annually":
        case "one-time":
          annualBonus += bonusFixedAmount;
          break;
        default:
          annualBonus += bonusFixedAmount;
      }
    }
    
    if (bonusType === "percentage" || bonusType === "mixed") {
      const percentageBonus = (annualSalary * bonusPercentage) / 100;
      annualBonus += percentageBonus;
    }
    
    // Apply bonus likelihood factor
    annualBonus = annualBonus * (bonusLikelihood / 100);
    
    return annualSalary + annualBonus;
  };

  // Update the value field whenever base salary or bonus changes
  // Also set the Employer name as the asset name
  useEffect(() => {
    const subscription = form.watch((formValues, { name: fieldName }) => {
      if (
        typeof fieldName === 'string' && (
          fieldName.includes("baseSalary") ||
          fieldName.includes("paymentFrequency") ||
          fieldName.includes("bonusType") ||
          fieldName.includes("bonusFixedAmount") ||
          fieldName.includes("bonusPercentage") ||
          fieldName.includes("bonusFrequency") ||
          fieldName.includes("bonusLikelihood")
        )
      ) {
        const annualIncome = calculateAnnualIncome();
        form.setValue("value", annualIncome);
      }
      
      // Update the name field when employer changes
      if (fieldName === "employer") {
        const employer = form.getValues("employer");
        const jobTitle = form.getValues("jobTitle");
        
        // Set name to employer, or "employer - job title" if both exist
        if (employer && jobTitle) {
          form.setValue("name", `${employer} - ${jobTitle}`);
        } else if (employer) {
          form.setValue("name", employer);
        }
      }
      
      // Update name when job title changes
      if (fieldName === "jobTitle") {
        const employer = form.getValues("employer");
        const jobTitle = form.getValues("jobTitle");
        
        if (employer && jobTitle) {
          form.setValue("name", `${employer} - ${jobTitle}`);
        }
      }
    });
    
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [form, form.watch]);

  // Format a currency value
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Create mutation for adding a new income source
  const createMutation = useMutation({
    mutationFn: async (formValues: any) => {
      // Add the additionalDeductions to the form data
      const formData: Record<string, any> = {
        ...formValues,
        additionalDeductions,
      };
      
      // Form data might contain values in the wrong format. Check and convert any date fields.
      if (formData.startDate instanceof Date) {
        formData.startDate = formData.startDate.toISOString().split("T")[0];
      }
      
      if (formData.endDate instanceof Date) {
        formData.endDate = formData.endDate.toISOString().split("T")[0];
      }
      
      // Need to remove undefined values due to API validation
      Object.keys(formData).forEach((key) => {
        if (formData[key] === undefined) {
          delete formData[key];
        }
      });
      
      console.log("Creating employment income with data:", formData);
      const response = await apiRequest("POST", "/api/assets", formData);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Employment income created successfully:", data);
      toast({
        title: "Employment income added",
        description: "Your employment income has been added successfully.",
      });
      
      // Invalidate asset queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: Error) => {
      console.error("Error creating employment income:", error);
      toast({
        title: "Error adding employment income",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation for editing an existing income source
  const updateMutation = useMutation({
    mutationFn: async (formValues: any) => {
      if (!defaultValues?.id) {
        throw new Error("Asset ID is required for updates");
      }
      
      // Add the additionalDeductions to the form data
      const formData: Record<string, any> = {
        ...formValues,
        additionalDeductions,
      };
      
      // Form data might contain values in the wrong format. Check and convert any date fields.
      if (formData.startDate instanceof Date) {
        formData.startDate = formData.startDate.toISOString().split("T")[0];
      }
      
      if (formData.endDate instanceof Date) {
        formData.endDate = formData.endDate.toISOString().split("T")[0];
      }
      
      // Need to remove undefined values due to API validation
      Object.keys(formData).forEach((key) => {
        if (formData[key] === undefined) {
          delete formData[key];
        }
      });
      
      console.log("Updating employment income with data:", formData);
      const response = await apiRequest("PATCH", `/api/assets/${defaultValues.id}`, formData);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Employment income updated successfully:", data);
      toast({
        title: "Employment income updated",
        description: "Your employment income has been updated successfully.",
      });
      
      // Invalidate asset queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: [`/api/assets/${defaultValues?.id}`] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: Error) => {
      console.error("Error updating employment income:", error);
      toast({
        title: "Error updating employment income",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = async (data: any) => {
    try {
      if (formMode === "create") {
        await createMutation.mutateAsync(data);
      } else {
        await updateMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  // Handle adding a new deduction
  const handleAddDeduction = () => {
    const newDeduction: AdditionalDeduction = {
      id: uuidv4(),
      name: "",
      amount: 0,
      isPercentage: false,
      frequency: "per-payment",
    };
    
    setAdditionalDeductions([...additionalDeductions, newDeduction]);
  };

  // Handle removing a deduction
  const handleRemoveDeduction = (id: string) => {
    setAdditionalDeductions(additionalDeductions.filter(d => d.id !== id));
  };

  // Handle updating a deduction
  const handleDeductionChange = (id: string, field: keyof AdditionalDeduction, value: any) => {
    setAdditionalDeductions(deductions => {
      return deductions.map(d => {
        if (d.id === id) {
          return { ...d, [field]: value };
        }
        return d;
      });
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
            <TabsTrigger value="salary-bonus">Salary & Bonus</TabsTrigger>
            <TabsTrigger value="tax-deductions">Tax & Deductions</TabsTrigger>
            <TabsTrigger value="growth-projections">Growth Projections</TabsTrigger>
          </TabsList>
          
          {/* Basic Info Tab */}
          <TabsContent value="basic-info" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name field removed as per request - using Employer as key field */}
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a description (optional)"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="employer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer*</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ABC Company" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Software Developer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Type*</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <DatePicker
                          date={field.value}
                          setDate={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <FormDescription className="text-xs">
                          Optional, for contract or temporary positions
                        </FormDescription>
                        <DatePicker
                          date={field.value}
                          setDate={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Salary & Bonus Tab */}
          <TabsContent value="salary-bonus" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Salary Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Salary/Wage*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Frequency*</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="fortnightly">Fortnightly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="text-md font-medium mb-2">Bonus Structure</h3>
                  
                  <FormField
                    control={form.control}
                    name="bonusType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Bonus Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="none" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                No Bonus
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="fixed" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Fixed Amount
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="percentage" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Percentage of Salary
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="mixed" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Mixed (Fixed + Percentage)
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {(form.watch("bonusType") === "fixed" || form.watch("bonusType") === "mixed") && (
                    <FormField
                      control={form.control}
                      name="bonusFixedAmount"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Bonus Fixed Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {(form.watch("bonusType") === "percentage" || form.watch("bonusType") === "mixed") && (
                    <FormField
                      control={form.control}
                      name="bonusPercentage"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Bonus Percentage</FormLabel>
                          <div className="flex items-center">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value));
                                }}
                              />
                            </FormControl>
                            <span className="ml-2">%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {form.watch("bonusType") !== "none" && (
                    <>
                      <FormField
                        control={form.control}
                        name="bonusFrequency"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Bonus Frequency</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select bonus frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="annually">Annually</SelectItem>
                                <SelectItem value="one-time">One-time</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bonusLikelihood"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Bonus Likelihood (%)</FormLabel>
                            <FormDescription>
                              Estimated probability of receiving the full bonus amount
                            </FormDescription>
                            <div className="flex items-center">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="1"
                                  min="0"
                                  max="100"
                                  placeholder="80"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                                    field.onChange(isNaN(value) ? 0 : value);
                                  }}
                                />
                              </FormControl>
                              <span className="ml-2">%</span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Annual Income Estimate</h3>
                    <Badge variant="outline" className="text-md">
                      {formatCurrency(form.watch("value"))}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total annual income including salary and bonus before tax and deductions
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tax & Deductions Tab */}
          <TabsContent value="tax-deductions" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Withholding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="taxWithholdingRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Withholding Rate</FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value));
                            }}
                          />
                        </FormControl>
                        <span className="ml-2">%</span>
                      </div>
                      <FormDescription>
                        Estimated tax rate applied to your income
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="superContributionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Superannuation Contribution Rate</FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value));
                            }}
                          />
                        </FormControl>
                        <span className="ml-2">%</span>
                      </div>
                      <FormDescription>
                        Mandatory employer retirement contribution (Australia)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Additional Deductions</CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddDeduction}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Deduction
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {additionalDeductions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No additional deductions added
                  </div>
                ) : (
                  <div className="space-y-4">
                    {additionalDeductions.map((deduction, index) => (
                      <div
                        key={deduction.id}
                        className="flex flex-col space-y-2 p-3 border rounded-md"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Deduction {index + 1}</h4>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveDeduction(deduction.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium">
                              Deduction Name
                            </label>
                            <Input
                              value={deduction.name}
                              onChange={(e) =>
                                handleDeductionChange(deduction.id, "name", e.target.value)
                              }
                              placeholder="e.g., Health Insurance"
                            />
                          </div>
                          
                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <label className="text-sm font-medium">
                                Amount
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={deduction.amount}
                                onChange={(e) =>
                                  handleDeductionChange(
                                    deduction.id,
                                    "amount",
                                    parseFloat(e.target.value)
                                  )
                                }
                                placeholder="0.00"
                              />
                            </div>
                            <div className="flex-shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleDeductionChange(
                                    deduction.id,
                                    "isPercentage",
                                    !deduction.isPercentage
                                  )
                                }
                              >
                                {deduction.isPercentage ? (
                                  <Percent className="h-4 w-4" />
                                ) : (
                                  <DollarSign className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">
                            Frequency
                          </label>
                          <Select
                            value={deduction.frequency}
                            onValueChange={(value) =>
                              handleDeductionChange(
                                deduction.id,
                                "frequency",
                                value as "per-payment" | "monthly" | "annually"
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per-payment">Every Payment</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {additionalDeductions.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleAddDeduction}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add a Deduction
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Growth Projections Tab */}
          <TabsContent value="growth-projections" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Salary Growth Projections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="salaryGrowthRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Salary Growth Rate</FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="-100"
                            max="100"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value));
                            }}
                          />
                        </FormControl>
                        <span className="ml-2">%</span>
                      </div>
                      <FormDescription>
                        Expected annual percentage increase in salary
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="salaryReviewFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary Review Frequency</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select review frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="annually">Annually</SelectItem>
                          <SelectItem value="bi-annually">Bi-annually</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How often your salary is reviewed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Accordion type="single" collapsible className="w-full mt-6">
                  <AccordionItem value="projections">
                    <AccordionTrigger>
                      <div className="text-left">
                        <div className="font-medium">Show Income Growth Projections</div>
                        <div className="text-sm text-muted-foreground">
                          Five-year forecast based on growth rate
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-2 text-sm font-medium">
                        <div>Year</div>
                        <div>Projected Annual Income</div>
                      </div>
                      <Separator />
                      
                      {/* Current year (baseline) */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Current</div>
                        <div>{formatCurrency(form.watch("value"))}</div>
                      </div>
                      
                      {/* Projection for 5 years */}
                      {[1, 2, 3, 4, 5].map((year) => {
                        const growthRate = form.watch("salaryGrowthRate") / 100;
                        const baseValue = form.watch("value");
                        const projectedValue = baseValue * Math.pow(1 + growthRate, year);
                        
                        return (
                          <div
                            key={year}
                            className="grid grid-cols-2 gap-2 text-sm"
                          >
                            <div>Year {year}</div>
                            <div>{formatCurrency(projectedValue)}</div>
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : formMode === "create" ? "Add Employment Income" : "Update Employment Income"}
          </Button>
        </div>
      </form>
    </Form>
  );
}