import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertCashAccountSchema, 
  InsertCashAccount, 
  AssetClass, 
  AssetHoldingType, 
  Asset, 
  BalanceHistoryEntry,
  TransactionCategory
} from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceHistory } from "./balance-history";
import { TransactionCategories } from "./transaction-categories";
import { InterestCalculator } from "./interest-calculator";

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
import { Checkbox } from "@/components/ui/checkbox";

interface CashAccountFormProps {
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  defaultValues?: Partial<InsertCashAccount>;
  isEditing?: boolean;
  assetId?: number;
}

export function CashAccountForm({
  assetClasses,
  holdingTypes,
  defaultValues,
  isEditing = false,
  assetId,
}: CashAccountFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistoryEntry[]>(
    defaultValues?.balanceHistory as BalanceHistoryEntry[] || []
  );
  const [transactionCategories, setTransactionCategories] = useState<TransactionCategory[]>(
    defaultValues?.transactionCategories as TransactionCategory[] || []
  );

  // Find the Cash/Bank Accounts asset class
  const cashAssetClass = assetClasses.find(
    (assetClass) => 
      assetClass.name.toLowerCase().includes("cash") || 
      assetClass.name.toLowerCase().includes("bank")
  );
  
  console.log("Found cash asset class:", cashAssetClass);
  console.log("Default values passed to form:", defaultValues);
  console.log("All available asset classes:", assetClasses);

  // Check if we have a classId in the URL parameters
  useEffect(() => {
    try {
      // Get classId from URL if present
      const url = window.location.href;
      const searchParams = url.includes('?') ? url.split('?')[1] : '';
      const params = new URLSearchParams(searchParams);
      const classIdParam = params.get('classId');
      
      console.log("Cash account classId from URL:", classIdParam);
      console.log("Full URL:", url);
      console.log("Search parameters:", searchParams ? '?' + searchParams : 'None');
      
      // Store in localStorage for persistence
      if (classIdParam) {
        localStorage.setItem('selectedAssetClassId', classIdParam);
      } else if (cashAssetClass?.id) {
        // Fallback to the found cash asset class
        localStorage.setItem('selectedAssetClassId', cashAssetClass.id.toString());
      }
    } catch (error) {
      console.error("Error processing URL parameters:", error);
    }
  }, [cashAssetClass]);

  // Initialize assetClassId from defaultValues or cashAssetClass
  const initialAssetClassId = defaultValues?.assetClassId || cashAssetClass?.id;
  console.log("Initializing form with assetClassId:", initialAssetClassId);
  
  const form = useForm<InsertCashAccount>({
    resolver: zodResolver(insertCashAccountSchema),
    defaultValues: {
      name: "",
      description: "",
      value: 0,
      assetClassId: initialAssetClassId,
      assetHoldingTypeId: holdingTypes[0]?.id,
      institution: "",
      accountType: "savings",
      interestRate: 0,
      accountPurpose: "general",
      isOffsetAccount: false,
      balanceHistory: [],
      transactionCategories: [],
      ...defaultValues,
    },
  });

  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (data: InsertCashAccount) => {
      console.log("Mutation executing with data:", data);
      
      try {
        // Get the URL from localStorage if it was set during initialization
        const savedClassId = localStorage.getItem('selectedAssetClassId');
        if (savedClassId && !data.assetClassId) {
          console.log("Using assetClassId from localStorage:", savedClassId);
          data.assetClassId = parseInt(savedClassId);
        }
        
        // Make sure assetClassId is set in data
        if (!data.assetClassId && cashAssetClass?.id) {
          console.log("Using assetClassId from cashAssetClass:", cashAssetClass.id);
          data.assetClassId = cashAssetClass.id;
        }
        
        // If we still don't have an assetClassId, use a default of 1 (typically Cash & Bank Accounts)
        if (!data.assetClassId) {
          console.log("No assetClassId found, using default of 1");
          data.assetClassId = 1;
        }
        
        if (isEditing && assetId) {
          console.log("Updating existing cash account:", assetId);
          const res = await apiRequest("PATCH", `/api/assets/${assetId}`, data);
          if (!res.ok) {
            const errorText = await res.text();
            console.error("API error response:", errorText);
            throw new Error(`API error: ${res.status} ${errorText}`);
          }
          const result = await res.json();
          console.log("Update response:", result);
          return result;
        } else {
          console.log("Creating new cash account with data:", data);
          console.log("Asset class ID for submission:", data.assetClassId);
          
          const res = await apiRequest("POST", "/api/assets", data);
          if (!res.ok) {
            const errorText = await res.text();
            console.error("API error response:", errorText);
            throw new Error(`API error: ${res.status} ${errorText}`);
          }
          
          const result = await res.json();
          console.log("Create response:", result);
          return result;
        }
      } catch (err) {
        console.error("API request error:", err);
        throw err;
      }
    },
    onMutate: (data) => {
      console.log("onMutate called with data:", data);
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: `Cash account ${isEditing ? "updated" : "created"} successfully`,
        description: `Your ${form.getValues("name")} account has been ${isEditing ? "updated" : "created"}.`,
      });
      setLocation("/asset-classes/" + cashAssetClass?.id);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} cash account: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: (data, error) => {
      console.log("onSettled called with data:", data);
      if (error) {
        console.error("onSettled error:", error);
      }
    },
  });

  const onSubmit = (data: InsertCashAccount) => {
    console.log("Form submitted with data:", data);
    
    try {
      // Deep clone the data to avoid reference issues
      const submitData = JSON.parse(JSON.stringify(data));
      
      // Add balance history and transaction categories to the data
      submitData.balanceHistory = balanceHistory;
      submitData.transactionCategories = transactionCategories;

      // Force the assetClassId to be the cash asset class ID
      if (cashAssetClass?.id) {
        console.log("Setting assetClassId to cash asset class:", cashAssetClass.id);
        submitData.assetClassId = cashAssetClass.id;
      } else if (!submitData.assetClassId) {
        // If we can't get the cash asset class ID from the cashAssetClass object, try to set it from defaultValues
        submitData.assetClassId = defaultValues?.assetClassId || 1;  // Fallback to 1 which is typically the Cash asset class ID
        console.log("No cash asset class found, using fallback ID:", submitData.assetClassId);
      }
      
      // Force numeric fields to be numbers, not strings
      submitData.value = typeof submitData.value === 'string' ? parseFloat(submitData.value) : (submitData.value || 0);
      submitData.interestRate = typeof submitData.interestRate === 'string' ? parseFloat(submitData.interestRate) : (submitData.interestRate || 0);
      
      // Force AssetHoldingTypeId to be a number
      submitData.assetHoldingTypeId = typeof submitData.assetHoldingTypeId === 'string' ? 
        parseInt(submitData.assetHoldingTypeId) : (submitData.assetHoldingTypeId || 1);
      
      // Add detailed debugging
      console.log("Submitting cash account data:", submitData);
      console.log("Asset class ID:", submitData.assetClassId);
      console.log("Asset holding type ID:", submitData.assetHoldingTypeId);
      
      // Final validation check - very important
      if (!submitData.assetClassId) {
        console.error("CRITICAL ERROR: Missing assetClassId in form data - cannot submit!");
        toast({
          title: "Missing Asset Class",
          description: "Please try again or contact support - asset class ID is missing.",
          variant: "destructive",
        });
        return;
      }
      
      // Make sure name field is filled
      if (!submitData.name?.trim()) {
        console.error("Missing account name - cannot submit!");
        toast({
          title: "Missing Account Name",
          description: "Please enter a name for your account.",
          variant: "destructive",
        });
        return;
      }
      
      // Submit the form directly without using mutation
      console.log("All validation passed, attempting direct API call");
      
      // Use native fetch instead of the mutation to bypass any TanStack issues
      (async () => {
        try {
          console.log("Starting direct API submission");
          const url = isEditing && assetId 
            ? `/api/assets/${assetId}`
            : "/api/assets";
          
          const method = isEditing && assetId ? "PATCH" : "POST";
          console.log(`Making direct ${method} request to ${url}`);
          
          const response = await fetch(url, {
            method: method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitData),
          });
          
          console.log("API response status:", response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("API error response:", errorText);
            toast({
              title: "Error",
              description: `Failed to ${isEditing ? "update" : "create"} cash account: ${errorText}`,
              variant: "destructive",
            });
            return;
          }
          
          const result = await response.json();
          console.log("Success response:", result);
          
          toast({
            title: `Cash account ${isEditing ? "updated" : "created"} successfully`,
            description: `Your ${submitData.name} account has been ${isEditing ? "updated" : "created"}.`,
          });
          
          // Redirect
          queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
          setLocation("/asset-classes/" + cashAssetClass?.id);
        } catch (err) {
          console.error("Direct API submission error:", err);
          toast({
            title: "Error",
            description: `An error occurred: ${err instanceof Error ? err.message : String(err)}`,
            variant: "destructive",
          });
        }
      })();
      
      // Also try the mutation as a fallback approach
      console.log("Also trying mutation as fallback");
      mutation.mutate(submitData);
    } catch (error) {
      console.error("Error preparing form data:", error);
      toast({
        title: "Form Error",
        description: "An error occurred while preparing the form data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Offset account linked loan selection
  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
    enabled: form.watch("isOffsetAccount"),
  });

  const loanAssets = assets?.filter((asset) => asset.isLiability) || [];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Cash Account" : "Add Cash Account"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => {
            console.log("Form submit event triggered");
            // Prevent the default form behavior just to debug
            e.preventDefault();
            
            // Capture form values for debugging
            const formValues = form.getValues();
            console.log("Current form values:", formValues);
            
            // Validate if we have all required fields
            console.log("Name field:", formValues.name);
            console.log("Institution field:", formValues.institution);
            console.log("Value field:", formValues.value);
            console.log("AssetClassId field:", formValues.assetClassId);
            console.log("AssetHoldingTypeId field:", formValues.assetHoldingTypeId);
            
            // Check for form validation errors
            console.log("Form state:", form.formState);
            console.log("Form errors:", form.formState.errors);
            
            // Now manually call the submit handler
            console.log("Calling onSubmit handler manually");
            onSubmit(formValues);
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Savings Account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="institution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank/Institution*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is stored securely and only visible to you
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="checking">Checking/Everyday</SelectItem>
                        <SelectItem value="term_deposit">Term Deposit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                        // Ensure value is always a valid number
                        value={field.value === undefined || isNaN(field.value) ? 0 : field.value}
                        onChange={(e) => {
                          // Only update if we have a valid number
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
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
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 2.5"
                        {...field}
                        // Handle NaN values for interest rate
                        value={field.value === undefined || isNaN(field.value) ? 0 : field.value}
                        onChange={(e) => {
                          // Convert empty string to 0, otherwise parse as float
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
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
                name="accountPurpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Purpose</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General Use</SelectItem>
                        <SelectItem value="emergency">Emergency Fund</SelectItem>
                        <SelectItem value="savings">Savings Goal</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
              name="isOffsetAccount"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Offset Account</FormLabel>
                    <FormDescription>
                      This account is used to offset interest on a loan
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("isOffsetAccount") && (
              <FormField
                control={form.control}
                name="offsetLinkedLoanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Loan</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select loan to offset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loanAssets.map((loan) => (
                          <SelectItem key={loan.id} value={loan.id.toString()}>
                            {loan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select which loan this account offsets
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Optional notes about this account" 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Hidden field for asset class ID */}
            <FormField
              control={form.control}
              name="assetClassId"
              render={({ field }) => {
                console.log("Asset class ID in hidden field:", field.value);
                
                // Convert to string to avoid NaN warnings
                const idValue = field.value ? String(field.value) : 
                               (cashAssetClass?.id ? String(cashAssetClass.id) : '');
                
                // Important: We need to use the onChange handler to ensure the value gets set in the form data
                return (
                  <>
                    <input 
                      type="hidden" 
                      value={idValue}
                      onChange={(e) => {
                        // Convert back to number for the form data
                        const numValue = e.target.value ? parseInt(e.target.value) : undefined;
                        field.onChange(numValue);
                      }}
                    />
                    <div className="text-xs text-muted-foreground">
                      Asset Class ID: {field.value || cashAssetClass?.id || 'Not set'}
                    </div>
                  </>
                );
              }}
            />

            {/* Advanced Features Tabs */}
            <Tabs defaultValue="balance-history" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="balance-history">Balance History</TabsTrigger>
                <TabsTrigger value="transaction-categories">Transaction Categories</TabsTrigger>
                <TabsTrigger value="interest-calculator">Interest Calculator</TabsTrigger>
              </TabsList>
              <TabsContent value="balance-history" className="pt-4">
                <BalanceHistory 
                  balanceHistory={balanceHistory}
                  onChange={setBalanceHistory}
                  initialBalance={form.getValues("value")}
                />
              </TabsContent>
              <TabsContent value="transaction-categories" className="pt-4">
                <TransactionCategories 
                  categories={transactionCategories}
                  onChange={setTransactionCategories}
                />
              </TabsContent>
              <TabsContent value="interest-calculator" className="pt-4">
                <InterestCalculator 
                  initialBalance={form.getValues("value")}
                  interestRate={form.getValues("interestRate") || 0}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation(`/asset-classes/${cashAssetClass?.id}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                onClick={() => {
                  console.log("Submit button clicked directly");
                  console.log("Form state at button click:", form.formState);
                  console.log("Form values at button click:", form.getValues());
                }}
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update Account" : "Add Account"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}