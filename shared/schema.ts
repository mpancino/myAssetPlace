import { pgTable, text, serial, integer, boolean, date, real, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const interfaceModeEnum = pgEnum('interface_mode', ['basic', 'advanced']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'expired', 'canceled']);

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  countryId: integer("country_id").references(() => countries.id),
  role: userRoleEnum("role").default('user').notNull(),
  preferredMode: interfaceModeEnum("preferred_mode").default('basic').notNull(),
  isDemo: boolean("is_demo").default(false).notNull(),
  completedOnboarding: boolean("completed_onboarding").default(false).notNull(),
  age: integer("age"),
  targetRetirementAge: integer("target_retirement_age"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  country: one(countries, {
    fields: [users.countryId],
    references: [countries.id],
  }),
  userSubscription: one(userSubscriptions),
  assets: many(assets),
}));

// Countries
export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  currency: text("currency").notNull(),
  currencySymbol: text("currency_symbol").notNull(),
  financialYearEndMonth: integer("financial_year_end_month").notNull(),
  financialYearEndDay: integer("financial_year_end_day").notNull(),
  defaultTaxSettings: json("default_tax_settings"),
  availableApis: json("available_apis"),
});

export const countriesRelations = relations(countries, ({ many }) => ({
  users: many(users),
  assetHoldingTypes: many(assetHoldingTypes),
}));

// Asset Holding Types
export const assetHoldingTypes = pgTable("asset_holding_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  countryId: integer("country_id").references(() => countries.id).notNull(),
  taxSettings: json("tax_settings"),
});

export const assetHoldingTypesRelations = relations(assetHoldingTypes, ({ one, many }) => ({
  country: one(countries, {
    fields: [assetHoldingTypes.countryId],
    references: [countries.id],
  }),
  assets: many(assets),
}));

// Asset Classes
export const assetClasses = pgTable("asset_classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  defaultLowGrowthRate: real("default_low_growth_rate"),
  defaultMediumGrowthRate: real("default_medium_growth_rate"),
  defaultHighGrowthRate: real("default_high_growth_rate"),
  defaultIncomeYield: real("default_income_yield"),
  expenseCategories: json("expense_categories"),
});

export const assetClassesRelations = relations(assetClasses, ({ many }) => ({
  assets: many(assets),
}));

// Assets
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id).notNull(),
  assetClassId: integer("asset_class_id").references(() => assetClasses.id).notNull(),
  assetHoldingTypeId: integer("asset_holding_type_id").references(() => assetHoldingTypes.id).notNull(),
  value: real("value").notNull(),
  purchaseDate: date("purchase_date"),
  purchasePrice: real("purchase_price"),
  growthRate: real("growth_rate"),
  incomeYield: real("income_yield"),
  expenses: json("expenses"),
  isHidden: boolean("is_hidden").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assetsRelations = relations(assets, ({ one }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
  assetClass: one(assetClasses, {
    fields: [assets.assetClassId],
    references: [assetClasses.id],
  }),
  assetHoldingType: one(assetHoldingTypes, {
    fields: [assets.assetHoldingTypeId],
    references: [assetHoldingTypes.id],
  }),
}));

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  currency: text("currency").notNull(),
  interval: text("interval").notNull(), // monthly, yearly, etc.
  maxAssetHoldingTypes: integer("max_asset_holding_types"),
  maxAssetClasses: integer("max_asset_classes"),
  maxAssetsPerClass: integer("max_assets_per_class"),
  allowedApis: json("allowed_apis"),
  allowedInterfaceModes: json("allowed_interface_modes").notNull(), // ["basic"] or ["basic", "advanced"]
  maxProjectionYears: integer("max_projection_years"),
  isDefault: boolean("is_default").default(false).notNull(),
});

// User Subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  subscriptionPlanId: integer("subscription_plan_id").references(() => subscriptionPlans.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: subscriptionStatusEnum("status").default('active').notNull(),
});

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  subscriptionPlan: one(subscriptionPlans, {
    fields: [userSubscriptions.subscriptionPlanId],
    references: [subscriptionPlans.id],
  }),
}));

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  loginSplashTitle: text("login_splash_title"),
  loginSplashText: text("login_splash_text"),
  loginSplashImageUrl: text("login_splash_image_url"),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  countryId: true,
  role: true,
  preferredMode: true,
  isDemo: true,
  age: true,
  targetRetirementAge: true,
  completedOnboarding: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
});

export const insertAssetHoldingTypeSchema = createInsertSchema(assetHoldingTypes).omit({
  id: true,
});

export const insertAssetClassSchema = createInsertSchema(assetClasses).omit({
  id: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
});

export const updateSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export type Country = typeof countries.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;

export type AssetHoldingType = typeof assetHoldingTypes.$inferSelect;
export type InsertAssetHoldingType = z.infer<typeof insertAssetHoldingTypeSchema>;

export type AssetClass = typeof assetClasses.$inferSelect;
export type InsertAssetClass = z.infer<typeof insertAssetClassSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;

export type SystemSettings = typeof systemSettings.$inferSelect;
export type UpdateSystemSettings = z.infer<typeof updateSystemSettingsSchema>;
