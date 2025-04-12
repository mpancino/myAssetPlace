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
  isLiability: boolean("is_liability").default(false),
  color: text("color"),
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
  isLiability: boolean("is_liability").default(false).notNull(),
  // Cash account specific fields
  interestRate: real("interest_rate"),
  accountNumber: text("account_number"),
  institution: text("institution"),
  accountType: text("account_type"), // savings, checking, etc.
  accountPurpose: text("account_purpose"), // emergency, general, etc.
  isOffsetAccount: boolean("is_offset_account").default(false),
  offsetLinkedLoanId: integer("offset_linked_loan_id"),
  // Account balance history for cash accounts
  balanceHistory: json("balance_history"),
  transactionCategories: json("transaction_categories"),
  // Loan specific fields
  loanProvider: text("loan_provider"),
  interestRateType: text("interest_rate_type"), // fixed, variable
  loanTerm: integer("loan_term"), // in months
  paymentFrequency: text("payment_frequency"), // monthly, weekly, etc.
  paymentAmount: real("payment_amount"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  originalLoanAmount: real("original_loan_amount"),
  // Property specific fields
  propertyType: text("property_type"), // residential, commercial, land, etc.
  address: text("address"),
  suburb: text("suburb"),
  state: text("state"),
  postcode: text("postcode"),
  country: text("country"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  landSize: real("land_size"), // in square meters
  floorArea: real("floor_area"), // in square meters
  parkingSpaces: integer("parking_spaces"),
  isRental: boolean("is_rental").default(false),
  rentalIncome: real("rental_income"), // monthly rental income
  rentalFrequency: text("rental_frequency"), // weekly, fortnightly, monthly
  vacancyRate: real("vacancy_rate"), // percent of time property is vacant
  propertyExpenses: json("property_expenses"), // e.g., strata, council rates, insurance, maintenance
  investmentExpenses: json("investment_expenses"), // e.g., management fees, brokerage fees, etc.
  mortgageId: integer("mortgage_id"), // link to associated mortgage (if any)
  // Property mortgage fields (to store mortgage info directly on property)
  hasMortgage: boolean("has_mortgage").default(false),
  mortgageAmount: real("mortgage_amount"),
  mortgageInterestRate: real("mortgage_interest_rate"),
  mortgageTerm: integer("mortgage_term"), // In months
  mortgageStartDate: date("mortgage_start_date"),
  mortgageLender: text("mortgage_lender"),
  mortgageType: text("mortgage_type"), // fixed, variable
  mortgagePaymentFrequency: text("mortgage_payment_frequency"), // weekly, fortnightly, monthly
  // Share/Stock specific fields
  ticker: text("ticker"), // Stock ticker symbol
  exchange: text("exchange"), // Stock exchange
  sharesQuantity: real("shares_quantity"), // Number of shares owned
  currentPrice: real("current_price"), // Current price per share
  lastPriceUpdateDate: date("last_price_update_date"), // Date of last price update
  purchaseHistory: json("purchase_history"), // History of purchases
  dividendYield: real("dividend_yield"), // Dividend yield percentage
  dividendHistory: json("dividend_history"), // History of dividends received
  // Stock Option specific fields
  isStockOption: boolean("is_stock_option").default(false),
  grantDate: date("grant_date"), // Date options were granted
  expirationDate: date("expiration_date"), // Date options expire
  strikePrice: real("strike_price"), // Price at which options can be exercised
  optionQuantity: integer("option_quantity"), // Number of options
  vestingSchedule: json("vesting_schedule"), // Schedule of vesting dates
  vestedQuantity: integer("vested_quantity"), // Number of vested options
  // Maps/API-related fields
  longitude: real("longitude"),
  latitude: real("latitude"),
  mapThumbnailUrl: text("map_thumbnail_url"),
  lastValuationDate: date("last_valuation_date"),
  lastValuationSource: text("last_valuation_source"), // manual, api, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assetsRelations = relations(assets, ({ one, many }) => ({
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
  // For offset accounts feature
  offsetLinkedLoan: one(assets, {
    fields: [assets.offsetLinkedLoanId],
    references: [assets.id],
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
  // Login splash screen settings
  loginSplashTitle: text("login_splash_title"),
  loginSplashText: text("login_splash_text"),
  loginSplashImageUrl: text("login_splash_image_url"),
  
  // General system settings
  defaultCurrency: text("default_currency"),
  defaultFinancialYearEnd: text("default_financial_year_end"),
  defaultBasicModeYears: integer("default_basic_mode_years"),
  defaultAdvancedModeYears: integer("default_advanced_mode_years"),
  
  // API integration settings
  enablePropertyApi: boolean("enable_property_api").default(false),
  enableStockApi: boolean("enable_stock_api").default(false),
  enableCryptoApi: boolean("enable_crypto_api").default(false),
  
  // Legal and support information
  termsAndConditionsUrl: text("terms_and_conditions_url"),
  privacyPolicyUrl: text("privacy_policy_url"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  
  // Company information
  companyName: text("company_name"),
  companyAddress: text("company_address"),
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

export const insertAssetSchema = createInsertSchema(assets)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    value: z.number().min(-1000000000, "Asset value must be greater than -1 billion").max(1000000000, "Asset value cannot exceed 1 billion"),
    investmentExpenses: z.record(z.string(), z.object({
      id: z.string(),
      category: z.string(),
      description: z.string(),
      amount: z.number(),
      frequency: z.string(),
      annualTotal: z.number()
    })).optional(),
  });

export const insertCashAccountSchema = insertAssetSchema.extend({
  accountNumber: z.string().optional(),
  institution: z.string().min(1, "Bank/institution name is required"),
  accountType: z.enum(["savings", "checking", "term_deposit", "other"]),
  interestRate: z.number().min(0).max(100).optional(),
  accountPurpose: z.enum(["general", "emergency", "savings", "investment", "other"]).optional(),
  isOffsetAccount: z.boolean().optional().default(false),
  offsetLinkedLoanId: z.number().optional(),
});

export const insertLoanSchema = insertAssetSchema.extend({
  isLiability: z.literal(true).default(true),
  loanProvider: z.string().min(1, "Loan provider is required"),
  interestRate: z.number().min(0).max(100),
  interestRateType: z.enum(["fixed", "variable"]),
  loanTerm: z.number().min(1, "Loan term must be at least 1 month").max(1200, "Loan term cannot exceed 1200 months (100 years)"),
  paymentFrequency: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annually"]),
  paymentAmount: z.number().min(0, "Payment amount must be greater than 0").max(1000000000, "Payment amount cannot exceed 1 billion"),
  startDate: z.date(),
  originalLoanAmount: z.number().min(0, "Original loan amount must be greater than 0").max(1000000000, "Loan amount cannot exceed 1 billion"),
});

export const insertPropertySchema = insertAssetSchema.extend({
  propertyType: z.enum(["residential", "commercial", "industrial", "land", "rural", "other"]),
  address: z.string().min(1, "Property address is required"),
  suburb: z.string().min(1, "Suburb/city is required"),
  state: z.string().min(1, "State/territory is required"),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().default("Australia"),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(), // Use number instead of int to support 0.5 baths
  landSize: z.number().min(0).optional(),
  floorArea: z.number().min(0).optional(),
  parkingSpaces: z.number().int().min(0).optional(),
  isRental: z.boolean().default(false),
  rentalIncome: z.number().min(0).optional(),
  rentalFrequency: z.enum(["weekly", "fortnightly", "monthly"]).optional(),
  vacancyRate: z.number().min(0).max(100).default(0).optional(),
  propertyExpenses: z.record(z.string(), z.object({
    id: z.string(),
    category: z.string(),
    description: z.string(),
    amount: z.number(),
    frequency: z.string(),
    annualTotal: z.number()
  })).optional(),
  
  // Mortgage fields
  hasMortgage: z.boolean().default(false),
  mortgageAmount: z.number().min(0).optional(),
  mortgageInterestRate: z.number().min(0).max(100).optional(),
  mortgageTerm: z.number().min(1).max(1200).optional(), // In months (100 years max)
  mortgageStartDate: z.date().optional(),
  mortgageLender: z.string().optional(),
  mortgageType: z.enum(["fixed", "variable"]).optional(),
  mortgagePaymentFrequency: z.enum(["weekly", "fortnightly", "monthly"]).optional(),
  
  mortgageId: z.number().optional(),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  // Override the purchaseDate from insertAssetSchema to accept Date objects
  purchaseDate: z.date().optional(),
});

// Stock/Share schema - for REQ-121 through REQ-127
export const insertShareSchema = insertAssetSchema.extend({
  ticker: z.string().min(1, "Ticker symbol is required"),
  exchange: z.string().min(1, "Exchange name is required"),
  sharesQuantity: z.number().min(0, "Quantity must be greater than 0"),
  currentPrice: z.number().min(0, "Current price must be greater than 0"),
  purchaseDate: z.date(),
  dividendYield: z.number().min(0).max(100).optional(),
  purchaseHistory: z.array(z.object({
    id: z.string(),
    date: z.date(),
    quantity: z.number().min(0),
    pricePerShare: z.number().min(0),
    fees: z.number().min(0).optional(),
    notes: z.string().optional(),
  })).optional(),
  dividendHistory: z.array(z.object({
    id: z.string(),
    date: z.date(),
    amount: z.number().min(0),
    frankedAmount: z.number().min(0).optional(),
    notes: z.string().optional(),
  })).optional(),
  investmentExpenses: z.record(z.string(), z.object({
    id: z.string(),
    category: z.string(),
    description: z.string(),
    amount: z.number(),
    frequency: z.string(),
    annualTotal: z.number()
  })).optional(),
});

// Employee Stock Options schema - for REQ-141 through REQ-147
export const insertStockOptionSchema = insertAssetSchema.extend({
  isStockOption: z.literal(true).default(true),
  ticker: z.string().min(1, "Underlying stock ticker symbol is required"),
  exchange: z.string().min(1, "Exchange name is required"),
  strikePrice: z.number().min(0, "Strike price must be greater than 0"),
  optionQuantity: z.number().int().min(1, "Option quantity must be at least 1"),
  grantDate: z.date(),
  expirationDate: z.date(),
  currentPrice: z.number().min(0, "Current stock price must be greater than 0").optional(),
  vestingSchedule: z.array(z.object({
    id: z.string(),
    date: z.date(),
    quantity: z.number().int().min(0),
    isVested: z.boolean().default(false),
  })).optional(),
  vestedQuantity: z.number().int().min(0).optional(),
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
export type InsertCashAccount = z.infer<typeof insertCashAccountSchema>;
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertShare = z.infer<typeof insertShareSchema>;
export type InsertStockOption = z.infer<typeof insertStockOptionSchema>;

// Expense category definition for administrators
export type ExpenseCategory = {
  id: string;
  name: string;
  description: string;
  defaultFrequency: 'monthly' | 'quarterly' | 'annually';
};

// Property expense type for user assets
export type PropertyExpense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string;
  annualTotal: number;
};

// Investment expense type for investment assets
export type InvestmentExpense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: string;
  annualTotal: number;
};

// Share transaction types for purchase history
export type SharePurchaseTransaction = {
  id: string;
  date: Date;
  quantity: number;
  pricePerShare: number;
  fees?: number;
  notes?: string;
};

// Dividend transaction type for dividend history
export type DividendTransaction = {
  id: string;
  date: Date;
  amount: number;
  frankedAmount?: number;
  notes?: string;
};

// Balance history entry for cash accounts
export type BalanceHistoryEntry = {
  id: string;
  date: Date;
  balance: number;
  notes?: string;
};

// Transaction category for cash accounts
export type TransactionCategory = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
};

// Stock option vesting schedule entry
export type VestingScheduleEntry = {
  id: string;
  date: Date;
  quantity: number;
  isVested: boolean;
};

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;

export type SystemSettings = typeof systemSettings.$inferSelect;
export type UpdateSystemSettings = z.infer<typeof updateSystemSettingsSchema>;
