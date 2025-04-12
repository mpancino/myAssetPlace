import { useQuery } from "@tanstack/react-query";
import { AssetClass } from "@shared/schema";

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
function parseExpenseCategories(expenseCategories: any): string[] {
  try {
    // If it's already a string array, return it
    if (Array.isArray(expenseCategories) && 
        expenseCategories.every(cat => typeof cat === 'string')) {
      return expenseCategories;
    }
    
    // If it's a JSON string, parse it
    if (typeof expenseCategories === 'string') {
      const parsed = JSON.parse(expenseCategories);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    
    // If it's an object with category properties, extract them
    if (typeof expenseCategories === 'object' && expenseCategories !== null) {
      // Handle case where it's an array of objects with name/value properties
      if (Array.isArray(expenseCategories) && 
          expenseCategories.length > 0 && 
          typeof expenseCategories[0] === 'object') {
        return expenseCategories.map(cat => 
          cat.name || cat.value || cat.category || cat.toString()
        );
      }
    }
    
    // Fallback to empty array
    return [];
  } catch (error) {
    console.error("Error parsing expense categories:", error);
    return [];
  }
}