import { db } from "./db";
import session from "express-session";
import { Store as SessionStore } from "express-session";
import createMemoryStore from "memorystore";
import { 
  users, 
  countries,
  assetHoldingTypes,
  assetClasses,
  assets,
  subscriptionPlans,
  userSubscriptions,
  systemSettings,
  type User,
  type InsertUser,
  type Country,
  type InsertCountry,
  type AssetHoldingType,
  type InsertAssetHoldingType,
  type AssetClass, 
  type InsertAssetClass,
  type Asset,
  type InsertAsset,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type UserSubscription,
  type SystemSettings,
  type UpdateSystemSettings
} from "@shared/schema";
import { eq, and, desc, or } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Country operations
  getCountry(id: number): Promise<Country | undefined>;
  getCountryByCode(code: string): Promise<Country | undefined>;
  getDefaultCountry(): Promise<Country | undefined>;
  createCountry(country: InsertCountry): Promise<Country>;
  updateCountry(id: number, country: Partial<Country>): Promise<Country | undefined>;
  listCountries(): Promise<Country[]>;

  // Asset Holding Type operations
  getAssetHoldingType(id: number): Promise<AssetHoldingType | undefined>;
  createAssetHoldingType(type: InsertAssetHoldingType): Promise<AssetHoldingType>;
  updateAssetHoldingType(id: number, type: Partial<AssetHoldingType>): Promise<AssetHoldingType | undefined>;
  listAssetHoldingTypes(countryId?: number): Promise<AssetHoldingType[]>;

  // Asset Class operations
  getAssetClass(id: number): Promise<AssetClass | undefined>;
  createAssetClass(assetClass: InsertAssetClass): Promise<AssetClass>;
  updateAssetClass(id: number, assetClass: Partial<AssetClass>): Promise<AssetClass | undefined>;
  listAssetClasses(): Promise<AssetClass[]>;

  // Asset operations
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<Asset>): Promise<Asset | undefined>;
  listAssets(userId: number, limit?: number): Promise<Asset[]>;
  getUserAssetsByClass(userId: number): Promise<{ assetClass: AssetClass, totalValue: number }[]>;
  
  // Subscription operations
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getDefaultSubscriptionPlan(): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  listSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  
  // User Subscription operations
  getUserSubscription(userId: number): Promise<(UserSubscription & { plan: SubscriptionPlan }) | undefined>;
  createUserSubscription(subscription: Omit<UserSubscription, 'id'>): Promise<UserSubscription>;
  updateUserSubscription(userId: number, subscriptionPlanId: number): Promise<UserSubscription | undefined>;
  
  // System Settings operations
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(settings: UpdateSystemSettings): Promise<SystemSettings | undefined>;

  // Session store
  sessionStore: SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Country operations
  async getCountry(id: number): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.id, id));
    return country;
  }

  async getCountryByCode(code: string): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.code, code));
    return country;
  }

  async getDefaultCountry(): Promise<Country | undefined> {
    // For now, return the first country. In a real-world scenario, you might have
    // a dedicated field to mark a default country or use a specific criterion.
    const [country] = await db.select().from(countries).limit(1);
    return country;
  }

  async createCountry(country: InsertCountry): Promise<Country> {
    const [createdCountry] = await db.insert(countries).values(country).returning();
    return createdCountry;
  }

  async updateCountry(id: number, countryData: Partial<Country>): Promise<Country | undefined> {
    const [updatedCountry] = await db
      .update(countries)
      .set(countryData)
      .where(eq(countries.id, id))
      .returning();
    return updatedCountry;
  }

  async listCountries(): Promise<Country[]> {
    return db.select().from(countries);
  }

  // Asset Holding Type operations
  async getAssetHoldingType(id: number): Promise<AssetHoldingType | undefined> {
    const [type] = await db.select().from(assetHoldingTypes).where(eq(assetHoldingTypes.id, id));
    return type;
  }

  async createAssetHoldingType(type: InsertAssetHoldingType): Promise<AssetHoldingType> {
    const [createdType] = await db.insert(assetHoldingTypes).values(type).returning();
    return createdType;
  }

  async updateAssetHoldingType(id: number, typeData: Partial<AssetHoldingType>): Promise<AssetHoldingType | undefined> {
    const [updatedType] = await db
      .update(assetHoldingTypes)
      .set(typeData)
      .where(eq(assetHoldingTypes.id, id))
      .returning();
    return updatedType;
  }

  async listAssetHoldingTypes(countryId?: number): Promise<AssetHoldingType[]> {
    if (countryId) {
      return db.select().from(assetHoldingTypes).where(eq(assetHoldingTypes.countryId, countryId));
    }
    return db.select().from(assetHoldingTypes);
  }

  // Asset Class operations
  async getAssetClass(id: number): Promise<AssetClass | undefined> {
    const [assetClass] = await db.select().from(assetClasses).where(eq(assetClasses.id, id));
    return assetClass;
  }

  async createAssetClass(assetClassData: InsertAssetClass): Promise<AssetClass> {
    const [createdAssetClass] = await db.insert(assetClasses).values(assetClassData).returning();
    return createdAssetClass;
  }

  async updateAssetClass(id: number, assetClassData: Partial<AssetClass>): Promise<AssetClass | undefined> {
    const [updatedAssetClass] = await db
      .update(assetClasses)
      .set(assetClassData)
      .where(eq(assetClasses.id, id))
      .returning();
    return updatedAssetClass;
  }

  async listAssetClasses(): Promise<AssetClass[]> {
    return db.select().from(assetClasses);
  }

  // Asset operations
  async getAsset(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async createAsset(assetData: InsertAsset): Promise<Asset> {
    const [createdAsset] = await db.insert(assets).values(assetData).returning();
    return createdAsset;
  }

  async updateAsset(id: number, assetData: Partial<Asset>): Promise<Asset | undefined> {
    const [updatedAsset] = await db
      .update(assets)
      .set(assetData)
      .where(eq(assets.id, id))
      .returning();
    return updatedAsset;
  }

  async listAssets(userId: number, limit?: number): Promise<Asset[]> {
    const query = db
      .select()
      .from(assets)
      .where(and(eq(assets.userId, userId), eq(assets.isHidden, false)))
      .orderBy(desc(assets.createdAt));
    
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }

  async getUserAssetsByClass(userId: number): Promise<{ assetClass: AssetClass, totalValue: number }[]> {
    // This is a simplified implementation. In a real application, you would use 
    // SQL aggregate functions to calculate totals directly in the database.
    try {
      const userAssets = await db
        .select()
        .from(assets)
        .where(and(eq(assets.userId, userId), eq(assets.isHidden, false)));
      
      // Return empty array when no assets found
      if (!userAssets.length) {
        return [];
      }
      
      // Get unique asset class IDs 
      const assetClassIds = userAssets.map(a => a.assetClassId)
        .filter((id, index, self) => self.indexOf(id) === index);
      
      // Handle case where no asset class IDs exist
      if (!assetClassIds.length) {
        return [];
      }
      
      // Get all asset classes and filter in memory
      const allAssetClasses = await db.select().from(assetClasses);
      const assetClassesData = allAssetClasses.filter(ac => 
        assetClassIds.includes(ac.id)
      );
      
      const assetClassMap = new Map(assetClassesData.map(ac => [ac.id, ac]));
      
      const results: { assetClass: AssetClass, totalValue: number }[] = [];
      const totalsByClass: Record<number, number> = {};
      
      for (const asset of userAssets) {
        if (!totalsByClass[asset.assetClassId]) {
          totalsByClass[asset.assetClassId] = 0;
        }
        totalsByClass[asset.assetClassId] += asset.value;
      }
      
      for (const [classId, total] of Object.entries(totalsByClass)) {
        const assetClass = assetClassMap.get(Number(classId));
        if (assetClass) {
          results.push({
            assetClass,
            totalValue: total,
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error in getUserAssetsByClass:", error);
      return [];
    }
  }

  // Subscription Plan operations
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getDefaultSubscriptionPlan(): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isDefault, true));
    return plan || (await db.select().from(subscriptionPlans).limit(1))[0];
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [createdPlan] = await db.insert(subscriptionPlans).values(plan).returning();
    return createdPlan;
  }

  async updateSubscriptionPlan(id: number, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updatedPlan] = await db
      .update(subscriptionPlans)
      .set(planData)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return updatedPlan;
  }

  async listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans);
  }

  // User Subscription operations
  async getUserSubscription(userId: number): Promise<(UserSubscription & { plan: SubscriptionPlan }) | undefined> {
    // This is a simplified join. In a real application, you would use proper ORM relations.
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    
    if (!subscription) return undefined;
    
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscription.subscriptionPlanId));
    
    if (!plan) return undefined;
    
    return {
      ...subscription,
      plan,
    };
  }

  async createUserSubscription(subscription: Omit<UserSubscription, 'id'>): Promise<UserSubscription> {
    const [createdSubscription] = await db.insert(userSubscriptions).values(subscription).returning();
    return createdSubscription;
  }

  async updateUserSubscription(userId: number, subscriptionPlanId: number): Promise<UserSubscription | undefined> {
    // Convert Date to ISO string which is compatible with database
    const today = new Date().toISOString();
    const [updatedSubscription] = await db
      .update(userSubscriptions)
      .set({
        subscriptionPlanId,
        startDate: today,
        status: 'active',
      })
      .where(eq(userSubscriptions.userId, userId))
      .returning();
    return updatedSubscription;
  }

  // System Settings operations
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const [settings] = await db.select().from(systemSettings).limit(1);
    return settings;
  }

  async updateSystemSettings(settingsData: UpdateSystemSettings): Promise<SystemSettings | undefined> {
    // Try to update existing settings first
    const [existingSettings] = await db.select().from(systemSettings).limit(1);
    
    if (existingSettings) {
      const [updatedSettings] = await db
        .update(systemSettings)
        .set(settingsData)
        .where(eq(systemSettings.id, existingSettings.id))
        .returning();
      return updatedSettings;
    } else {
      // If no settings exist, create new ones
      const [newSettings] = await db.insert(systemSettings).values(settingsData).returning();
      return newSettings;
    }
  }
}

export const storage = new DatabaseStorage();
