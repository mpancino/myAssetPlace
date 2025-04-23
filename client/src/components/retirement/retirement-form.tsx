import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AssetClass, AssetHoldingType, InsertAsset } from "@shared/schema";
import { logError, logInfo } from "@/lib/logger";
import { formSpacing } from "@/lib/form-utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvestmentExpensesFixed as InvestmentExpenses } from "@/components/expense/investment-expenses-fixed";

// Define the retirement form schema
const retirementFormSchema = z.object({
  name: z.string().min(1, "Retirement account name is required"),
  description: z.string().optional(),
  assetClassId: z.number(),
  assetHoldingTypeId: z.number(),
  value: z.number().positive("Current value must be positive"),
  purchaseDate: z.date().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  growthRate: z.number().min(0).max(30).optional().nullable()
    .transform(val => val === null ? null : Number(val)),
  incomeYield: z.number().min(0).max(30).optional().nullable()
    .transform(val => val === null ? null : Number(val)),
  isHidden: z.boolean().default(false),
  investmentExpenses: z.record(z.string(), z.any()).default({}),
});

type RetirementFormValues = z.infer<typeof retirementFormSchema>;

interface RetirementFormProps {
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  defaultValues?: Partial<InsertAsset>;
  isEditing?: boolean;
  assetId?: number;
}

export function RetirementForm({
  assetClasses,
  holdingTypes,
  defaultValues,
  isEditing = false,
  assetId,
}: RetirementFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [investmentExpenses, setInvestmentExpenses] = useState<Record<string, any>>(
    defaultValues?.investmentExpenses || {}
  );

  // Find the Retirement asset class
  const retirementAssetClass = assetClasses.find(
    (assetClass) => assetClass.name.toLowerCase().includes("retirement")
  );

  // Form setup
  const form = useForm<RetirementFormValues>({
    resolver: zodResolver(retirementFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      assetClassId: defaultValues?.assetClassId || retirementAssetClass?.id,
      assetHoldingTypeId: defaultValues?.assetHoldingTypeId || 1,
      value: defaultValues?.value || 0,
      purchaseDate: defaultValues?.purchaseDate ? new Date(defaultValues.purchaseDate) : null,
      purchasePrice: defaultValues?.purchasePrice || null,
      growthRate: defaultValues?.growthRate || 6.5, // Default growth rate for retirement accounts
      incomeYield: defaultValues?.incomeYield || 2.5, // Default income yield
      isHidden: defaultValues?.isHidden || false,
      investmentExpenses: defaultValues?.investmentExpenses || {},
    },
  });

  // Handler for form submission
  const onSubmit = async (values: RetirementFormValues) => {
    logInfo("form", `Submitting retirement form - ${isEditing ? 'update' : 'create'}`, {
      accountName: values.name,
      value: values.value
    });
    
    try {
      // Include the investment expenses from the state
      const dataToSubmit = {
        ...values,
        investmentExpenses,
      };

      // Make the API request
      if (isEditing && assetId) {
        // Update existing asset
        const response = await apiRequest("PATCH", `/api/assets/${assetId}`, dataToSubmit);
        const updatedAsset = await response.json();

        logInfo("asset", "Retirement account updated successfully", {
          id: assetId,
          name: values.name
        });

        toast({
          title: "Retirement Account Updated",
          description: "Your retirement account has been updated successfully.",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        queryClient.invalidateQueries({ queryKey: [`/api/assets/${assetId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      } else {
        // Create new asset
        const response = await apiRequest("POST", "/api/assets", dataToSubmit);
        const newAsset = await response.json();

        logInfo("asset", "Retirement account created successfully", {
          name: values.name,
          id: newAsset.id
        });

        toast({
          title: "Retirement Account Added",
          description: "Your retirement account has been added successfully.",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      }

      // Navigate back to the appropriate page
      if (retirementAssetClass) {
        setLocation(`/asset-classes/${retirementAssetClass.id}`);
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      logError("form", "Error saving retirement account", { 
        accountName: values.name,
        error 
      });
      
      toast({
        title: "Error",
        description: "Failed to save retirement account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Retirement Account" : "Add Retirement Account"}</CardTitle>
        <CardDescription>
          Track your retirement accounts to monitor your progress towards your retirement goals.
        </CardDescription>
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
                    <FormLabel>Account Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 401(k), Super Fund" {...field} />
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
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
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
                    <FormDescription>
                      The legal structure under which this retirement account is held
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const value = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      When you started this retirement account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="growthRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Growth Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="6.5"
                        {...field}
                        value={field.value === null ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Expected annual growth rate for this retirement account
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
                        step="0.1"
                        placeholder="2.5"
                        {...field}
                        value={field.value === null ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Expected income yield for this retirement account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isHidden"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Hide from dashboard</FormLabel>
                      <FormDescription>
                        Hidden assets won't appear in your dashboard summary, but will still be included in calculations
                      </FormDescription>
                    </div>
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
                    <Textarea
                      placeholder="Enter details about your retirement account (optional)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Investment Expenses</FormLabel>
              <InvestmentExpenses
                value={investmentExpenses}
                onChange={setInvestmentExpenses}
                assetClassId={retirementAssetClass?.id || 5}
                isEditMode={true}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (retirementAssetClass) {
                    setLocation(`/asset-classes/${retirementAssetClass.id}`);
                  } else {
                    setLocation("/dashboard");
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? "Update Retirement Account" : "Add Retirement Account"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}