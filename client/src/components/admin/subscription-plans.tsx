import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

// Form schema with validation
const planFormSchema = z.object({
  name: z.string().min(2, "Plan name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  currency: z.string().min(1, "Currency is required"),
  interval: z.string().min(1, "Interval is required"),
  maxAssetHoldingTypes: z.coerce.number().int().min(1, "Must allow at least 1 holding type"),
  maxAssetClasses: z.coerce.number().int().min(1, "Must allow at least 1 asset class"),
  maxAssetsPerClass: z.coerce.number().int().min(1, "Must allow at least 1 asset per class"),
  maxProjectionYears: z.coerce.number().int().min(1, "Must allow at least 1 year for projections"),
  allowedInterfaceModes: z.array(z.string()).min(1, "At least one interface mode must be allowed"),
  isDefault: z.boolean().default(false),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

export default function SubscriptionPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get subscription plans
  const { data: subscriptionPlans, isLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
  });

  // Form setup
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      currency: "USD",
      interval: "monthly",
      maxAssetHoldingTypes: 1,
      maxAssetClasses: 1,
      maxAssetsPerClass: 3,
      maxProjectionYears: 5,
      allowedInterfaceModes: ["basic"],
      isDefault: false,
    },
  });

  // Create subscription plan mutation
  const createPlan = useMutation({
    mutationFn: async (values: PlanFormValues) => {
      const res = await apiRequest("POST", "/api/subscription-plans", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Subscription plan created",
        description: "The subscription plan has been successfully added.",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create subscription plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission
  function onSubmit(values: PlanFormValues) {
    // Format the allowed interface modes as a JSON array
    createPlan.mutate(values);
  }

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-slate-200">
        <CardTitle className="text-md font-semibold text-slate-900">Subscription Plans</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {subscriptionPlans && subscriptionPlans.length > 0 && (
          <div className="mb-4">
            {subscriptionPlans.map((plan) => (
              <div 
                key={plan.id}
                className="flex items-center justify-between bg-slate-50 p-3 rounded-md mb-2"
              >
                <div>
                  <h4 className="font-medium text-slate-900">{plan.name}</h4>
                  <p className="text-xs text-slate-500">
                    {plan.description || 
                      `${plan.maxAssetsPerClass} assets, 
                      ${(plan.allowedInterfaceModes as string[]).includes("advanced") ? "Both Modes" : "Basic Mode only"}, 
                      ${plan.maxProjectionYears} year projections`}
                  </p>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-medium mb-4">Add Subscription Plan</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Free" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Basic access, limited assets" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="AUD">AUD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Interval</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxAssetHoldingTypes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Holding Types</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxAssetClasses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Asset Classes</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxAssetsPerClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Assets Per Class</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxProjectionYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Projection Years</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="allowedInterfaceModes"
                render={() => (
                  <FormItem>
                    <FormLabel>Allowed Interface Modes</FormLabel>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="allowedInterfaceModes"
                          render={({ field }) => {
                            return (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("basic")}
                                    onCheckedChange={(checked) => {
                                      const currentValue = [...field.value];
                                      if (checked) {
                                        if (!currentValue.includes("basic")) {
                                          field.onChange([...currentValue, "basic"]);
                                        }
                                      } else {
                                        field.onChange(currentValue.filter(value => value !== "basic"));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Basic Mode
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="allowedInterfaceModes"
                          render={({ field }) => {
                            return (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("advanced")}
                                    onCheckedChange={(checked) => {
                                      const currentValue = [...field.value];
                                      if (checked) {
                                        if (!currentValue.includes("advanced")) {
                                          field.onChange([...currentValue, "advanced"]);
                                        }
                                      } else {
                                        field.onChange(currentValue.filter(value => value !== "advanced"));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Advanced Mode
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Default Plan
                      </FormLabel>
                      <FormDescription>
                        This plan will be assigned to new users by default
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full"
                disabled={createPlan.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {createPlan.isPending ? "Adding..." : "Add Subscription Plan"}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
