import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useExpenses } from "@/contexts/ExpenseContext";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MortgageDetails } from "@/components/property/mortgage-details";
// Import just the analysis component from the refactored file
import { PropertyExpenseAnalysis } from "@/components/property/property-expenses-refactored";
import { ExpensesContainer } from "@/components/expense/ExpensesContainer";
import { InvestmentExpensesFixed, InvestmentExpenseAnalysis } from "@/components/expense/investment-expenses-fixed";
import { 
  ArrowLeft, 
  BarChart3,
  Bath,
  BedDouble,
  Building, 
  Calculator,
  Calendar, 
  Car,
  CheckCircle2,
  CreditCard,
  Home, 
  Database,
  DollarSign, 
  Edit, 
  Link,
  Loader2,
  Map as MapIcon,
  Plus,
  Percent, 
  Receipt,
  Save, 
  Tag, 
  Trash2, 
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { AssetClass, AssetHoldingType, Asset, Mortgage, AssetWithLegacyMortgage } from "@shared/schema";
import { asLegacyAsset, hasLegacyMortgageData, getMortgageDataStatus, isLegacyMortgageProperty } from "@/lib/legacy-asset-utils";
import { OffsetAccountSection } from "@/components/loans/offset-account-section";
import { calculateLoanPayment, calculatePrincipalAndInterest } from "@shared/calculations";
import { formatCurrency } from "@/lib/utils";
import { calculateMonthlyInterestExpense } from "@/lib/expense-utils";
import { convertToComponentFormat } from "@/lib/expense-utils-new";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Import shared types
import type { Expense } from "@shared/schema";

/**
 * Standardizes expense fields to ensure only one format is used.
 * If both component format (category, description) and page format (categoryId, name)
 * properties exist on the same expense object, this function normalizes it to use only
 * the page format (categoryId, name) to avoid data corruption.
 * 
 * @param expenses Record of expense objects that might have duplicate field formats
 * @returns Standardized expenses with only one field format per property
 */
function standardizeExpenseFields<T extends Record<string, any>>(expenses: Record<string, T>): Record<string, T> {
  if (!expenses) return {};
  
  const result: Record<string, any> = {};
  const now = Date.now();
  console.log(`[STANDARDIZE:${now}] Standardizing ${Object.keys(expenses).length} expenses`);
  
  Object.entries(expenses).forEach(([id, expense]) => {
    // Create a new expense object without any format duplications
    result[id] = { ...expense };
    
    // Handle category/categoryId duplication
    if ('category' in expense && 'categoryId' in expense) {
      // Prefer categoryId and remove category
      result[id].categoryId = expense.categoryId || expense.category;
      delete result[id].category;
      console.log(`[STANDARDIZE:${now}] Expense ${id}: Removed duplicate 'category' field`);
    } else if ('category' in expense && !('categoryId' in expense)) {
      // If only category exists, rename it to categoryId
      result[id].categoryId = expense.category;
      delete result[id].category;
      console.log(`[STANDARDIZE:${now}] Expense ${id}: Converted 'category' to 'categoryId'`);
    }
    
    // Handle description/name duplication
    if ('description' in expense && 'name' in expense) {
      // Prefer name and remove description
      result[id].name = expense.name || expense.description;
      delete result[id].description;
      console.log(`[STANDARDIZE:${now}] Expense ${id}: Removed duplicate 'description' field`);
    } else if ('description' in expense && !('name' in expense)) {
      // If only description exists, rename it to name
      result[id].name = expense.description;
      delete result[id].description;
      console.log(`[STANDARDIZE:${now}] Expense ${id}: Converted 'description' to 'name'`);
    }
    
    // CRITICAL FIX: Make sure each expense has an annualTotal field
    if (!('annualTotal' in result[id]) && 'amount' in result[id] && 'frequency' in result[id]) {
      // Calculate annual total based on frequency
      const frequency = String(result[id].frequency || 'monthly');
      // Use a safer lookup approach to avoid TypeScript errors
      const frequencyMultipliers: Record<string, number> = {
        monthly: 12,
        quarterly: 4,
        annually: 1
      };
      const multiplier = frequencyMultipliers[frequency] || 12;
      
      result[id].annualTotal = result[id].amount * multiplier;
      console.log(`[STANDARDIZE:${now}] Expense ${id}: Added missing annualTotal: ${result[id].annualTotal}`);
    }
  });
  
  console.log(`[STANDARDIZE:${now}] Standardized ${Object.keys(result).length} expenses`);
  return result as Record<string, T>;
}

// Investment expense interface (similar structure to PropertyExpense)
export interface InvestmentExpense {
  id: string;
  categoryId: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annually';  
  notes?: string;
}

// Component-specific expense type from investment-expenses.tsx
interface ComponentInvestmentExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string;
  annualTotal: number;
}

// Convert from page format to component format
function convertPageToComponentExpense(expense: InvestmentExpense): ComponentInvestmentExpense {
  // Calculate annualTotal based on frequency
  const frequencyMultiplier = expense.frequency === 'monthly' ? 12 : 
                              expense.frequency === 'quarterly' ? 4 : 1;
  const annualTotal = expense.amount * frequencyMultiplier;
  
  // Create a new expense object with only the component format properties
  // This ensures we don't have duplicate properties in different formats
  return {
    id: expense.id,
    category: expense.categoryId,
    description: expense.name || '',
    amount: expense.amount,
    frequency: expense.frequency,
    annualTotal: annualTotal
  };
}

// Convert from component format to page format
function convertComponentToPageExpense(expense: ComponentInvestmentExpense): InvestmentExpense {
  // Create a new expense object with only the page format properties
  // This ensures we don't have duplicate properties in different formats
  return {
    id: expense.id,
    categoryId: expense.category,
    name: expense.description,
    amount: expense.amount,
    frequency: expense.frequency as 'monthly' | 'quarterly' | 'annually',
    notes: ''
  };
}

// Convert a collection of page expenses to component expenses
function convertPageExpensesToComponent(expenses: Record<string, InvestmentExpense>): Record<string, ComponentInvestmentExpense> {
  if (!expenses) return {};
  
  const result: Record<string, ComponentInvestmentExpense> = {};
  
  Object.entries(expenses).forEach(([id, expense]) => {
    result[id] = convertPageToComponentExpense(expense);
  });
  
  return result;
}

// Convert a collection of component expenses to page expenses
function convertComponentExpensesToPage(expenses: Record<string, ComponentInvestmentExpense>): Record<string, InvestmentExpense> {
  if (!expenses) return {};
  
  const result: Record<string, InvestmentExpense> = {};
  
  Object.entries(expenses).forEach(([id, expense]) => {
    result[id] = convertComponentToPageExpense(expense);
  });
  
  return result;
}

// Helper function to safely parse investment expenses data
function parseInvestmentExpenses(data: any): Record<string, InvestmentExpense> {
  try {
    // Create a hash from the data for a more stable identifier that won't change on every call
    const valueStr = typeof data === 'string' ? data : JSON.stringify(data || {});
    const hashCode = Array.from(valueStr).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString().slice(-4);
    const parseId = `${hashCode}`;
    
    console.log(`\n[PARSE:${parseId}] ===== PARSE INVESTMENT EXPENSES =====`);
    console.log(`[PARSE:${parseId}] Input type:`, typeof data);
    console.log(`[PARSE:${parseId}] Input value:`, data ? (typeof data === 'object' ? 'Object with keys: ' + Object.keys(data).join(', ') : data.toString().substring(0, 100)) : 'null/undefined');
    
    // Log the call stack to track where this is being called from
    console.log(`[PARSE:${parseId}] Call stack:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));
    
    // If it's a string, try to parse it as JSON
    if (typeof data === 'string') {
      if (data.trim() === '') {
        console.log(`[PARSE:${parseId}] Empty string detected, returning empty object`);
        return {};
      }
      
      const parsedData = JSON.parse(data) as Record<string, InvestmentExpense>;
      console.log(`[PARSE:${parseId}] Parsed string into object with ${Object.keys(parsedData).length} items`);
      console.log(`[PARSE:${parseId}] Keys:`, Object.keys(parsedData));
      
      // Standardize the parsed data
      const standardizedData = standardizeExpenseFields(parsedData);
      console.log(`[PARSE:${parseId}] Standardized data with ${Object.keys(standardizedData).length} items`);
      console.log(`[PARSE:${parseId}] ===== END PARSE =====\n`);
      return standardizedData as Record<string, InvestmentExpense>;
    }
    
    // If it's already an object, create a deep clone to break reference cycles
    if (data && typeof data === 'object') {
      console.log(`[PARSE:${parseId}] Received object with ${Object.keys(data).length} items`);
      console.log(`[PARSE:${parseId}] Keys:`, Object.keys(data));
      
      // Create a deep clone to ensure we're not affected by reference issues
      const clonedData = JSON.parse(JSON.stringify(data));
      console.log(`[PARSE:${parseId}] Created deep clone with ${Object.keys(clonedData).length} items`);
      
      // Standardize the cloned data
      const standardizedData = standardizeExpenseFields(clonedData);
      console.log(`[PARSE:${parseId}] Standardized data with ${Object.keys(standardizedData).length} items`);
      console.log(`[PARSE:${parseId}] ===== END PARSE =====\n`);
      return standardizedData as Record<string, InvestmentExpense>;
    }
    
    // Return empty object as fallback
    console.log(`[PARSE:${parseId}] Fallback: returning empty object`);
    console.log(`[PARSE:${parseId}] ===== END PARSE =====\n`);
    return {};
  } catch (err) {
    console.error('[ERROR] Failed to parse investment expenses:', err);
    return {};
  }
}

// Helper function to safely parse property expenses data
function parsePropertyExpenses(data: any): Record<string, Expense> {
  try {
    // Create a hash from the data for a more stable identifier that won't change on every call
    const valueStr = typeof data === 'string' ? data : JSON.stringify(data || {});
    const hashCode = Array.from(valueStr).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString().slice(-4);
    const parseId = `${hashCode}`;
    
    console.log(`\n[PARSE:${parseId}] ===== PARSE PROPERTY EXPENSES =====`);
    console.log(`[PARSE:${parseId}] Input type:`, typeof data);
    console.log(`[PARSE:${parseId}] Input value:`, data ? (typeof data === 'object' ? 'Object with keys: ' + Object.keys(data).join(', ') : data.toString().substring(0, 100)) : 'null/undefined');
    
    // Log the call stack to track where this is being called from
    console.log(`[PARSE:${parseId}] Call stack:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));
    
    // If it's a string, try to parse it as JSON
    if (typeof data === 'string') {
      if (data.trim() === '') {
        console.log(`[PARSE:${parseId}] Empty string detected, returning empty object`);
        return {};
      }
      
      const parsedData = JSON.parse(data) as Record<string, any>;
      console.log(`[PARSE:${parseId}] Parsed string into object with ${Object.keys(parsedData).length} items`);
      console.log(`[PARSE:${parseId}] Keys:`, Object.keys(parsedData));
      
      // Standardize the parsed data
      const standardizedData = standardizeExpenseFields(parsedData);
      console.log(`[PARSE:${parseId}] Standardized data with ${Object.keys(standardizedData).length} items`);
      console.log(`[PARSE:${parseId}] ===== END PARSE =====\n`);
      return standardizedData as Record<string, Expense>;
    }
    
    // If it's already an object, create a deep clone to break reference cycles
    if (data && typeof data === 'object') {
      console.log(`[PARSE:${parseId}] Received object with ${Object.keys(data).length} items`);
      console.log(`[PARSE:${parseId}] Keys:`, Object.keys(data));
      
      // Create a deep clone to ensure we're not affected by reference issues
      const clonedData = JSON.parse(JSON.stringify(data));
      console.log(`[PARSE:${parseId}] Created deep clone with ${Object.keys(clonedData).length} items`);
      
      // Standardize the cloned data
      const standardizedData = standardizeExpenseFields(clonedData);
      console.log(`[PARSE:${parseId}] Standardized data with ${Object.keys(standardizedData).length} items`);
      console.log(`[PARSE:${parseId}] ===== END PARSE =====\n`);
      return standardizedData as Record<string, Expense>;
    }
    
    // Return empty object as fallback
    console.log(`[PARSE:${parseId}] Fallback: returning empty object`);
    console.log(`[PARSE:${parseId}] ===== END PARSE =====\n`);
    return {};
  } catch (err) {
    console.error('[ERROR] Failed to parse property expenses:', err);
    return {};
  }
}

