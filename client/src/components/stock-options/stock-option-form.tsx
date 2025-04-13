import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AssetClass, AssetHoldingType, InsertAsset } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { InvestmentExpenses } from "@/components/expense/investment-expenses";

// UI Components
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define stock option form schema
const stockOptionFormSchema = z.object({
  name: z.string().min(1, "Stock option name is required"),
  description: z.string().optional(),
  assetClassId: z.number(),
  assetHoldingTypeId: z.number(),
  value: z.number().min(0, "Current value must be at least 0"),
  isStockOption: z.boolean().default(true),
  ticker: z.string().optional(),
  exchange: z.string().optional(),
  optionQuantity: z.number().int().positive("Number of options must be positive"),
  strikePrice: z.number().min(0, "Strike price must be at least 0"),
  currentPrice: z.number().min(0, "Current stock price must be at least 0").optional(),
  grantDate: z.date().optional().nullable(),
  expirationDate: z.date().optional().nullable(),
  vestedQuantity: z.number().int().min(0).optional(),
  // Fields that aren't part of the schema but useful for UI
  companyName: z.string().min(1, "Company name is required"),
  optionType: z.enum(["iso", "nso", "rsu", "other"]).optional(),
  vestingSchedule: z.string().optional(),
  grantPrice: z.number().optional(),
  isHidden: z.boolean().default(false),
  investmentExpenses: z.record(z.string(), z.any()).default({}),
});

type StockOptionFormValues = z.infer<typeof stockOptionFormSchema>;

interface StockOptionFormProps {
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  defaultValues?: Partial<InsertAsset>;
  isEditing?: boolean;
  assetId?: number;
}

export function StockOptionForm({
  assetClasses,
  holdingTypes,
  defaultValues,
  isEditing = false,
  assetId,
}: StockOptionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [investmentExpenses, setInvestmentExpenses] = useState<Record<string, any>>(
    defaultValues?.investmentExpenses || {}
  );
  const [activeTab, setActiveTab] = useState("details");

  // Find the Stock Options asset class
  const stockOptionsAssetClass = assetClasses.find(
    (assetClass) => assetClass.name.toLowerCase().includes("stock option")
  );

  // Calculate the intrinsic value (difference between current share price and strike price)
  const calculateIntrinsicValue = (
    currentPrice: number = 0,
    strikePrice: number = 0,
    quantity: number = 0
  ): number => {
    const intrinsicValuePerOption = Math.max(0, currentPrice - strikePrice);
    return intrinsicValuePerOption * quantity;
  };

  // Form setup
  const form = useForm<StockOptionFormValues>({
    resolver: zodResolver(stockOptionFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      assetClassId: defaultValues?.assetClassId || stockOptionsAssetClass?.id,
      assetHoldingTypeId: defaultValues?.assetHoldingTypeId || 1,
      value: defaultValues?.value || 0,
      isStockOption: true,
      ticker: defaultValues?.ticker || "",
      exchange: defaultValues?.exchange || "",
      optionQuantity: defaultValues?.optionQuantity || 0,
      strikePrice: defaultValues?.strikePrice || 0,
      currentPrice: defaultValues?.currentPrice || 0,
      grantDate: defaultValues?.grantDate ? new Date(defaultValues.grantDate) : null,
      expirationDate: defaultValues?.expirationDate ? new Date(defaultValues.expirationDate) : null,
      // Extra fields
      companyName: defaultValues?.companyName || "",
      optionType: (defaultValues?.optionType as "iso" | "nso" | "rsu" | "other") || "iso",
      vestingSchedule: defaultValues?.vestingSchedule || "",
      isHidden: defaultValues?.isHidden || false,
      investmentExpenses: defaultValues?.investmentExpenses || {},
    },
  });

  // Watch form values to calculate intrinsic value
  const currentPrice = form.watch("currentPrice") || 0;
  const strikePrice = form.watch("strikePrice") || 0;
  const optionQuantity = form.watch("optionQuantity") || 0;
  const intrinsicValue = calculateIntrinsicValue(currentPrice, strikePrice, optionQuantity);
  
  // Update value field when intrinsic value changes
  const updateValueFromIntrinsic = () => {
    form.setValue("value", intrinsicValue);
  };

  // Handle expenses change
  const handleExpensesChange = (expenses: Record<string, any>) => {
    setInvestmentExpenses(expenses);
  };

  // Handler for form submission
  const onSubmit = async (values: StockOptionFormValues) => {
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

        toast({
          title: "Stock Options Updated",
          description: "Your stock options have been updated successfully.",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        queryClient.invalidateQueries({ queryKey: [`/api/assets/${assetId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      } else {
        // Create new asset
        const response = await apiRequest("POST", "/api/assets", dataToSubmit);
        const newAsset = await response.json();

        toast({
          title: "Stock Options Added",
          description: "Your stock options have been added successfully.",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      }

      // Navigate back to the appropriate page
      if (stockOptionsAssetClass) {
        setLocation(`/asset-classes/${stockOptionsAssetClass.id}`);
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      console.error("Error saving stock options:", error);
      toast({
        title: "Error",
        description: "Failed to save stock options. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Stock Options" : "Add Stock Options"}</CardTitle>
        <CardDescription>
          Track your employee stock options to monitor their value and vesting schedule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="valuation">Valuation</TabsTrigger>
                <TabsTrigger value="vesting">Vesting Schedule</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ACME Company Options" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ACME Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          The legal structure under which these options are held
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="optionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option Type*</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select option type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="iso">ISO (Incentive Stock Options)</SelectItem>
                            <SelectItem value="nso">NSO (Non-Qualified Stock Options)</SelectItem>
                            <SelectItem value="rsu">RSU (Restricted Stock Units)</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The type of stock options or equity you have been granted
                        </FormDescription>
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
                        <Textarea
                          placeholder="Enter notes about your stock options (optional)"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          Hidden assets won't appear in your dashboard summary, but will still be included in calculations
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="valuation" className="space-y-4">
                <div className="rounded-md bg-muted p-4 mb-4">
                  <h3 className="font-medium mb-2">Estimated Value</h3>
                  <p className="text-xl font-bold">{formatCurrency(intrinsicValue)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {optionQuantity} options × {formatCurrency(Math.max(0, currentPrice - strikePrice))} per option
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={updateValueFromIntrinsic}
                  >
                    Update Asset Value
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="optionQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Options*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="strikePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strike Price*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          The price at which you can purchase shares
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Share Price*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grantDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grant Date</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="grantPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grant Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          The share price when the options were granted
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        The total value of these options (defaults to intrinsic value)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="vesting" className="space-y-4">
                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
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
                        The date when the options expire and can no longer be exercised
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vestingSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vesting Schedule</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="E.g., 25% after 1 year, then monthly over 3 years"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Describe when your options vest and become exercisable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="expenses" className="pt-4">
                <InvestmentExpenses 
                  value={investmentExpenses}
                  onChange={handleExpensesChange}
                  assetClassId={stockOptionsAssetClass?.id}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (stockOptionsAssetClass) {
                    setLocation(`/asset-classes/${stockOptionsAssetClass.id}`);
                  } else {
                    setLocation("/dashboard");
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? "Update Stock Options" : "Add Stock Options"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}