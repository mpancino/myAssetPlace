import { db } from "../db";
import { assetClasses } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * This utility standardizes all expense categories in the database to a consistent format
 * The standard format is an array of objects with id, name, description, and defaultFrequency
 */
export async function standardizeExpenseCategories() {
  try {
    console.log("Starting expense category standardization...");
    
    // Fetch all asset classes
    const allAssetClasses = await db.select().from(assetClasses);
    
    let standardizedCount = 0;
    let unchangedCount = 0;
    
    for (const assetClass of allAssetClasses) {
      try {
        if (!assetClass.expenseCategories) {
          console.log(`Asset class ${assetClass.id} (${assetClass.name}) has no expense categories, skipping.`);
          continue;
        }
        
        const expenseCategoriesString = String(assetClass.expenseCategories);
        let currentCategories: any[] = [];
        let needsStandardization = false;
        
        // Try to parse current categories
        try {
          currentCategories = JSON.parse(expenseCategoriesString);
          
          // If it's not an array, convert it
          if (!Array.isArray(currentCategories)) {
            currentCategories = [currentCategories];
            needsStandardization = true;
          }
          
          // Check if all items have the required properties in the standard format
          for (const category of currentCategories) {
            if (typeof category === 'string') {
              needsStandardization = true;
              break;
            }
            
            if (typeof category === 'object') {
              if (!category.id || !category.name || category.description === undefined || !category.defaultFrequency) {
                needsStandardization = true;
                break;
              }
            }
          }
        } catch (parseError) {
          // If it can't be parsed as JSON, it definitely needs standardization
          needsStandardization = true;
          
          // Create categories based on string format
          if (expenseCategoriesString.includes(',')) {
            // Comma-separated list
            currentCategories = expenseCategoriesString.split(',').map(item => item.trim());
          } else {
            // Single value
            currentCategories = [expenseCategoriesString];
          }
        }
        
        if (needsStandardization) {
          // Convert all categories to the standard format
          const standardizedCategories = currentCategories.map(category => {
            if (typeof category === 'string') {
              return {
                id: crypto.randomUUID(),
                name: category,
                description: "",
                defaultFrequency: "monthly"
              };
            } else if (typeof category === 'object') {
              return {
                id: category.id || crypto.randomUUID(),
                name: category.name || "Unknown Category",
                description: category.description || "",
                defaultFrequency: category.defaultFrequency || "monthly"
              };
            }
            
            // Fallback (should never happen)
            return {
              id: crypto.randomUUID(),
              name: "Unknown Category",
              description: "",
              defaultFrequency: "monthly"
            };
          });
          
          // Update the asset class with standardized categories
          await db
            .update(assetClasses)
            .set({ 
              expenseCategories: JSON.stringify(standardizedCategories),
              updatedAt: new Date()
            })
            .where(eq(assetClasses.id, assetClass.id));
          
          console.log(`Standardized ${standardizedCategories.length} categories for asset class ${assetClass.id} (${assetClass.name})`);
          standardizedCount++;
        } else {
          console.log(`Asset class ${assetClass.id} (${assetClass.name}) already has standardized expense categories.`);
          unchangedCount++;
        }
      } catch (assetClassError) {
        console.error(`Error standardizing expense categories for asset class ${assetClass.id}:`, assetClassError);
      }
    }
    
    console.log(`Expense category standardization complete. Standardized ${standardizedCount} asset classes. ${unchangedCount} were already standardized.`);
    return {
      success: true,
      standardizedCount,
      unchangedCount,
      totalProcessed: standardizedCount + unchangedCount,
    };
  } catch (error) {
    console.error("Error standardizing expense categories:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}