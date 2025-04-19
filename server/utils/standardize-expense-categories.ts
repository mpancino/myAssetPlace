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
          
          // Update the asset class with standardized categories
          await db.update(assetClasses)
            .set({ expenseCategories: JSON.stringify(standardizedCategories) })
            .where(eq(assetClasses.id, assetClass.id));
          
          console.log(`Updated asset class ${assetClass.id} (${assetClass.name}) with ${standardizedCategories.length} standardized categories`);
          results[assetClass.name] = standardizedCategories.map(c => c.name);
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