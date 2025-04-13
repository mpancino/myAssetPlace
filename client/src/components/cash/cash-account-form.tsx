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
import { useState } from "react";
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

  const form = useForm<InsertCashAccount>({
    resolver: zodResolver(insertCashAccountSchema),
    defaultValues: {
      name: "",
      description: "",
      value: 0,
      assetClassId: cashAssetClass?.id,
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
        if (isEditing && assetId) {
          console.log("Updating existing cash account:", assetId);
          const res = await apiRequest("PATCH", `/api/assets/${assetId}`, data);
          const result = await res.json();
          console.log("Update response:", result);
          return result;
        } else {
          console.log("Creating new cash account with data:", data);
          // Make sure we're sending a properly formed asset
          if (!data.assetClassId) {
            console.error("Missing assetClassId in form data!");
            throw new Error("Asset class must be selected");
          }
          
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
  });

  const onSubmit = (data: InsertCashAccount) => {
    // Add balance history and transaction categories to the data
    data.balanceHistory = balanceHistory;
    data.transactionCategories = transactionCategories;
    
    // Make sure we have an asset class ID - fallback to the cash asset class if none was set
    if (!data.assetClassId && cashAssetClass) {
      console.log("No assetClassId detected, using fallback cash asset class:", cashAssetClass.id);
      data.assetClassId = cashAssetClass.id;
    }
    
    // Add debugging
    console.log("Submitting cash account data:", data);
    
    // Final validation check
    if (!data.assetClassId) {
      console.error("Missing assetClassId in form data - cannot submit!");
      toast({
        title: "Missing Asset Class",
        description: "Please try again or contact support - asset class ID is missing.",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate(data);
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                        onChange={(e) => 
                          field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
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
                // Important: We need to use the onChange handler to ensure the value gets set in the form data
                return (
                  <>
                    <input 
                      type="hidden" 
                      value={field.value || cashAssetClass?.id || ''} 
                      onChange={field.onChange}
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