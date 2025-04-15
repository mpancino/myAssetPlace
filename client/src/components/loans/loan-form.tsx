import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLoanSchema, InsertLoan, AssetClass, AssetHoldingType, Asset } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { logError, logInfo } from "@/lib/logger";
import { formSpacing } from "@/lib/form-utils";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check } from "lucide-react";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LoanFormProps {
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  defaultValues?: Partial<InsertLoan>;
  isEditing?: boolean;
  assetId?: number;
  mortgageId?: number;  // Added for direct mortgage editing
  isMortgage?: boolean; // Flag to indicate this is a mortgage form
  onSuccess?: (loan: Asset) => void;
}

export function LoanForm({
  assetClasses,
  holdingTypes,
  defaultValues,
  isEditing = false,
  assetId,
  mortgageId,
  isMortgage = false,
  onSuccess,
}: LoanFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Find the Loans asset class
  const loansAssetClass = assetClasses.find(
    (assetClass) => 
      assetClass.name.toLowerCase().includes("loan") || 
      assetClass.name.toLowerCase().includes("debt") ||
      assetClass.name.toLowerCase().includes("liability")
  );

  const [isSuccess, setIsSuccess] = useState(false);
  
  const form = useForm<InsertLoan>({
    resolver: zodResolver(insertLoanSchema),
    defaultValues: {
      name: "",
      description: "",
      value: 0,
      assetClassId: loansAssetClass?.id,
      assetHoldingTypeId: holdingTypes[0]?.id,
      isLiability: true,
      loanProvider: "",
      interestRate: 0,
      interestRateType: "variable",
      loanTerm: 12,
      paymentFrequency: "monthly",
      paymentAmount: 0,
      startDate: new Date(),
      originalLoanAmount: 0,
      ...defaultValues,
    },
  });

  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (data: InsertLoan) => {
      // Determine if this is likely a mortgage by ID range or explicit flag
      const isMortgageEndpoint = isMortgage || (assetId && assetId < 100);
      console.log("Using mortgage endpoint:", isMortgageEndpoint, "for ID:", assetId || mortgageId);
      console.log("FORM DATA BEING SUBMITTED:", JSON.stringify(data, null, 2));
      
      // Case 1: Editing an existing asset that's actually a mortgage
      if (isEditing && assetId && isMortgageEndpoint) {
        console.log("Editing mortgage via assets endpoint:", assetId);
        // Convert loan form data to mortgage update format - ensuring field names match DB schema exactly
        // IMPORTANT: These field mappings must match the DB schema or updates will fail
        const mortgageData = {
          name: data.name,
          description: data.description,
          value: data.value,
          lender: data.loanProvider, // Form field is loanProvider but DB field is lender
          originalAmount: data.originalLoanAmount, // Form field is originalLoanAmount but DB field is originalAmount
          interestRate: data.interestRate,
          interestRateType: data.interestRateType,
          loanTerm: data.loanTerm,
          paymentFrequency: data.paymentFrequency,
          paymentAmount: data.paymentAmount,
          startDate: data.startDate instanceof Date ? data.startDate : (data.startDate ? new Date(data.startDate as string) : new Date()), // Ensure date is in proper format
          securedAssetId: data.securedAssetId,
          assetHoldingTypeId: data.assetHoldingTypeId // Include asset holding type
        };
        
        console.log("Updating mortgage: ", assetId, mortgageData);
        const res = await apiRequest("PATCH", `/api/mortgages/${assetId}`, mortgageData);
        return await res.json();
      }
      // Case 2: Editing a regular loan/asset
      else if (isEditing && assetId) {
        console.log("Editing regular loan:", assetId);
        const res = await apiRequest("PATCH", `/api/assets/${assetId}`, data);
        return await res.json();
      } 
      // Case 3: Editing a mortgage directly via mortgageId
      else if (isEditing && mortgageId) {
        console.log("Editing mortgage directly:", mortgageId);
        // Convert loan form data to mortgage update format - ensuring field names match DB schema exactly
        // IMPORTANT: These field mappings must match the DB schema or updates will fail
        const mortgageData = {
          name: data.name,
          description: data.description,
          value: data.value,
          lender: data.loanProvider, // Form field is loanProvider but DB field is lender
          originalAmount: data.originalLoanAmount, // Form field is originalLoanAmount but DB field is originalAmount 
          interestRate: data.interestRate,
          interestRateType: data.interestRateType,
          loanTerm: data.loanTerm,
          paymentFrequency: data.paymentFrequency,
          paymentAmount: data.paymentAmount,
          startDate: data.startDate instanceof Date ? data.startDate : (data.startDate ? new Date(data.startDate as string) : new Date()), // Ensure date is in proper format
          securedAssetId: data.securedAssetId
        };
        
        console.log("Updating mortgage directly:", mortgageId, mortgageData);
        const res = await apiRequest("PATCH", `/api/mortgages/${mortgageId}`, mortgageData);
        return await res.json();
      } 
      // Case 4: Creating a new loan/asset
      else {
        console.log("Creating new loan");
        const res = await apiRequest("POST", "/api/assets", data);
        return await res.json();
      }
    },
    onSuccess: (loan: Asset) => {
      // Invalidate all potentially affected queries
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      
      // More aggressive cache invalidation for mortgages
      if (mortgageId || isMortgage || (assetId && assetId < 100)) {
        // Invalidate all mortgage-related data
        queryClient.invalidateQueries({ queryKey: ["/api/mortgages"] });
        
        // Invalidate specific mortgage
        if (assetId) {
          queryClient.invalidateQueries({ queryKey: [`/api/mortgages/${assetId}`] });
        }
        if (mortgageId) {
          queryClient.invalidateQueries({ queryKey: [`/api/mortgages/${mortgageId}`] });
        }
        
        // Invalidate the property's mortgage list if we have a secured asset
        if (loan.securedAssetId) {
          queryClient.invalidateQueries({ 
            queryKey: [`/api/properties/${loan.securedAssetId}/mortgages`] 
          });
        }
        
        // Invalidate all properties since mortgage updates affect property calculations
        queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
        
        // Force refresh assets list since mortgage changes affect balance calculations
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      }
      
      // Show success toast
      toast({
        title: `${isMortgage ? "Mortgage" : "Loan"} ${isEditing ? "updated" : "created"} successfully`,
        description: `Your ${form.getValues("name")} has been ${isEditing ? "updated" : "created"}.`,
      });
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess(loan);
      } else {
        // Set success state and redirect after a delay (fallback)
        setIsSuccess(true);
        setTimeout(() => {
          // If this is for a property, redirect back to the property
          if (loan.securedAssetId) {
            setLocation(`/assets/${loan.securedAssetId}`);
          } else {
            // Otherwise go to loans overview
            setLocation("/asset-classes/" + loansAssetClass?.id);
          }
        }, 1500); // Redirect after 1.5 seconds
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} loan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLoan) => {
    logInfo("form", "Submitting loan form", { 
      action: isEditing ? "update" : "create",
      loanName: data.name
    });
    
    // Ensure current value (balance) is negative for liabilities
    if (typeof data.value === 'number' && data.value > 0) {
      data.value = -Math.abs(data.value);
    }
    
    try {
      mutation.mutate(data);
    } catch (error) {
      logError("form", "Error submitting loan form", { 
        action: isEditing ? "update" : "create",
        error
      });
    }
  };

  // Show success message after successful submission
  if (isSuccess) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Success!</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center space-y-4">
          <div className="bg-green-100 dark:bg-green-900 rounded-full p-4 mb-4">
            <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-xl font-medium">Your {isMortgage ? "mortgage" : "loan"} has been {isEditing ? "updated" : "created"} successfully!</p>
          <p>
            {isMortgage && form.getValues("securedAssetId") 
              ? "Redirecting you back to the property details..." 
              : "Redirecting you to the loans overview..."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing 
            ? (isMortgage ? "Edit Mortgage" : "Edit Loan") 
            : (isMortgage ? "Add Mortgage" : "Add Loan")
          }
        </CardTitle>
      </CardHeader>
      <CardContent className={formSpacing.section}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={formSpacing.container}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isMortgage ? "Mortgage Name*" : "Loan Name*"}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Personal Loan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loanProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isMortgage ? "Mortgage Lender*" : "Loan Provider*"}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originalLoanAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isMortgage ? "Original Mortgage Amount*" : "Original Loan Amount*"}</FormLabel>
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

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Balance*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(-Math.abs(parseFloat(e.target.value)))}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter as a positive number, will be stored as negative
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 5.5"
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
                name="interestRateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate Type*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loanTerm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isMortgage ? "Mortgage Term (months)*" : "Loan Term (months)*"}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="fortnightly">Fortnightly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regular Payment Amount*</FormLabel>
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

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assetHoldingTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holding Type*</FormLabel>
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
                        {holdingTypes.map((type) => (
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
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={`Optional notes about this ${isMortgage ? "mortgage" : "loan"}`} 
                      {...field} 
                      value={field.value || ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation(`/asset-classes/${loansAssetClass?.id}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending 
                  ? "Saving..." 
                  : isEditing 
                    ? (isMortgage ? "Update Mortgage" : "Update Loan") 
                    : (isMortgage ? "Add Mortgage" : "Add Loan")
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}