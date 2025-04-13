import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AssetClass, AssetHoldingType, InsertAsset, InsertShare, insertShareSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { InvestmentExpenses } from "@/components/expense/investment-expenses";

// UI Components
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define share form schema based on the InsertShare schema
const shareFormSchema = insertShareSchema.extend({
  // Add additional validations or fields as needed
  sharesQuantity: z.number().int().positive("Number of shares must be positive"),
  lastDividendAmount: z.number().min(0, "Dividend amount must be at least 0").optional(),
  lastDividendDate: z.date().optional().nullable(),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

interface ShareFormProps {
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  defaultValues?: Partial<InsertAsset>;
  isEditing?: boolean;
  assetId?: number;
}

export function ShareForm({
  assetClasses,
  holdingTypes,
  defaultValues,
  isEditing = false,
  assetId,
}: ShareFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [investmentExpenses, setInvestmentExpenses] = useState<Record<string, any>>(
    defaultValues?.investmentExpenses || {}
  );
  const [activeTab, setActiveTab] = useState("details");

  // Find the Investments asset class
  const investmentsAssetClass = assetClasses.find(
    (assetClass) => assetClass.name.toLowerCase().includes("investment")
  );

  // Calculate the current market value
  const calculateMarketValue = (
    currentPrice: number = 0,
    quantity: number = 0
  ): number => {
    return currentPrice * quantity;
  };

  // Calculate gain/loss
  const calculateGainLoss = (
    currentPrice: number = 0,
    purchasePrice: number = 0,
    quantity: number = 0
  ): number => {
    return (currentPrice - purchasePrice) * quantity;
  };

  // Form setup
  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      assetClassId: defaultValues?.assetClassId || investmentsAssetClass?.id,
      assetHoldingTypeId: defaultValues?.assetHoldingTypeId || 1,
      value: defaultValues?.value || 0,
      ticker: defaultValues?.ticker || "",
      exchange: defaultValues?.exchange || "",
      sharesQuantity: defaultValues?.sharesQuantity || 0,
      purchasePrice: defaultValues?.purchasePrice || 0,
      currentPrice: defaultValues?.currentPrice || 0,
      purchaseDate: defaultValues?.purchaseDate ? new Date(defaultValues.purchaseDate) : null,
      dividendYield: defaultValues?.dividendYield || 0,
      growthRate: defaultValues?.growthRate || investmentsAssetClass?.defaultMediumGrowthRate || 7,
      lastDividendAmount: defaultValues?.lastDividendAmount || 0,
      lastDividendDate: defaultValues?.lastDividendDate ? new Date(defaultValues.lastDividendDate) : null,
      isHidden: defaultValues?.isHidden || false,
      investmentExpenses: defaultValues?.investmentExpenses || {},
    },
  });

  // Watch form values to calculate market value
  const currentPrice = form.watch("currentPrice") || 0;
  const sharesQuantity = form.watch("sharesQuantity") || 0;
  const purchasePrice = form.watch("purchasePrice") || 0;
  const marketValue = calculateMarketValue(currentPrice, sharesQuantity);
  const gainLoss = calculateGainLoss(currentPrice, purchasePrice, sharesQuantity);
  
  // Update value field when market value changes
  const updateValueFromMarket = () => {
    form.setValue("value", marketValue);
  };

  // Handle expenses change
  const handleExpensesChange = (expenses: Record<string, any>) => {
    setInvestmentExpenses(expenses);
  };

  // Handler for form submission
  const onSubmit = async (values: ShareFormValues) => {
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
          title: "Investment Updated",
          description: "Your investment has been updated successfully.",
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
          title: "Investment Added",
          description: "Your investment has been added successfully.",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      }

      // Navigate back to the appropriate page
      if (investmentsAssetClass) {
        setLocation(`/asset-classes/${investmentsAssetClass.id}`);
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      console.error("Error saving investment:", error);
      toast({
        title: "Error",
        description: "Failed to save investment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Investment" : "Add Investment"}</CardTitle>
        <CardDescription>
          Track your stock and ETF investments to monitor their performance and value.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="valuation">Valuation</TabsTrigger>
                <TabsTrigger value="dividends">Dividends</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Apple Shares" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ticker"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticker Symbol*</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., AAPL" {...field} />
                        </FormControl>
                        <FormDescription>The stock's ticker symbol on its exchange</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="exchange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., NASDAQ" {...field} />
                        </FormControl>
                        <FormDescription>The exchange where the stock is traded</FormDescription>
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
                          The legal structure under which this investment is held
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
                          placeholder="Enter notes about your investment (optional)"
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
                  <h3 className="font-medium mb-2">Current Market Value</h3>
                  <p className="text-xl font-bold">{formatCurrency(marketValue)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sharesQuantity} shares × {formatCurrency(currentPrice)} per share
                  </p>
                  <p className={`text-sm mt-1 ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLoss !== 0 && purchasePrice !== 0 ? 
                      `${Math.round(gainLoss / (purchasePrice * sharesQuantity) * 100)}%` : '0%'})
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={updateValueFromMarket}
                  >
                    Update Asset Value
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sharesQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Shares*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
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
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price Per Share*</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Purchase Date</FormLabel>
                        <DatePicker
                          date={field.value as Date | undefined}
                          setDate={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="growthRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Annual Growth Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="7.0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Expected annual growth rate for long-term projections
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="dividends" className="space-y-4">
                <FormField
                  control={form.control}
                  name="dividendYield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dividend Yield (%)</FormLabel>
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
                        Annual dividend as a percentage of the current share price
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lastDividendAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Dividend Amount</FormLabel>
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
                          The last dividend payment amount per share
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastDividendDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Last Dividend Date</FormLabel>
                        <DatePicker
                          date={field.value as Date | undefined}
                          setDate={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-md bg-muted p-4">
                  <h3 className="font-medium mb-2">Estimated Annual Dividend Income</h3>
                  <p className="text-xl font-bold">
                    {formatCurrency((form.watch("dividendYield") || 0) / 100 * marketValue)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on current market value and dividend yield
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                <InvestmentExpenses
                  expenses={investmentExpenses}
                  onChange={handleExpensesChange}
                  assetClass={investmentsAssetClass}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (investmentsAssetClass) {
                    setLocation(`/asset-classes/${investmentsAssetClass.id}`);
                  } else {
                    setLocation("/dashboard");
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? "Update Investment" : "Add Investment"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}