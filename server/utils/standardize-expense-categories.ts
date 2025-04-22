/**
 * Utility to standardize expense categories across the application
 * 
 * This utility ensures that all expense categories for asset classes
 * follow a consistent structure and format.
 */
import { db } from "../db";
import { assetClasses, type ExpenseCategory } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Deduplicate expense categories based on name
 * This prevents duplicates of the same category from appearing in the UI
 * 
 * @param categories Array of expense categories to deduplicate
 * @returns Array of unique expense categories
 */
function deduplicateCategories(categories: ExpenseCategory[]): ExpenseCategory[] {
  // Use a Map to track unique categories by name (case-insensitive)
  const uniqueMap = new Map<string, ExpenseCategory>();
  
  for (const category of categories) {
    const normalizedName = category.name.toLowerCase().trim();
    
    // Only add if not already in the map, or replace if this one has more data
    if (!uniqueMap.has(normalizedName) || 
        (!uniqueMap.get(normalizedName)?.description && category.description)) {
      uniqueMap.set(normalizedName, category);
    }
  }
  
  // Convert map values back to array
  return Array.from(uniqueMap.values());
}

/**
 * Standardize expense categories for all asset classes
 */
export async function standardizeExpenseCategories() {
  try {
    console.log("Starting expense category standardization...");
    
    // Fetch all asset classes
    const allAssetClasses = await db.select().from(assetClasses);
    let updatedCount = 0;
    const results: Record<string, any> = {};
    
    for (const assetClass of allAssetClasses) {
      try {
        // Process expense categories field
        if (assetClass.expenseCategories) {
          let categories: any[] = [];
          
          // Convert from string to object if needed
          if (typeof assetClass.expenseCategories === 'string') {
            try {
              // Try to parse as JSON
              categories = JSON.parse(assetClass.expenseCategories);
              
              // If the result is not an array, wrap it in one
              if (!Array.isArray(categories)) {
                categories = [categories];
              }
            } catch (parseError) {
              // If JSON parse fails, it might be a comma-separated string
              if (assetClass.expenseCategories.includes(',')) {
                // Split by comma and create basic category objects
                categories = assetClass.expenseCategories
                  .split(',')
                  .map((name: string) => ({
                    id: uuidv4(),
                    name: name.trim(),
                    description: '',
                    defaultFrequency: 'monthly'
                  }));
              } else {
                // Single value
                categories = [{
                  id: uuidv4(),
                  name: assetClass.expenseCategories.trim(),
                  description: '',
                  defaultFrequency: 'monthly'
                }];
              }
            }
          } else if (Array.isArray(assetClass.expenseCategories)) {
            // It's already an array, use it as is
            categories = assetClass.expenseCategories;
          } else if (typeof assetClass.expenseCategories === 'object') {
            // It's an object, wrap it in an array
            categories = [assetClass.expenseCategories];
          }
          
          // Standardize each category in the array
          const standardizedCategories = categories.map((category: any) => {
            // If it's a string, convert to full object
            if (typeof category === 'string') {
              return {
                id: uuidv4(),
                name: category.trim(),
                description: '',
                defaultFrequency: 'monthly'
              };
            }
            
            // Otherwise ensure all required properties exist
            return {
              id: category.id || uuidv4(),
              name: category.name || 'Unnamed Category',
              description: category.description || '',
              defaultFrequency: category.defaultFrequency || 'monthly'
            };
          });
          
          // Deduplicate categories based on name to prevent duplicates
          const uniqueCategories = deduplicateCategories(standardizedCategories);
          console.log(`Deduplicated ${standardizedCategories.length - uniqueCategories.length} duplicate categories`);
          
          // Update the asset class with standardized and deduplicated categories
          await db.update(assetClasses)
            .set({ expenseCategories: JSON.stringify(uniqueCategories) })
            .where(eq(assetClasses.id, assetClass.id));
          
          console.log(`Updated asset class ${assetClass.id} (${assetClass.name}) with ${uniqueCategories.length} standardized categories (${standardizedCategories.length - uniqueCategories.length} duplicates removed)`);
          results[assetClass.name] = uniqueCategories.map(c => c.name);
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error standardizing categories for asset class ${assetClass.id}:`, error);
        results[assetClass.name] = { error: String(error) };
      }
    }
    
    console.log(`Successfully standardized expense categories for ${updatedCount} asset classes`);
    return { 
      success: true, 
      updatedCount,
      results
    };
  } catch (error) {
    console.error("Error standardizing expense categories:", error);
    return { 
      success: false, 
      error: String(error) 
    };
  }
}