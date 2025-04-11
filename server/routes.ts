import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { loginUserSchema, insertAssetSchema, insertCountrySchema, insertAssetHoldingTypeSchema, insertAssetClassSchema, insertSubscriptionPlanSchema, updateSystemSettingsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

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
      const assets = await storage.listAssets(req.user.id, limit);
      res.json(assets);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/by-class", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const assetsByClass = await storage.getUserAssetsByClass(req.user.id);
      res.json(assetsByClass);
    } catch (err) {
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

  app.put("/api/assets/:id", async (req, res) => {
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

  const httpServer = createServer(app);

  return httpServer;
}