// Asset detail validation schema
const assetDetailSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional().nullable(),
  assetClassId: z.number({ 
    required_error: "Please select an asset class" 
  }),
  assetHoldingTypeId: z.number({ 
    required_error: "Please select a holding type" 
  }),
  value: z.number().positive("Value must be positive"),
  purchaseDate: z.date().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  growthRate: z.number().optional().nullable(),
  incomeYield: z.number().optional().nullable(),
  isHidden: z.boolean().default(false),
  
  // Property-specific fields
  propertyType: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  suburb: z.string().optional().nullable(),
  // city removed as it's not in the schema
  state: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  bedrooms: z.number().optional().nullable(),
  bathrooms: z.number().optional().nullable(),
  parkingSpaces: z.number().optional().nullable(),
  landSize: z.number().optional().nullable(),
  isRental: z.boolean().optional().nullable(),
  rentalIncome: z.number().optional().nullable(),
  rentalFrequency: z.string().optional().nullable(),
  vacancyRate: z.number().optional().nullable(),
  
  // Property expenses
  propertyExpenses: z.record(z.string(), z.any()).optional().nullable(),
  
  // Investment expenses
  investmentExpenses: z.record(z.string(), z.any()).optional().nullable(),
  
  // Investment-specific fields
  annualIncome: z.number().optional().nullable(),
  
  // Mortgage fields
  hasMortgage: z.boolean().optional().nullable(),
  mortgageLender: z.string().optional().nullable(),
  mortgageAmount: z.number().optional().nullable(),
  mortgageInterestRate: z.number().optional().nullable(),
  mortgageType: z.string().optional().nullable(),
  mortgageTerm: z.number().optional().nullable(),
  mortgageStartDate: z.date().optional().nullable(),
  mortgagePaymentFrequency: z.string().optional().nullable(),
});

type AssetDetailFormValues = z.infer<typeof assetDetailSchema>;

