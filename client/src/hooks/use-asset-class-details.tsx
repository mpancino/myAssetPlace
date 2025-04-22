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
        console.log('[EXPENSE_CATEGORY_PARSE] Processing object category:', cat);
        
        // Create a fresh object to avoid modifying the original which might be deeply nested
        const cleanCategory = {
          id: cat.id || crypto.randomUUID?.() || `cat-${Math.random().toString(36).substring(2, 9)}`,
          name: '',
          description: cat.description || '',
          defaultFrequency: cat.defaultFrequency || 'monthly'
        };
        
        // First, check if name is actually an object before anything else
        if (cat.name !== null && typeof cat.name === 'object') {
          // This is specifically for the [object Object] case
          console.log('[EXPENSE_CATEGORY_PARSE] Detected object name:', JSON.stringify(cat.name));
          try {
            if ('name' in cat.name) {
              // Extract the name property from the nested object
              cleanCategory.name = String(cat.name.name);
              console.log('[EXPENSE_CATEGORY_PARSE] Extracted nested name property:', cleanCategory.name);
            } else if (cat.defaultFrequency) {
              // Use a frequency-based name if available
              const frequencyMap: Record<string, string> = {
                'monthly': 'Monthly Expense',
                'quarterly': 'Quarterly Expense', 
                'annually': 'Annual Expense',
                'weekly': 'Weekly Expense'
              };
              cleanCategory.name = frequencyMap[cat.defaultFrequency] || 'Expense Category';
              console.log('[EXPENSE_CATEGORY_PARSE] Using frequency-based name:', cleanCategory.name);
            } else {
              // Create a more meaningful name than [object Object]
              cleanCategory.name = `Expense Category ${cat.id?.substring(0, 4) || ''}`;
              console.log('[EXPENSE_CATEGORY_PARSE] Created generic name:', cleanCategory.name);
            }
          } catch (e) {
            cleanCategory.name = 'Expense Category';
            console.error('[EXPENSE_CATEGORY_PARSE] Error handling object name:', e);
          }
        } else if (cat.name === undefined || cat.name === null) {
          // Use alternative property if name doesn't exist
          cleanCategory.name = String(cat.value || cat.category || 'Unnamed Category');
          console.log('[EXPENSE_CATEGORY_PARSE] Using alternative property for name:', cleanCategory.name);
        } else {
          // Normal case - string or primitive
          const nameStr = String(cat.name);
          // Check if we're getting [object Object] and provide meaningful replacement
          if (nameStr === "[object Object]") {
            // Try to extract a name that makes sense based on other properties
            if (cat.description && cat.description.length > 0) {
              // Use the description as name if available
              cleanCategory.name = cat.description;
            } else if (cat.category) {
              // Use the category if available
              cleanCategory.name = String(cat.category);
            } else if (cat.defaultFrequency) {
              // Use properly capitalized frequency as last resort
              const frequency = cat.defaultFrequency.charAt(0).toUpperCase() + cat.defaultFrequency.slice(1);
              cleanCategory.name = `${frequency} Expense`;
            } else {
              // Fallback to some default
              cleanCategory.name = "Property Expense";
            }
          } else {
            cleanCategory.name = nameStr;
          }
          console.log('[EXPENSE_CATEGORY_PARSE] Using normal name property:', cleanCategory.name);
        }
        
        console.log('[EXPENSE_CATEGORY_PARSE] Returning standardized category:', cleanCategory);
        return cleanCategory;
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