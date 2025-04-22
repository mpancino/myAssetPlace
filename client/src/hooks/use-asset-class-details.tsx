import { useQuery } from "@tanstack/react-query";
import { AssetClass } from "@shared/schema";
import { useEffect } from "react";

/**
 * Standardizes expense field names to ensure consistent format
 * - Converts 'category' to 'categoryId'
 * - Converts 'description' to 'name'
 * - Removes duplicated fields
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
  });
  
  console.log(`[STANDARDIZE:${now}] Standardized ${Object.keys(result).length} expenses`);
  return result as Record<string, T>;
}

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

  // Log the raw expense categories for debugging
  useEffect(() => {
    if (assetClass?.expenseCategories) {
      console.log('[RAW_ASSET_CLASS] Raw expense categories:', 
                 typeof assetClass.expenseCategories === 'string' 
                 ? assetClass.expenseCategories 
                 : JSON.stringify(assetClass.expenseCategories));
    }
  }, [assetClass]);

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
      
      // If we have an array of expense category objects, standardize their field names
      if (parsedCategories.length > 0 && typeof parsedCategories[0] === 'object') {
        // Create a temporary object to use with standardizeExpenseFields
        const tempObj: Record<string, any> = {};
        parsedCategories.forEach((cat, index) => {
          tempObj[`cat-${index}`] = cat;
        });
        
        // Standardize the fields in the temporary object
        console.log('[EXPENSE_CATEGORY_PARSE] Standardizing expense category fields for array');
        const standardized = standardizeExpenseFields(tempObj);
        
        // Convert back to array
        parsedCategories = Object.values(standardized);
      }
    }
    
    // Ensure we have an array
    if (!Array.isArray(parsedCategories)) {
      console.warn('Expense categories is not an array after parsing:', parsedCategories);
      return [];
    }
    
    // Direct mapping for property expense category names
    const categoryMappings: Record<string, string> = {
      "insurance": "Insurance",
      "property_tax": "Property Tax",
      "propertytax": "Property Tax",
      "maintenance": "Maintenance", 
      "utilities": "Utilities",
      "management": "Management",
      "repairs": "Repairs",
      "strata": "Strata Fees",
      "council": "Council Rates",
      "body_corporate": "Body Corporate"
    };
    
    // Standard property expense categories we want to use
    const standardCategories = Object.values(categoryMappings);

    // Normalize each item to the standardized format
    return parsedCategories.map(cat => {
      // If it's a string, create a simple category object
      if (typeof cat === 'string') {
        return {
          id: crypto.randomUUID?.() || `cat-${Math.random().toString(36).substring(2, 9)}`, 
          name: cat,
          description: '',
          defaultFrequency: 'monthly'
        };
      }
      
      // If it's an object
      if (typeof cat === 'object' && cat !== null) {
        console.log('[EXPENSE_CATEGORY_PARSE] Processing object category:', cat);
        
        // Create clean category with defaults
        const cleanCategory: StandardizedExpenseCategory = {
          id: cat.id || crypto.randomUUID?.() || `cat-${Math.random().toString(36).substring(2, 9)}`,
          name: 'Property Expense', // Default fallback
          description: cat.description || '',
          defaultFrequency: cat.defaultFrequency || 'monthly'
        };
        
        // HARDCODED FIX: Add standard names for known real estate expense categories
        // These are predefined in the database and we'll map them directly
        if (cat.id) {
          // Real Estate expense categories - direct mapping by known IDs
          const knownCategoryIds: Record<string, string> = {
            "bd42c972-f20f-4f92-a77c-4fac7e60fd01": "Insurance",
            "075ada85-3e24-43d9-982e-50c02b56a9c7": "Property Tax",
            "6c39362a-2924-490a-8cb0-467d76ab9566": "Maintenance",
            "85083e6a-a138-41ea-9c0d-19528526c0dc": "Utilities"
          };
          
          if (cat.id in knownCategoryIds) {
            cleanCategory.name = knownCategoryIds[cat.id];
            console.log(`[EXPENSE_CATEGORY_PARSE] Using hardcoded category name for ID ${cat.id}: ${cleanCategory.name}`);
            return cleanCategory;
          }
        }
        
        // Hard-code categories for real estate - prioritize exact property expense types
        // Check for standard category names in any property
        for (const stdCat of standardCategories) {
          // Check the type property first (most specific)
          if (cat.type && typeof cat.type === 'string' && 
              cat.type.toLowerCase().includes(stdCat.toLowerCase())) {
            cleanCategory.name = stdCat;
            console.log(`[EXPENSE_CATEGORY_PARSE] Matched standard category from type: ${stdCat}`);
            break;
          }
          
          // Check category property next
          if (cat.category && typeof cat.category === 'string' && 
              cat.category.toLowerCase().includes(stdCat.toLowerCase())) {
            cleanCategory.name = stdCat;
            console.log(`[EXPENSE_CATEGORY_PARSE] Matched standard category from category: ${stdCat}`);
            break;
          }
          
          // Then check name property
          if (cat.name && typeof cat.name === 'string' && 
              !cat.name.includes('[object Object]') &&
              cat.name.toLowerCase().includes(stdCat.toLowerCase())) {
            cleanCategory.name = stdCat;
            console.log(`[EXPENSE_CATEGORY_PARSE] Matched standard category from name: ${stdCat}`);
            break;
          }
          
          // Check description next
          if (cat.description && typeof cat.description === 'string' && 
              cat.description.toLowerCase().includes(stdCat.toLowerCase())) {
            cleanCategory.name = stdCat;
            console.log(`[EXPENSE_CATEGORY_PARSE] Matched standard category from description: ${stdCat}`);
            break;
          }
        }
        
        // If we have already identified a standard category, return it
        if (cleanCategory.name !== 'Property Expense') {
          console.log(`[EXPENSE_CATEGORY_PARSE] Using standard category: ${cleanCategory.name}`);
          return cleanCategory;
        }
        
        // If name isn't set yet, use the best available option
        
        // 1. Try type property directly (most specific for expenses)
        if (cat.type && typeof cat.type === 'string') {
          cleanCategory.name = cat.type;
          console.log('[EXPENSE_CATEGORY_PARSE] Using type property:', cleanCategory.name);
          return cleanCategory;
        }
        
        // 2. Try category property 
        if (cat.category && typeof cat.category === 'string') {
          cleanCategory.name = cat.category;
          console.log('[EXPENSE_CATEGORY_PARSE] Using category property:', cleanCategory.name);
          return cleanCategory;
        }
        
        // 3. Try name property if not [object Object]
        if (cat.name && typeof cat.name === 'string' && cat.name !== "[object Object]") {
          cleanCategory.name = cat.name;
          console.log('[EXPENSE_CATEGORY_PARSE] Using name property:', cleanCategory.name);
          return cleanCategory;
        }
        
        // 4. For object name properties or [object Object], try to extract nested properties
        if (cat.name !== null && (typeof cat.name === 'object' || String(cat.name) === "[object Object]")) {
          // Try to extract from nested object properties
          if (typeof cat.name === 'object') {
            // Look for type in nested object first
            if ('type' in cat.name && typeof cat.name.type === 'string') {
              cleanCategory.name = cat.name.type;
              console.log('[EXPENSE_CATEGORY_PARSE] Using nested type property:', cleanCategory.name);
              return cleanCategory;
            }
            
            // Look for category in nested object
            if ('category' in cat.name && typeof cat.name.category === 'string') {
              cleanCategory.name = cat.name.category;
              console.log('[EXPENSE_CATEGORY_PARSE] Using nested category property:', cleanCategory.name);
              return cleanCategory;
            }
            
            // Look for name in nested object
            if ('name' in cat.name && typeof cat.name.name === 'string') {
              cleanCategory.name = cat.name.name;
              console.log('[EXPENSE_CATEGORY_PARSE] Using nested name property:', cleanCategory.name);
              return cleanCategory;
            }
          }
          
          // If we reached here, we couldn't extract a good name from the nested object
          
          // 5. Use description if available and meaningful
          if (cat.description && typeof cat.description === 'string' && cat.description.length > 3) {
            cleanCategory.name = cat.description;
            console.log('[EXPENSE_CATEGORY_PARSE] Using description as name:', cleanCategory.name);
            return cleanCategory;
          }
          
          // 6. Use properly named frequency-based fallback
          const frequency = cat.defaultFrequency.charAt(0).toUpperCase() + cat.defaultFrequency.slice(1);
          const categoryName = `${frequency} Expense`;
          cleanCategory.name = categoryName;
          console.log('[EXPENSE_CATEGORY_PARSE] Using frequency-based fallback:', cleanCategory.name);
          return cleanCategory;
        }
        
        // At this point, we've exhausted our options, so return the default
        console.log('[EXPENSE_CATEGORY_PARSE] Using default name:', cleanCategory.name);
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