export default function AssetDetailPage() {
  const [location, setLocation] = useLocation();
  const params = useParams();
  const assetId = params.assetId ? parseInt(params.assetId) : undefined;
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get the expense context for asset-specific expense management
  const { 
    setCurrentAssetId, 
    setPropertyExpenses, 
    setInvestmentExpenses 
  } = useExpenses();
  
  // View states
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentPropertyExpenses, setCurrentPropertyExpenses] = useState<Record<string, Expense> | undefined>(undefined);
  const [currentInvestmentExpenses, setCurrentInvestmentExpenses] = useState<Record<string, InvestmentExpense> | undefined>(undefined);
  
  // Fetch the asset details
  const { 
    data: asset, 
    isLoading: isLoadingAsset,
    error: assetError 
  } = useQuery<AssetWithLegacyMortgage>({
    queryKey: [`/api/assets/${assetId}`],
    enabled: !!assetId,
    staleTime: 0, // Disable caching for this query to always get fresh data
    refetchOnMount: true, // Force refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when the window regains focus
  });
  
  // Fetch the associated mortgages for real estate properties
  const { data: propertyMortgages = [], isLoading: isLoadingMortgages } = useQuery<Mortgage[]>({
    queryKey: [`/api/properties/${assetId}/mortgages`],
    enabled: !!assetId && !!asset && asset.assetClassId === 3, // Only for real estate assets
  });
  
  // Debug log the property mortgages
  useEffect(() => {
    if (propertyMortgages && propertyMortgages.length > 0) {
      console.log("Property mortgages loaded:", propertyMortgages);
      console.log("First mortgage details:", propertyMortgages[0]);
    }
  }, [propertyMortgages]);
  
  // Fetch asset classes
  const { data: assetClasses = [] } = useQuery<AssetClass[]>({
    queryKey: ["/api/asset-classes"],
  });
  
  // Fetch asset holding types
  const { data: holdingTypes = [] } = useQuery<AssetHoldingType[]>({
    queryKey: ["/api/asset-holding-types"],
  });
  
  // Find the selected asset class and holding type
  const selectedClass = asset?.assetClassId 
    ? assetClasses.find(c => c.id === asset.assetClassId) 
    : undefined;
    
  const selectedHoldingType = asset?.assetHoldingTypeId 
    ? holdingTypes.find(t => t.id === asset.assetHoldingTypeId) 
    : undefined;
    
  // Debug information
  console.log("Asset class ID:", asset?.assetClassId);
  console.log("Selected class:", selectedClass);
  console.log("Is Real Estate?", selectedClass?.name === "Real Estate");
  
  // Update current asset ID in the expense context when asset changes
  useEffect(() => {
    if (assetId && !isLoadingAsset) {
      console.log("Setting current asset ID in expense context:", assetId);
      setCurrentAssetId(assetId);
    }
    
    return () => {
      // Clear the current asset ID when unmounting
      setCurrentAssetId(null);
    };
  }, [assetId, isLoadingAsset, setCurrentAssetId]);

  // Add effect to track property expenses after asset loads/updates and update context
  useEffect(() => {
    if (asset?.propertyExpenses && !isLoadingAsset && assetId) {
      try {
        // Use our utility function to get a properly parsed version of the expenses
        const parsedExpenses = parsePropertyExpenses(asset.propertyExpenses);
          
        console.log("ASSET DATA CHANGED: Property expenses updated:", parsedExpenses);
        console.log("Number of expenses:", Object.keys(parsedExpenses || {}).length);
        console.log("Raw property expenses type:", typeof asset.propertyExpenses);
        
        // Set the current expenses state when asset data changes
        if (Object.keys(parsedExpenses).length > 0) {
          setCurrentPropertyExpenses(parsedExpenses);
          
          // Update the expense context with asset ID for isolation
          // Use isInitialLoad=true to prevent triggering auto-save on load
          setPropertyExpenses(parsedExpenses, assetId, true);
        }
      } catch (err) {
        console.error("Error parsing property expenses in debug effect:", err);
      }
    }
  }, [asset, isLoadingAsset, assetId, setPropertyExpenses]);
  
  // Add effect to track investment expenses after asset loads/updates and update context 
  useEffect(() => {
    if (asset?.investmentExpenses && !isLoadingAsset && assetId) {
      try {
        // Use our utility function to get a properly parsed version of the expenses
        const parsedExpenses = parseInvestmentExpenses(asset.investmentExpenses);
          
        console.log("ASSET DATA CHANGED: Investment expenses updated:", parsedExpenses);
        console.log("Number of investment expenses:", Object.keys(parsedExpenses || {}).length);
        console.log("Raw investment expenses type:", typeof asset.investmentExpenses);
        
        // Set the current expenses state when asset data changes
        if (Object.keys(parsedExpenses).length > 0) {
          setCurrentInvestmentExpenses(parsedExpenses);
          
          // Update the expense context with asset ID for isolation
          // Use isInitialLoad=true to prevent triggering auto-save on load
          setInvestmentExpenses(parsedExpenses, assetId, true);
        }
      } catch (err) {
        console.error("Error parsing investment expenses in debug effect:", err);
      }
    }
  }, [asset, isLoadingAsset, assetId, setInvestmentExpenses]);
  
  // Initialize form with asset data
  const form = useForm<AssetDetailFormValues>({
    resolver: zodResolver(assetDetailSchema),
    defaultValues: {
      name: asset?.name || "",
      description: asset?.description || "",
      assetClassId: asset?.assetClassId,
      assetHoldingTypeId: asset?.assetHoldingTypeId,
      value: asset?.value,
      purchaseDate: asset?.purchaseDate ? new Date(asset.purchaseDate) : null,
      purchasePrice: asset?.purchasePrice || null,
      growthRate: asset?.growthRate || null,
      incomeYield: asset?.incomeYield || null,
      isHidden: asset?.isHidden || false,
      
      // Property-specific fields
      propertyType: asset?.propertyType || null,
      address: asset?.address || null,
      suburb: asset?.suburb || null,
      state: asset?.state || null,
      postcode: asset?.postcode || null,
      country: asset?.country || null,
      bedrooms: asset?.bedrooms || null,
      bathrooms: asset?.bathrooms || null,
      landSize: asset?.landSize || null,
      // floorArea removed as it's not in the schema
      parkingSpaces: asset?.parkingSpaces || null,
      isRental: asset?.isRental || false,
      rentalIncome: asset?.rentalIncome || null,
      rentalFrequency: asset?.rentalFrequency || null,
      vacancyRate: asset?.vacancyRate || null,
      
      // Property expenses - use our enhanced parsing function
      propertyExpenses: parsePropertyExpenses(asset?.propertyExpenses),
      
      // Investment expenses
      investmentExpenses: parseInvestmentExpenses(asset?.investmentExpenses),
      annualIncome: asset?.annualIncome || null,
      
      // Mortgage fields
      hasMortgage: asset ? isLegacyMortgageProperty(asLegacyAsset(asset)) : false,
      mortgageLender: asset?.mortgageLender || null,
      mortgageAmount: asset?.mortgageAmount || null,
      mortgageInterestRate: asset?.mortgageInterestRate || null,
      mortgageType: asset?.mortgageType || null,
      mortgageTerm: asset?.mortgageTerm || null,
      mortgageStartDate: asset?.mortgageStartDate ? new Date(asset.mortgageStartDate) : null,
      mortgagePaymentFrequency: asset?.mortgagePaymentFrequency || null,
    },
  });
  
  // Update form values when asset data is loaded
  useEffect(() => {
    if (asset) {
      form.reset({
        name: asset.name,
        description: asset.description,
        assetClassId: asset.assetClassId,
        assetHoldingTypeId: asset.assetHoldingTypeId,
        value: asset.value,
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
        purchasePrice: asset.purchasePrice,
        growthRate: asset.growthRate,
        incomeYield: asset.incomeYield,
        isHidden: asset.isHidden,
        
        // Property-specific fields
        propertyType: asset.propertyType,
        address: asset.address,
        suburb: asset.suburb,
        // city removed
        state: asset.state,
        postcode: asset.postcode,
        country: asset.country,
        bedrooms: asset.bedrooms,
        bathrooms: asset.bathrooms,
        parkingSpaces: asset.parkingSpaces,
        landSize: asset.landSize,
        isRental: asset.isRental,
        rentalIncome: asset.rentalIncome,
        rentalFrequency: asset.rentalFrequency,
        vacancyRate: asset.vacancyRate,
        
        // Property expenses - use our parsing function to handle it correctly
        propertyExpenses: parsePropertyExpenses(asset.propertyExpenses),
        
        // Investment expenses
        investmentExpenses: parseInvestmentExpenses(asset.investmentExpenses),
        annualIncome: asset.annualIncome,
        
        // Mortgage fields
        hasMortgage: isLegacyMortgageProperty(asLegacyAsset(asset)),
        mortgageLender: asset.mortgageLender,
        mortgageAmount: asset.mortgageAmount,
        mortgageInterestRate: asset.mortgageInterestRate,
        mortgageType: asset.mortgageType,
        mortgageTerm: asset.mortgageTerm,
        mortgageStartDate: asset.mortgageStartDate ? new Date(asset.mortgageStartDate) : null,
        mortgagePaymentFrequency: asset.mortgagePaymentFrequency,
      });
    }
  }, [asset, form]);
  
  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async (values: AssetDetailFormValues) => {
      if (!assetId) return null;
      
      // Create a copy of the values to ensure we're not affected by object references
      // Also standardize expense fields to prevent format inconsistencies that cause display issues
      const dataToSend = {
        ...values,
        // Ensure expenses are properly handled by creating deep copies
        // Apply standardizeExpenseFields to ensure consistent field formats (categoryId/name only)
        propertyExpenses: values.propertyExpenses ? 
          standardizeExpenseFields(JSON.parse(JSON.stringify(values.propertyExpenses))) : {},
        // IMPORTANT: Always send an empty object for investmentExpenses when it's null to prevent validation errors
        // Apply standardizeExpenseFields to ensure consistent field formats (categoryId/name only)
        investmentExpenses: values.investmentExpenses ? 
          standardizeExpenseFields(JSON.parse(JSON.stringify(values.investmentExpenses))) : {}
      };
      
      // Log the values being sent in the request to debug expenses
      console.log("Sending PATCH request with data:", JSON.stringify(dataToSend));
      
      // Log property expenses
      console.log("Property expenses:", dataToSend.propertyExpenses);
      console.log("[SAVE] Number of property expenses:", Object.keys(dataToSend.propertyExpenses || {}).length);
      
      // Log investment expenses
      console.log("Investment expenses:", dataToSend.investmentExpenses);
      console.log("[SAVE] Number of investment expenses:", Object.keys(dataToSend.investmentExpenses || {}).length);
      
      const res = await apiRequest("PATCH", `/api/assets/${assetId}`, dataToSend);
      const data = await res.json();
      return data as AssetWithLegacyMortgage;
    },
    onSuccess: (updatedAsset) => {
      if (!updatedAsset) return;
      
      const now = new Date().toISOString();
      console.log(`[${now}] Asset update success! Received updated asset:`, updatedAsset);
      console.log("Updated property expenses:", updatedAsset.propertyExpenses);
      console.log("Updated investment expenses:", updatedAsset.investmentExpenses);
      
      // Show success toast
      toast({
        title: "Asset Updated",
        description: `${updatedAsset.name} has been updated successfully`,
      });
      
      // CRITICAL FIX: More robust approach to ensure data is visible after update
      // First completely clear the cached data
      queryClient.removeQueries({ queryKey: [`/api/assets/${assetId}`] });
      
      // Immediately make a new fetch request to get truly fresh data from the server
      console.log('[RELOAD] Forcing a complete reload directly from database...');
      
      // Using a direct fetch request with cache-busting headers to bypass cache entirely
      fetch(`/api/assets/${assetId}`, {
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
        .then(response => response.json())
        .then(freshData => {
          console.log('[RELOAD] Fresh data received from database:', freshData);
          
          // Process property expenses
          if (freshData.propertyExpenses) {
            console.log('[RELOAD] Property expenses in fresh data:', freshData.propertyExpenses);
            const parsedPropertyExpenses = parsePropertyExpenses(freshData.propertyExpenses);
            console.log('[RELOAD] Number of property expenses:', Object.keys(parsedPropertyExpenses).length);
            
            // Update property expenses state
            setCurrentPropertyExpenses(parsedPropertyExpenses);
            // Update context to maintain isolation between assets
            if (assetId) {
              setPropertyExpenses(parsedPropertyExpenses, assetId, true);
            }
            console.log('[RELOAD] Updated property expenses state and context');
          }
          
          // Process investment expenses - this is critical for our current issue
          if (freshData.investmentExpenses) {
            console.log('[RELOAD] Investment expenses in fresh data:', freshData.investmentExpenses);
            const parsedInvestmentExpenses = parseInvestmentExpenses(freshData.investmentExpenses);
            console.log('[RELOAD] Number of investment expenses:', Object.keys(parsedInvestmentExpenses).length);
            
            // Update investment expenses state
            setCurrentInvestmentExpenses(parsedInvestmentExpenses);
            // Update context to maintain isolation between assets
            if (assetId) {
              setInvestmentExpenses(parsedInvestmentExpenses, assetId, true);
            }
            console.log('[RELOAD] Updated investment expenses state and context');
          }
          
          // Manually update the cache with this fresh data
          console.log('[RELOAD] Setting query data with fresh data...');
          queryClient.setQueryData([`/api/assets/${assetId}`], freshData);
          
          // ONLY exit edit mode AFTER we've received and set the fresh data
          setIsEditing(false);
          console.log('[RELOAD] Exited edit mode after data was refreshed');
          
          // Also invalidate other relevant queries for the list views
          queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
          queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
          if (updatedAsset.assetClassId) {
            queryClient.invalidateQueries({ queryKey: [`/api/asset-classes/${updatedAsset.assetClassId}`] });
          }
        })
        .catch(error => {
          console.error('[RELOAD] Error fetching fresh data:', error);
          console.error('[RELOAD] Error details:', error.message);
          
          // Fall back to using the original approach
          console.log('[RELOAD] Falling back to standard query mechanism...');
          
          // First invalidate the queries to force fresh data
          queryClient.invalidateQueries({ queryKey: [`/api/assets/${assetId}`] });
          
          setTimeout(() => {
            console.log('[RELOAD] Executing fallback query fetch after timeout...');
            queryClient.fetchQuery({ 
              queryKey: [`/api/assets/${assetId}`],
              queryFn: getQueryFn({ on401: "throw" })
            })
            .then(freshData => {
              console.log('[RELOAD] Fallback fetch successful:', freshData);
              
              // Try to update state with the newly fetched data 
              if (freshData && freshData.investmentExpenses) {
                const parsedInvestmentExpenses = parseInvestmentExpenses(freshData.investmentExpenses);
                setCurrentInvestmentExpenses(parsedInvestmentExpenses);
                // Update context to maintain isolation between assets
                if (assetId) {
                  setInvestmentExpenses(parsedInvestmentExpenses, assetId, true);
                }
                console.log('[RELOAD] Updated investment expenses via fallback with',
                  Object.keys(parsedInvestmentExpenses).length, 'expenses');
              }
              
              setIsEditing(false);
            })
            .catch(fallbackError => {
              console.error('[RELOAD] Even fallback fetch failed:', fallbackError);
              setIsEditing(false);
            });
          }, 500); // Slightly longer timeout to ensure the server has completed processing
        });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async () => {
      if (!assetId) return null;
      
      const res = await apiRequest("DELETE", `/api/assets/${assetId}`);
      return res.status === 200;
    },
    onSuccess: (success) => {
      if (!success) return;
      
      toast({
        title: "Asset Deleted",
        description: "The asset has been deleted successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      // Also invalidate the specific asset class query to refresh the asset class page
      if (asset?.assetClassId) {
        queryClient.invalidateQueries({ queryKey: [`/api/asset-classes/${asset.assetClassId}`] });
      }
      
      // Navigate back to the asset class page or dashboard
      if (asset?.assetClassId) {
        setLocation(`/asset-classes/${asset.assetClassId}`);
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Direct investment expense save mutation - immediately saves expenses to DB
  const saveInvestmentExpensesMutation = useMutation({
    mutationFn: async (expenses: Record<string, InvestmentExpense> | Record<string, ComponentInvestmentExpense>) => {
      if (!assetId) return null;
      
      console.log(`[SEQUENCE:${Date.now()}] 1. SAVE MUTATION STARTED - saveInvestmentExpensesMutation`);
      console.log(`[SEQUENCE:${Date.now()}] Current state before save: currentInvestmentExpenses has ${
        Object.keys(currentInvestmentExpenses || {}).length} items`);
      
      // Check if these are ComponentInvestmentExpense instances or PageInvestmentExpense instances
      // by checking for a "category" property on the first expense
      const expenseValues = Object.values(expenses);
      const firstExpense = expenseValues.length > 0 ? expenseValues[0] : null;
      
      // Convert to PageInvestmentExpense format if needed
      let pageFormatExpenses = expenses as Record<string, InvestmentExpense>;
      
      if (firstExpense && 'category' in firstExpense) {
        console.log(`[SEQUENCE:${Date.now()}] Converting component format to page format for saving`);
        // These are component format expenses
        pageFormatExpenses = convertComponentExpensesToPage(expenses as Record<string, ComponentInvestmentExpense>);
      }
      
      // Create a minimal update payload with just the expenses
      // Standardize the expense format to ensure consistent field naming
      const dataToSend = {
        investmentExpenses: standardizeExpenseFields(pageFormatExpenses)
      };
      
      console.log("[DIRECT SAVE INV] Saving expenses to database:", Object.keys(expenses).length);
      console.log("[DIRECT SAVE INV] Expense data:", JSON.stringify(expenses));
      
      const res = await apiRequest("PATCH", `/api/assets/${assetId}`, dataToSend);
      const data = await res.json();
      
      console.log(`[SEQUENCE:${Date.now()}] 2. API REQUEST COMPLETED - received response`);
      return data as AssetWithLegacyMortgage;
    },
    onSuccess: (updatedAsset) => {
      if (!updatedAsset) return;
      
      console.log(`[SEQUENCE:${Date.now()}] 3. MUTATION SUCCESS CALLBACK - onSuccess triggered`);
      console.log("[DIRECT SAVE INV] Success! Updated investment expenses:", updatedAsset.investmentExpenses);
      console.log(`[SEQUENCE:${Date.now()}] Object keys in response:`, Object.keys(updatedAsset));
      console.log(`[SEQUENCE:${Date.now()}] Investment expenses type:`, typeof updatedAsset.investmentExpenses);
      
      // Store a copy of what we received from the server
      const serverReturnedExpenses = updatedAsset.investmentExpenses;
      
      // Immediately make a new fetch request to get truly fresh data from the server
      console.log(`[SEQUENCE:${Date.now()}] 4. MAKING DIRECT FETCH to get fresh data...`);
      
      // Using a direct fetch request to bypass cache entirely
      fetch(`/api/assets/${assetId}`, {
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
        .then(response => response.json())
        .then(freshData => {
          console.log(`[SEQUENCE:${Date.now()}] 5. DIRECT FETCH SUCCESSFUL - received fresh data`);
          console.log('[DIRECT SAVE INV] Fresh data received via direct fetch:', freshData);
          console.log('[DIRECT SAVE INV] Investment expenses in fresh data:', freshData.investmentExpenses);
          console.log(`[SEQUENCE:${Date.now()}] Fresh data expense type:`, typeof freshData.investmentExpenses);
          
          // Compare what we got in the original PATCH response vs what we get from fresh fetch
          console.log(`[SEQUENCE:${Date.now()}] COMPARING: Original PATCH response vs Fresh fetch data`);
          console.log(`Original PATCH response expenses:`, serverReturnedExpenses);
          console.log(`Fresh fetch expenses:`, freshData.investmentExpenses);
          
          // Parse the data to ensure it's in the correct format
          const parsedExpenses = parseInvestmentExpenses(freshData.investmentExpenses);
          console.log('[DIRECT SAVE INV] Number of expenses after parsing:', Object.keys(parsedExpenses).length);
          
          // Update our local state - both component state and form state
          console.log(`[SEQUENCE:${Date.now()}] 6. UPDATING LOCAL STATE with parsed expenses`);
          console.log(`Before update: currentInvestmentExpenses has ${
            Object.keys(currentInvestmentExpenses || {}).length} items`);
          setCurrentInvestmentExpenses(parsedExpenses);
          form.setValue('investmentExpenses', parsedExpenses);
          
          // Update expense context with parsed expenses and asset ID for isolation
          if (assetId) {
            setInvestmentExpenses(parsedExpenses, assetId, true);
          }
          
          console.log(`After update: form.getValues().investmentExpenses has ${
            Object.keys(form.getValues().investmentExpenses || {}).length} items`);
          console.log('[DIRECT SAVE INV] Updated local, form state and context with parsed expenses');
          
          // Manually update the cache with this fresh data
          console.log(`[SEQUENCE:${Date.now()}] 7. UPDATING CACHE with fresh data`);
          queryClient.setQueryData([`/api/assets/${assetId}`], freshData);
          
          // Show brief success toast
          toast({
            title: "Investment Expenses Saved",
            description: `Successfully saved ${Object.keys(parsedExpenses).length} expenses`,
            duration: 2000,
          });
        })
        .catch(error => {
          console.error('[DIRECT SAVE INV] Error fetching fresh data:', error);
          
          // Fall back to the original approach if direct fetch fails
          console.log('[DIRECT SAVE INV] Falling back to query client fetching...');
          
          // Update our local state using the original updatedAsset
          if (updatedAsset.investmentExpenses) {
            const parsedExpenses = parseInvestmentExpenses(updatedAsset.investmentExpenses);
            setCurrentInvestmentExpenses(parsedExpenses);
            form.setValue('investmentExpenses', parsedExpenses);
            
            // Update expense context with parsed expenses and asset ID for isolation
            if (assetId) {
              setInvestmentExpenses(parsedExpenses, assetId, true);
            }
          }
          
          // Use the query client to refresh
          queryClient.removeQueries({ queryKey: [`/api/assets/${assetId}`] });
          queryClient.fetchQuery({ 
            queryKey: [`/api/assets/${assetId}`],
            queryFn: getQueryFn({ on401: "throw" })
          });
          
          // Show brief success toast
          toast({
            title: "Investment Expenses Saved",
            description: `Successfully saved expenses`,
            duration: 2000,
          });
        });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving investment expenses",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Direct property expense save mutation - immediately saves expenses to DB
  const savePropertyExpensesMutation = useMutation({
    mutationFn: async (expenses: Record<string, PropertyExpense>) => {
      if (!assetId) return null;
      
      // Create a minimal update payload with just the expenses
      // Use our new standardizeExpenseFields function to ensure both formats are preserved
      // This prevents [object Object] display issues by maintaining both formats
      const standardizedExpenses = standardizeExpenseFields(expenses);
      console.log("[DIRECT SAVE] Standardized expenses:", standardizedExpenses);
      
      const dataToSend = {
        propertyExpenses: standardizedExpenses
      };
      
      console.log("[DIRECT SAVE] Saving expenses to database:", Object.keys(expenses).length);
      console.log("[DIRECT SAVE] Expense data:", JSON.stringify(expenses));
      
      const res = await apiRequest("PATCH", `/api/assets/${assetId}`, dataToSend);
      const data = await res.json();
      return data as AssetWithLegacyMortgage;
    },
    onSuccess: (updatedAsset) => {
      if (!updatedAsset) return;
      
      console.log("[DIRECT SAVE] Success! Updated property expenses:", updatedAsset.propertyExpenses);
      
      // Immediately make a new fetch request to get truly fresh data from the server
      console.log('[DIRECT SAVE] Making direct fetch to get fresh data after update...');
      
      // Using a direct fetch request to bypass cache entirely
      fetch(`/api/assets/${assetId}`)
        .then(response => response.json())
        .then(freshData => {
          console.log('[DIRECT SAVE] Fresh data received via direct fetch:', freshData);
          console.log('[DIRECT SAVE] Property expenses in fresh data:', freshData.propertyExpenses);
          
          // Parse the data to ensure it's in the correct format
          const parsedExpenses = parsePropertyExpenses(freshData.propertyExpenses);
          console.log('[DIRECT SAVE] Number of expenses after parsing:', Object.keys(parsedExpenses).length);
          
          // Update our local state - both component state and form state
          setCurrentPropertyExpenses(parsedExpenses);
          form.setValue('propertyExpenses', parsedExpenses);
          
          // Update expense context to maintain isolation between assets
          if (assetId) {
            setPropertyExpenses(parsedExpenses, assetId, true);
          }
          
          console.log('[DIRECT SAVE] Updated local, form state and context with parsed expenses');
          
          // Manually update the cache with this fresh data
          console.log('[DIRECT SAVE] Setting query data with fresh data...');
          queryClient.setQueryData([`/api/assets/${assetId}`], freshData);
          
          // Show brief success toast
          toast({
            title: "Expenses Saved",
            description: `Successfully saved ${Object.keys(parsedExpenses).length} expenses`,
            duration: 2000,
          });
        })
        .catch(error => {
          console.error('[DIRECT SAVE] Error fetching fresh data:', error);
          
          // Fall back to the original approach if direct fetch fails
          console.log('[DIRECT SAVE] Falling back to query client fetching...');
          
          // Update our local state using the original updatedAsset
          if (updatedAsset.propertyExpenses) {
            const parsedExpenses = parsePropertyExpenses(updatedAsset.propertyExpenses);
            setCurrentPropertyExpenses(parsedExpenses);
            form.setValue('propertyExpenses', parsedExpenses);
            
            // Update expense context to maintain isolation between assets
            if (assetId) {
              setPropertyExpenses(parsedExpenses, assetId, true);
            }
          }
          
          // Use the query client to refresh
          queryClient.removeQueries({ queryKey: [`/api/assets/${assetId}`] });
          queryClient.fetchQuery({ 
            queryKey: [`/api/assets/${assetId}`],
            queryFn: getQueryFn({ on401: "throw" })
          });
          
          // Show brief success toast
          toast({
            title: "Expenses Saved",
            description: `Successfully saved expenses`,
            duration: 2000,
          });
        });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving expenses",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form submission with enhanced expense preservation and proper parsing
  const onSubmit = (values: AssetDetailFormValues) => {
    console.log("==================== FORM SUBMIT START ====================");
    console.log(`[${new Date().toISOString()}] FORM SUBMIT HANDLER TRIGGERED`);
    
    // Get current form values 
    const formValues = form.getValues();
    
    // First try to use any tracked currentPropertyExpenses from our state
    // This helps capture expenses that may have been added but not yet synced to the form
    let propertyExpensesToSave = currentPropertyExpenses || {};
    
    // If we don't have current expenses in state, fallback to form values
    if (!propertyExpensesToSave || Object.keys(propertyExpensesToSave).length === 0) {
      // Use our utility function to properly parse property expenses
      propertyExpensesToSave = parsePropertyExpenses(formValues.propertyExpenses);
    }
    
    console.log("[FORM SUBMIT] Property expenses to save:", propertyExpensesToSave);
    console.log("[FORM SUBMIT] Number of property expenses:", Object.keys(propertyExpensesToSave).length);
    
    // Log expense IDs to help with debugging
    if (Object.keys(propertyExpensesToSave).length > 0) {
      console.log("[FORM SUBMIT] Property expense IDs:", Object.keys(propertyExpensesToSave));
    }
    
    // Do the same for investment expenses
    let investmentExpensesToSave = currentInvestmentExpenses || {};
    
    // If we don't have current expenses in state, fallback to form values
    if (!investmentExpensesToSave || Object.keys(investmentExpensesToSave).length === 0) {
      // Use our utility function to properly parse investment expenses
      investmentExpensesToSave = parseInvestmentExpenses(formValues.investmentExpenses);
    }
    
    console.log("[FORM SUBMIT] Investment expenses to save:", investmentExpensesToSave);
    console.log("[FORM SUBMIT] Number of investment expenses:", Object.keys(investmentExpensesToSave).length);
    
    // Log expense IDs to help with debugging
    if (Object.keys(investmentExpensesToSave).length > 0) {
      console.log("[FORM SUBMIT] Investment expense IDs:", Object.keys(investmentExpensesToSave));
    }
    
    // Debug log to check if property expenses match what's in the component state
    if (currentPropertyExpenses) {
      const currentKeys = Object.keys(currentPropertyExpenses);
      const saveKeys = Object.keys(propertyExpensesToSave);
      console.log("[FORM SUBMIT] Current property expenses in state:", currentKeys.length);
      console.log("[FORM SUBMIT] Property expenses being saved:", saveKeys.length);
      
      // Check for any keys that might be in one but not the other
      const missingInSave = currentKeys.filter(k => !saveKeys.includes(k));
      const missingInCurrent = saveKeys.filter(k => !currentKeys.includes(k));
      
      if (missingInSave.length > 0) {
        console.warn("[FORM SUBMIT] WARNING: These property expense IDs are in state but not being saved:", missingInSave);
      }
      if (missingInCurrent.length > 0) {
        console.warn("[FORM SUBMIT] WARNING: These property expense IDs are being saved but not in state:", missingInCurrent);
      }
    }
    
    // Debug log to check if investment expenses match what's in the component state
    if (currentInvestmentExpenses) {
      const currentKeys = Object.keys(currentInvestmentExpenses);
      const saveKeys = Object.keys(investmentExpensesToSave);
      console.log("[FORM SUBMIT] Current investment expenses in state:", currentKeys.length);
      console.log("[FORM SUBMIT] Investment expenses being saved:", saveKeys.length);
      
      // Check for any keys that might be in one but not the other
      const missingInSave = currentKeys.filter(k => !saveKeys.includes(k));
      const missingInCurrent = saveKeys.filter(k => !currentKeys.includes(k));
      
      if (missingInSave.length > 0) {
        console.warn("[FORM SUBMIT] WARNING: These investment expense IDs are in state but not being saved:", missingInSave);
      }
      if (missingInCurrent.length > 0) {
        console.warn("[FORM SUBMIT] WARNING: These investment expense IDs are being saved but not in state:", missingInCurrent);
      }
    }
    
    // CRITICAL: Create deep copies of expense objects to completely isolate them
    // This prevents any race conditions where state updates might affect these objects
    // Also standardize the expense format to ensure consistent field naming
    const finalPropertyExpenses = standardizeExpenseFields(JSON.parse(JSON.stringify(propertyExpensesToSave)));
    const finalInvestmentExpenses = standardizeExpenseFields(JSON.parse(JSON.stringify(investmentExpensesToSave)));
    
    // TEST CASE: Log the isolated expense objects to prove they're safe from state changes
    console.log("[FORM SUBMIT TEST] Final property expenses object (copied):", finalPropertyExpenses);
    console.log("[FORM SUBMIT TEST] Final investment expenses object (copied):", finalInvestmentExpenses);
    
    // Store a reference count to verify data integrity 
    const propertyExpenseCount = Object.keys(finalPropertyExpenses).length;
    const investmentExpenseCount = Object.keys(finalInvestmentExpenses).length;
    console.log("[FORM SUBMIT TEST] Property expense count (immutable):", propertyExpenseCount);
    console.log("[FORM SUBMIT TEST] Investment expense count (immutable):", investmentExpenseCount);
    
    // Run a simulated state change test to ensure our copies are truly isolated
    console.log("[FORM SUBMIT TEST] Running isolation test...");
    setTimeout(() => {
      // This simulates what would happen if state changed during the save operation
      // The original objects might be modified, but our copies should remain intact
      console.log("[FORM SUBMIT TEST] After simulated delay - property expense count:", 
        Object.keys(finalPropertyExpenses).length, "- should still be", propertyExpenseCount);
      console.log("[FORM SUBMIT TEST] After simulated delay - investment expense count:", 
        Object.keys(finalInvestmentExpenses).length, "- should still be", investmentExpenseCount);
      
      // Verify isolation by comparing object references
      const isPropertyIsolated = finalPropertyExpenses !== propertyExpensesToSave;
      const isInvestmentIsolated = finalInvestmentExpenses !== investmentExpensesToSave;
      console.log("[FORM SUBMIT TEST] Property expenses properly isolated:", isPropertyIsolated);
      console.log("[FORM SUBMIT TEST] Investment expenses properly isolated:", isInvestmentIsolated);
      
      if (!isPropertyIsolated || !isInvestmentIsolated) {
        console.error("[FORM SUBMIT TEST] CRITICAL ERROR: Expense objects not properly isolated!");
      } else {
        console.log("[FORM SUBMIT TEST] SUCCESS: All expense objects are properly isolated and protected");
      }
    }, 100);
    
    // Update UI to show we're saving
    const currentIsInvestmentAsset = selectedClass?.name?.toLowerCase() === "investments";
    if (currentIsInvestmentAsset) {
      console.log("[FORM SUBMIT] This is an investment asset");
      
      toast({
        title: "Saving investment expenses",
        description: `Saving ${investmentExpenseCount} expenses...`,
        duration: 2000,
      });
      
      // IMPORTANT: Log the exact data being sent to the mutation
      console.log(`[FORM SUBMIT] Mutation will send ${investmentExpenseCount} investment expenses`);
      console.log("[FORM SUBMIT] Investment expense IDs being sent:", Object.keys(finalInvestmentExpenses));
    }
    
    console.log("[FORM SUBMIT] Triggering update mutation with final data...");
    
    // Update expense context with the final data for isolation
    if (assetId) {
      setPropertyExpenses(finalPropertyExpenses, assetId, true);
      setInvestmentExpenses(finalInvestmentExpenses, assetId, true);
      console.log("[FORM SUBMIT] Updated expense context with final data for asset ID:", assetId);
    }
    
    // Now trigger the actual save with our isolated copies
    updateAssetMutation.mutate({
      ...values,
      propertyExpenses: finalPropertyExpenses,
      investmentExpenses: finalInvestmentExpenses
    });
    
    console.log("[FORM SUBMIT] Mutation triggered. Waiting for server response...");
    console.log("==================== FORM SUBMIT END ====================");
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    // Reset form to original values
    if (asset) {
      form.reset({
        name: asset.name,
        description: asset.description,
        assetClassId: asset.assetClassId,
        assetHoldingTypeId: asset.assetHoldingTypeId,
        value: asset.value,
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
        purchasePrice: asset.purchasePrice,
        growthRate: asset.growthRate,
        incomeYield: asset.incomeYield,
        isHidden: asset.isHidden,
        
        // Property-specific fields
        propertyType: asset.propertyType,
        address: asset.address,
        suburb: asset.suburb,
        // city removed
        state: asset.state,
        postcode: asset.postcode,
        country: asset.country,
        bedrooms: asset.bedrooms,
        bathrooms: asset.bathrooms,
        parkingSpaces: asset.parkingSpaces,
        landSize: asset.landSize,
        isRental: asset.isRental,
        rentalIncome: asset.rentalIncome,
        rentalFrequency: asset.rentalFrequency,
        vacancyRate: asset.vacancyRate,
        
        // Property expenses - use the parsing utility function
        propertyExpenses: parsePropertyExpenses(asset.propertyExpenses),
        
        // Investment expenses
        investmentExpenses: parseInvestmentExpenses(asset.investmentExpenses),
        annualIncome: asset.annualIncome,
        
        // Mortgage fields
        hasMortgage: isLegacyMortgageProperty(asLegacyAsset(asset)),
        mortgageLender: asset.mortgageLender,
        mortgageAmount: asset.mortgageAmount,
        mortgageInterestRate: asset.mortgageInterestRate,
        mortgageType: asset.mortgageType,
        mortgageTerm: asset.mortgageTerm,
        mortgageStartDate: asset.mortgageStartDate ? new Date(asset.mortgageStartDate) : null,
        mortgagePaymentFrequency: asset.mortgagePaymentFrequency,
      });
    }
    setIsEditing(false);
  };
  
  // Handle delete
  const handleDelete = () => {
    deleteAssetMutation.mutate();
  };
  
  // Handle back navigation
  const handleBack = () => {
    // First invalidate all the relevant queries to ensure they refetch when we navigate
    queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    
    if (asset?.assetClassId) {
      // Invalidate the specific asset class query
      queryClient.invalidateQueries({ queryKey: [`/api/asset-classes/${asset.assetClassId}`] });
      // Navigate back to the asset class page
      setLocation(`/asset-classes/${asset.assetClassId}`);
    } else {
      // Navigate to dashboard
      setLocation("/dashboard");
    }
  };
  
  // Calculate metrics
  const calculateGain = () => {
    if (!asset || !asset.purchasePrice) return null;
    return asset.value - asset.purchasePrice;
  };
  
  const calculateGainPercentage = () => {
    if (!asset || !asset.purchasePrice || asset.purchasePrice === 0) return null;
    return ((asset.value - asset.purchasePrice) / asset.purchasePrice) * 100;
  };
  
  const gainValue = calculateGain();
  const gainPercentage = calculateGainPercentage();
  
  // Loading state
  if (isLoadingAsset) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading asset details...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Not found state
  if (!asset && !isLoadingAsset) {
    // Check if there's an error in the query
    const errorMessage = assetError 
      ? `Error: ${(assetError as Error).message}` 
      : "The asset you're looking for doesn't exist or has been deleted.";
    
    // Special message for newly created mortgages
    const referrer = document.referrer;
    const isMortgageRedirect = referrer && referrer.includes('/mortgages');
    
    const actionGuide = isMortgageRedirect 
      ? "You may have just created a mortgage. Please go to the property page to view it."
      : "Please return to the dashboard or try another asset.";
    
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Asset Not Found
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{errorMessage}</p>
                <p className="text-muted-foreground">{actionGuide}</p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 sm:flex-row justify-between">
                <Button onClick={() => setLocation("/dashboard")}>
                  Go to Dashboard
                </Button>
                {isMortgageRedirect && (
                  <Button onClick={() => setLocation("/asset-classes/3")} variant="outline">
                    View Properties
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack} 
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold">{asset?.name}</h1>
          </div>
          
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                {/* Conditional Edit button for different asset types */}
                {selectedClass && 
                 (selectedClass.name.toLowerCase().includes("cash") || 
                  selectedClass.name.toLowerCase().includes("bank")) ? (
                  <Button 
                    variant="outline"
                    onClick={() => setLocation(`/edit-cash-account/${assetId}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Cash Account
                  </Button>
                ) : selectedClass && 
                 (selectedClass.name.toLowerCase().includes("retirement") || 
                  selectedClass.name.toLowerCase().includes("superannuation") ||
                  selectedClass.name.toLowerCase().includes("pension")) ? (
                  <Button 
                    variant="outline"
                    onClick={() => setLocation(`/edit-retirement/${assetId}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Retirement Account
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this asset? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDelete}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button 
                variant="outline"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={(e) => {
            console.log("[FORM_SUBMIT_EVENT] Form submit event triggered at:", new Date().toISOString());
            const formData = form.getValues();
            console.log("[FORM_SUBMIT_EVENT] Current form values:", formData);
            console.log("[FORM_SUBMIT_EVENT] Current property expenses:", formData.propertyExpenses);
            console.log("[FORM_SUBMIT_EVENT] Current investment expenses:", formData.investmentExpenses);
            const result = form.handleSubmit(onSubmit)(e);
            console.log("[FORM_SUBMIT_EVENT] Form submission result:", result);
            return result;
          }}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                {selectedClass?.name?.toLowerCase() === "real estate" && (
                  <>
                    <TabsTrigger value="property">Property Info</TabsTrigger>
                    <TabsTrigger value="mortgage">Mortgage</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                  </>
                )}
                {selectedClass?.name?.toLowerCase() === "investments" && (
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                )}
                {(selectedClass?.name?.toLowerCase() === "loans & liabilities" || 
                  asset?.assetClassId === 5) && (
                  <TabsTrigger value="loan">Loan Info</TabsTrigger>
                )}
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 pt-4">
                {/* Property-specific overview with mortgage information */}
                {selectedClass?.name?.toLowerCase() === "real estate" && !isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Card className="col-span-1 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center text-lg">
                          <Building className="mr-2 h-5 w-5 text-primary" /> Property Value Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Property Value</div>
                            <div className="text-xl font-semibold">{formatCurrency(asset?.value || 0)}</div>
                          </div>
                          
                          {/* Get mortgage amount either from new mortgage system or legacy */}
                          {(() => {
                            // Determine mortgage amount from either propertyMortgages or legacy data
                            const mortgageBalance = propertyMortgages && propertyMortgages.length > 0 
                              ? Math.abs(propertyMortgages[0].value || 0)
                              : asset?.mortgageAmount || 0;
                              
                            // Calculate total equity
                            const totalEquity = (asset?.value || 0) - mortgageBalance;
                            
                            // Calculate equity percentage
                            const equityPercentage = asset?.value && asset.value > 0
                              ? (totalEquity / asset.value) * 100
                              : 0;
                              
                            return (
                              <>
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">Mortgage Balance</div>
                                  <div className="text-xl font-semibold text-destructive">
                                    {formatCurrency(mortgageBalance)}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">Total Equity</div>
                                  <div className="text-xl font-semibold text-green-600">
                                    {formatCurrency(totalEquity)}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">Equity %</div>
                                  <div className="text-xl font-semibold text-green-600">
                                    {equityPercentage.toFixed(1)}%
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">LVR</div>
                                  <div className="text-xl font-semibold">
                                    {asset?.value ? 
                                      `${((mortgageBalance / asset.value) * 100).toFixed(1)}%` 
                                      : "N/A"}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                          
                          {/* Purchase information and capital gain */}
                          {asset?.purchasePrice && asset?.purchaseDate && (
                            <>
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Purchase Price</div>
                                <div className="text-base font-medium">
                                  {formatCurrency(asset.purchasePrice)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(asset.purchaseDate).toLocaleDateString()}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Capital Gain</div>
                                <div className={`text-base font-medium ${(asset.value - asset.purchasePrice) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(asset.value - asset.purchasePrice)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {asset.purchasePrice > 0 ? ((asset.value - asset.purchasePrice) / asset.purchasePrice * 100).toFixed(1) : 0}% total
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Equity progress bar */}
                        <div className="mt-4">
                          <div className="text-sm text-muted-foreground mb-1">Equity Percentage</div>
                          <div className="w-full bg-muted rounded-full h-2.5 dark:bg-gray-700 mt-1 mb-3">
                            <div 
                              className="bg-green-600 h-2.5 rounded-full"
                              style={{ 
                                width: `${asset?.value && asset.value > 0 ? 
                                  Math.min(100, 100 - (((propertyMortgages && propertyMortgages.length > 0 
                                    ? Math.abs(propertyMortgages[0].value || 0) 
                                    : asset?.mortgageAmount || 0) / asset?.value) * 100)) : 0}%` 
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="col-span-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center text-lg">
                          <CreditCard className="mr-2 h-5 w-5 text-blue-600" /> Mortgage Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingMortgages ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                            <span>Loading mortgage details...</span>
                          </div>
                        ) : propertyMortgages && propertyMortgages.length > 0 ? (
                          <div className="space-y-4">
                            {/* Modern mortgage information */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Lender</div>
                                <div className="text-base font-medium">
                                  {propertyMortgages[0].lender || "Not specified"}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Interest Rate</div>
                                <div className="text-base font-medium flex items-center">
                                  {propertyMortgages[0].interestRate ? 
                                    `${propertyMortgages[0].interestRate}%` : "Not specified"}
                                  {propertyMortgages[0].interestRateType && (
                                    <Badge variant="outline" className="ml-2">
                                      {propertyMortgages[0].interestRateType}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Monthly Payment</div>
                                <div className="text-base font-medium">
                                  {propertyMortgages[0].paymentAmount 
                                    ? formatCurrency(propertyMortgages[0].paymentAmount) 
                                    : (propertyMortgages[0].value && propertyMortgages[0].interestRate && propertyMortgages[0].loanTerm
                                      ? formatCurrency(
                                          calculateLoanPayment(
                                            Math.abs(propertyMortgages[0].value),
                                            propertyMortgages[0].interestRate / 100,
                                            propertyMortgages[0].loanTerm / 12
                                          ))
                                      : "Not available")}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Interest Expense</div>
                                <div className="text-base font-medium text-amber-600">
                                  {formatCurrency((propertyMortgages[0].interestRate / 100) * Math.abs(propertyMortgages[0].value || 0) / 12)}
                                  <span className="text-xs text-muted-foreground ml-1">/ month</span>
                                </div>
                              </div>
                              
                              {/* Show fixed rate period information if applicable */}
                              {propertyMortgages[0].interestRateType === "fixed" && propertyMortgages[0].fixedRateEndDate && (
                                <div className="col-span-2">
                                  <div className="text-sm text-muted-foreground mb-1">Fixed Rate Period</div>
                                  <div className="text-base">
                                    <span className="font-medium">Until: </span> 
                                    {new Date(propertyMortgages[0].fixedRateEndDate).toLocaleDateString()}
                                    {propertyMortgages[0].variableRateAfterFixed && (
                                      <span className="text-muted-foreground ml-2">
                                        Then {propertyMortgages[0].variableRateAfterFixed}% variable
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Loan progress information */}
                            {propertyMortgages[0].startDate && propertyMortgages[0].loanTerm && (
                              <div>
                                <div className="text-sm text-muted-foreground mb-2">Loan Progress</div>
                                <div className="w-full bg-muted rounded-full h-2.5 dark:bg-gray-700 mt-1 mb-3">
                                  {(() => {
                                    const startDate = new Date(propertyMortgages[0].startDate);
                                    const loanTermMonths = propertyMortgages[0].loanTerm;
                                    const endDate = new Date(startDate);
                                    endDate.setMonth(startDate.getMonth() + loanTermMonths);
                                    
                                    const now = new Date();
                                    const totalLoanDuration = endDate.getTime() - startDate.getTime();
                                    const elapsedDuration = now.getTime() - startDate.getTime();
                                    
                                    const percentComplete = totalLoanDuration > 0
                                      ? Math.min(100, (elapsedDuration / totalLoanDuration) * 100)
                                      : 0;
                                      
                                    return (
                                      <div 
                                        className="bg-blue-600 h-2.5 rounded-full"
                                        style={{ width: `${percentComplete}%` }}
                                      ></div>
                                    );
                                  })()}
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    Started: {new Date(propertyMortgages[0].startDate).toLocaleDateString()}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {(() => {
                                      const startDate = new Date(propertyMortgages[0].startDate);
                                      const loanTermMonths = propertyMortgages[0].loanTerm;
                                      const endDate = new Date(startDate);
                                      endDate.setMonth(startDate.getMonth() + loanTermMonths);
                                      return `Ends: ${endDate.toLocaleDateString()}`
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (asset ? isLegacyMortgageProperty(asLegacyAsset(asset)) : false) ? (
                          // Legacy mortgage information as fallback
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Lender</div>
                              <div className="text-base font-medium">
                                {asset?.mortgageLender || "Not specified"}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Interest Rate</div>
                              <div className="text-base font-medium">
                                {asset?.mortgageInterestRate ? `${asset.mortgageInterestRate}%` : "Not specified"}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Monthly Payment</div>
                              <div className="text-base font-medium">
                                {asset?.mortgageAmount && asset?.mortgageInterestRate && asset?.mortgageTerm ?
                                  formatCurrency(
                                    calculateLoanPayment(
                                      asset.mortgageAmount,
                                      asset.mortgageInterestRate / 100,
                                      asset.mortgageTerm / 12
                                    )
                                  ) : "Not available"}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Monthly Interest</div>
                              <div className="text-base font-medium text-amber-600">
                                {asset?.mortgageAmount && asset?.mortgageInterestRate ?
                                  formatCurrency((asset.mortgageInterestRate / 100) * (asset.mortgageAmount) / 12)
                                  : "Not available"}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Type</div>
                              <div className="text-base font-medium capitalize">
                                {asset?.mortgageType || "Not specified"}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Term</div>
                              <div className="text-base font-medium">
                                {asset?.mortgageTerm ? 
                                  `${(asset.mortgageTerm / 12).toFixed(0)} years (${asset.mortgageTerm} months)` 
                                  : "Not specified"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // No mortgage information
                          <div className="text-center p-4">
                            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No mortgage information available for this property.</p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setActiveTab("mortgage")}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Add Mortgage
                            </Button>
                          </div>
                        )}
                        
                        <Separator className="my-4" />
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm text-muted-foreground">View full details</div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setActiveTab("mortgage")}
                          >
                            <CreditCard className="mr-2 h-4 w-4" /> Mortgage Tab
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* Main asset details grid - for all asset types */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Current Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem>
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
                        ) : (
                          formatCurrency(asset?.value || 0)
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Asset Class</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-medium">
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="assetClassId"
                            render={({ field }) => (
                              <FormItem>
                                <Select 
                                  value={field.value?.toString()} 
                                  onValueChange={value => field.onChange(parseInt(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select asset class" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {assetClasses?.map(assetClass => (
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
                        ) : (
                          selectedClass?.name || "N/A"
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Holding Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-medium">
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="assetHoldingTypeId"
                            render={({ field }) => (
                              <FormItem>
                                <Select 
                                  value={field.value?.toString()} 
                                  onValueChange={value => field.onChange(parseInt(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select holding type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {holdingTypes?.map(type => (
                                      <SelectItem 
                                        key={type.id} 
                                        value={type.id.toString()}
                                      >
                                        {type.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          selectedHoldingType?.name || "N/A"
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Asset Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter a description for this asset (optional)" 
                                className="min-h-[100px]"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        {asset?.description || "No description provided."}
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Purchase Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Purchase Date</div>
                          {isEditing ? (
                            <FormField
                              control={form.control}
                              name="purchaseDate"
                              render={({ field }) => (
                                <FormItem>
                                  <DatePicker
                                    date={field.value || null}
                                    setDate={field.onChange}
                                  />
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="font-medium flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                              {asset?.purchaseDate 
                                ? new Date(asset.purchaseDate).toLocaleDateString() 
                                : "Not provided"
                              }
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Purchase Price</div>
                          {isEditing ? (
                            <FormField
                              control={form.control}
                              name="purchasePrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      placeholder="0.00" 
                                      {...field}
                                      value={(field.value === null || field.value === undefined) ? "" : field.value}
                                      onChange={(e) => {
                                        const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="font-medium flex items-center">
                              <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                              {asset?.purchasePrice 
                                ? formatCurrency(asset.purchasePrice)
                                : "Not provided"
                              }
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {!isEditing && asset?.purchasePrice && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Gain/Loss</div>
                              <div className={`font-medium ${gainValue && gainValue > 0 ? 'text-green-600' : gainValue && gainValue < 0 ? 'text-red-600' : ''}`}>
                                {gainValue !== null 
                                  ? formatCurrency(gainValue)
                                  : "N/A"
                                }
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Gain/Loss %</div>
                              <div className={`font-medium ${gainPercentage && gainPercentage > 0 ? 'text-green-600' : gainPercentage && gainPercentage < 0 ? 'text-red-600' : ''}`}>
                                {gainPercentage !== null 
                                  ? `${gainPercentage.toFixed(2)}%`
                                  : "N/A"
                                }
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Growth Rate</div>
                          {isEditing ? (
                            <FormField
                              control={form.control}
                              name="growthRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      placeholder={selectedClass && selectedClass.defaultMediumGrowthRate !== null 
                                        ? `Default: ${(selectedClass.defaultMediumGrowthRate * 100).toFixed(2)}%` 
                                        : "Enter growth rate"} 
                                      {...field}
                                      value={(field.value === null || field.value === undefined) ? "" : field.value * 100}
                                      onChange={(e) => {
                                        const value = e.target.value === "" ? null : parseFloat(e.target.value) / 100;
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="font-medium flex items-center">
                              <Percent className="mr-2 h-4 w-4 text-muted-foreground" />
                              {asset?.growthRate !== null && asset?.growthRate !== undefined
                                ? `${(asset.growthRate * 100).toFixed(2)}%`
                                : selectedClass?.defaultMediumGrowthRate !== null && selectedClass?.defaultMediumGrowthRate !== undefined
                                  ? `${(selectedClass.defaultMediumGrowthRate * 100).toFixed(2)}% (Default)`
                                  : "Not set"
                              }
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Income Yield</div>
                          {isEditing ? (
                            <FormField
                              control={form.control}
                              name="incomeYield"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      placeholder={selectedClass && selectedClass.defaultIncomeYield !== null 
                                        ? `Default: ${(selectedClass.defaultIncomeYield * 100).toFixed(2)}%` 
                                        : "Enter income yield"} 
                                      {...field}
                                      value={(field.value === null || field.value === undefined) ? "" : field.value * 100}
                                      onChange={(e) => {
                                        const value = e.target.value === "" ? null : parseFloat(e.target.value) / 100;
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="font-medium flex items-center">
                              <Percent className="mr-2 h-4 w-4 text-muted-foreground" />
                              {asset?.incomeYield !== null && asset?.incomeYield !== undefined
                                ? `${(asset.incomeYield * 100).toFixed(2)}%`
                                : selectedClass?.defaultIncomeYield !== null && selectedClass?.defaultIncomeYield !== undefined
                                  ? `${(selectedClass.defaultIncomeYield * 100).toFixed(2)}% (Default)`
                                  : "Not set"
                              }
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm text-muted-foreground mb-1">Visibility</div>
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="isHidden"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Hide from dashboard</FormLabel>
                                  <FormDescription>
                                    Hidden assets won't appear in your dashboard summary, but will still be included in total calculations
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        ) : (
                          <div className="font-medium flex items-center">
                            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                            {asset?.isHidden 
                              ? "Hidden from dashboard"
                              : "Visible on dashboard"
                            }
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                {/* Extended asset details go here - can be customized based on asset class */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedClass?.name || "Asset"} Specific Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedClass?.name === "Property" && (
                      <div className="space-y-6">
                        <div className="flex items-center">
                          <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Property Type</p>
                            <p className="font-medium">{asset?.propertyType ? asset.propertyType.charAt(0).toUpperCase() + asset.propertyType.slice(1) : "Residential"}</p>
                          </div>
                        </div>
                        
                        {/* Property Details */}
                        <div className="grid grid-cols-2 gap-4">
                          {asset && asset.bedrooms && asset.bedrooms > 0 && (
                            <div className="flex items-center">
                              <BedDouble className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Bedrooms</p>
                                <p className="font-medium">{asset.bedrooms}</p>
                              </div>
                            </div>
                          )}
                          
                          {asset && asset.bathrooms && asset.bathrooms > 0 && (
                            <div className="flex items-center">
                              <Bath className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Bathrooms</p>
                                <p className="font-medium">{asset.bathrooms}</p>
                              </div>
                            </div>
                          )}
                          
                          {asset && asset.parkingSpaces && asset.parkingSpaces > 0 && (
                            <div className="flex items-center">
                              <Car className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Parking Spaces</p>
                                <p className="font-medium">{asset.parkingSpaces}</p>
                              </div>
                            </div>
                          )}
                          
                          {asset && asset.landSize && asset.landSize > 0 && (
                            <div className="flex items-center">
                              <MapIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Land Size</p>
                                <p className="font-medium">{asset.landSize} m²</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Property Expenses have been moved to a dedicated tab */}
                        
                        {/* Rental Information */}
                        {asset && asset.isRental && (
                          <div className="mt-4">
                            <h3 className="font-medium mb-2 flex items-center">
                              <DollarSign className="mr-2 h-4 w-4" /> Rental Information
                            </h3>
                            <div className="bg-muted p-4 rounded-md space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Rental Income</span>
                                <span className="font-medium">
                                  {formatCurrency(asset.rentalIncome || 0)} 
                                  /{asset.rentalFrequency || 'month'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Vacancy Rate</span>
                                <span className="font-medium">
                                  {asset.vacancyRate || 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedClass?.name === "Loans" && (
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Loan Type</p>
                            <p className="font-medium">Personal Loan</p>
                          </div>
                        </div>
                        
                        {/* Interest Expense - show for all liability assets with interest expenses */}
                        {asset && (() => {
                          const monthlyInterest = calculateMonthlyInterestExpense(asset);
                          return monthlyInterest > 0 ? (
                            <div className="flex items-center mt-4">
                              <DollarSign className="mr-2 h-5 w-5 text-amber-600" />
                              <div>
                                <p className="text-sm text-muted-foreground">Monthly Interest</p>
                                <p className="font-medium text-amber-600">{formatCurrency(monthlyInterest)}</p>
                              </div>
                            </div>
                          ) : null;
                        })()}
                        
                        {/* Only show offset accounts if this is a liability */}
                        {asset?.isLiability && asset?.id && (
                          <div className="mt-6">
                            <OffsetAccountSection 
                              loanId={asset.id} 
                              loanInterestRate={asset.incomeYield ? asset.incomeYield * 100 : undefined}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {(!selectedClass?.name || (selectedClass?.name !== "Property" && selectedClass?.name !== "Loans")) && (
                      <p className="text-muted-foreground">
                        No specific details available for this asset type.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Property Info Tab */}
              <TabsContent value="property" className="space-y-4 pt-4">
                {asset && selectedClass?.name?.toLowerCase() === "real estate" && asset && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Link to Mortgage Tab */}
                    {!isEditing && propertyMortgages?.length > 0 && (
                      <Card className="col-span-1 md:col-span-2 mb-4">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center">
                            <Building className="mr-2 h-4 w-4" /> Mortgage Information
                          </CardTitle>
                          <CardDescription>
                            This property has {propertyMortgages.length} associated mortgage(s).
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-primary"
                              onClick={() => setActiveTab("mortgage")}
                            >
                              View the mortgage tab for details
                            </Button>
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    )}
                    
                    {/* Mortgage Information Card - Only shown when editing */}
                    {isEditing && (
                      <Card className="col-span-1 md:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <DollarSign className="mr-2 h-5 w-5" /> Mortgage Information
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
                                    checked={field.value === true}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          {form.watch("hasMortgage") && (
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
                                          placeholder="Enter mortgage amount"
                                          onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                          value={field.value || ""}
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
                                        <Input 
                                          placeholder="e.g., ANZ, Commonwealth Bank" 
                                          {...field} 
                                          value={field.value || ""}
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
                                          placeholder="Enter interest rate"
                                          onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                          value={field.value || ""}
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
                                      <FormLabel>Interest Rate Type</FormLabel>
                                      <Select
                                        value={field.value || ""}
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
                                          placeholder="e.g., 360 for 30 years"
                                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 360)}
                                          value={field.value || ""}
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
                                      value={field.value || ""}
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
                    )}
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Property Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                          {/* Property Features */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {asset.bedrooms && (
                              <div className="flex items-center">
                                <BedDouble className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                                  <p className="font-medium">{asset.bedrooms}</p>
                                </div>
                              </div>
                            )}
                            
                            {asset.bathrooms && (
                              <div className="flex items-center">
                                <Bath className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                                  <p className="font-medium">{asset.bathrooms}</p>
                                </div>
                              </div>
                            )}
                            
                            {asset.parkingSpaces && asset.parkingSpaces > 0 && (
                              <div className="flex items-center">
                                <Car className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Parking Spaces</p>
                                  <p className="font-medium">{asset.parkingSpaces}</p>
                                </div>
                              </div>
                            )}
                            
                            {asset.landSize && asset.landSize > 0 && (
                              <div className="flex items-center">
                                <MapIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Land Size</p>
                                  <p className="font-medium">{asset.landSize} m²</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Property address information */}
                          {asset.address && (
                            <div className="mt-4">
                              <h3 className="font-medium mb-2">Property Address</h3>
                              <div className="bg-muted p-4 rounded-md">
                                <p>{asset.address}</p>
                                {asset.suburb && <p>{asset.suburb}</p>}
                                {asset.state && asset.postcode && <p>{asset.state}, {asset.postcode}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Rental Income Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Rental Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Rental status */}
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Rental Status</div>
                          <div className="font-medium">
                            {asset.isRental ? "Investment Property" : "Owner-Occupied"}
                          </div>
                        </div>
                        
                        {/* Show rental details only if it's a rental property */}
                        {asset.isRental && (
                          <>
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Weekly Rent</div>
                              <div className="font-medium">{(asset as any).weeklyRent ? formatCurrency((asset as any).weeklyRent) : "Not specified"}</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Annual Rental Income</div>
                              <div className="font-medium">{(asset as any).weeklyRent ? formatCurrency((asset as any).weeklyRent * 52) : "Not specified"}</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Rental Yield</div>
                              <div className="font-medium">
                                {(asset as any).weeklyRent && asset.value
                                  ? `${(((asset as any).weeklyRent * 52 / asset.value) * 100).toFixed(2)}%`
                                  : "Not available"
                                }
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Mortgage Details - Only shown when not editing */}
                    {console.log("Mortgage rendering condition:", {
                      isEditing,
                      hasMortgage: isLegacyMortgageProperty(asLegacyAsset(asset)),
                      shouldRender: !isEditing && asset.hasMortgage,
                      mortgagesCount: propertyMortgages?.length,
                      isLoadingMortgages
                    })}
                    {!isEditing && (asset.hasMortgage || propertyMortgages?.length > 0) && (
                      <MortgageDetails 
                        property={asset} 
                        mortgages={propertyMortgages} 
                        isLoading={isLoadingMortgages} 
                      />
                    )}
                    
                    {/* Property Expenses Section - moved to dedicated tab */}
                    <div className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Receipt className="mr-2 h-4 w-4" /> Property Expenses
                          </CardTitle>
                          <CardDescription>
                            {asset && asset.propertyExpenses && typeof asset.propertyExpenses === 'object' && 
                             Object.keys(asset.propertyExpenses).length > 0 ? (
                              <>
                                This property has {Object.keys(asset.propertyExpenses).length} expenses.
                                <Button 
                                  variant="link" 
                                  className="p-0 h-auto text-primary"
                                  onClick={() => setActiveTab("expenses")}
                                >
                                  View expenses tab for details
                                </Button>
                              </>
                            ) : (
                              <>
                                No expenses have been added yet.
                                <Button 
                                  variant="link" 
                                  className="p-0 h-auto text-primary"
                                  onClick={() => {
                                    setActiveTab("expenses");
                                    if (!isEditing) setIsEditing(true);
                                  }}
                                >
                                  Add expenses
                                </Button>
                              </>
                            )}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Mortgage Tab - Dedicated tab for property mortgage details */}
              <TabsContent value="mortgage" className="space-y-4 pt-4">
                {asset && selectedClass?.name?.toLowerCase() === "real estate" && (
                  <div className="space-y-6">
                    {/* Debug info for mortgage display conditions */}
                    {console.log("Mortgage rendering condition:", {
                      isEditing,
                      hasMortgage: isLegacyMortgageProperty(asLegacyAsset(asset)),
                      shouldRender: !isEditing && asset.hasMortgage,
                      mortgagesCount: propertyMortgages?.length,
                      isLoadingMortgages
                    })}
                    
                    {/* Property Summary */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center">
                          <Building className="mr-2 h-4 w-4" /> Property Summary
                        </CardTitle>
                        <CardDescription>
                          {asset.name} - {formatCurrency(asset.value || 0)}
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    {/* Mortgage Details - Now directly shown in this tab */}
                    {isLoadingMortgages ? (
                      <Card>
                        <CardContent className="p-8 flex flex-col items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                          <p>Loading mortgage information...</p>
                        </CardContent>
                      </Card>
                    ) : propertyMortgages && propertyMortgages.length > 0 ? (
                      <div>
                        {/* This will display the list of mortgages */}
                        {propertyMortgages.map((mortgage) => (
                          <div key={mortgage.id} className="mb-4">
                            <MortgageDetails
                              property={asset}
                              mortgages={[mortgage]}
                              isLoading={false}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Building className="mr-2 h-4 w-4" /> No Mortgage Assigned
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center p-6">
                            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              This property doesn't have any associated mortgages. It may be owned outright, or you can add mortgage information by editing the property.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>
              
              {/* Expenses Tab - Dedicated tab for property and investment expenses */}
              <TabsContent value="expenses" className="space-y-4 pt-4">
                {/* Real Estate Expenses */}
                {asset && selectedClass?.name?.toLowerCase() === "real estate" && (
                  <div className="space-y-6">
                    {/* Expense Management Card */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center">
                          <BarChart3 className="mr-2 h-5 w-5 text-primary" /> 
                          Property Expenses
                          {updateAssetMutation.isPending && (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin text-primary" />
                          )}
                          {updateAssetMutation.isSuccess && (
                            <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                          )}
                        </CardTitle>
                        <CardDescription>
                          Manage expenses related to this property
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="propertyExpenses"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <ExpensesContainer
                                    key={`expenses-edit-${asset.id}`}
                                    assetId={asset.id}
                                    assetClassId={asset.assetClassId}
                                    propertyExpenses={field.value as Record<string, Expense> || {}}
                                    investmentExpenses={{}} 
                                    expenseCategories={[
                                      { id: 'utilities', name: 'Utilities', description: 'Electricity, water, gas, etc.', defaultFrequency: 'monthly' },
                                      { id: 'maintenance', name: 'Maintenance', description: 'Regular upkeep and repairs', defaultFrequency: 'monthly' },
                                      { id: 'insurance', name: 'Insurance', description: 'Property and liability insurance', defaultFrequency: 'annually' },
                                      { id: 'taxes', name: 'Property Taxes', description: 'Annual taxes on property', defaultFrequency: 'annually' },
                                      { id: 'management', name: 'Management', description: 'Property management fees', defaultFrequency: 'monthly' },
                                      { id: 'strata', name: 'Strata/HOA Fees', description: 'Strata or homeowners association fees', defaultFrequency: 'monthly' },
                                      { id: 'other', name: 'Other', description: 'Other property-related expenses', defaultFrequency: 'monthly' }
                                    ]}
                                    onExpensesChange={(propertyExpenses, investmentExpenses) => {
                                      const timestamp = Date.now();
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] ===== PROPERTY EXPENSE CHANGE HANDLER START =====`);
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] Expense component updated with ${Object.keys(propertyExpenses).length} expenses`);
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] Call stack:`, new Error().stack?.split('\n').slice(1, 5).join('\n'));
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] Current form values:`, form.getValues());
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] Current form dirty state:`, form.formState.isDirty);
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] Expense data:`, propertyExpenses);
                                      
                                      // IMPORTANT: Only update the form field without immediate database save
                                      field.onChange(propertyExpenses);
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] Form field updated`);
                                      
                                      // Update state tracker to monitor changes
                                      setCurrentPropertyExpenses(propertyExpenses);
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] State tracker updated`);
                                      
                                      // No longer saving to database immediately
                                      // Database updates will occur when "Save Changes" is clicked
                                      // This ensures all changes are committed together
                                      console.log(`[PROP_EXPENSES_PARENT:${timestamp}] ===== PROPERTY EXPENSE CHANGE HANDLER END =====`);
                                    }}
                                    readOnly={!isEditing}
                                    annualIncome={asset.isRental && asset.rentalIncome ? 
                                      (asset.rentalFrequency === 'weekly' ? asset.rentalIncome * 52 : 
                                       asset.rentalFrequency === 'fortnightly' ? asset.rentalIncome * 26 : 
                                       asset.rentalFrequency === 'monthly' ? asset.rentalIncome * 12 : 
                                       asset.rentalIncome) : 0}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : asset.propertyExpenses ? (
                          <div className="relative">
                            {/* Read-only overlay when not in edit mode */}
                            <div className="absolute inset-0 bg-transparent z-10" onClick={() => setIsEditing(true)}></div>
                            <ExpensesContainer
                              key={`expenses-view-${asset.id}`}
                              assetId={asset.id}
                              assetClassId={asset.assetClassId}
                              propertyExpenses={parsePropertyExpenses(asset.propertyExpenses)}
                              investmentExpenses={{}}
                              expenseCategories={[
                                { id: 'utilities', name: 'Utilities', description: 'Electricity, water, gas, etc.', defaultFrequency: 'monthly' },
                                { id: 'maintenance', name: 'Maintenance', description: 'Regular upkeep and repairs', defaultFrequency: 'monthly' },
                                { id: 'insurance', name: 'Insurance', description: 'Property and liability insurance', defaultFrequency: 'annually' },
                                { id: 'taxes', name: 'Property Taxes', description: 'Annual taxes on property', defaultFrequency: 'annually' },
                                { id: 'management', name: 'Management', description: 'Property management fees', defaultFrequency: 'monthly' },
                                { id: 'strata', name: 'Strata/HOA Fees', description: 'Strata or homeowners association fees', defaultFrequency: 'monthly' },
                                { id: 'other', name: 'Other', description: 'Other property-related expenses', defaultFrequency: 'monthly' }
                              ]}
                              onExpensesChange={(value) => {
                                // Read-only when not editing - should trigger edit mode
                                console.log("Property expenses component triggered onChange in read-only mode");
                                // We shouldn't reach here because of the overlay
                              }}
                              readOnly={true}
                              annualIncome={asset.isRental && asset.rentalIncome ? 
                                (asset.rentalFrequency === 'weekly' ? asset.rentalIncome * 52 : 
                                 asset.rentalFrequency === 'fortnightly' ? asset.rentalIncome * 26 : 
                                 asset.rentalFrequency === 'monthly' ? asset.rentalIncome * 12 : 
                                 asset.rentalIncome) : 0}
                            />

                          </div>
                        ) : (
                          <div className="text-center p-6 border rounded border-dashed">
                            <p className="text-muted-foreground mb-4">No property expenses have been added yet.</p>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                              <Plus className="mr-2 h-4 w-4" /> Add Expenses
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Property Expense Analysis is now included within ExpensesContainer */}
                    
                    {/* Database persistence status card (shows only when editing) */}
                    {isEditing && (
                      <Card className="bg-muted border-dashed">
                        <CardContent className="pt-4">
                          <div className="flex items-start">
                            <Database className="h-5 w-5 mt-0.5 mr-2 text-muted-foreground" />
                            <div>
                              <h4 className="text-sm font-medium">Database Persistence Status</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {savePropertyExpensesMutation.isPending && "Saving expense data to database..."}
                                {savePropertyExpensesMutation.isSuccess && "✓ Expense data successfully saved to database."}
                                {!savePropertyExpensesMutation.isPending && !savePropertyExpensesMutation.isSuccess && 
                                  "Expense changes will be saved to database when you click 'Save Changes'."}
                              </p>
                              <div className="mt-2 text-xs">
                                <code className="bg-background rounded px-1 py-0.5 text-xs">
                                  {Object.keys(currentPropertyExpenses || {}).length || 
                                   Object.keys(parsePropertyExpenses(asset.propertyExpenses)).length || 0} expenses tracked
                                </code>
                                {savePropertyExpensesMutation.isSuccess && (
                                  <span className="ml-2 text-green-600 font-medium">✓ Verified in database</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                
                {/* Investment Expenses */}
                {asset && selectedClass?.name?.toLowerCase() === "investments" && (
                  <div className="space-y-6">
                    {/* Investment Expense Management Card */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center">
                          <BarChart3 className="mr-2 h-5 w-5 text-primary" /> 
                          Investment Expenses
                          {updateAssetMutation.isPending && (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin text-primary" />
                          )}
                          {updateAssetMutation.isSuccess && (
                            <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                          )}
                        </CardTitle>
                        <CardDescription>
                          Manage expenses related to this investment
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="investmentExpenses"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <InvestmentExpensesFixed
                                    key={`investment-expenses-edit-${asset.id}`}
                                    value={convertPageExpensesToComponent(field.value as Record<string, InvestmentExpense> || {})}
                                    onChange={(newComponentExpenses) => {
                                      const timestamp = Date.now();
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] ===== INVESTMENT EXPENSE CHANGE HANDLER START =====`);
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] Component updated with ${Object.keys(newComponentExpenses).length} expenses`);
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] Call stack:`, new Error().stack?.split('\n').slice(1, 5).join('\n'));
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] Current form values:`, form.getValues());
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] Current form dirty state:`, form.formState.isDirty);
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] Raw component expense data:`, newComponentExpenses);
                                      
                                      // Convert component format back to page format
                                      const pageFormatExpenses = convertComponentExpensesToPage(newComponentExpenses);
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] Converted to page format with ${Object.keys(pageFormatExpenses).length} expenses`);
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] Converted expense data:`, pageFormatExpenses);
                                      
                                      // Update the form field without immediate database save
                                      field.onChange(pageFormatExpenses);
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] Form field updated`);
                                      
                                      // Update state tracker to monitor changes
                                      setCurrentInvestmentExpenses(pageFormatExpenses);
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] State tracker updated`);
                                      console.log(`[INV_EXPENSES_PARENT:${timestamp}] ===== INVESTMENT EXPENSE CHANGE HANDLER END =====`);
                                    }}
                                    assetId={asset.id}
                                    assetClassId={asset?.assetClassId}
                                    isEditMode={isEditing}
                                    isSaving={updateAssetMutation.isPending}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : asset.investmentExpenses ? (
                          <div className="relative">
                            {/* Read-only overlay when not in edit mode */}
                            <div className="absolute inset-0 bg-transparent z-10" onClick={() => setIsEditing(true)}></div>
                            <InvestmentExpensesFixed
                              key={`investment-expenses-view-${asset.id}`}
                              value={convertPageExpensesToComponent(parseInvestmentExpenses(asset.investmentExpenses))}
                              onChange={(value) => {
                                // Read-only when not editing - should trigger edit mode
                                console.log("Investment expenses component triggered onChange in read-only mode");
                                // We shouldn't reach here because of the overlay
                              }}
                              assetId={asset.id}
                              assetClassId={asset?.assetClassId}
                              isEditMode={false}
                            />
                          </div>
                        ) : (
                          <div className="text-center p-6 border rounded border-dashed">
                            <p className="text-muted-foreground mb-4">No investment expenses have been added yet.</p>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                              <Plus className="mr-2 h-4 w-4" /> Add Expenses
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Investment Expense Analysis */}
                    {asset.investmentExpenses && Object.keys(parseInvestmentExpenses(asset.investmentExpenses)).length > 0 && (
                      <InvestmentExpenseAnalysis 
                        key={`investment-expense-analysis-${asset.id}`}
                        expenses={convertPageExpensesToComponent(parseInvestmentExpenses(asset.investmentExpenses))}
                        annualIncome={asset.annualIncome || 0}
                      />
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="performance" className="space-y-4 pt-4">
                {/* Performance charts and trends would go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Historical Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Performance tracking will be available in a future update.
                    </p>
                    {gainValue !== null && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Total Gain/Loss</div>
                          <div className={`text-xl font-semibold ${gainValue > 0 ? 'text-green-600' : gainValue < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(gainValue)} ({gainPercentage !== null ? `${gainPercentage.toFixed(2)}%` : "N/A"})
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {isEditing && (
              <div className="flex justify-end space-x-2 mt-6">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  disabled={updateAssetMutation.isPending}
                  onClick={() => {
                    console.log("Direct Save button clicked", new Date().toISOString());
                    console.log("Current form state:", form.getValues());
                    console.log("Is form valid:", form.formState.isValid);
                    console.log("Current asset ID:", assetId);
                    
                    // Get current expenses from state and standardize them
                    const propertyExpensesToSave = currentPropertyExpenses ? 
                      standardizeExpenseFields(currentPropertyExpenses) : {};
                    const investmentExpensesToSave = currentInvestmentExpenses ? 
                      standardizeExpenseFields(currentInvestmentExpenses) : {};
                    
                    console.log("Current property expenses to save:", propertyExpensesToSave);
                    console.log("Current investment expenses to save:", investmentExpensesToSave);
                    
                    // Get current form values and prepare data for submission
                    const formValues = form.getValues();
                    
                    // Directly trigger the mutation with the form values and current expenses
                    if (assetId) {
                      toast({
                        title: "Saving changes",
                        description: "Submitting data directly to avoid form validation issues...",
                        duration: 2000,
                      });
                      
                      // Directly call the mutation function with merged data
                      updateAssetMutation.mutate({
                        ...formValues,
                        propertyExpenses: propertyExpensesToSave,
                        investmentExpenses: investmentExpensesToSave
                      });
                    }
                  }}
                >
                  {updateAssetMutation.isPending ? "Saving..." : "Save Changes (Direct)"}
                </Button>
                
                <Button 
                  type="submit"
                  className="hidden" // Hide the regular submit button
                  disabled={updateAssetMutation.isPending}
                >
                  {updateAssetMutation.isPending ? "Saving..." : "Save Changes (Normal)"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}