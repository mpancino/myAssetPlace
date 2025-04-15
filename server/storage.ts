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
  mortgages,
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
  type Mortgage,
  type InsertMortgage,
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
  deleteAssetClass(id: number): Promise<boolean>;
  listAssetClasses(): Promise<AssetClass[]>;

  // Asset operations
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<Asset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;
  listAssets(userId: number, limit?: number): Promise<Asset[]>;
  getUserAssetsByClass(userId: number): Promise<{ assetClass: AssetClass, totalValue: number }[]>;
  
  // Mortgage operations
  getMortgage(id: number): Promise<Mortgage | undefined>;
  createMortgage(mortgage: InsertMortgage): Promise<Mortgage>;
  updateMortgage(id: number, mortgage: Partial<Mortgage>): Promise<Mortgage | undefined>;
  deleteMortgage(id: number): Promise<boolean>;
  listMortgages(userId: number): Promise<Mortgage[]>;
  getMortgagesBySecuredAsset(assetId: number): Promise<Mortgage[]>;
  linkMortgageToProperty(mortgageId: number, propertyId: number): Promise<boolean>;
  unlinkMortgageFromProperty(mortgageId: number): Promise<boolean>;
  migratePropertyMortgageData(propertyId: number): Promise<{mortgage: Mortgage, property: Asset} | undefined>;
  
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
    console.log('[STORAGE] updateAssetHoldingType called for ID:', id);
    console.log('[STORAGE] typeData:', JSON.stringify(typeData));
    
    // Deep inspect the taxSettings property
    if ('taxSettings' in typeData) {
      console.log('[STORAGE] taxSettings type:', typeof typeData.taxSettings);
      console.log('[STORAGE] taxSettings value:', 
        typeData.taxSettings ? JSON.stringify(typeData.taxSettings) : 'null/undefined');
    }
    
    try {
      const [updatedType] = await db
        .update(assetHoldingTypes)
        .set(typeData)
        .where(eq(assetHoldingTypes.id, id))
        .returning();
      
      console.log('[STORAGE] DB update completed, result:', updatedType ? 'success' : 'no record found');
      
      if (updatedType) {
        console.log('[STORAGE] Returned taxSettings type:', typeof updatedType.taxSettings);
        console.log('[STORAGE] Returned taxSettings value:', 
          updatedType.taxSettings ? JSON.stringify(updatedType.taxSettings) : 'null/undefined');
      }
      
      return updatedType;
    } catch (error) {
      console.error('[STORAGE] Error in updateAssetHoldingType:', error);
      throw error;
    }
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
  
  async deleteAssetClass(id: number): Promise<boolean> {
    try {
      // Protect core asset classes from deletion - only those explicitly mentioned in the PDD
      // 1=Cash, 2=Loans, 3=Real Estate, 4=Investments, 5=Retirement, 8=Employment Income, 9=Employee Stock Options
      const protectedAssetClassIds = [1, 2, 3, 4, 5, 8, 9];
      if (protectedAssetClassIds.includes(id)) {
        console.error(`Cannot delete protected asset class with ID ${id}`);
        return false;
      }
      
      // Check if the asset class exists
      const [assetClass] = await db
        .select()
        .from(assetClasses)
        .where(eq(assetClasses.id, id));
        
      if (!assetClass) {
        console.error(`Asset class with ID ${id} not found`);
        return false;
      }
      
      // Delete the asset class
      const result = await db
        .delete(assetClasses)
        .where(eq(assetClasses.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting asset class:", error);
      return false;
    }
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
    // Log property expenses if present
    if (assetData.propertyExpenses) {
      const propertyExpensesCount = Object.keys(assetData.propertyExpenses).length;
      console.log(`[STORAGE] Updating asset ${id} with ${propertyExpensesCount} property expenses`);
      console.log(`[STORAGE] Property expenses data:`, JSON.stringify(assetData.propertyExpenses));
    } else {
      console.log(`[STORAGE] Updating asset ${id} without property expenses`);
    }
    
    // Log investment expenses if present
    if (assetData.investmentExpenses) {
      const investmentExpensesCount = Object.keys(assetData.investmentExpenses).length;
      console.log(`[STORAGE] Updating asset ${id} with ${investmentExpensesCount} investment expenses`);
      console.log(`[STORAGE] Investment expenses data:`, JSON.stringify(assetData.investmentExpenses));
    } else {
      console.log(`[STORAGE] Updating asset ${id} without investment expenses`);
    }
    
    // Before update - check current state
    const [currentAsset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id));
      
    console.log(`[STORAGE] Current property expenses:`, 
      currentAsset.propertyExpenses ? 
      `Found ${Object.keys(currentAsset.propertyExpenses).length} expenses` : 
      "None");
      
    console.log(`[STORAGE] Current investment expenses:`, 
      currentAsset.investmentExpenses ? 
      `Found ${Object.keys(currentAsset.investmentExpenses).length} expenses` : 
      "None");
    
    // Do the update
    const [updatedAsset] = await db
      .update(assets)
      .set(assetData)
      .where(eq(assets.id, id))
      .returning();
      
    // Verify after update for property expenses
    console.log(`[STORAGE] Updated property expenses:`, 
      updatedAsset.propertyExpenses ? 
      `Found ${Object.keys(updatedAsset.propertyExpenses).length} expenses` : 
      "None");
      
    // Verify after update for investment expenses
    console.log(`[STORAGE] Updated investment expenses:`, 
      updatedAsset.investmentExpenses ? 
      `Found ${Object.keys(updatedAsset.investmentExpenses).length} expenses` : 
      "None");
      
    return updatedAsset;
  }
  
  async linkOffsetAccount(cashAccountId: number, loanId: number): Promise<boolean> {
    try {
      // First check that the cash account and loan exist and belong to the same user
      const cashAccount = await this.getAsset(cashAccountId);
      const loan = await this.getAsset(loanId);
      
      if (!cashAccount || !loan) {
        return false;
      }
      
      // Verify the assets belong to the same user
      if (cashAccount.userId !== loan.userId) {
        return false;
      }
      
      // Verify the cash account is actually a cash account
      if (cashAccount.assetClassId !== 1) { // Assuming cash accounts have assetClassId=1
        return false;
      }
      
      // Verify the loan is actually a loan (liability)
      if (!loan.isLiability) {
        return false;
      }
      
      // Update the cash account to be linked to the loan
      await db
        .update(assets)
        .set({
          isOffsetAccount: true,
          offsetLinkedLoanId: loanId,
        })
        .where(eq(assets.id, cashAccountId));
        
      return true;
    } catch (error) {
      console.error("Error linking offset account:", error);
      return false;
    }
  }
  
  async unlinkOffsetAccount(cashAccountId: number): Promise<boolean> {
    try {
      // Update the cash account to remove the link
      await db
        .update(assets)
        .set({
          isOffsetAccount: false,
          offsetLinkedLoanId: null,
        })
        .where(eq(assets.id, cashAccountId));
        
      return true;
    } catch (error) {
      console.error("Error unlinking offset account:", error);
      return false;
    }
  }
  
  async getLinkedOffsetAccounts(loanId: number): Promise<Asset[]> {
    try {
      const offsetAccounts = await db
        .select()
        .from(assets)
        .where(and(
          eq(assets.offsetLinkedLoanId, loanId),
          eq(assets.isOffsetAccount, true)
        ));
        
      return offsetAccounts;
    } catch (error) {
      console.error("Error getting linked offset accounts:", error);
      return [];
    }
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(assets)
        .where(eq(assets.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting asset:", error);
      return false;
    }
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

  // Mortgage operations
  async getMortgage(id: number): Promise<Mortgage | undefined> {
    const [mortgage] = await db.select().from(mortgages).where(eq(mortgages.id, id));
    return mortgage;
  }

  async createMortgage(mortgageData: InsertMortgage): Promise<Mortgage> {
    const [createdMortgage] = await db.insert(mortgages).values(mortgageData).returning();
    return createdMortgage;
  }

  async updateMortgage(id: number, mortgageData: Partial<Mortgage>): Promise<Mortgage | undefined> {
    console.log("Storage: Updating mortgage", id, "with data:", mortgageData);
    
    // If value is provided, ensure it's negative for liabilities
    if (mortgageData.value !== undefined && mortgageData.value > 0) {
      mortgageData.value = -Math.abs(mortgageData.value);
    }
    
    // If updating dates, recalculate remaining term
    if (mortgageData.startDate || mortgageData.loanTerm) {
      // Get current mortgage data
      const currentMortgage = await this.getMortgage(id);
      if (!currentMortgage) {
        return undefined;
      }
      
      // Use updated values or current values
      const startDate = mortgageData.startDate || currentMortgage.startDate;
      const loanTerm = mortgageData.loanTerm || currentMortgage.loanTerm;
      
      // Calculate the end date
      const endDateObj = new Date(startDate);
      endDateObj.setMonth(endDateObj.getMonth() + loanTerm);
      
      // Set the end date in the update data
      mortgageData.endDate = endDateObj;
      
      // Calculate remaining term (in months)
      const now = new Date();
      const diffMonths = (endDateObj.getFullYear() - now.getFullYear()) * 12 + 
                         (endDateObj.getMonth() - now.getMonth());
      
      mortgageData.remainingTerm = Math.max(0, diffMonths);
    }
    
    // Perform the update
    try {
      const [updatedMortgage] = await db
        .update(mortgages)
        .set({
          ...mortgageData,
          updatedAt: new Date()
        })
        .where(eq(mortgages.id, id))
        .returning();
        
      console.log("Storage: Mortgage updated successfully:", updatedMortgage);
      return updatedMortgage;
    } catch (error) {
      console.error("Storage: Error updating mortgage:", error);
      return undefined;
    }
  }

  async deleteMortgage(id: number): Promise<boolean> {
    try {
      // First, check if there are any assets with this mortgage linked
      const linkedAssets = await db
        .select()
        .from(assets)
        .where(eq(assets.linkedMortgageId, id));

      // If assets are linked, update them to remove the link
      if (linkedAssets.length > 0) {
        await db
          .update(assets)
          .set({ linkedMortgageId: null })
          .where(eq(assets.linkedMortgageId, id));
      }

      // Then delete the mortgage
      await db
        .delete(mortgages)
        .where(eq(mortgages.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting mortgage:", error);
      return false;
    }
  }

  async listMortgages(userId: number): Promise<Mortgage[]> {
    return db
      .select()
      .from(mortgages)
      .where(eq(mortgages.userId, userId))
      .orderBy(desc(mortgages.createdAt));
  }

  async getMortgagesBySecuredAsset(assetId: number): Promise<Mortgage[]> {
    return db
      .select()
      .from(mortgages)
      .where(eq(mortgages.securedAssetId, assetId));
  }

  async linkMortgageToProperty(mortgageId: number, propertyId: number): Promise<boolean> {
    try {
      // First verify that both entities exist and belong to the same user
      const mortgage = await this.getMortgage(mortgageId);
      const property = await this.getAsset(propertyId);

      if (!mortgage || !property) {
        console.error("Mortgage or property not found");
        return false;
      }

      if (mortgage.userId !== property.userId) {
        console.error("Mortgage and property belong to different users");
        return false;
      }

      // Check the property is actually a property
      if (property.assetClassId !== 3) { // Assuming real estate has assetClassId=3
        console.error("Asset is not a property");
        return false;
      }

      // Update both sides of the relationship
      await db.transaction(async (tx) => {
        // Update mortgage to point to property
        await tx
          .update(mortgages)
          .set({ securedAssetId: propertyId })
          .where(eq(mortgages.id, mortgageId));
        
        // Update property to point to mortgage
        await tx
          .update(assets)
          .set({ linkedMortgageId: mortgageId })
          .where(eq(assets.id, propertyId));
      });
      
      return true;
    } catch (error) {
      console.error("Error linking mortgage to property:", error);
      return false;
    }
  }

  async unlinkMortgageFromProperty(mortgageId: number): Promise<boolean> {
    try {
      // Get the mortgage to find the linked property
      const mortgage = await this.getMortgage(mortgageId);
      if (!mortgage || !mortgage.securedAssetId) {
        console.error("Mortgage not found or not linked to a property");
        return false;
      }

      const propertyId = mortgage.securedAssetId;

      // Update both sides of the relationship
      await db.transaction(async (tx) => {
        // Update mortgage to remove property link
        await tx
          .update(mortgages)
          .set({ securedAssetId: null })
          .where(eq(mortgages.id, mortgageId));
        
        // Update property to remove mortgage link
        await tx
          .update(assets)
          .set({ linkedMortgageId: null })
          .where(eq(assets.id, propertyId));
      });
      
      return true;
    } catch (error) {
      console.error("Error unlinking mortgage from property:", error);
      return false;
    }
  }

  async migratePropertyMortgageData(propertyId: number): Promise<{mortgage: Mortgage, property: Asset} | undefined> {
    try {
      // Get the property with mortgage data
      const [property] = await db
        .select()
        .from(assets)
        .where(
          and(
            eq(assets.id, propertyId),
            eq(assets.hasMortgage, true)
          )
        );

      if (!property) {
        console.error("Property not found or has no mortgage");
        return undefined;
      }

      // Create a new mortgage from the property's mortgage data
      const mortgageData: InsertMortgage = {
        name: `Mortgage for ${property.name}`,
        description: `Mortgage migrated from property ${property.name}`,
        userId: property.userId,
        value: -1 * (property.mortgageAmount || 0), // Make negative as it's a liability
        lender: property.mortgageLender || '',
        originalAmount: property.mortgageAmount || 0,
        interestRate: property.mortgageInterestRate || 0,
        interestRateType: property.mortgageType as 'fixed' | 'variable' | 'interest-only' || 'fixed',
        loanTerm: property.mortgageTerm || 360, // Default to 30 years if not specified
        paymentFrequency: property.mortgagePaymentFrequency as 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' || 'monthly',
        startDate: property.mortgageStartDate || new Date(),
        securedAssetId: propertyId,
        loanPurpose: 'mortgage'
      };

      // Create the mortgage
      const mortgage = await this.createMortgage(mortgageData);

      // Link the property to the mortgage
      await db
        .update(assets)
        .set({ 
          linkedMortgageId: mortgage.id,
          // Don't set hasMortgage to false yet - we'll do that after verification
        })
        .where(eq(assets.id, propertyId));

      // Return both updated entities
      const updatedProperty = await this.getAsset(propertyId);
      
      return { 
        mortgage, 
        property: updatedProperty as Asset 
      };
    } catch (error) {
      console.error("Error migrating property mortgage data:", error);
      return undefined;
    }
  }

  async getUserAssetsByClass(userId: number): Promise<{ assetClass: AssetClass, totalValue: number }[]> {
    // This is a simplified implementation. In a real application, you would use 
    // SQL aggregate functions to calculate totals directly in the database.
    try {
      // First, get all asset classes to ensure we have data even if user has no assets
      const allAssetClasses = await db.select().from(assetClasses);
      
      if (!allAssetClasses || allAssetClasses.length === 0) {
        console.warn("No asset classes found");
        return [];
      }
      
      // Try to get user's assets
      let userAssets: Asset[] = [];
      try {
        userAssets = await db
          .select()
          .from(assets)
          .where(eq(assets.userId, userId));
      } catch (error) {
        console.error("Error fetching user assets:", error);
        // Continue with empty assets array
      }
      
      // If user has no assets, return all asset classes with zero values
      if (!userAssets.length) {
        return allAssetClasses.map(ac => ({
          assetClass: ac,
          totalValue: 0
        }));
      }
      
      // Initialize results with all asset classes at zero value
      const results: { assetClass: AssetClass, totalValue: number }[] = 
        allAssetClasses.map(ac => ({ assetClass: ac, totalValue: 0 }));
      
      // Add up asset values by class
      for (const asset of userAssets) {
        if (asset && asset.assetClassId) {
          // Find the matching result and update the value
          const resultIndex = results.findIndex(r => r.assetClass.id === asset.assetClassId);
          if (resultIndex >= 0) {
            // Handle null or undefined values
            const assetValue = typeof asset.value === 'number' ? asset.value : 0;
            results[resultIndex].totalValue += assetValue;
          }
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
