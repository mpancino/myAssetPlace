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
import { SharePurchaseTransaction, InvestmentExpense } from "@shared/schema";
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
  const handleExpensesChange = (expenses: Record<string, InvestmentExpense>) => {
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

            {/* Purchase History Section */}
            <div className="space-y-4 border rounded-md p-4">
              <h3 className="font-semibold text-lg">Purchase History</h3>
              
              {purchaseHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-2 font-medium text-sm">
                    <div>Date</div>
                    <div>Quantity</div>
                    <div>Price</div>
                    <div>Fees</div>
                    <div>Total</div>
                    <div></div>
                  </div>
                  
                  {purchaseHistory.map((transaction) => (
                    <div key={transaction.id} className="grid grid-cols-6 gap-2 text-sm items-center">
                      <div>{format(new Date(transaction.date), "MMM d, yyyy")}</div>
                      <div>{transaction.quantity.toLocaleString()}</div>
                      <div>${transaction.pricePerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>${transaction.fees?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                      <div>${((transaction.quantity * transaction.pricePerShare) + (transaction.fees || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeTransaction(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transaction-date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="transaction-date"
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !newTransaction.date && "text-muted-foreground"
                        )}
                      >
                        {newTransaction.date ? (
                          format(new Date(newTransaction.date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTransaction.date ? new Date(newTransaction.date) : undefined}
                        onSelect={(date) => setNewTransaction({...newTransaction, date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="transaction-quantity">Quantity</Label>
                  <Input
                    id="transaction-quantity"
                    type="number"
                    step="0.001"
                    value={newTransaction.quantity || ''}
                    onChange={(e) => setNewTransaction({...newTransaction, quantity: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="transaction-price">Price per Share</Label>
                  <Input
                    id="transaction-price"
                    type="number"
                    step="0.01"
                    value={newTransaction.pricePerShare || ''}
                    onChange={(e) => setNewTransaction({...newTransaction, pricePerShare: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="transaction-fees">Fees</Label>
                  <Input
                    id="transaction-fees"
                    type="number"
                    step="0.01"
                    value={newTransaction.fees || ''}
                    onChange={(e) => setNewTransaction({...newTransaction, fees: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="transaction-notes">Notes</Label>
                  <Input
                    id="transaction-notes"
                    value={newTransaction.notes || ''}
                    onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Button
                    type="button"
                    onClick={addTransaction}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Transaction
                  </Button>
                </div>
              </div>
            </div>

            {/* Investment Expenses Section */}
            <div className="border rounded-md p-4">
              <h3 className="font-semibold text-lg mb-4">Investment Expenses</h3>
              <InvestmentExpenses 
                expenses={form.getValues("investmentExpenses") || {}}
                onChange={handleExpensesChange}
              />
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