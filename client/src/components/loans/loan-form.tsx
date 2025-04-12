import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLoanSchema, InsertLoan, AssetClass, AssetHoldingType } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

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
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LoanFormProps {
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  defaultValues?: Partial<InsertLoan>;
  isEditing?: boolean;
  assetId?: number;
}

export function LoanForm({
  assetClasses,
  holdingTypes,
  defaultValues,
  isEditing = false,
  assetId,
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
        title: `Loan ${isEditing ? "updated" : "created"} successfully`,
        description: `Your ${form.getValues("name")} loan has been ${isEditing ? "updated" : "created"}.`,
      });
      navigate("/asset-classes/" + loansAssetClass?.id);
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
    // Ensure current value (balance) is negative for liabilities
    if (data.value > 0) {
      data.value = -Math.abs(data.value);
    }
    
    mutation.mutate(data);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Loan" : "Add Loan"}</CardTitle>
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
                    <FormLabel>Loan Name*</FormLabel>
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
                    <FormLabel>Loan Provider*</FormLabel>
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
                    <FormLabel>Original Loan Amount*</FormLabel>
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
                    <FormLabel>Loan Term (months)*</FormLabel>
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
                    <Input placeholder="Optional notes about this loan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/asset-classes/${loansAssetClass?.id}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update Loan" : "Add Loan"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}