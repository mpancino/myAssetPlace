import { useQuery } from "@tanstack/react-query";
import { AssetClass } from "@shared/schema";

/**
 * Standardized expense category type
 */
export interface StandardizedExpenseCategory {
  id: string;
  name: string;
  description?: string;
  defaultFrequency?: string;
}

/**
 * Hook to fetch and provide detailed information about an asset class
 * @param assetClassId The ID of the asset class to fetch details for
 * @returns Object containing the asset class details and loading/error states
 */
export function useAssetClassDetails(assetClassId?: number) {
  const { 
    data: assetClass, 
    isLoading, 
    isError 
  } = useQuery<AssetClass>({
    queryKey: [`/api/asset-classes/${assetClassId}`],
    enabled: !!assetClassId,
  });

  // Parse expense categories from the asset class
  const expenseCategories = assetClass?.expenseCategories 
    ? parseExpenseCategories(assetClass.expenseCategories) 
    : [];

  return {
    assetClass,
    expenseCategories,
    isLoading,
    isError
  };
}

/**
 * Parse expense categories from various formats
 */
function parseExpenseCategories(expenseCategories: any): StandardizedExpenseCategory[] {
  try {
    // Handle empty cases
    if (!expenseCategories) return [];
    
    let parsedCategories: any[] = [];
    
    // If it's a JSON string, parse it
    if (typeof expenseCategories === 'string') {
      try {
        parsedCategories = JSON.parse(expenseCategories);
      } catch (e) {
        // If JSON parsing fails, it might be a comma-separated string
        if (expenseCategories.includes(',')) {
          parsedCategories = expenseCategories.split(',').map(cat => cat.trim());
        } else {
          // Single string value
          parsedCategories = [expenseCategories];
        }
      }
    } else if (Array.isArray(expenseCategories)) {
      // Already an array
      parsedCategories = expenseCategories;
    }
    
    // Ensure we have an array
    if (!Array.isArray(parsedCategories)) {
      console.warn('Expense categories is not an array after parsing:', parsedCategories);
      return [];
    }
    
    // Normalize each item to the standardized format
    return parsedCategories.map(cat => {
      // If it's a string, create a simple category object
      if (typeof cat === 'string') {
        return {
          id: crypto.randomUUID?.() || `cat-${Math.random().toString(36).substring(2, 9)}`, // Generate an ID with fallback
          name: cat,
          description: '',
          defaultFrequency: 'monthly'
        };
      }
      
      // If it's already a standardized object, use it as is
      if (typeof cat === 'object' && cat !== null) {
        // Ensure it has an ID
        if (!cat.id) {
          cat.id = crypto.randomUUID?.() || `cat-${Math.random().toString(36).substring(2, 9)}`;
        }
        
        // Ensure it has a name
        if (!cat.name && (cat.value || cat.category)) {
          cat.name = cat.value || cat.category;
        }
        
        // Ensure it has a default frequency
        if (!cat.defaultFrequency) {
          cat.defaultFrequency = 'monthly';
        }
        
        return cat;
      }
      
      // Fallback for unexpected types
      return {
        id: crypto.randomUUID?.() || `cat-${Math.random().toString(36).substring(2, 9)}`,
        name: String(cat),
        description: '',
        defaultFrequency: 'monthly'
      };
    });
  } catch (error) {
    console.error("Error parsing expense categories:", error);
    return [];
  }
}