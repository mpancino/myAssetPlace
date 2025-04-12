/**
 * This script updates assets with expenses that match the expense categories 
 * defined in asset classes.
 */

// Store the log entries so we can display them in the UI
const logMessages = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Override console.log and console.error to capture messages
console.log = function() {
  logMessages.push(['log', Array.from(arguments).join(' ')]);
  originalConsoleLog.apply(console, arguments);
};

console.error = function() {
  logMessages.push(['error', Array.from(arguments).join(' ')]);
  originalConsoleError.apply(console, arguments);
};

const updateAssetsWithExpenses = async () => {
  try {
    // First, get all asset classes and their expense categories
    const assetClassesResponse = await fetch('/api/asset-classes');
    const assetClasses = await assetClassesResponse.json();
    
    // Extract expense categories by asset class ID
    const expenseCategoriesByClassId = {};
    
    assetClasses.forEach(assetClass => {
      try {
        if (assetClass.expenseCategories) {
          const categories = JSON.parse(assetClass.expenseCategories);
          expenseCategoriesByClassId[assetClass.id] = categories;
          console.log(`Asset class ${assetClass.id} (${assetClass.name}) has ${categories.length} expense categories`);
        }
      } catch (error) {
        console.error(`Error parsing expense categories for asset class ${assetClass.id}:`, error);
        expenseCategoriesByClassId[assetClass.id] = [];
      }
    });
    
    // Get all user assets
    const assetsResponse = await fetch('/api/assets');
    const assets = await assetsResponse.json();
    
    if (assets.length === 0) {
      console.log("No assets found. Please make sure you're logged in.");
      return { success: false, message: "No assets found" };
    }
    
    console.log(`Found ${assets.length} assets to process`);
    
    // Process each asset and update it with expenses
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const asset of assets) {
      const assetClassId = asset.assetClassId;
      const categories = expenseCategoriesByClassId[assetClassId] || [];
      
      if (!categories.length) {
        console.log(`Skipping asset ${asset.id} (${asset.name}) - no expense categories defined for class ${assetClassId}`);
        skippedCount++;
        continue;
      }
      
      console.log(`Processing asset ${asset.id} (${asset.name}) with ${categories.length} expense categories`);
      
      // Create expenses for the asset
      const expenses = {};
      
      categories.forEach((category, index) => {
        // Get the category name based on object structure (old format or new format)
        const categoryName = typeof category === 'string' ? category : category.name;
        
        // Generate reasonable expense amount based on asset value
        let baseAmount = asset.value * 0.01; // 1% of asset value as base
        if (baseAmount < 50) baseAmount = 50; // Minimum expense amount
        if (baseAmount > 1000) baseAmount = 1000; // Maximum expense amount
        
        // Add some randomness
        const amount = Math.round(baseAmount * (0.5 + Math.random()));
        
        // Use the category's default frequency if available, otherwise default to 'monthly'
        const frequency = (typeof category === 'object' && category.defaultFrequency) 
          ? category.defaultFrequency 
          : 'monthly';
        
        // Create expense
        expenses[`expense-${index + 1}`] = {
          category: categoryName,
          amount,
          frequency
        };
      });
      
      // If property, update propertyExpenses field, otherwise update generic expenses field
      const isProperty = assetClassId === 3; // Based on your schema, Real Estate is ID 3
      const updateField = isProperty ? 'propertyExpenses' : 'expenses';
      
      // Prepare update payload
      const updatePayload = {
        [updateField]: JSON.stringify(expenses)
      };
      
      console.log(`Updating asset ${asset.id} with ${Object.keys(expenses).length} expenses in field ${updateField}`);
      
      try {
        // Update the asset
        const updateResponse = await fetch(`/api/assets/${asset.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });
        
        if (updateResponse.ok) {
          console.log(`Successfully updated asset ${asset.id} (${asset.name})`);
          updatedCount++;
        } else {
          const errorText = await updateResponse.text();
          console.error(`Failed to update asset ${asset.id}: ${errorText}`);
        }
      } catch (err) {
        console.error(`Error updating asset ${asset.id}: ${err.message}`);
      }
    }
    
    const result = {
      success: true,
      message: `Updated ${updatedCount} assets with expenses (${skippedCount} skipped)`,
      logs: logMessages
    };
    
    console.log('All assets have been processed!');
    return result;
    
  } catch (error) {
    console.error('Error updating assets with expenses:', error);
    return { 
      success: false, 
      message: error.message || 'Unknown error',
      logs: logMessages
    };
  }
};

// This is the function that will be called from our HTML page
export async function runExpenseUpdate() {
  return await updateAssetsWithExpenses();
}