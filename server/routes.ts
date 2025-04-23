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
  insertMortgageSchema,
  users,
  assets,
  assetClasses,
  mortgages,
  transformTaxSettings,
  AssetWithLegacyMortgage,
  type AssetHoldingType,
  type ProjectionConfig,
  type ProjectionResult,
  type Asset,
  type Mortgage
} from "@shared/schema";
import { generateProjections, defaultBasicProjectionConfig } from "@shared/projections";
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
  
  // Standardize expenses across all assets (admin only)
  app.get('/api/admin/standardize-expenses', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can run standardization" 
      });
    }
    
    try {
      // Import the standardization function
      const { standardizeExpenseData } = await import('../scripts/standardize-expenses');
      
      // Run the standardization
      const result = await standardizeExpenseData();
      
      return res.json({
        success: true,
        message: `Standardized expenses for ${result.updatedCount} assets`,
        result
      });
      
    } catch (error: unknown) {
      console.error('Error standardizing expenses:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return res.status(500).json({
        success: false,
        message: `Failed to standardize expenses: ${errorMessage}`
      });
    }
  });
  
  // Standardize expenses for a specific asset (admin only)
  app.get('/api/admin/standardize-expenses/:assetId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can run standardization" 
      });
    }
    
    try {
      const assetId = parseInt(req.params.assetId);
      
      if (isNaN(assetId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid asset ID"
        });
      }
      
      // Import the standardization function
      const { standardizeAssetExpenses } = await import('../scripts/standardize-expenses');
      
      // Run the standardization
      const result = await standardizeAssetExpenses(assetId);
      
      return res.json({
        success: true,
        message: `Standardized expenses for asset ${assetId}`,
        result
      });
      
    } catch (error: unknown) {
      console.error('Error standardizing expenses:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return res.status(500).json({
        success: false,
        message: `Failed to standardize expenses: ${errorMessage}`
      });
    }
  });
  
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
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          logMessages.push(`Error updating asset ${asset.id}: ${errorMessage}`);
        }
      }
      
      return res.json({
        success: true,
        message: `Updated ${updatedCount} assets with expenses (${skippedCount} skipped)`,
        logs: logMessages
      });
      
    } catch (error: unknown) {
      console.error('Error updating assets with expenses:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
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
      
      // Debug logging for incoming request
      console.log('[ASSET_HOLDING_TYPE] Update request for ID:', id);
      console.log('[ASSET_HOLDING_TYPE] Request body:', JSON.stringify(req.body));
      
      // For simplicity, directly process the request body
      let updatedData: Partial<AssetHoldingType> = {
        name: req.body.name,
        description: req.body.description,
        countryId: req.body.countryId ? parseInt(req.body.countryId) : undefined
      };
      
      // Handle taxSettings separately - this is causing the problems
      if (req.body.taxSettings !== undefined) {
        console.log('[ASSET_HOLDING_TYPE] Incoming taxSettings type:', typeof req.body.taxSettings);
        
        // Convert taxSettings to proper format based on its current type
        if (typeof req.body.taxSettings === 'string') {
          try {
            updatedData.taxSettings = JSON.parse(req.body.taxSettings);
            console.log('[ASSET_HOLDING_TYPE] Successfully parsed taxSettings string');
          } catch (e) {
            console.error('[ASSET_HOLDING_TYPE] Failed to parse taxSettings string:', e);
            // If parsing fails, use empty object
            updatedData.taxSettings = {};
          }
        } else {
          // If it's already an object, use it directly
          updatedData.taxSettings = req.body.taxSettings;
        }
        
        console.log('[ASSET_HOLDING_TYPE] Processed taxSettings:', 
          JSON.stringify(updatedData.taxSettings));
      }
      
      // Basic validation
      if (updatedData.name !== undefined && updatedData.name.length < 2) {
        return res.status(400).json({ 
          errors: [{ path: ["name"], message: "Name is required and must be at least 2 characters" }] 
        });
      }
      
      if (updatedData.countryId !== undefined && (!Number.isInteger(updatedData.countryId) || updatedData.countryId <= 0)) {
        return res.status(400).json({ 
          errors: [{ path: ["countryId"], message: "Country ID must be a positive integer" }] 
        });
      }
      
      const type = await storage.updateAssetHoldingType(id, updatedData);
      if (!type) {
        return res.status(404).json({ message: "Asset holding type not found" });
      }
      
      // Log what's being sent back
      console.log('[ASSET_HOLDING_TYPE] Response data:', JSON.stringify(type));
      
      res.json(type);
    } catch (err) {
      console.error('[ASSET_HOLDING_TYPE] Error updating:', err);
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
      const assetClassName = req.query.assetClass as string | undefined;
      
      // Get all assets first (we'll need to filter them)
      const allAssets = await storage.listAssets(req.user.id);
      
      // If assetClassId is provided, filter assets by that class ID
      if (assetClassId) {
        const filteredAssets = allAssets.filter(asset => asset.assetClassId === assetClassId);
        return res.json(filteredAssets);
      }
      
      // If assetClassName is provided, filter assets by class name
      if (assetClassName) {
        // Get all asset classes first
        const assetClasses = await storage.listAssetClasses();
        
        // Find the asset class ID matching the provided name (case insensitive)
        const targetClass = assetClasses.find(ac => 
          ac.name.toLowerCase() === assetClassName.toLowerCase()
        );
        
        if (targetClass) {
          const filteredAssets = allAssets.filter(asset => asset.assetClassId === targetClass.id);
          return res.json(filteredAssets);
        }
        
        // If no matching class found, return empty array
        return res.json([]);
      }
      
      // Otherwise return all assets with optional limit
      if (limit && limit > 0) {
        return res.json(allAssets.slice(0, limit));
      }
      
      res.json(allAssets);
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
      
      // Enhanced logging for asset updates
      console.log("PATCH request for asset:", id);
      
      // Handle expense logging
      if (req.body.propertyExpenses) {
        console.log("Property expenses in request:", 
          typeof req.body.propertyExpenses === 'object' ? 
          `Found ${Object.keys(req.body.propertyExpenses).length} expenses` : 
          `Unexpected format: ${typeof req.body.propertyExpenses}`);
      }
      
      if (req.body.investmentExpenses) {
        console.log("Investment expenses in request:", 
          typeof req.body.investmentExpenses === 'object' ? 
          `Found ${Object.keys(req.body.investmentExpenses).length} expenses` : 
          `Unexpected format: ${typeof req.body.investmentExpenses}`);
      }
      
      // Ensure any null expense fields are converted to empty objects to prevent validation errors
      if (req.body.propertyExpenses === null) {
        console.log("Converting null propertyExpenses to empty object");
        req.body.propertyExpenses = {};
      }
      
      if (req.body.investmentExpenses === null) {
        console.log("Converting null investmentExpenses to empty object");
        req.body.investmentExpenses = {};
      }
      
      if (req.body.expenses === null) {
        console.log("Converting null expenses to empty object");
        req.body.expenses = {};
      }
      
      // Ensure accountType is a string to match schema
      if (req.body.accountType) {
        req.body.accountType = String(req.body.accountType);
      }
      
      console.log("Validating data for PATCH request");
      
      try {
        // Validate the data using Zod schema
        const validatedData = insertAssetSchema.partial().parse(req.body);
        console.log("Successfully validated data");
        
        // Log the validated expense data
        if (validatedData.propertyExpenses) {
          console.log("Property expenses after validation:", 
            `Found ${Object.keys(validatedData.propertyExpenses).length} expenses`);
        }
          
        if (validatedData.investmentExpenses) {
          console.log("Investment expenses after validation:", 
            `Found ${Object.keys(validatedData.investmentExpenses).length} expenses`);
        }
        
        // Update the asset with validated data
        const updatedAsset = await storage.updateAsset(id, validatedData);
        
        // Immediately verify the saved data by fetching it again
        const verifiedAsset = await storage.getAsset(id);
        console.log("VERIFICATION - Property expenses after save:", 
          verifiedAsset && verifiedAsset.propertyExpenses && typeof verifiedAsset.propertyExpenses === 'object' ? 
          `Found ${Object.keys(verifiedAsset.propertyExpenses).length} expenses` : 
          "None");
          
        console.log("VERIFICATION - Investment expenses after save:", 
          verifiedAsset && verifiedAsset.investmentExpenses && typeof verifiedAsset.investmentExpenses === 'object' ? 
          `Found ${Object.keys(verifiedAsset.investmentExpenses).length} expenses` : 
          "None");
        
        res.json(updatedAsset);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("Validation error details:", JSON.stringify(validationError.errors));
          return res.status(400).json({ 
            message: "Invalid request data", 
            details: validationError.errors
          });
        }
        throw validationError; // Re-throw if it's not a ZodError
      }
    } catch (err) {
      console.error("Error updating asset:", err);
      res.status(500).json({ 
        message: "Failed to update asset",
        error: err instanceof Error ? err.message : "Unknown error"
      });
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

  // Mortgage routes
  app.get("/api/mortgages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const mortgages = await storage.listMortgages(req.user.id);
      res.json(mortgages);
    } catch (err) {
      console.error("Error fetching mortgages:", err);
      res.status(500).json({ message: "Failed to fetch mortgages" });
    }
  });

  app.get("/api/mortgages/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const mortgage = await storage.getMortgage(id);
      
      if (!mortgage) {
        return res.status(404).json({ message: "Mortgage not found" });
      }
      
      // Check if user owns the mortgage
      if (mortgage.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this mortgage" });
      }
      
      res.json(mortgage);
    } catch (err) {
      console.error("Error fetching mortgage:", err);
      res.status(500).json({ message: "Failed to fetch mortgage" });
    }
  });

  // New endpoint to get the loan asset associated with a mortgage
  app.get("/api/mortgages/:id/asset", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const mortgageId = parseInt(req.params.id);
      const mortgage = await storage.getMortgage(mortgageId);
      
      if (!mortgage) {
        return res.status(404).json({ message: "Mortgage not found" });
      }
      
      // Check if user owns the mortgage
      if (mortgage.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this mortgage" });
      }
      
      // Find the matching loan asset, searching by name and properties
      const allAssets = await storage.listAssets(req.user.id);
      
      // Find loan assets that match this mortgage (should have mortgage-specific properties)
      const loanAsset = allAssets.find(asset => 
        asset.isLiability === true && 
        (
          // Match by names, amounts, or mortgage relationships
          (asset.name === mortgage.name || asset.name === `Loan for ${mortgage.name}`) || 
          (asset.description && asset.description.includes(mortgage.name)) ||
          ('mortgageId' in asset && (asset as any).mortgageId === mortgage.id) ||
          ('originalLoanAmount' in asset && (asset as any).originalLoanAmount === mortgage.originalAmount)
        )
      );
      
      if (!loanAsset) {
        return res.status(404).json({ message: "No loan asset found for this mortgage" });
      }
      
      res.json(loanAsset);
    } catch (err) {
      console.error("Error finding loan asset for mortgage:", err);
      res.status(500).json({ message: "Failed to find loan asset" });
    }
  });

  app.get("/api/properties/:id/mortgages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const propertyId = parseInt(req.params.id);
      
      // Check if property exists and user owns it
      const property = await storage.getAsset(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view mortgages for this property" });
      }
      
      // Get mortgages secured by this property
      const mortgages = await storage.getMortgagesBySecuredAsset(propertyId);
      res.json(mortgages);
    } catch (err) {
      console.error("Error fetching property mortgages:", err);
      res.status(500).json({ message: "Failed to fetch property mortgages" });
    }
  });

  app.post("/api/mortgages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Add the user ID to the mortgage data
      const mortgageData = {
        ...req.body,
        userId: req.user.id
      };
      
      // Additional validation logic beyond schema
      if (mortgageData.securedAssetId) {
        // Verify that the secured asset exists and belongs to the user
        const asset = await storage.getAsset(mortgageData.securedAssetId);
        
        if (!asset) {
          return res.status(404).json({ 
            message: "The property specified as collateral does not exist",
            field: "securedAssetId"
          });
        }
        
        if (asset.userId !== req.user.id) {
          return res.status(403).json({ 
            message: "You are not authorized to use this property as collateral",
            field: "securedAssetId"
          });
        }
        
        // Verify the asset is a property (asset class 3 is Real Estate)
        if (asset.assetClassId !== 3) {
          return res.status(400).json({
            message: "Only real estate properties can be used as collateral for mortgages",
            field: "securedAssetId"
          });
        }
      }
      
      // Verify value is negative for liabilities
      if (mortgageData.value && mortgageData.value > 0) {
        mortgageData.value = -Math.abs(mortgageData.value);
      }
      
      // Additional validation for mortgage fields
      if (mortgageData.loanTerm && mortgageData.loanTerm <= 0) {
        return res.status(400).json({
          message: "Loan term must be a positive number of months",
          field: "loanTerm"
        });
      }
      
      if (mortgageData.interestRate && (mortgageData.interestRate < 0 || mortgageData.interestRate > 30)) {
        return res.status(400).json({
          message: "Interest rate must be between 0% and 30%",
          field: "interestRate"
        });
      }
      
      // Validate and transform start date if provided
      if (mortgageData.startDate) {
        try {
          mortgageData.startDate = new Date(mortgageData.startDate);
        } catch (e) {
          return res.status(400).json({
            message: "Invalid start date format",
            field: "startDate"
          });
        }
      }
      
      // Validate the data through Zod schema
      const validatedData = insertMortgageSchema.parse(mortgageData);
      
      // Create the mortgage
      const mortgage = await storage.createMortgage(validatedData);
      
      // If a secured asset (property) is specified, link them
      if (mortgage.securedAssetId) {
        const linkResult = await storage.linkMortgageToProperty(mortgage.id, mortgage.securedAssetId);
        if (!linkResult) {
          console.warn(`Failed to link mortgage ${mortgage.id} to property ${mortgage.securedAssetId}`);
        }
      }
      
      res.status(201).json(mortgage);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: err.errors 
        });
      }
      console.error("Error creating mortgage:", err);
      res.status(500).json({ 
        message: "Failed to create mortgage", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  app.put("/api/mortgages/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      
      // Check if mortgage exists and user owns it
      const mortgage = await storage.getMortgage(id);
      if (!mortgage) {
        return res.status(404).json({ message: "Mortgage not found" });
      }
      
      if (mortgage.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this mortgage" });
      }
      
      // Validate the data
      const validatedData = insertMortgageSchema.partial().parse(req.body);
      
      // Update the mortgage
      const updatedMortgage = await storage.updateMortgage(id, validatedData);
      
      // If securedAssetId has changed, update the relationship
      if ('securedAssetId' in req.body && mortgage.securedAssetId !== req.body.securedAssetId) {
        // First, unlink from current property if one exists
        if (mortgage.securedAssetId) {
          await storage.unlinkMortgageFromProperty(id);
        }
        
        // Then link to new property if one is specified
        if (req.body.securedAssetId) {
          await storage.linkMortgageToProperty(id, req.body.securedAssetId);
        }
      }
      
      if (!updatedMortgage) {
        return res.status(500).json({ message: "Failed to update mortgage" });
      }
      
      res.json(updatedMortgage);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      console.error("Error updating mortgage:", err);
      res.status(500).json({ message: "Failed to update mortgage" });
    }
  });
  
  // Add PATCH endpoint for mortgages, which does the same as PUT
  app.patch("/api/mortgages/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      console.log("DEBUG: PATCH mortgage REQUEST:", id, JSON.stringify(req.body, null, 2));
      
      // Check if mortgage exists and user owns it
      const mortgage = await storage.getMortgage(id);
      if (!mortgage) {
        console.log(`Mortgage with ID ${id} not found`);
        return res.status(404).json({ message: "Mortgage not found" });
      }
      
      console.log("DEBUG: ORIGINAL mortgage:", JSON.stringify(mortgage, null, 2));
      
      if (mortgage.userId !== req.user.id) {
        console.log(`User ${req.user.id} not authorized to update mortgage ${id} owned by ${mortgage.userId}`);
        return res.status(403).json({ message: "Not authorized to update this mortgage" });
      }
      
      // Check for empty update
      if (Object.keys(req.body).length === 0) {
        console.log("DEBUG: Empty update detected - no fields to update");
        return res.status(400).json({ message: "No fields to update" });
      }
      
      console.log("DEBUG: Attempting to validate with insertMortgageSchema.partial()");
      
      // Pre-process the request body to convert date strings to Date objects
      const processedBody = { ...req.body };
      
      // Convert startDate string to Date object if it exists
      if (processedBody.startDate && typeof processedBody.startDate === 'string') {
        try {
          processedBody.startDate = new Date(processedBody.startDate);
          console.log("DEBUG: Converted startDate string to Date object:", processedBody.startDate);
        } catch (error) {
          console.error("ERROR: Failed to convert startDate to Date object:", error);
          return res.status(400).json({ 
            errors: [{ message: "Invalid startDate format" }]
          });
        }
      }
      
      // Convert fixedRateEndDate string to Date object if it exists
      if (processedBody.fixedRateEndDate && typeof processedBody.fixedRateEndDate === 'string') {
        try {
          processedBody.fixedRateEndDate = new Date(processedBody.fixedRateEndDate);
          console.log("DEBUG: Converted fixedRateEndDate string to Date object:", processedBody.fixedRateEndDate);
        } catch (error) {
          console.error("ERROR: Failed to convert fixedRateEndDate to Date object:", error);
          return res.status(400).json({ 
            errors: [{ message: "Invalid fixedRateEndDate format" }]
          });
        }
      }
      
      // Create a direct validated data object, skipping Zod validation
      const directData = { ...processedBody };
      
      // Handle date conversions directly
      if (directData.startDate && typeof directData.startDate === 'string') {
        try {
          // Store as a proper Date object
          directData.startDate = new Date(directData.startDate);
          console.log("DEBUG: Directly converted startDate to Date:", directData.startDate);
        } catch (e) {
          console.error("ERROR: Could not convert startDate to Date:", e);
          return res.status(400).json({
            errors: [{ message: "Invalid startDate format" }]
          });
        }
      }
      
      if (directData.fixedRateEndDate && typeof directData.fixedRateEndDate === 'string') {
        try {
          // Store as a proper Date object
          directData.fixedRateEndDate = new Date(directData.fixedRateEndDate);
          console.log("DEBUG: Directly converted fixedRateEndDate to Date:", directData.fixedRateEndDate);
        } catch (e) {
          console.error("ERROR: Could not convert fixedRateEndDate to Date:", e);
          return res.status(400).json({
            errors: [{ message: "Invalid fixedRateEndDate format" }]
          });
        }
      }
      
      // Skip Zod validation and use the direct object
      const validatedData = directData;
      console.log("DEBUG: Using direct data (skipping Zod):", JSON.stringify(validatedData, null, 2));
      
      // Check if validatedData is empty (meaning all fields were rejected by validation)
      if (Object.keys(validatedData).length === 0) {
        console.log("DEBUG: No fields passed validation - all fields were filtered out");
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      // Deep copy the mortgage to detect changes
      const originalMortgage = JSON.parse(JSON.stringify(mortgage));
      
      // Update the mortgage
      const updatedMortgage = await storage.updateMortgage(id, validatedData);
      
      if (!updatedMortgage) {
        console.log("Failed to update mortgage - storage returned undefined");
        return res.status(500).json({ message: "Failed to update mortgage" });
      }
      
      console.log("Updated mortgage from storage:", JSON.stringify(updatedMortgage, null, 2));
      
      // Detect what changed
      const changes = [];
      for (const key in validatedData) {
        if (JSON.stringify(originalMortgage[key]) !== JSON.stringify(updatedMortgage[key])) {
          changes.push({
            field: key,
            from: originalMortgage[key],
            to: updatedMortgage[key]
          });
        }
      }
      console.log("Detected changes:", JSON.stringify(changes, null, 2));
      
      // If securedAssetId has changed, update the relationship
      if ('securedAssetId' in req.body && mortgage.securedAssetId !== req.body.securedAssetId) {
        console.log(`Updating securedAssetId relationship from ${mortgage.securedAssetId} to ${req.body.securedAssetId}`);
        // First, unlink from current property if one exists
        if (mortgage.securedAssetId) {
          await storage.unlinkMortgageFromProperty(id);
        }
        
        // Then link to new property if one is specified
        if (req.body.securedAssetId) {
          await storage.linkMortgageToProperty(id, req.body.securedAssetId);
        }
      }
      
      // Fetch the mortgage one more time to ensure we have the latest data
      const finalMortgage = await storage.getMortgage(id);
      console.log("Final mortgage state:", JSON.stringify(finalMortgage, null, 2));
      
      res.json(finalMortgage || updatedMortgage);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.log("Validation error:", err.errors);
        return res.status(400).json({ errors: err.errors });
      }
      console.error("Error updating mortgage:", err);
      res.status(500).json({ message: "Failed to update mortgage" });
    }
  });

  app.delete("/api/mortgages/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const mortgage = await storage.getMortgage(id);
      
      if (!mortgage) {
        return res.status(404).json({ message: "Mortgage not found" });
      }
      
      // Check if user owns the mortgage
      if (mortgage.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this mortgage" });
      }
      
      const success = await storage.deleteMortgage(id);
      if (success) {
        res.status(200).json({ message: "Mortgage deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete mortgage" });
      }
      
    } catch (err) {
      console.error("Error deleting mortgage:", err);
      res.status(500).json({ message: "Failed to delete mortgage" });
    }
  });

  // Migration endpoint: Convert property mortgage data to separate mortgage entity
  // Migrate property mortgage data to a separate mortgage entity
  app.post("/api/properties/:id/migrate-mortgage", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const propertyId = parseInt(req.params.id);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      
      // Check if property exists and user owns it
      const property = await storage.getAsset(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to migrate mortgage for this property" });
      }
      
      // The property might be using AssetWithLegacyMortgage interface
      const legacyProperty = property as AssetWithLegacyMortgage;
      
      // Check if property has mortgage data to migrate
      if (!legacyProperty.hasMortgage) {
        return res.status(400).json({ message: "Property does not have mortgage data to migrate" });
      }
      
      // Check if property already has a linked mortgage
      if (property.linkedMortgageId) {
        return res.status(400).json({ 
          message: "Property already has a linked mortgage. Remove the existing link before migrating.", 
          linkedMortgageId: property.linkedMortgageId 
        });
      }
      
      // Perform the migration
      const result = await storage.migratePropertyMortgageData(propertyId);
      
      if (!result) {
        return res.status(500).json({ message: "Failed to migrate mortgage data" });
      }
      
      // After successful migration, clean up legacy data if requested
      const cleanupRequested = req.body.cleanupLegacyData === true;
      let cleanupSuccess = false;
      
      if (cleanupRequested) {
        cleanupSuccess = await storage.cleanupPropertyMortgageData(propertyId);
      }
      
      // Return the migrated data with cleanup status
      res.json({
        ...result,
        cleanupRequested,
        cleanupSuccess
      });
    } catch (err) {
      console.error("Error migrating property mortgage data:", err);
      res.status(500).json({ message: "Failed to migrate mortgage data", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Endpoint to clean up legacy mortgage data for a property
  app.post("/api/properties/:id/cleanup-mortgage", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const propertyId = parseInt(req.params.id);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      
      // Check if property exists and user owns it
      const property = await storage.getAsset(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to clean up mortgage data for this property" });
      }
      
      // Check if property has a linked mortgage
      if (!property.linkedMortgageId) {
        return res.status(400).json({ 
          message: "Property has no linked mortgage. Cannot clean up legacy data when no mortgage is linked." 
        });
      }
      
      // Perform the cleanup
      const cleanupSuccess = await storage.cleanupPropertyMortgageData(propertyId);
      
      if (!cleanupSuccess) {
        return res.status(500).json({ message: "Failed to clean up legacy mortgage data" });
      }
      
      // Return the cleaned property data
      const cleanedProperty = await storage.getAsset(propertyId);
      
      res.json({
        property: cleanedProperty,
        cleanupSuccess
      });
    } catch (err) {
      console.error("Error cleaning up property mortgage data:", err);
      res.status(500).json({ 
        message: "Failed to clean up legacy mortgage data", 
        error: err instanceof Error ? err.message : String(err) 
      });
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

  // Financial Projections API
  app.post("/api/projections/generate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Get projection configuration from request body
      const projectionConfig = req.body as ProjectionConfig;
      
      // Get system settings for default values
      const settings = await storage.getSystemSettings() || {
        id: 1,
        defaultBasicModeYears: 10,
        defaultAdvancedModeYears: 30,
        defaultMediumInflationRate: 2.5
      };
      
      // Validate and set default config values if needed
      const config: ProjectionConfig = {
        ...defaultBasicProjectionConfig(settings),
        ...projectionConfig
      };
      
      // Get user's assets
      const userAssets = await storage.listAssets(req.user.id);
      
      if (!userAssets || userAssets.length === 0) {
        return res.status(404).json({ message: "No assets found" });
      }
      
      // Get asset classes and holding types for reference
      const assetClassList = await storage.listAssetClasses();
      const holdingTypesList = await storage.listAssetHoldingTypes();
      
      // Convert to required format (map of id -> object)
      const assetClasses: Record<number, typeof assetClassList[0]> = {};
      const holdingTypes: Record<number, typeof holdingTypesList[0]> = {};
      
      assetClassList.forEach(ac => { assetClasses[ac.id] = ac; });
      holdingTypesList.forEach(ht => { holdingTypes[ht.id] = ht; });
      
      // Generate projections
      const projections = generateProjections(
        userAssets,
        assetClasses,
        holdingTypes,
        config
      );
      
      return res.json(projections);
    } catch (error) {
      console.error("Error generating projections:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate projections" 
      });
    }
  });

  // Get default projection configuration
  app.get("/api/projections/config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Get system settings
      const settings = await storage.getSystemSettings() || {
        id: 1,
        defaultBasicModeYears: 10,
        defaultAdvancedModeYears: 30,
        defaultMediumInflationRate: 2.5
      };
      
      // Get user to determine mode
      const user = await storage.getUser(req.user.id);
      
      // Create appropriate default config
      let config = defaultBasicProjectionConfig(settings);
      
      // If user is in advanced mode, adjust config
      if (user && user.preferredMode === 'advanced') {
        config.yearsToProject = settings.defaultAdvancedModeYears ?? 30;
        config.period = '30-years';
        config.calculateAfterTax = true;
      }
      
      return res.json(config);
    } catch (error) {
      console.error("Error getting projection config:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get projection configuration" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
