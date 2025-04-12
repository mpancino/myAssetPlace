import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStockOptionSchema, InsertStockOption, AssetClass, AssetHoldingType } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import { VestingScheduleEntry } from "@shared/schema";

interface StockOptionFormProps {
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  defaultValues?: Partial<InsertStockOption>;
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
  const [vestingSchedule, setVestingSchedule] = useState<VestingScheduleEntry[]>(
    defaultValues?.vestingSchedule || []
  );
  const [newVesting, setNewVesting] = useState<Partial<VestingScheduleEntry>>({
    id: uuidv4(),
    date: new Date(),
    quantity: 0,
    isVested: false,
  });

  // Find the Stock Options asset class
  const optionsAssetClass = assetClasses.find(
    (assetClass) => 
      assetClass.name.toLowerCase().includes("option") || 
      assetClass.name.toLowerCase().includes("stock option")
  ) || assetClasses.find(
    (assetClass) => 
      assetClass.name.toLowerCase().includes("share") || 
      assetClass.name.toLowerCase().includes("investment") ||
      assetClass.name.toLowerCase().includes("stock")
  );

  const form = useForm<InsertStockOption>({
    resolver: zodResolver(insertStockOptionSchema),
    defaultValues: {
      name: "",
      description: "",
      value: 0,
      assetClassId: optionsAssetClass?.id,
      assetHoldingTypeId: holdingTypes[0]?.id,
      isStockOption: true,
      ticker: "",
      exchange: "",
      strikePrice: 0,
      optionQuantity: 0,
      grantDate: new Date(),
      expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)), // Default 10 years out
      currentPrice: 0,
      vestingSchedule: [],
      vestedQuantity: 0,
      ...defaultValues,
    },
  });

  // Calculate total value based on quantity, current price, and strike price
  const watchQuantity = form.watch("optionQuantity");
  const watchStrikePrice = form.watch("strikePrice");
  const watchCurrentPrice = form.watch("currentPrice");
  
  // Update the total value whenever quantity or prices change
  const updateTotalValue = () => {
    const quantity = parseInt(watchQuantity.toString()) || 0;
    const strikePrice = parseFloat(watchStrikePrice.toString()) || 0;
    const currentPrice = parseFloat(watchCurrentPrice.toString()) || 0;
    
    // Only calculate intrinsic value when current price > strike price
    const intrinsicValue = Math.max(0, currentPrice - strikePrice);
    form.setValue("value", quantity * intrinsicValue);
  };

  // Update total value when any fields change
  form.watch(() => {
    updateTotalValue();
  });

  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (data: InsertStockOption) => {
      // Add vesting schedule to the data
      data.vestingSchedule = vestingSchedule;
      // Calculate vested quantity
      data.vestedQuantity = vestingSchedule
        .filter(entry => entry.isVested)
        .reduce((sum, entry) => sum + entry.quantity, 0);
      
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
        title: `Stock options ${isEditing ? "updated" : "created"} successfully`,
        description: `Your ${form.getValues("name")} stock options have been ${isEditing ? "updated" : "created"}.`,
      });
      setLocation("/asset-classes/" + optionsAssetClass?.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} stock options: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertStockOption) => {
    mutation.mutate(data);
  };

  // Add a new vesting schedule entry
  const addVestingEntry = () => {
    if (!newVesting.date || !newVesting.quantity) {
      toast({
        title: "Incomplete data",
        description: "Please fill in all required vesting schedule fields",
        variant: "destructive",
      });
      return;
    }
    
    setVestingSchedule([...vestingSchedule, newVesting as VestingScheduleEntry]);
    setNewVesting({
      id: uuidv4(),
      date: new Date(),
      quantity: 0,
      isVested: false,
    });
  };

  // Remove a vesting schedule entry
  const removeVestingEntry = (id: string) => {
    setVestingSchedule(vestingSchedule.filter(entry => entry.id !== id));
  };

  // Toggle vested status of a vesting entry
  const toggleVestedStatus = (id: string) => {
    setVestingSchedule(vestingSchedule.map(entry => 
      entry.id === id 
        ? { ...entry, isVested: !entry.isVested } 
        : entry
    ));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Stock Options" : "Add Stock Options"}</CardTitle>
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
                    <FormLabel>Options Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Company XYZ Stock Options" {...field} />
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
                    <FormLabel>Underlying Stock Ticker*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., XYZ" {...field} />
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
                      <Input placeholder="e.g., NYSE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="optionQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Options*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="Total number of options"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
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
                        placeholder="Price to exercise options"
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
                    <FormLabel>Current Stock Price*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Current price of underlying stock"
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
                    <FormLabel>Intrinsic Value*</FormLabel>
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
                      Calculated from (current price - strike price) × quantity
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grantDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Grant Date*</FormLabel>
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
                name="expirationDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiration Date*</FormLabel>
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
                      placeholder="Optional notes about these stock options" 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vesting Schedule Section */}
            <div className="space-y-4 border rounded-md p-4">
              <h3 className="font-semibold text-lg">Vesting Schedule</h3>
              
              {vestingSchedule.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 font-medium text-sm">
                    <div>Vesting Date</div>
                    <div>Quantity</div>
                    <div>Status</div>
                    <div></div>
                  </div>
                  
                  {vestingSchedule.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-4 gap-2 text-sm items-center">
                      <div>{format(new Date(entry.date), "MMM d, yyyy")}</div>
                      <div>{entry.quantity.toLocaleString()}</div>
                      <div>
                        <Button
                          type="button"
                          variant={entry.isVested ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleVestedStatus(entry.id)}
                        >
                          {entry.isVested ? "Vested" : "Unvested"}
                        </Button>
                      </div>
                      <div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeVestingEntry(entry.id)}
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
                  <Label htmlFor="vesting-date">Vesting Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="vesting-date"
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !newVesting.date && "text-muted-foreground"
                        )}
                      >
                        {newVesting.date ? (
                          format(new Date(newVesting.date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newVesting.date ? new Date(newVesting.date) : undefined}
                        onSelect={(date) => setNewVesting({...newVesting, date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="vesting-quantity">Quantity</Label>
                  <Input
                    id="vesting-quantity"
                    type="number"
                    step="1"
                    value={newVesting.quantity || ''}
                    onChange={(e) => setNewVesting({...newVesting, quantity: parseInt(e.target.value, 10) || 0})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vesting-status"
                    checked={newVesting.isVested}
                    onCheckedChange={(checked) => 
                      setNewVesting({...newVesting, isVested: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="vesting-status"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Already vested
                  </label>
                </div>

                <div className="col-span-2">
                  <Button
                    type="button"
                    onClick={addVestingEntry}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Vesting Entry
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation(`/asset-classes/${optionsAssetClass?.id}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update Stock Options" : "Add Stock Options"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}