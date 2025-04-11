import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Form schema
const countryFormSchema = z.object({
  name: z.string().min(2, "Country name is required"),
  code: z.string().min(2, "Country code is required"),
  currency: z.string().min(1, "Currency is required"),
  currencySymbol: z.string().min(1, "Currency symbol is required"),
  financialYearEndMonth: z.coerce.number().int().min(1).max(12),
  financialYearEndDay: z.coerce.number().int().min(1).max(31),
});

type CountryFormValues = z.infer<typeof countryFormSchema>;

export default function CountryConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get countries
  const { data: countries } = useQuery({
    queryKey: ["/api/countries"],
  });

  // Form setup
  const form = useForm<CountryFormValues>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: {
      name: "",
      code: "",
      currency: "",
      currencySymbol: "$",
      financialYearEndMonth: 6, // June
      financialYearEndDay: 30,
    },
  });

  // Create country mutation
  const createCountry = useMutation({
    mutationFn: async (values: CountryFormValues) => {
      const res = await apiRequest("POST", "/api/countries", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      toast({
        title: "Country created",
        description: "The country has been successfully added.",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create country",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission
  function onSubmit(values: CountryFormValues) {
    createCountry.mutate(values);
  }

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-slate-200">
        <CardTitle className="text-md font-semibold text-slate-900">Country Configuration</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="Australia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country Code</FormLabel>
                  <FormControl>
                    <Input placeholder="AU" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="AUD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currencySymbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="$" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="financialYearEndMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Financial Year End Month</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="financialYearEndDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Financial Year End Day</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={31} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button
              type="submit"
              disabled={createCountry.isPending}
            >
              {createCountry.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
        
        {countries && countries.length > 0 && (
          <div className="mt-8">
            <h3 className="font-medium mb-2">Existing Countries</h3>
            <div className="space-y-2">
              {countries.map((country) => (
                <div 
                  key={country.id}
                  className="flex items-center justify-between bg-slate-50 p-3 rounded-md"
                >
                  <div>
                    <p className="font-medium">{country.name} ({country.code})</p>
                    <p className="text-xs text-slate-500">
                      {country.currency} ({country.currencySymbol}) • Year end: {country.financialYearEndDay}/{country.financialYearEndMonth}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
