import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Don't use extends User as it causes a circular reference
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      password: string;
      firstName?: string | null;
      lastName?: string | null;
      countryId?: number | null;
      role: 'user' | 'admin';
      preferredMode: 'basic' | 'advanced';
      isDemo: boolean;
      completedOnboarding: boolean;
      age?: number | null;
      targetRetirementAge?: number | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Admin direct login route for simplified admin access
export async function setupDirectAdminLogin(app: Express) {
  console.log("Setting up direct admin login route");
  
  // Create an admin user if one doesn't exist with 'admin123' credentials
  app.post("/api/admin-login", async (req, res, next) => {
    console.log("Direct admin login endpoint called");
    try {
      // Look for any existing admin user first
      const adminUsername = "admin123"; 
      const adminPassword = "admin123";
      
      console.log("Looking for existing admin user:", adminUsername);
      // Check if admin user exists, if not create one
      let adminUser = await storage.getUserByUsername(adminUsername);
      
      if (!adminUser) {
        console.log("Admin user not found, creating new one");
        // Create the admin user with role='admin'
        adminUser = await storage.createUser({
          username: adminUsername,
          email: "admin123@myassetplace.com",
          password: await hashPassword(adminPassword),
          role: 'admin',
          preferredMode: 'advanced',
          isDemo: false,
          completedOnboarding: true
        });
        console.log("Created admin user:", adminUser.username);
      } else {
        console.log("Found existing admin user:", adminUser.username);
      }
      
      // Log in the user directly
      req.login(adminUser, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        console.log("Admin login successful for user:", adminUser.username);
        return res.status(200).json(adminUser);
      });
    } catch (err) {
      console.error("Admin login error:", err);
      next(err);
    }
  });

  // Test route to check if the admin login route is working
  app.get("/api/admin-login-test", (req, res) => {
    console.log("Admin login test endpoint hit");
    res.status(200).json({ message: "Admin login endpoint is working" });
  });
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "myAssetPlaceSecretKey",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).send("Email already exists");
      }

      // Create default country if not specified
      if (!req.body.countryId) {
        const defaultCountry = await storage.getDefaultCountry();
        if (defaultCountry) {
          req.body.countryId = defaultCountry.id;
        }
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Assign default subscription plan
      const defaultPlan = await storage.getDefaultSubscriptionPlan();
      if (defaultPlan) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        await storage.createUserSubscription({
          userId: user.id,
          subscriptionPlanId: defaultPlan.id,
          startDate: today,
          endDate: null, // No end date for active subscriptions
          status: 'active',
        });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });
  
  // Demo user creation endpoint
  app.post("/api/register/demo", async (req, res, next) => {
    try {
      console.log("Demo user creation endpoint called");
      
      // Generate a unique username with timestamp
      const timestamp = new Date().getTime();
      const username = `demo_user_${timestamp}`;
      const email = `demo_${timestamp}@myassetplace.demo`;
      const password = Math.random().toString(36).slice(-10); // Generate a random password
      
      console.log(`Creating demo user: ${username}`);
      
      // Create a new demo user
      const hashedPassword = await hashPassword(password);
      console.log("Password hashed successfully");
      
      try {
        const user = await storage.createUser({
          username,
          email,
          password: hashedPassword,
          role: 'user', // Ensure this is set to 'user'
          isDemo: true,
          preferredMode: 'basic',
          completedOnboarding: false,
        });
        
        console.log(`Demo user created successfully with ID: ${user.id}`);

        // Assign default subscription plan
        try {
          const defaultPlan = await storage.getDefaultSubscriptionPlan();
          if (defaultPlan) {
            console.log(`Found default subscription plan ID: ${defaultPlan.id}`);
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            await storage.createUserSubscription({
              userId: user.id,
              subscriptionPlanId: defaultPlan.id,
              startDate: today,
              endDate: null, // No end date for active subscriptions
              status: 'active',
            });
            console.log("Subscription assigned to demo user");
          } else {
            console.log("No default subscription plan found");
          }
        } catch (subscriptionError) {
          console.error("Error assigning subscription to demo user:", subscriptionError);
          // Continue without subscription - not a critical error
        }

        req.login(user, (err) => {
          if (err) {
            console.error("Error logging in demo user:", err);
            return next(err);
          }
          
          console.log("Demo user logged in successfully");
          res.status(201).json(user);
        });
      } catch (createUserError) {
        console.error("Error creating demo user:", createUserError);
        res.status(500).json({ 
          message: "Failed to create demo user. Please try the Direct Admin Login instead.",
          error: createUserError.message
        });
      }
    } catch (err) {
      console.error("Unexpected error in demo user creation:", err);
      res.status(500).json({ 
        message: "An unexpected error occurred while creating a demo user",
        error: err.message
      });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Get user subscription details
  app.get("/api/user/subscription", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const subscription = await storage.getUserSubscription(req.user.id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.json(subscription);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch subscription details" });
    }
  });
}
