import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AssetClass, AssetHoldingType, InsertAsset, insertEmploymentIncomeSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

// UI Components
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Briefcase, Calculator, DollarSign, Plus, Save, Trash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Define form props
type EmploymentIncomeFormProps = {
  defaultValues?: Partial<InsertAsset>;
  assetClasses?: AssetClass[];
  assetHoldingTypes?: AssetHoldingType[];
  onSuccess?: (data: any) => void;
  isSubmitting?: boolean;
  formMode?: "create" | "edit";
};

// Extend the schema with more specific validations for our form
const formSchema = insertEmploymentIncomeSchema.extend({
  // Additional validations
  baseSalary: z.number().min(0, "Base salary must be greater than 0"),
  bonusFixedAmount: z.number().min(0, "Bonus amount must be at least 0").optional(),
  bonusPercentage: z.number().min(0, "Bonus percentage must be at least 0").max(100, "Bonus percentage cannot exceed 100%").optional(),
});

// Define additional deduction type
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
  isSubmitting = false,
  formMode = "create"
}: EmploymentIncomeFormProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [showBonusFields, setShowBonusFields] = useState(
    defaultValues?.bonusType !== "none" && defaultValues?.bonusType !== undefined
  );
  const [deductions, setDeductions] = useState<AdditionalDeduction[]>(
    (defaultValues?.additionalDeductions as AdditionalDeduction[]) || []
  );

  // Find the Employment Income asset class (ID 8)
  const employmentIncomeAssetClass = assetClasses?.find(ac => ac.id === 8);

  // Set up the form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetClassId: 8, // Employment Income asset class ID
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      value: defaultValues?.value || 0,
      assetHoldingTypeId: defaultValues?.assetHoldingTypeId || 1, // Default to Personal
      isHidden: defaultValues?.isHidden || false,
      employer: defaultValues?.employer || "",
      jobTitle: defaultValues?.jobTitle || "",
      employmentType: defaultValues?.employmentType || "full-time",
      baseSalary: defaultValues?.baseSalary || 0,
      paymentFrequency: defaultValues?.paymentFrequency || "monthly",
      bonusType: defaultValues?.bonusType || "none",
      bonusFixedAmount: defaultValues?.bonusFixedAmount || 0,
      bonusPercentage: defaultValues?.bonusPercentage || 0,
      bonusFrequency: defaultValues?.bonusFrequency || "annually",
      taxWithholdingRate: defaultValues?.taxWithholdingRate || 0,
      superContributionRate: defaultValues?.superContributionRate || 0,
      salaryGrowthRate: defaultValues?.salaryGrowthRate || 0,
      salaryReviewFrequency: defaultValues?.salaryReviewFrequency || "annually",
      startDate: defaultValues?.startDate || undefined,
      endDate: defaultValues?.endDate || undefined,
    },
  });

  // Watch for specific form values to update UI accordingly
  const bonusType = form.watch("bonusType");
  const paymentFrequency = form.watch("paymentFrequency");
  const baseSalary = form.watch("baseSalary");
  
  // Update the bonus fields visibility when bonus type changes
  const handleBonusTypeChange = (value: string) => {
    setShowBonusFields(value !== "none");
    form.setValue("bonusType", value as "none" | "fixed" | "percentage" | "mixed");
    
    // Reset bonus values when switching to "none"
    if (value === "none") {
      form.setValue("bonusFixedAmount", 0);
      form.setValue("bonusPercentage", 0);
    }
  };

  // Calculate annual equivalent of the base salary
  const calculateAnnualSalary = () => {
    if (!baseSalary) return 0;
    
    switch (paymentFrequency) {
      case "weekly":
        return baseSalary * 52;
      case "fortnightly":
        return baseSalary * 26;
      case "monthly":
        return baseSalary * 12;
      case "annually":
        return baseSalary;
      default:
        return baseSalary;
    }
  };

  // Calculate total annual compensation including bonuses
  const calculateTotalAnnualCompensation = () => {
    const annualBaseSalary = calculateAnnualSalary();
    let annualBonus = 0;
    
    if (bonusType === "fixed" || bonusType === "mixed") {
      const bonusFixedAmount = form.getValues("bonusFixedAmount") || 0;
      const bonusFrequency = form.getValues("bonusFrequency") || "annually";
      
      switch (bonusFrequency) {
        case "monthly":
          annualBonus += bonusFixedAmount * 12;
          break;
        case "quarterly":
          annualBonus += bonusFixedAmount * 4;
          break;
        case "annually":
        case "one-time":
        default:
          annualBonus += bonusFixedAmount;
          break;
      }
    }
    
    if (bonusType === "percentage" || bonusType === "mixed") {
      const bonusPercentage = form.getValues("bonusPercentage") || 0;
      const bonusFrequency = form.getValues("bonusFrequency") || "annually";
      const percentageAmount = annualBaseSalary * (bonusPercentage / 100);
      
      switch (bonusFrequency) {
        case "monthly":
          annualBonus += percentageAmount * 12;
          break;
        case "quarterly":
          annualBonus += percentageAmount * 4;
          break;
        case "annually":
        case "one-time":
        default:
          annualBonus += percentageAmount;
          break;
      }
    }
    
    return annualBaseSalary + annualBonus;
  };

  // Handle adding a new deduction
  const addDeduction = () => {
    const newDeduction: AdditionalDeduction = {
      id: uuidv4(),
      name: "",
      amount: 0,
      isPercentage: false,
      frequency: "per-payment"
    };
    setDeductions([...deductions, newDeduction]);
  };

  // Handle removing a deduction
  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter(d => d.id !== id));
  };

  // Handle deduction change
  const handleDeductionChange = (id: string, field: keyof AdditionalDeduction, value: any) => {
    const updatedDeductions = deductions.map(d => {
      if (d.id === id) {
        return { ...d, [field]: value };
      }
      return d;
    });
    setDeductions(updatedDeductions);
  };

  // Calculate total deductions
  const calculateTotalDeductions = () => {
    const annualSalary = calculateAnnualSalary();
    let totalDeductions = 0;
    
    deductions.forEach(d => {
      let deductionAmount = d.amount;
      
      if (d.isPercentage) {
        deductionAmount = annualSalary * (d.amount / 100);
      }
      
      switch (d.frequency) {
        case "per-payment":
          switch (paymentFrequency) {
            case "weekly":
              totalDeductions += deductionAmount * 52;
              break;
            case "fortnightly":
              totalDeductions += deductionAmount * 26;
              break;
            case "monthly":
              totalDeductions += deductionAmount * 12;
              break;
            case "annually":
              totalDeductions += deductionAmount;
              break;
          }
          break;
        case "monthly":
          totalDeductions += deductionAmount * 12;
          break;
        case "annually":
          totalDeductions += deductionAmount;
          break;
      }
    });
    
    return totalDeductions;
  };

  // Form submission handler
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      // Calculate the total annual value for the asset
      const annualValue = calculateTotalAnnualCompensation();
      
      // Prepare the data to be sent to the API
      const assetData = {
        ...data,
        value: annualValue, // Set the asset value to the total annual compensation
        additionalDeductions: deductions
      };
      
      // Create or update the asset
      const method = formMode === "edit" ? "PATCH" : "POST";
      const endpoint = formMode === "edit" 
        ? `/api/assets/${defaultValues?.id}` 
        : "/api/assets";
      
      const response = await apiRequest(method, endpoint, assetData);
      const result = await response.json();
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      
      // Show success toast
      toast({
        title: `Employment Income ${formMode === "edit" ? "updated" : "added"}`,
        description: `${data.name} has been successfully ${formMode === "edit" ? "updated" : "added"}.`,
      });
      
      // Call the onSuccess callback
      if (onSuccess) {
        onSuccess(result);
      } else {
        // Navigate back to the asset class page
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error saving employment income:", error);
      toast({
        title: "Error",
        description: "There was an error saving your employment income. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Basic Details</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
          </TabsList>
          
          {/* Tab 1: Basic Employment Details */}
          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Class (Hidden, always Employment Income) */}
              <FormField
                control={form.control}
                name="assetClassId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} value={8} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Employment Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Software Engineer at Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Holding Type */}
              <FormField
                control={form.control}
                name="assetHoldingTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holding Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select holding type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetHoldingTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Employer */}
              <FormField
                control={form.control}
                name="employer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Job Title */}
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Employment Type */}
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
              
              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* End Date (for contract or temporary positions) */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (for temporary/contract positions)</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add additional details about this employment..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Hidden from calculations */}
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
                    <FormLabel>Hide from calculations</FormLabel>
                    <FormDescription>
                      This employment income will be excluded from all financial calculations and projections.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </TabsContent>
          
          {/* Tab 2: Compensation Details */}
          <TabsContent value="compensation" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Base Salary</CardTitle>
                <CardDescription>Enter your regular salary/wage details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Base Salary */}
                  <FormField
                    control={form.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Salary/Wage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 5000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Payment Frequency */}
                  <FormField
                    control={form.control}
                    name="paymentFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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
                
                {/* Annual equivalent calculation */}
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Annual Base Salary: {formatCurrency(calculateAnnualSalary())}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bonus Structure</CardTitle>
                <CardDescription>Add information about any bonuses you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bonus Type */}
                <FormField
                  control={form.control}
                  name="bonusType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonus Type</FormLabel>
                      <Select
                        onValueChange={handleBonusTypeChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bonus type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Bonus</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="percentage">Percentage of Salary</SelectItem>
                          <SelectItem value="mixed">Mixed (Fixed + Percentage)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Conditional fields based on bonus type */}
                {showBonusFields && (
                  <div className="space-y-4">
                    {/* Bonus Frequency */}
                    <FormField
                      control={form.control}
                      name="bonusFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bonus Frequency</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Fixed Bonus Amount (shown for fixed or mixed types) */}
                      {(bonusType === "fixed" || bonusType === "mixed") && (
                        <FormField
                          control={form.control}
                          name="bonusFixedAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fixed Bonus Amount</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="e.g., 1000"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Bonus Percentage (shown for percentage or mixed types) */}
                      {(bonusType === "percentage" || bonusType === "mixed") && (
                        <FormField
                          control={form.control}
                          name="bonusPercentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bonus Percentage</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    max="100"
                                    placeholder="e.g., 10"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    %
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                )}
                
                {/* Total annual compensation calculation */}
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Total Annual Compensation: {formatCurrency(calculateTotalAnnualCompensation())}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab 3: Deductions */}
          <TabsContent value="deductions" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Withholding</CardTitle>
                <CardDescription>
                  Specify tax and retirement contribution rates for accurate net income calculations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tax Withholding Rate */}
                  <FormField
                    control={form.control}
                    name="taxWithholdingRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Withholding Rate (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              max="100"
                              placeholder="e.g., 25"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              %
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Estimated income tax withholding rate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Superannuation/Retirement Contribution Rate */}
                  <FormField
                    control={form.control}
                    name="superContributionRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retirement Contribution (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              max="100"
                              placeholder="e.g., 9.5"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              %
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Superannuation or retirement contribution rate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Additional Deductions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Additional Deductions</CardTitle>
                  <CardDescription>
                    Add other regular deductions such as health insurance, union dues, etc.
                  </CardDescription>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addDeduction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deduction
                </Button>
              </CardHeader>
              <CardContent>
                {deductions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No additional deductions added</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deductions.map((deduction, index) => (
                      <div key={deduction.id} className="flex items-start space-x-2 p-4 border rounded-md">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Deduction Name */}
                          <div>
                            <Label htmlFor={`deduction-name-${index}`}>Name</Label>
                            <Input
                              id={`deduction-name-${index}`}
                              value={deduction.name}
                              onChange={(e) => handleDeductionChange(deduction.id, "name", e.target.value)}
                              placeholder="e.g., Health Insurance"
                            />
                          </div>
                          
                          {/* Amount */}
                          <div>
                            <Label htmlFor={`deduction-amount-${index}`}>Amount</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                id={`deduction-amount-${index}`}
                                type="number"
                                step="0.01"
                                value={deduction.amount}
                                onChange={(e) => handleDeductionChange(deduction.id, "amount", parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                              <Select
                                value={deduction.isPercentage ? "percentage" : "fixed"}
                                onValueChange={(value) => handleDeductionChange(deduction.id, "isPercentage", value === "percentage")}
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">$</SelectItem>
                                  <SelectItem value="percentage">%</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* Frequency */}
                          <div>
                            <Label htmlFor={`deduction-frequency-${index}`}>Frequency</Label>
                            <Select
                              value={deduction.frequency}
                              onValueChange={(value) => handleDeductionChange(
                                deduction.id,
                                "frequency",
                                value as "per-payment" | "monthly" | "annually"
                              )}
                            >
                              <SelectTrigger id={`deduction-frequency-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="per-payment">Per Payment</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="annually">Annually</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDeduction(deduction.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Total Deductions Summary */}
                    <div className="bg-muted p-4 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Calculator className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-sm font-medium">
                          Estimated Annual Deductions: {formatCurrency(calculateTotalDeductions())}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab 4: Projections */}
          <TabsContent value="projections" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Growth Projections</CardTitle>
                <CardDescription>
                  Configure projections for future salary growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Salary Growth Rate */}
                  <FormField
                    control={form.control}
                    name="salaryGrowthRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Annual Growth Rate (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="e.g., 3"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              %
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Expected annual increase in your salary
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Salary Review Frequency */}
                  <FormField
                    control={form.control}
                    name="salaryReviewFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary Review Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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
                          How often your salary is typically reviewed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Growth Rate Reference */}
                {employmentIncomeAssetClass && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-sm font-medium">Reference Growth Rates</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted p-3 rounded-md text-center">
                        <p className="text-xs text-muted-foreground">Low</p>
                        <Badge variant="outline" className="mt-1">
                          {employmentIncomeAssetClass.defaultLowGrowthRate}%
                        </Badge>
                      </div>
                      <div className="bg-muted p-3 rounded-md text-center">
                        <p className="text-xs text-muted-foreground">Medium</p>
                        <Badge variant="outline" className="mt-1">
                          {employmentIncomeAssetClass.defaultMediumGrowthRate}%
                        </Badge>
                      </div>
                      <div className="bg-muted p-3 rounded-md text-center">
                        <p className="text-xs text-muted-foreground">High</p>
                        <Badge variant="outline" className="mt-1">
                          {employmentIncomeAssetClass.defaultHighGrowthRate}%
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These are the default growth rates defined for Employment Income. 
                      You can use these as a reference for setting your own growth rate.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Projection Info */}
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>About Salary Projections</AlertTitle>
              <AlertDescription>
                Salary projections help you estimate your future income based on expected growth rates.
                These projections will be used in your financial planning and retirement calculations.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {formMode === "edit" ? "Update" : "Save"} Employment Income
            </Button>
          </div>
        </Tabs>
      </form>
    </Form>
  );
}