import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { insertPropertySchema, InsertProperty, AssetClass, AssetHoldingType, PropertyExpense } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Building, MapPin, Info, Home, DollarSign, PiggyBank } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PropertyExpenses } from "@/components/property/property-expenses";
import { logInfo, logError } from "@/lib/logger";
import { formSpacing } from "@/lib/form-utils";

interface PropertyFormProps {
  onSubmit: (data: InsertProperty) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<InsertProperty>;
  assetClassId?: number;
}

export function PropertyForm({
  onSubmit,
  isSubmitting = false,
  defaultValues,
  assetClassId,
}: PropertyFormProps) {
  const [isRental, setIsRental] = useState(defaultValues?.isRental || false);
  const [hasMortgage, setHasMortgage] = useState(defaultValues?.hasMortgage || false);

  // Fetch asset classes for dropdown
  const { data: assetClasses = [] } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });

  // Fetch asset holding types
  const { data: holdingTypes = [] } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
  });

  // Find real estate asset class if not provided
  const realEstateClass = assetClasses.find(c => c.name === "Real Estate");
  
  // Setup form with validation
  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      assetClassId: assetClassId || defaultValues?.assetClassId || realEstateClass?.id,
      assetHoldingTypeId: defaultValues?.assetHoldingTypeId || holdingTypes[0]?.id,
      value: defaultValues?.value || 0,
      purchaseDate: defaultValues?.purchaseDate instanceof Date ? defaultValues.purchaseDate : undefined,
      purchasePrice: defaultValues?.purchasePrice || 0,
      propertyType: defaultValues?.propertyType || "residential",
      address: defaultValues?.address || "",
      suburb: defaultValues?.suburb || "",
      state: defaultValues?.state || "",
      postcode: defaultValues?.postcode || "",
      country: defaultValues?.country || "Australia",
      bedrooms: defaultValues?.bedrooms || 0,
      bathrooms: defaultValues?.bathrooms || 0,
      landSize: defaultValues?.landSize,
      floorArea: defaultValues?.floorArea,
      parkingSpaces: defaultValues?.parkingSpaces || 0,
      isRental: defaultValues?.isRental || false,
      rentalIncome: defaultValues?.rentalIncome || 0,
      rentalFrequency: defaultValues?.rentalFrequency || "monthly",
      vacancyRate: defaultValues?.vacancyRate || 0,
      propertyExpenses: defaultValues?.propertyExpenses || {},
      
      // Mortgage fields
      hasMortgage: defaultValues?.hasMortgage || false,
      mortgageAmount: defaultValues?.mortgageAmount || 0,
      mortgageInterestRate: defaultValues?.mortgageInterestRate || 0,
      mortgageTerm: defaultValues?.mortgageTerm || 360, // Default 30 years (360 months)
      mortgageStartDate: defaultValues?.mortgageStartDate || undefined,
      mortgageLender: defaultValues?.mortgageLender || "",
      mortgageType: defaultValues?.mortgageType || "variable",
      mortgagePaymentFrequency: defaultValues?.mortgagePaymentFrequency || "monthly",
    },
  });

  // Watch for isRental and hasMortgage changes in the form
  const isRentalValue = form.watch("isRental");
  const hasMortgageValue = form.watch("hasMortgage");
  
  useEffect(() => {
    setIsRental(isRentalValue || false);
  }, [isRentalValue]);
  
  useEffect(() => {
    setHasMortgage(hasMortgageValue || false);
  }, [hasMortgageValue]);

  // Update form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        ...defaultValues,
        assetClassId: assetClassId || defaultValues.assetClassId || realEstateClass?.id,
        purchaseDate: defaultValues.purchaseDate instanceof Date 
          ? defaultValues.purchaseDate 
          : defaultValues.purchaseDate 
            ? new Date(defaultValues.purchaseDate) 
            : undefined,
      });
    }
  }, [defaultValues, form, assetClassId, realEstateClass?.id]);

  const handleSubmit = (data: InsertProperty) => {
    logInfo("Form submitted with data", { component: "PropertyForm" });
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={formSpacing.container}>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Home className="mr-2 h-5 w-5" />
              Basic Property Information
            </CardTitle>
            <CardDescription>
              Enter the essential details about your property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Main Residence, Holiday Home" />
                  </FormControl>
                  <FormDescription>
                    A recognizable name for your property
                  </FormDescription>
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
                    <Textarea
                      placeholder="Add additional details about the property"
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assetClassId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Class</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetClasses.map((assetClass) => (
                          <SelectItem
                            key={assetClass.id}
                            value={assetClass.id.toString()}
                          >
                            {assetClass.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assetHoldingTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holding Type</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
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
                      How the property is legally owned
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="rural">Rural</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                      date={field.value ? new Date(field.value) : null}
                      setDate={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value === null || field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimated current market value
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value === null || field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Property Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <MapPin className="mr-2 h-5 w-5" />
              Property Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., 123 Main St" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb/City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Building className="mr-2 h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value === null || field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value === null || field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parkingSpaces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parking Spaces</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value === null || field.value === undefined ? '' : field.value}
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
                name="landSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Land Size (sq m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value === null || field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="floorArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor Area (sq m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value === null || field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rental Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <DollarSign className="mr-2 h-5 w-5" />
              Rental Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="isRental"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Rental Property</FormLabel>
                    <FormDescription>
                      Is this property rented or generating income?
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

            {isRental && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rentalIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental Income ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            value={field.value === null || field.value === undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="rentalFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="vacancyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vacancy Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          value={field.value === null || field.value === undefined ? '' : field.value}
                        />
                      </FormControl>
                      <FormDescription>
                        Estimated percentage of time the property is vacant per year
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mortgage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <PiggyBank className="mr-2 h-5 w-5" />
              Mortgage Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="hasMortgage"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Property Mortgage</FormLabel>
                    <FormDescription>
                      Does this property have a mortgage?
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
            
            {hasMortgage && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mortgageAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mortgage Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            value={field.value === null || field.value === undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormDescription>
                          Current outstanding mortgage balance
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mortgageLender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mortgage Lender</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., ANZ, Commonwealth Bank" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mortgageInterestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            value={field.value === null || field.value === undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mortgageType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select interest rate type" />
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mortgageTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Term (months)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="1200"
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 360)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            value={field.value === null || field.value === undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormDescription>
                          Total term of the mortgage (e.g., 360 months = 30 years)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mortgageStartDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Mortgage Start Date</FormLabel>
                        <DatePicker
                          date={field.value ? new Date(field.value) : null}
                          setDate={field.onChange}
                        />
                        <FormDescription>
                          When did the mortgage begin?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="mortgagePaymentFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Frequency</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Expenses Section */}
        <FormField
          control={form.control}
          name="propertyExpenses"
          render={({ field }) => (
            <FormItem>
              <PropertyExpenses 
                value={field.value as Record<string, PropertyExpense> || {}}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
          {isSubmitting ? "Saving..." : "Save Property"}
        </Button>
      </form>
    </Form>
  );
}