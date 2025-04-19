/**
 * This script standardizes all expense data in the database to a consistent format
 */
import { db } from "../server/db";
import { assets } from "../shared/schema";
import { eq } from "drizzle-orm";
import { parseExpenses, standardizeExpense, generateExpenseId } from "../shared/expense-utils";

/**
 * Standardize all expense data in the database
 */
export async function standardizeExpenseData() {
  try {
    console.log("Starting expense data standardization...");
    
    // Fetch all assets
    const allAssets = await db.select().from(assets);
    let updatedCount = 0;
    
    for (const asset of allAssets) {
      try {
        const updates: Record<string, any> = {};
        let hasUpdates = false;
        
        // Process generic expenses
        if (asset.expenses) {
          const expensesData = parseExpenses(asset.expenses);
          const standardizedExpenses: Record<string, any> = {};
          
          // Standardize each expense
          Object.values(expensesData).forEach(expense => {
            const id = expense.id || generateExpenseId();
            standardizedExpenses[id] = standardizeExpense(expense);
          });
          
          updates.expenses = JSON.stringify(standardizedExpenses);
          hasUpdates = true;
          
          console.log(`Standardized ${Object.keys(standardizedExpenses).length} generic expenses for asset ${asset.id} (${asset.name})`);
        }
        
        // Process property expenses
        if (asset.propertyExpenses) {
          const expensesData = parseExpenses(asset.propertyExpenses);
          const standardizedExpenses: Record<string, any> = {};
          
          // Standardize each expense
          Object.values(expensesData).forEach(expense => {
            const id = expense.id || generateExpenseId();
            standardizedExpenses[id] = standardizeExpense(expense);
          });
          
          updates.propertyExpenses = JSON.stringify(standardizedExpenses);
          hasUpdates = true;
          
          console.log(`Standardized ${Object.keys(standardizedExpenses).length} property expenses for asset ${asset.id} (${asset.name})`);
        }
        
        // Process investment expenses
        if (asset.investmentExpenses) {
          const expensesData = parseExpenses(asset.investmentExpenses);
          const standardizedExpenses: Record<string, any> = {};
          
          // Standardize each expense
          Object.values(expensesData).forEach(expense => {
            const id = expense.id || generateExpenseId();
            standardizedExpenses[id] = standardizeExpense(expense);
          });
          
          updates.investmentExpenses = JSON.stringify(standardizedExpenses);
          hasUpdates = true;
          
          console.log(`Standardized ${Object.keys(standardizedExpenses).length} investment expenses for asset ${asset.id} (${asset.name})`);
        }
        
        // Update the asset if needed
        if (hasUpdates) {
          await db.update(assets)
            .set(updates)
            .where(eq(assets.id, asset.id));
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error standardizing expenses for asset ${asset.id}:`, error);
      }
    }
    
    console.log(`Successfully standardized expenses for ${updatedCount} assets`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error("Error standardizing expense data:", error);
    return { success: false, error: String(error) };
  }
}

// Function to standardize a single asset's expenses
export async function standardizeAssetExpenses(assetId: number) {
  try {
    console.log(`Standardizing expenses for asset ${assetId}...`);
    
    // Fetch the asset
    const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
    
    if (!asset) {
      console.error(`Asset ${assetId} not found`);
      return { success: false, error: "Asset not found" };
    }
    
    const updates: Record<string, any> = {};
    let hasUpdates = false;
    
    // Process generic expenses
    if (asset.expenses) {
      const expensesData = parseExpenses(asset.expenses);
      const standardizedExpenses: Record<string, any> = {};
      
      // Standardize each expense
      Object.values(expensesData).forEach(expense => {
        const id = expense.id || generateExpenseId();
        standardizedExpenses[id] = standardizeExpense(expense);
      });
      
      updates.expenses = JSON.stringify(standardizedExpenses);
      hasUpdates = true;
      
      console.log(`Standardized ${Object.keys(standardizedExpenses).length} generic expenses for asset ${asset.id} (${asset.name})`);
    }
    
    // Process property expenses
    if (asset.propertyExpenses) {
      const expensesData = parseExpenses(asset.propertyExpenses);
      const standardizedExpenses: Record<string, any> = {};
      
      // Standardize each expense
      Object.values(expensesData).forEach(expense => {
        const id = expense.id || generateExpenseId();
        standardizedExpenses[id] = standardizeExpense(expense);
      });
      
      updates.propertyExpenses = JSON.stringify(standardizedExpenses);
      hasUpdates = true;
      
      console.log(`Standardized ${Object.keys(standardizedExpenses).length} property expenses for asset ${asset.id} (${asset.name})`);
    }
    
    // Process investment expenses
    if (asset.investmentExpenses) {
      const expensesData = parseExpenses(asset.investmentExpenses);
      const standardizedExpenses: Record<string, any> = {};
      
      // Standardize each expense
      Object.values(expensesData).forEach(expense => {
        const id = expense.id || generateExpenseId();
        standardizedExpenses[id] = standardizeExpense(expense);
      });
      
      updates.investmentExpenses = JSON.stringify(standardizedExpenses);
      hasUpdates = true;
      
      console.log(`Standardized ${Object.keys(standardizedExpenses).length} investment expenses for asset ${asset.id} (${asset.name})`);
    }
    
    // Update the asset if needed
    if (hasUpdates) {
      await db.update(assets)
        .set(updates)
        .where(eq(assets.id, asset.id));
      
      return { success: true, assetId, assetName: asset.name };
    }
    
    return { success: true, assetId, assetName: asset.name, message: "No expense updates needed" };
  } catch (error) {
    console.error(`Error standardizing expenses for asset ${assetId}:`, error);
    return { success: false, error: String(error) };
  }
}