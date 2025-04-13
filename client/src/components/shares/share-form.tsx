import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShareSchema, InsertShare, AssetClass, AssetHoldingType } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
import { useState } from "react";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { SharePurchaseTransaction, DividendTransaction } from "@shared/schema";
import { PurchaseHistory } from "@/components/shares/purchase-history";
import { DividendHistory } from "@/components/shares/dividend-history";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { InvestmentExpenses } from "@/components/expense/investment-expenses";

interface ShareFormProps {
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  defaultValues?: Partial<InsertShare>;
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
  const [purchaseHistory, setPurchaseHistory] = useState<SharePurchaseTransaction[]>(
    defaultValues?.purchaseHistory || []
  );
  const [dividendHistory, setDividendHistory] = useState<DividendTransaction[]>(
    defaultValues?.dividendHistory || []
  );
  const [newTransaction, setNewTransaction] = useState<Partial<SharePurchaseTransaction>>({
    id: uuidv4(),
    date: new Date(),
    quantity: 0,
    pricePerShare: 0,
    fees: 0,
    notes: "",
  });

  // Find the Shares/Investments asset class
  const sharesAssetClass = assetClasses.find(
    (assetClass) => 
      assetClass.name.toLowerCase().includes("share") || 
      assetClass.name.toLowerCase().includes("investment") ||
      assetClass.name.toLowerCase().includes("stock")
  );

  const form = useForm<InsertShare>({
    resolver: zodResolver(insertShareSchema),
    defaultValues: {
      name: "",
      description: "",
      value: 0,
      assetClassId: sharesAssetClass?.id,
      assetHoldingTypeId: holdingTypes[0]?.id,
      ticker: "",
      exchange: "",
      sharesQuantity: 0,
      currentPrice: 0,
      purchaseDate: new Date(),
      dividendYield: 0,
      purchaseHistory: [],
      dividendHistory: [],
      investmentExpenses: {},
      ...defaultValues,
    },
  });

  // Calculate total value based on quantity and current price
  const watchQuantity = form.watch("sharesQuantity");
  const watchCurrentPrice = form.watch("currentPrice");
  
  // Update the total value whenever quantity or price changes
  const updateTotalValue = () => {
    const quantity = parseFloat(watchQuantity.toString()) || 0;
    const price = parseFloat(watchCurrentPrice.toString()) || 0;
    form.setValue("value", quantity * price);
  };

  // Update total value when either field changes
  form.watch(() => {
    updateTotalValue();
  });

  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (data: InsertShare) => {
      // Add purchase history to the data
      data.purchaseHistory = purchaseHistory;
      
      if (isEditing && assetId) {
        const res = await apiRequest("PATCH", `/api/assets/${assetId}`, data);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/assets", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: `Investment ${isEditing ? "updated" : "created"} successfully`,
        description: `Your ${form.getValues("name")} investment has been ${isEditing ? "updated" : "created"}.`,
      });
      setLocation("/asset-classes/" + sharesAssetClass?.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} investment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertShare) => {
    // Add purchase history and dividend history to the data
    data.purchaseHistory = purchaseHistory;
    data.dividendHistory = dividendHistory;
    mutation.mutate(data);
  };

  // Add a new purchase transaction
  const addTransaction = () => {
    if (!newTransaction.date || !newTransaction.quantity || !newTransaction.pricePerShare) {
      toast({
        title: "Incomplete data",
        description: "Please fill in all required transaction fields",
        variant: "destructive",
      });
      return;
    }
    
    setPurchaseHistory([...purchaseHistory, newTransaction as SharePurchaseTransaction]);
    setNewTransaction({
      id: uuidv4(),
      date: new Date(),
      quantity: 0,
      pricePerShare: 0,
      fees: 0,
      notes: "",
    });
  };

  // Remove a purchase transaction
  const removeTransaction = (id: string) => {
    setPurchaseHistory(purchaseHistory.filter(transaction => transaction.id !== id));
  };

  // Handle expenses
  const handleExpensesChange = (expenses: any) => {
    form.setValue("investmentExpenses", expenses);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Investment" : "Add Investment"}</CardTitle>
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
                    <FormLabel>Investment Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Apple Inc. Shares" {...field} />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., NASDAQ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sharesQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Number of shares"
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
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Price*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Current price per share"
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
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Value*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        readOnly
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormDescription>
                      Automatically calculated from quantity × price
                    </FormDescription>
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
                              format(new Date(field.value), "PPP")
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
                          selected={new Date(field.value)}
                          onSelect={(date) => field.onChange(date)}
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
                name="dividendYield"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dividend Yield (%)</FormLabel>
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
                      placeholder="Optional notes about this investment" 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tabbed Details Sections */}
            <div className="border rounded-md p-4">
              <Tabs defaultValue="purchases" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="purchases">Purchase History</TabsTrigger>
                  <TabsTrigger value="dividends">Dividend History</TabsTrigger>
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                </TabsList>
                
                <TabsContent value="purchases" className="pt-4">
                  <PurchaseHistory 
                    purchaseHistory={purchaseHistory}
                    onChange={setPurchaseHistory}
                    onQuantityChange={(totalQuantity) => {
                      // Optionally update the form's quantity field
                      form.setValue("sharesQuantity", totalQuantity);
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="dividends" className="pt-4">
                  <DividendHistory 
                    dividendHistory={dividendHistory}
                    onChange={setDividendHistory}
                    sharesQuantity={watchQuantity}
                    currentPrice={watchCurrentPrice}
                    onYieldChange={(annualYield) => {
                      form.setValue("dividendYield", annualYield);
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="expenses" className="pt-4">
                  <InvestmentExpenses 
                    value={form.getValues("investmentExpenses") || {}}
                    onChange={handleExpensesChange}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation(`/asset-classes/${sharesAssetClass?.id}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update Investment" : "Add Investment"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}