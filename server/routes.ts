import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, setupDirectAdminLogin } from "./auth";
import { 
  loginUserSchema, 
  insertAssetSchema, 
  insertCountrySchema, 
  insertAssetHoldingTypeSchema, 
  insertAssetClassSchema, 
  insertSubscriptionPlanSchema, 
  updateSystemSettingsSchema, 
  users,
  assets,
  assetClasses 
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { upload, getFileUrl, deleteFile } from "./utils/upload";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Set up direct admin login for easier testing
  await setupDirectAdminLogin(app);
  
  // Serve scripts directory
  app.use('/scripts', express.static(path.join(process.cwd(), 'scripts')));
  
  // Run update expenses script
  app.post('/api/run-update-expenses', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Get all asset classes and extract expense categories
      const assetClasses = await storage.listAssetClasses();
      const expenseCategoriesByClassId: Record<number, any[]> = {};
      
      assetClasses.forEach(assetClass => {
        // Initialize with empty array
        expenseCategoriesByClassId[assetClass.id] = [];
        
        try {
          if (assetClass.expenseCategories) {
            let categories: any[] = [];
            const expenseCategoriesString = String(assetClass.expenseCategories);
            
            // Try to parse as JSON first
            try {
              categories = JSON.parse(expenseCategoriesString);
              // If parsed successfully, check if it's an array
              if (!Array.isArray(categories)) {
                categories = [categories]; // Convert to array if it's a single object
              }
            } catch (parseError) {
              // If JSON parse fails, check if it's a comma-separated list or single value
              if (expenseCategoriesString.includes(',')) {
                // Split by comma and trim each item
                categories = expenseCategoriesString.split(',').map((item: string) => item.trim());
              } else {
                // Single value, create a category object
                categories = [{ 
                  id: crypto.randomUUID(), 
                  name: expenseCategoriesString,
                  description: "",
                  defaultFrequency: "monthly"
                }];
              }
            }
            
            // Transform any string values to proper category objects
            categories = categories.map(category => {
              if (typeof category === 'string') {
                return {
                  id: crypto.randomUUID(),
                  name: category,
                  description: "",
                  defaultFrequency: "monthly"
                };
              }
              return category;
            });
            
            expenseCategoriesByClassId[assetClass.id] = categories;
            console.log(`Asset class ${assetClass.id} (${assetClass.name}) has ${categories.length} expense categories`);
          }
        } catch (error) {
          console.error(`Error processing expense categories for asset class ${assetClass.id}:`, error);
        }
      });
      
      // Get all user assets
      const assets = await storage.listAssets(req.user.id);
      
      if (assets.length === 0) {
        return res.json({ 
          success: false, 
          message: "No assets found for this user" 
        });
      }
      
      console.log(`Found ${assets.length} assets to process for user ${req.user.id}`);
      
      // Process each asset and update it with expenses
      let updatedCount = 0;
      let skippedCount = 0;
      const logMessages = [];
      
      for (const asset of assets) {
        const assetClassId = asset.assetClassId;
        const categories = expenseCategoriesByClassId[assetClassId] || [];
        
        if (!categories.length) {
          logMessages.push(`Skipping asset ${asset.id} (${asset.name}) - no expense categories defined for class ${assetClassId}`);
          skippedCount++;
          continue;
        }
        
        logMessages.push(`Processing asset ${asset.id} (${asset.name}) with ${categories.length} expense categories`);
        
        // Create expenses for the asset
        const expenses: Record<string, { category: string; amount: number; frequency: string }> = {};
        
        categories.forEach((category: any, index: number) => {
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
          
          // Create expense with proper key
          const expenseKey = `expense-${index + 1}`;
          expenses[expenseKey] = {
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
        
        logMessages.push(`Updating asset ${asset.id} with ${Object.keys(expenses).length} expenses in field ${updateField}`);
        
        try {
          // Update the asset
          const updatedAsset = await storage.updateAsset(asset.id, updatePayload);
          
          if (updatedAsset) {
            logMessages.push(`Successfully updated asset ${asset.id} (${asset.name})`);
            updatedCount++;
          } else {
            logMessages.push(`Failed to update asset ${asset.id}`);
          }
        } catch (err) {
          logMessages.push(`Error updating asset ${asset.id}: ${err.message}`);
        }
      }
      
      return res.json({
        success: true,
        message: `Updated ${updatedCount} assets with expenses (${skippedCount} skipped)`,
        logs: logMessages
      });
      
    } catch (error) {
      console.error('Error updating assets with expenses:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Unknown error'
      });
    }
  });

  // Add endpoint to standardize expense categories for all asset classes
  app.post('/api/admin/standardize-expense-categories', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized - admin access required" });
    }
    
    try {
      const { standardizeExpenseCategories } = await import('./utils/standardize-expense-categories');
      const result = await standardizeExpenseCategories();
      return res.json(result);
    } catch (error) {
      console.error('Error standardizing expense categories:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Custom middleware to check if user is admin
  const isAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized" });
    }
    next();
  };
  
  // User subscription routes
  app.get("/api/user/subscription", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get user's subscription
      const subscription = await storage.getUserSubscription(req.user.id);
      
      if (!subscription) {
        // If no subscription exists, assign the default plan
        const defaultPlan = await storage.getDefaultSubscriptionPlan();
        if (!defaultPlan) {
          return res.status(500).send("No default subscription plan configured");
        }
        
        // Convert dates to strings in ISO format to match the schema
        const startDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
        const endDate = new Date(Date.now() + (30 * 86400000)).toISOString().split('T')[0]; // 30 days from now
        
        // Create new subscription with default plan
        const newSubscription = await storage.createUserSubscription({
          userId: req.user.id,
          subscriptionPlanId: defaultPlan.id,
          status: "active",
          startDate: startDate,
          endDate: endDate,
        });
        
        // Return the newly created subscription with plan details
        const subscriptionWithPlan = await storage.getUserSubscription(req.user.id);
        return res.json(subscriptionWithPlan);
      }
      
      return res.json(subscription);
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      return res.status(500).send("Failed to fetch subscription");
    }
  });
  
  // Get asset count for the user (to check against limits)
  app.get("/api/user/asset-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const assets = await storage.listAssets(req.user.id);
      return res.json({ count: assets.length });
    } catch (error) {
      console.error("Error fetching asset count:", error);
      return res.status(500).send("Failed to fetch asset count");
    }
  });
  
  // Update user preferred interface mode
  app.post("/api/user/mode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { mode } = req.body;
      if (mode !== 'basic' && mode !== 'advanced') {
        return res.status(400).send("Invalid mode");
      }
      
      // Check if user is allowed to use this mode based on subscription
      const subscription = await storage.getUserSubscription(req.user.id);
      
      // Parse the allowed interface modes to check if advanced mode is allowed
      let isAdvancedAllowed = false;
      if (subscription && subscription.plan.allowedInterfaceModes) {
        try {
          const allowedModes = JSON.parse(String(subscription.plan.allowedInterfaceModes));
          isAdvancedAllowed = Array.isArray(allowedModes) && allowedModes.includes("advanced");
        } catch (error) {
          console.error("Error parsing allowed interface modes:", error);
        }
      }
      
      if (mode === 'advanced' && (!subscription || !isAdvancedAllowed)) {
        return res.status(403).send("Subscription does not allow advanced mode");
      }
      
      // Update user's preferred mode
      const updated = await storage.updateUser(req.user.id, { 
        preferredMode: mode 
      });
      
      return res.json(updated);
    } catch (error) {
      console.error("Error updating user mode:", error);
      return res.status(500).send("Failed to update mode");
    }
  });
  
  // Subscription plans routes
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.listSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      return res.status(500).send("Failed to fetch subscription plans");
    }
  });
  
  // Upgrade subscription
  app.post("/api/user/subscription/upgrade", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { planId } = req.body;
      if (!planId) {
        return res.status(400).send("Plan ID is required");
      }
      
      // Validate plan exists
      const plan = await storage.getSubscriptionPlan(Number(planId));
      if (!plan) {
        return res.status(404).send("Subscription plan not found");
      }
      
      // Update user's subscription
      const subscription = await storage.updateUserSubscription(req.user.id, Number(planId));
      
      // Return updated subscription with plan details
      const subscriptionWithPlan = await storage.getUserSubscription(req.user.id);
      return res.json(subscriptionWithPlan);
    } catch (error) {
      console.error("Failed to upgrade subscription:", error);
      return res.status(500).send("Failed to upgrade subscription");
    }
  });

  // Country routes
  app.get("/api/countries", async (req, res) => {
    try {
      const countries = await storage.listCountries();
      res.json(countries);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  app.post("/api/countries", isAdmin, async (req, res) => {
    try {
      const validatedData = insertCountrySchema.parse(req.body);
      const country = await storage.createCountry(validatedData);
      res.status(201).json(country);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create country" });
    }
  });

  app.put("/api/countries/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCountrySchema.partial().parse(req.body);
      const country = await storage.updateCountry(id, validatedData);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
      res.json(country);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update country" });
    }
  });

  // Asset Holding Types routes
  app.get("/api/asset-holding-types", async (req, res) => {
    try {
      const countryId = req.query.countryId ? parseInt(req.query.countryId as string) : undefined;
      const types = await storage.listAssetHoldingTypes(countryId);
      res.json(types);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch asset holding types" });
    }
  });

  app.post("/api/asset-holding-types", isAdmin, async (req, res) => {
    try {
      const validatedData = insertAssetHoldingTypeSchema.parse(req.body);
      const type = await storage.createAssetHoldingType(validatedData);
      res.status(201).json(type);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create asset holding type" });
    }
  });

  app.put("/api/asset-holding-types/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAssetHoldingTypeSchema.partial().parse(req.body);
      const type = await storage.updateAssetHoldingType(id, validatedData);
      if (!type) {
        return res.status(404).json({ message: "Asset holding type not found" });
      }
      res.json(type);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update asset holding type" });
    }
  });

  // Asset Classes routes
  app.get("/api/asset-classes", async (req, res) => {
    try {
      const classes = await storage.listAssetClasses();
      res.json(classes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch asset classes" });
    }
  });
  
  app.get("/api/asset-classes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assetClass = await storage.getAssetClass(id);
      
      if (!assetClass) {
        return res.status(404).json({ message: "Asset class not found" });
      }
      
      res.json(assetClass);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch asset class" });
    }
  });

  app.post("/api/asset-classes", isAdmin, async (req, res) => {
    try {
      const validatedData = insertAssetClassSchema.parse(req.body);
      const assetClass = await storage.createAssetClass(validatedData);
      res.status(201).json(assetClass);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create asset class" });
    }
  });

  app.put("/api/asset-classes/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAssetClassSchema.partial().parse(req.body);
      const assetClass = await storage.updateAssetClass(id, validatedData);
      if (!assetClass) {
        return res.status(404).json({ message: "Asset class not found" });
      }
      res.json(assetClass);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update asset class" });
    }
  });
  
  // Add PATCH endpoint as an alternative to PUT for asset classes
  app.patch("/api/asset-classes/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAssetClassSchema.partial().parse(req.body);
      const assetClass = await storage.updateAssetClass(id, validatedData);
      if (!assetClass) {
        return res.status(404).json({ message: "Asset class not found" });
      }
      res.json(assetClass);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update asset class" });
    }
  });
  
  // Add DELETE endpoint for asset classes
  app.delete("/api/asset-classes/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Define protected core asset classes (from PDD)
      const protectedAssetClassIds = [1, 2, 3, 4, 5, 8, 9]; // Core asset classes explicitly mentioned in the PDD
      
      // Check if this is a protected core asset class
      if (protectedAssetClassIds.includes(id)) {
        return res.status(400).json({ 
          message: "Cannot delete core asset classes that are required by the system",
          isProtected: true
        });
      }
      
      // Check if this asset class is in use
      const allAssets = await storage.listAssets(req.user!.id);
      const assetsUsingClass = allAssets.filter(asset => asset.assetClassId === id);
      if (assetsUsingClass.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete asset class that is in use by assets",
          assetCount: assetsUsingClass.length
        });
      }
      
      const success = await storage.deleteAssetClass(id);
      if (!success) {
        return res.status(404).json({ message: "Asset class not found" });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting asset class:", err);
      res.status(500).json({ message: "Failed to delete asset class" });
    }
  });

  // Assets routes
  app.get("/api/assets", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const assetClassId = req.query.assetClassId ? parseInt(req.query.assetClassId as string) : undefined;
      
      // If assetClassId is provided, filter assets by that class
      if (assetClassId) {
        const allAssets = await storage.listAssets(req.user.id);
        const filteredAssets = allAssets.filter(asset => asset.assetClassId === assetClassId);
        return res.json(filteredAssets);
      }
      
      // Otherwise return all assets with optional limit
      const assets = await storage.listAssets(req.user.id, limit);
      res.json(assets);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });
  
  app.get("/api/assets/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      // Check if the asset belongs to the user
      if (asset.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this asset" });
      }
      
      res.json(asset);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.get("/api/assets/by-class", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Let's use console.error to make sure these logs are visible
      console.error("Building assets by class manually for user ID:", req.user.id);
      
      try {
        // Instead of using storage.getUserAssetsByClass, do it directly here
        // 1. Get all asset classes
        const allAssetClasses = await db.select().from(assetClasses);
        console.error(`Found ${allAssetClasses.length} asset classes`);
        
        if (!allAssetClasses.length) {
          console.error("No asset classes found!");
          return res.json([]);
        }
        
        // 2. Get all user's assets
        const userAssets = await db.select().from(assets).where(eq(assets.userId, req.user.id));
        console.error(`Found ${userAssets.length} assets for user`);
        
        // 3. Initialize results with all classes at zero
        const results = allAssetClasses.map(ac => ({
          assetClass: ac,
          totalValue: 0
        }));
        
        // 4. Add up values by class
        for (const asset of userAssets) {
          if (asset && asset.assetClassId) {
            const resultIndex = results.findIndex(r => r.assetClass.id === asset.assetClassId);
            if (resultIndex >= 0) {
              const assetValue = typeof asset.value === 'number' ? asset.value : 0;
              results[resultIndex].totalValue += assetValue;
            }
          }
        }
        
        console.error(`Successfully built asset class results with ${results.length} classes`);
        res.json(results);
      } catch (innerErr) {
        console.error("Detailed inner error:", innerErr);
        throw innerErr;
      }
    } catch (err) {
      console.error("Error in /api/assets/by-class endpoint:", err);
      console.error("Error details:", err instanceof Error ? err.stack : String(err));
      res.status(500).json({ message: "Failed to fetch assets by class" });
    }
  });

  app.post("/api/assets", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const validatedData = insertAssetSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const asset = await storage.createAsset(validatedData);
      res.status(201).json(asset);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.patch("/api/assets/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (asset.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this asset" });
      }
      
      // Enhanced logging for property expenses debug
      console.log("PATCH request for asset:", id);
      console.log("Property expenses in request:", 
        req.body.propertyExpenses ? 
        `Found ${Object.keys(req.body.propertyExpenses).length} expenses` : 
        "None");
      
      // For real estate assets, check for property expenses and implement deduplication
      if (asset.assetClassId === 3 && req.body.propertyExpenses) {
        console.log("Detailed property expenses data:", JSON.stringify(req.body.propertyExpenses));
        
        // Handle property expenses deduplication
        try {
          const expensesData = typeof req.body.propertyExpenses === 'string' 
            ? JSON.parse(req.body.propertyExpenses) 
            : req.body.propertyExpenses;
          
          // Create a deduplication tracker
          const dedupeTracker: Record<string, boolean> = {};
          const dedupedExpenses: Record<string, any> = {};
          
          // Sort expenses to prioritize "expense-N" IDs over random UUIDs
          const sortedEntries = Object.entries(expensesData).sort(([keyA], [keyB]) => {
            const isOriginalA = keyA.startsWith('expense-');
            const isOriginalB = keyB.startsWith('expense-');
            if (isOriginalA && !isOriginalB) return -1;
            if (!isOriginalA && isOriginalB) return 1;
            return 0;
          });
          
          // Process entries with deduplication
          sortedEntries.forEach(([key, expense]) => {
            // Make sure expense is an object and has required properties
            if (expense && typeof expense === 'object' && 
                'category' in expense && 
                'amount' in expense) {
              
              // Safely extract properties with type checking
              const category = String(expense.category || '');
              const amount = Number(expense.amount || 0);
              // Check if frequency property exists, defaulting to monthly
              const frequency = typeof (expense as any).frequency === 'string' 
                ? String((expense as any).frequency) 
                : 'monthly';
              
              // Skip empty or invalid expenses
              if (!category || amount <= 0) return;
              
              // Create a unique key for this expense signature
              const dedupeKey = `${category}-${amount}-${frequency}`;
              
              // Skip if we've already seen this signature
              if (dedupeTracker[dedupeKey]) {
                console.log(`Deduplicating expense: ${dedupeKey}`);
                return;
              }
              
              // Mark this signature as seen
              dedupeTracker[dedupeKey] = true;
              
              // Keep this expense
              dedupedExpenses[key] = expense;
            }
          });
          
          console.log(`Deduplicated expenses from ${Object.keys(expensesData).length} to ${Object.keys(dedupedExpenses).length}`);
          req.body.propertyExpenses = JSON.stringify(dedupedExpenses);
        } catch (err) {
          console.error("Error during expense deduplication:", err);
        }
      }
      
      const validatedData = insertAssetSchema.partial().parse(req.body);
      
      // Log the validated data to ensure property expenses survived validation
      console.log("Property expenses after validation:", 
        validatedData.propertyExpenses ? 
        `Found ${Object.keys(validatedData.propertyExpenses).length} expenses` : 
        "None");
      
      const updatedAsset = await storage.updateAsset(id, validatedData);
      
      // Immediately verify the saved data by fetching it again
      const verifiedAsset = await storage.getAsset(id);
      console.log("VERIFICATION - Property expenses after save:", 
        verifiedAsset?.propertyExpenses ? 
        `Found ${Object.keys(verifiedAsset.propertyExpenses).length} expenses` : 
        "None");
      
      res.json(updatedAsset);
    } catch (err) {
      console.error("Error updating asset:", err);
      if (err instanceof z.ZodError) {
        console.error("Validation error details:", JSON.stringify(err.errors));
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update asset" });
    }
  });
  
  app.delete("/api/assets/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      // Check if the asset belongs to the user
      if (asset.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this asset" });
      }
      
      // Delete the asset
      await storage.deleteAsset(id);
      
      res.status(200).json({ message: "Asset deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Offset Account Routes
  
  // Link a cash account as an offset account to a loan
  app.post("/api/assets/offset-link", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { cashAccountId, loanId } = req.body;
      
      if (!cashAccountId || !loanId) {
        return res.status(400).json({ message: "Both cashAccountId and loanId are required" });
      }
      
      // Verify assets exist and belong to the user
      const cashAccount = await storage.getAsset(cashAccountId);
      const loan = await storage.getAsset(loanId);
      
      if (!cashAccount) {
        return res.status(404).json({ message: "Cash account not found" });
      }
      
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      
      if (cashAccount.userId !== req.user.id || loan.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to link these assets" });
      }
      
      const success = await storage.linkOffsetAccount(cashAccountId, loanId);
      
      if (success) {
        res.json({ message: "Offset account linked successfully" });
      } else {
        res.status(400).json({ message: "Failed to link offset account" });
      }
    } catch (err) {
      res.status(500).json({ message: "Error linking offset account" });
    }
  });
  
  // Unlink a cash account from being an offset account
  app.post("/api/assets/offset-unlink", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { cashAccountId } = req.body;
      
      if (!cashAccountId) {
        return res.status(400).json({ message: "Cash account ID is required" });
      }
      
      // Verify cash account exists and belongs to the user
      const cashAccount = await storage.getAsset(cashAccountId);
      
      if (!cashAccount) {
        return res.status(404).json({ message: "Cash account not found" });
      }
      
      if (cashAccount.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to modify this asset" });
      }
      
      const success = await storage.unlinkOffsetAccount(cashAccountId);
      
      if (success) {
        res.json({ message: "Offset account unlinked successfully" });
      } else {
        res.status(400).json({ message: "Failed to unlink offset account" });
      }
    } catch (err) {
      res.status(500).json({ message: "Error unlinking offset account" });
    }
  });
  
  // Get linked offset accounts for a loan
  app.get("/api/loans/:id/offset-accounts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const loanId = parseInt(req.params.id);
      
      // Verify loan exists and belongs to the user
      const loan = await storage.getAsset(loanId);
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      
      if (loan.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to access this loan" });
      }
      
      if (!loan.isLiability) {
        return res.status(400).json({ message: "Specified asset is not a loan" });
      }
      
      const offsetAccounts = await storage.getLinkedOffsetAccounts(loanId);
      res.json(offsetAccounts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch offset accounts" });
    }
  });

  // Subscription Plans routes
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.listSubscriptionPlans();
      res.json(plans);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.post("/api/subscription-plans", isAdmin, async (req, res) => {
    try {
      const validatedData = insertSubscriptionPlanSchema.parse(req.body);
      const plan = await storage.createSubscriptionPlan(validatedData);
      res.status(201).json(plan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  app.put("/api/subscription-plans/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSubscriptionPlanSchema.partial().parse(req.body);
      const plan = await storage.updateSubscriptionPlan(id, validatedData);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      res.json(plan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // User Subscription management
  app.post("/api/user/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { subscriptionPlanId } = req.body;
      if (!subscriptionPlanId) {
        return res.status(400).json({ message: "Subscription plan ID is required" });
      }
      
      const plan = await storage.getSubscriptionPlan(subscriptionPlanId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      const subscription = await storage.updateUserSubscription(req.user.id, subscriptionPlanId);
      res.json(subscription);
    } catch (err) {
      res.status(500).json({ message: "Failed to update user subscription" });
    }
  });

  // System Settings routes
  app.get("/api/system-settings", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || {});
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.put("/api/system-settings", isAdmin, async (req, res) => {
    try {
      const validatedData = updateSystemSettingsSchema.parse(req.body);
      const settings = await storage.updateSystemSettings(validatedData);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });
  
  // Image upload for login splash screen
  app.post("/api/upload/splash-image", isAdmin, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      
      // Get the current system settings
      const currentSettings = await storage.getSystemSettings();
      
      // If there's an existing image, delete it
      if (currentSettings?.loginSplashImageUrl) {
        try {
          const filename = path.basename(currentSettings.loginSplashImageUrl);
          await deleteFile(filename);
        } catch (error) {
          console.error("Error deleting previous image:", error);
          // Continue even if previous file deletion fails
        }
      }
      
      // Get the public URL for the uploaded file
      const imageUrl = getFileUrl(req.file.filename);
      
      // Update the system settings with the new image URL
      const updatedSettings = await storage.updateSystemSettings({
        loginSplashImageUrl: imageUrl,
        // Preserve existing title and text if they exist
        loginSplashTitle: currentSettings?.loginSplashTitle,
        loginSplashText: currentSettings?.loginSplashText,
      });
      
      res.status(200).json({ 
        message: "Image uploaded successfully", 
        imageUrl,
        settings: updatedSettings
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });
  
  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Basic security check to avoid directory traversal
    const requestedFile = path.basename(req.path);
    const filePath = path.join(process.cwd(), 'uploads', requestedFile);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ message: "File not found" });
      }
    });
  });

  // User profile route
  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const validatedData = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        countryId: z.number().optional(),
        preferredMode: z.enum(['basic', 'advanced']).optional(),
      }).parse(req.body);
      
      const user = await storage.updateUser(req.user.id, validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  
  // Demo user available endpoint
  app.get("/api/demo-user/available", async (req, res) => {
    try {
      // Find a demo user that's not completed onboarding
      const demoUsers = await db
        .select()
        .from(users)
        .where(and(
          eq(users.isDemo, true),
          eq(users.completedOnboarding, false),
        ))
        .limit(1);
      
      if (demoUsers && demoUsers.length > 0) {
        // Log the user in by creating a session
        req.login(demoUsers[0], (err) => {
          if (err) {
            console.error("Error logging in demo user:", err);
            return res.status(500).json({ message: "Error logging in demo user" });
          }
          
          return res.status(200).json(demoUsers[0]);
        });
      } else {
        // No available demo user
        return res.status(404).json({ message: "No available demo users" });
      }
    } catch (error) {
      console.error("Error finding available demo user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Demo user onboarding route
  app.put("/api/user/onboarding", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Only allow this endpoint for demo users
      if (!req.user.isDemo) {
        return res.status(403).json({ message: "Only available for demo users" });
      }
      
      const validatedData = z.object({
        age: z.number().min(18).max(100),
        targetRetirementAge: z.number().min(18).max(100),
        completedOnboarding: z.boolean()
      }).parse(req.body);
      
      // Ensure target retirement age is greater than current age
      if (validatedData.targetRetirementAge && validatedData.age) {
        if (validatedData.targetRetirementAge <= validatedData.age) {
          return res.status(400).json({
            message: "Target retirement age must be greater than current age"
          });
        }
      }
      
      const user = await storage.updateUser(req.user.id, validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update onboarding information" });
    }
  });

  // User subscription management routes
  app.get("/api/user/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const subscription = await storage.getUserSubscription(req.user.id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.json(subscription);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Upgrade subscription
  app.post("/api/user/subscription/upgrade", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }
      
      // Verify plan exists
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      // Update user's subscription
      const subscription = await storage.updateUserSubscription(req.user.id, planId);
      
      if (!subscription) {
        return res.status(400).json({ message: "Failed to update subscription" });
      }
      
      // Return full subscription with plan details
      const fullSubscription = await storage.getUserSubscription(req.user.id);
      res.json(fullSubscription);
    } catch (err) {
      res.status(500).json({ message: "Failed to upgrade subscription" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
