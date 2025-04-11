import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

// Form schema
const holdingTypeFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  countryId: z.coerce.number().int().positive("Country is required"),
  taxSettings: z.any().optional(), // In a real app, this would be properly typed
});

type HoldingTypeFormValues = z.infer<typeof holdingTypeFormSchema>;

export default function AssetHoldingTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get countries
  const { data: countries } = useQuery({
    queryKey: ["/api/countries"],
  });

  // Get asset holding types
  const { data: holdingTypes } = useQuery({
    queryKey: ["/api/asset-holding-types"],
  });

  // Form setup
  const form = useForm<HoldingTypeFormValues>({
    resolver: zodResolver(holdingTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      countryId: 0,
      taxSettings: {},
    },
  });

  // Create holding type mutation
  const createHoldingType = useMutation({
    mutationFn: async (values: HoldingTypeFormValues) => {
      const res = await apiRequest("POST", "/api/asset-holding-types", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-holding-types"] });
      toast({
        title: "Holding type created",
        description: "The asset holding type has been successfully added.",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create holding type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission
  function onSubmit(values: HoldingTypeFormValues) {
    createHoldingType.mutate(values);
  }

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-slate-200">
        <CardTitle className="text-md font-semibold text-slate-900">Asset Holding Types</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {holdingTypes && holdingTypes.length > 0 && (
          <div className="mb-4">
            {holdingTypes.map((type) => (
              <div 
                key={type.id}
                className="flex items-center justify-between bg-slate-50 p-3 rounded-md mb-2"
              >
                <div>
                  <h4 className="font-medium text-slate-900">{type.name}</h4>
                  <p className="text-xs text-slate-500">{type.description || "No description"}</p>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-medium mb-4">Add Holding Type</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Personal" {...field} />
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
                      <Textarea placeholder="Standard personal holding" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries?.map((country) => (
                          <SelectItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full"
                disabled={createHoldingType.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {createHoldingType.isPending ? "Adding..." : "Add Holding Type"}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
