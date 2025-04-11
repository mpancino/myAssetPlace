import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SystemSettings, updateSystemSettingsSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Extended form schema with validations
const systemSettingsFormSchema = updateSystemSettingsSchema.extend({
  defaultCurrency: z.string().min(1, "Default currency is required"),
  defaultFinancialYearEnd: z.string().optional(),
  defaultBasicModeYears: z.coerce.number().int().positive("Must be a positive integer").optional(),
  defaultAdvancedModeYears: z.coerce.number().int().positive("Must be a positive integer").optional(),
  enablePropertyApi: z.boolean().optional(),
  enableStockApi: z.boolean().optional(),
  enableCryptoApi: z.boolean().optional(),
  termsAndConditionsUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  privacyPolicyUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  supportEmail: z.string().email("Must be a valid email").optional().or(z.literal('')),
  supportPhone: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
});

// Define the form values type
type SystemSettingsFormValues = z.infer<typeof systemSettingsFormSchema>;

export default function SystemSettingsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch system settings
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery<SystemSettings>({
    queryKey: ["/api/system-settings"],
  });

  // Form setup
  const form = useForm<SystemSettingsFormValues>({
    resolver: zodResolver(systemSettingsFormSchema),
    defaultValues: {
      defaultCurrency: "AUD",
      defaultFinancialYearEnd: "06-30",
      defaultBasicModeYears: 5,
      defaultAdvancedModeYears: 10,
      enablePropertyApi: false,
      enableStockApi: false,
      enableCryptoApi: false,
      termsAndConditionsUrl: "",
      privacyPolicyUrl: "",
      supportEmail: "",
      supportPhone: "",
      companyName: "",
      companyAddress: "",
    },
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (systemSettings) {
      form.reset({
        defaultCurrency: systemSettings.defaultCurrency,
        defaultFinancialYearEnd: systemSettings.defaultFinancialYearEnd || "06-30",
        defaultBasicModeYears: systemSettings.defaultBasicModeYears || 5,
        defaultAdvancedModeYears: systemSettings.defaultAdvancedModeYears || 10,
        enablePropertyApi: systemSettings.enablePropertyApi || false,
        enableStockApi: systemSettings.enableStockApi || false,
        enableCryptoApi: systemSettings.enableCryptoApi || false,
        termsAndConditionsUrl: systemSettings.termsAndConditionsUrl || "",
        privacyPolicyUrl: systemSettings.privacyPolicyUrl || "",
        supportEmail: systemSettings.supportEmail || "",
        supportPhone: systemSettings.supportPhone || "",
        companyName: systemSettings.companyName || "",
        companyAddress: systemSettings.companyAddress || "",
      });
    }
  }, [systemSettings, form]);

  // Mutation for updating system settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettingsFormValues) => {
      const response = await apiRequest("PUT", "/api/system-settings", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      toast({
        title: "Settings Updated",
        description: "System settings have been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating settings",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: SystemSettingsFormValues) => {
    updateSettingsMutation.mutate(values);
  };

  if (isLoadingSettings) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>
          Configure global system parameters and default values
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="integration">API Integrations</TabsTrigger>
                <TabsTrigger value="legal">Legal & Support</TabsTrigger>
              </TabsList>

              {/* General Settings Tab */}
              <TabsContent value="general" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="defaultCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Currency</FormLabel>
                        <FormControl>
                          <Input placeholder="AUD" {...field} />
                        </FormControl>
                        <FormDescription>
                          Three-letter ISO currency code
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultFinancialYearEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Financial Year End</FormLabel>
                        <FormControl>
                          <Input placeholder="06-30" {...field} />
                        </FormControl>
                        <FormDescription>
                          Format: MM-DD (e.g., 06-30 for June 30th)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="defaultBasicModeYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Basic Mode Projection Years</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of years for projections in Basic mode
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultAdvancedModeYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advanced Mode Projection Years</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of years for projections in Advanced mode
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company Name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Name displayed in legal and communication materials
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Address" {...field} />
                        </FormControl>
                        <FormDescription>
                          Physical address for legal documents
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* API Integrations Tab */}
              <TabsContent value="integration" className="space-y-6">
                <Alert className="mb-6">
                  <AlertTitle>API Integrations</AlertTitle>
                  <AlertDescription>
                    Enable/disable third-party API integrations. API keys will need to be provided separately.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enablePropertyApi"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Property Valuation API</FormLabel>
                          <FormDescription>
                            Enable integration with property data providers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableStockApi"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Stock Market API</FormLabel>
                          <FormDescription>
                            Enable integration with stock market data providers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableCryptoApi"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Cryptocurrency API</FormLabel>
                          <FormDescription>
                            Enable integration with cryptocurrency data providers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Legal & Support Tab */}
              <TabsContent value="legal" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="termsAndConditionsUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/terms" {...field} />
                        </FormControl>
                        <FormDescription>
                          Link to your Terms & Conditions page
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="privacyPolicyUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Privacy Policy URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/privacy" {...field} />
                        </FormControl>
                        <FormDescription>
                          Link to your Privacy Policy page
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="supportEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Email</FormLabel>
                        <FormControl>
                          <Input placeholder="support@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Email address for customer support
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supportPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormDescription>
                          Phone number for customer support
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <CardFooter className="flex justify-end px-0 pt-6">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}