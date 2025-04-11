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
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Plus, Edit2, ClipboardCopy, Check, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

// Form schema
const holdingTypeFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  countryId: z.coerce.number().int().positive("Country is required"),
  taxSettings: z.string().transform((val) => {
    try {
      return JSON.parse(val);
    } catch (e) {
      return {};
    }
  }),
});

// Edit form schema (allows partial updates)
const editHoldingTypeFormSchema = holdingTypeFormSchema.partial();

type HoldingTypeFormValues = z.infer<typeof holdingTypeFormSchema>;
type EditHoldingTypeFormValues = z.infer<typeof editHoldingTypeFormSchema>;

export default function AssetHoldingTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Pre-defined tax settings templates
  const taxTemplates = {
    personal: {
      incomeTaxBrackets: "standard",
      capitalGains: { 
        discountRate: 0.5, 
        discountEligibilityMonths: 12 
      },
      dividendImputation: true,
      expenseDeductionRate: 1.0
    },
    superannuation: {
      contributionTaxRate: 0.15,
      earningsTaxRate: 0.15,
      pensionPhaseTaxRate: 0,
      contributionCaps: {
        concessional: 27500,
        nonConcessional: 110000
      },
      expenseDeductionRate: 1.0
    },
    familyTrust: {
      distributionRules: {
        minDistribution: 0,
        maxBeneficiaries: null
      },
      corporateTaxRate: 0.30,
      streamingAllowed: true,
      expenseDeductionRate: 1.0
    }
  };

  // Get countries
  const { data: countries, isLoading: isLoadingCountries } = useQuery({
    queryKey: ["/api/countries"],
  });

  // Get asset holding types
  const { data: holdingTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["/api/asset-holding-types"],
  });

  // Form setup for adding new holding type
  const form = useForm<HoldingTypeFormValues>({
    resolver: zodResolver(holdingTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      countryId: 0,
      taxSettings: JSON.stringify({}, null, 2),
    },
  });

  // Form setup for editing existing holding type
  const editForm = useForm<EditHoldingTypeFormValues>({
    resolver: zodResolver(editHoldingTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      countryId: 0,
      taxSettings: JSON.stringify({}, null, 2),
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

  // Update holding type mutation
  const updateHoldingType = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: EditHoldingTypeFormValues }) => {
      const res = await apiRequest("PUT", `/api/asset-holding-types/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-holding-types"] });
      toast({
        title: "Holding type updated",
        description: "The asset holding type has been successfully updated.",
      });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update holding type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission for new holding type
  function onSubmit(values: HoldingTypeFormValues) {
    createHoldingType.mutate(values);
  }

  // Form submission for editing holding type
  function onEditSubmit(values: EditHoldingTypeFormValues) {
    if (!selectedType) return;
    updateHoldingType.mutate({ id: selectedType.id, data: values });
  }

  // Set up the edit form when a holding type is selected
  function handleEditType(type: any) {
    setSelectedType(type);
    editForm.reset({
      name: type.name,
      description: type.description || "",
      countryId: type.countryId,
      taxSettings: JSON.stringify(type.taxSettings || {}, null, 2),
    });
    setEditDialogOpen(true);
  }

  // Apply a tax template to the form
  function applyTaxTemplate(template: keyof typeof taxTemplates, formToUpdate: any) {
    if (taxTemplates[template]) {
      formToUpdate.setValue('taxSettings', JSON.stringify(taxTemplates[template], null, 2));
    }
  }

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-slate-200">
        <CardTitle className="text-md font-semibold text-slate-900">Asset Holding Types</CardTitle>
        <CardDescription>
          Configure the asset holding types available for users in each country.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        {isLoadingTypes ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-6 w-6 border-t-2 border-blue-500 rounded-full"></div>
          </div>
        ) : holdingTypes && holdingTypes.length > 0 ? (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdingTypes.map((type) => {
              const country = countries?.find(c => c.id === type.countryId);
              return (
                <Card 
                  key={type.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-md font-semibold">{type.name}</CardTitle>
                      <CardDescription className="mt-1">{type.description || "No description"}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEditType(type)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {country && (
                      <Badge variant="outline" className="mb-2 flex items-center gap-1 w-fit">
                        <Flag className="h-3 w-3" />
                        <span>{country.name}</span>
                      </Badge>
                    )}
                    <div className="text-xs text-slate-500 mt-2">
                      <div className="font-medium text-slate-700">Tax Settings:</div>
                      <div className="mt-1 max-h-20 overflow-y-auto">
                        <pre className="text-xs p-1 bg-slate-50 rounded">
                          {JSON.stringify(type.taxSettings || {}, null, 2).slice(0, 200)}
                          {JSON.stringify(type.taxSettings || {}, null, 2).length > 200 ? "..." : ""}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-md p-8 text-center mb-6">
            <h3 className="font-semibold text-slate-600 mb-2">No holding types defined</h3>
            <p className="text-sm text-slate-500 mb-4">
              You need to define asset holding types for users to categorize their assets.
            </p>
          </div>
        )}

        <div className="bg-slate-50 p-5 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Add New Holding Type</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Personal" {...field} />
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
                        disabled={isLoadingCountries}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingCountries ? "Loading..." : "Select country"} />
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
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this holding type and its purpose" 
                        {...field} 
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="taxSettings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Settings (JSON)</FormLabel>
                    <div className="flex gap-2 mb-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTaxTemplate('personal', form)}
                      >
                        Personal Template
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTaxTemplate('superannuation', form)}
                      >
                        Superannuation Template
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTaxTemplate('familyTrust', form)}
                      >
                        Family Trust Template
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="font-mono text-sm min-h-[200px]"
                        spellCheck="false"
                      />
                    </FormControl>
                    <FormDescription>
                      Configure tax settings as a JSON object. Use the templates above for common configurations.
                    </FormDescription>
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Holding Type</DialogTitle>
            <DialogDescription>
              Make changes to the asset holding type. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
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
              </div>
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="taxSettings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Settings (JSON)</FormLabel>
                    <div className="flex gap-2 mb-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTaxTemplate('personal', editForm)}
                      >
                        Personal Template
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTaxTemplate('superannuation', editForm)}
                      >
                        Superannuation Template
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTaxTemplate('familyTrust', editForm)}
                      >
                        Family Trust Template
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="font-mono text-sm min-h-[200px]"
                        spellCheck="false"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateHoldingType.isPending}
                >
                  {updateHoldingType.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
