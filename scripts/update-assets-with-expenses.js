/**
 * This script updates assets with expenses that match the expense categories 
 * defined in asset classes.
 */

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
    
    // Process each asset and update it with expenses
    for (const asset of assets) {
      const assetClassId = asset.assetClassId;
      const categories = expenseCategoriesByClassId[assetClassId] || [];
      
      if (!categories.length) {
        console.log(`Skipping asset ${asset.id} (${asset.name}) - no expense categories defined for class ${assetClassId}`);
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
      
      // Update the asset
      const updateResponse = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });
      
      const updateResult = await updateResponse.json();
      console.log(`Updated asset ${asset.id} result:`, updateResponse.status === 200 ? 'Success' : 'Failed');
    }
    
    console.log('All assets have been updated with expenses!');
    return { success: true, message: 'All assets updated with expenses' };
    
  } catch (error) {
    console.error('Error updating assets with expenses:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
};

// Execute the function
updateAssetsWithExpenses()
  .then(result => {
    console.log(result);
  })
  .catch(err => {
    console.error('Script execution failed:', err);
  });