import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { setupAuth, setupDirectAdminLogin } from "./auth";
import { loginUserSchema, insertAssetSchema, insertCountrySchema, insertAssetHoldingTypeSchema, insertAssetClassSchema, insertSubscriptionPlanSchema, updateSystemSettingsSchema, users } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { upload, getFileUrl, deleteFile } from "./utils/upload";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Set up direct admin login for easier testing
  await setupDirectAdminLogin(app);

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
      console.log("Getting assets by class for user ID:", req.user.id);
      
      try {
        const assetsByClass = await storage.getUserAssetsByClass(req.user.id);
        
        // If no assets are returned, return an empty array instead of causing an error
        if (!assetsByClass || !Array.isArray(assetsByClass)) {
          console.warn("No assets by class returned, defaulting to empty array");
          return res.json([]);
        }
        
        console.log("Returning assets by class:", JSON.stringify(assetsByClass));
        res.json(assetsByClass);
      } catch (innerErr) {
        console.error("Detailed error in getUserAssetsByClass:", innerErr);
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
      
      const validatedData = insertAssetSchema.partial().parse(req.body);
      const updatedAsset = await storage.updateAsset(id, validatedData);
      res.json(updatedAsset);
    } catch (err) {
      if (err instanceof z.ZodError) {
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

  const httpServer = createServer(app);

  return httpServer;
}
