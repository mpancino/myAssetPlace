import { storage } from "../storage";
import { Asset, InsertAsset } from "@shared/schema";

// Extended Asset type to include mortgage fields
interface ExtendedAsset extends InsertAsset {
  hasMortgage?: boolean;
  mortgageAmount?: number;
  mortgageInterestRate?: number;
  mortgageTerm?: number;
  mortgageStartDate?: string;
  mortgageLender?: string;
  mortgageType?: string;
  mortgagePaymentFrequency?: string;
}

/**
 * Creates sample assets for a demo user
 * @param userId The ID of the user to create assets for
 */
export async function createDemoAssets(userId: number): Promise<Asset[]> {
  console.log(`Creating demo assets for user ID: ${userId}`);
  const assets: InsertAsset[] = [
    // Cash & Bank Accounts
    {
      userId,
      assetClassId: 1, // Cash & Bank Accounts
      assetHoldingTypeId: 1, // Personal
      name: "Emergency Fund",
      description: "Savings for unexpected expenses",
      value: 10000,
      interestRate: 1.5,
      institution: "ABC Bank",
      accountNumber: "XXXX-1234",
      accountPurpose: "emergency",
      isLiability: false,
      growthRate: 1.5,
      incomeYield: 1.5
    },
    {
      userId,
      assetClassId: 1, // Cash & Bank Accounts
      assetHoldingTypeId: 1, // Personal
      name: "Vacation Savings",
      description: "Savings for annual vacation",
      value: 5000,
      interestRate: 2.0,
      institution: "XYZ Bank",
      accountNumber: "XXXX-5678",
      accountPurpose: "savings",
      isLiability: false,
      growthRate: 2.0,
      incomeYield: 2.0
    },
    
    // Investments (replacing Stocks & Shares)
    {
      userId,
      assetClassId: 4, // Investments (correct ID)
      assetHoldingTypeId: 1, // Personal
      name: "Tech Stock Portfolio",
      description: "Collection of technology stocks",
      value: 25000,
      purchasePrice: 20000,
      growthRate: 7.5,
      incomeYield: 1.8,
      isLiability: false
    },
    {
      userId,
      assetClassId: 5, // Retirement (correct ID)
      assetHoldingTypeId: 2, // Retirement/Super
      name: "Retirement Fund",
      description: "401k/Superannuation investments",
      value: 150000,
      growthRate: 6.5,
      incomeYield: 2.5,
      isLiability: false
    },
    
    // Real Estate
    {
      userId,
      assetClassId: 3, // Real Estate
      assetHoldingTypeId: 1, // Personal
      name: "Primary Residence",
      description: "Family home",
      value: 450000,
      purchasePrice: 350000,
      purchaseDate: new Date("2015-06-15").toISOString(),
      growthRate: 4.0,
      isLiability: false,
      propertyType: "residential",
      address: "123 Main Street",
      suburb: "Cityville",
      state: "NSW",
      postcode: "2000",
      country: "Australia",
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 1,
      hasMortgage: true,
      mortgageAmount: 280000,
      mortgageInterestRate: 4.5,
      mortgageTerm: 360,
      mortgageStartDate: new Date("2015-06-20").toISOString(),
      mortgageLender: "Home Loans Inc",
      mortgageType: "variable",
      mortgagePaymentFrequency: "monthly"
    },
    {
      userId,
      assetClassId: 3, // Real Estate
      assetHoldingTypeId: 1, // Personal
      name: "Investment Property",
      description: "Rental property investment",
      value: 380000,
      purchasePrice: 320000,
      purchaseDate: new Date("2018-09-10").toISOString(),
      growthRate: 3.5,
      isLiability: false,
      propertyType: "residential",
      address: "45 Park Avenue",
      suburb: "Riverdale",
      state: "VIC",
      postcode: "3000",
      country: "Australia",
      bedrooms: 2,
      bathrooms: 1,
      parkingSpaces: 1,
      isRental: true,
      rentalIncome: 1900,
      rentalFrequency: "monthly",
      vacancyRate: 5,
      hasMortgage: true,
      mortgageAmount: 250000,
      mortgageInterestRate: 3.85,
      mortgageTerm: 360,
      mortgageStartDate: new Date("2018-09-15").toISOString(),
      mortgageLender: "Westpac Bank",
      mortgageType: "variable",
      mortgagePaymentFrequency: "monthly",
    },
    
    // Loans & Liabilities
    {
      userId,
      assetClassId: 2, // Loans & Liabilities (correct ID)
      assetHoldingTypeId: 1, // Personal
      name: "Car Loan",
      description: "Auto financing",
      value: 15000,
      loanProvider: "Auto Finance Co",
      interestRate: 5.5,
      loanTerm: 60, // 5 years in months
      paymentFrequency: "monthly",
      paymentAmount: 300,
      startDate: new Date("2022-01-10").toISOString(),
      endDate: new Date("2027-01-10").toISOString(),
      originalLoanAmount: 18000,
      isLiability: true
    },
    
    // Business & Private Equity (using Investments asset class)
    {
      userId,
      assetClassId: 4, // Investments (correct ID for business investments)
      assetHoldingTypeId: 3, // Family Trust
      name: "Small Business Investment",
      description: "Ownership stake in local business",
      value: 75000,
      purchasePrice: 50000,
      purchaseDate: new Date("2019-03-01").toISOString(),
      growthRate: 8.0,
      incomeYield: 5.0,
      isLiability: false
    }
  ];

  const createdAssets: Asset[] = [];

  // Create assets one by one to handle any errors
  for (const asset of assets) {
    try {
      const createdAsset = await storage.createAsset(asset);
      createdAssets.push(createdAsset);
      console.log(`Created demo asset: ${createdAsset.name}`);
    } catch (error) {
      console.error(`Error creating demo asset ${asset.name}:`, error);
    }
  }

  return createdAssets;
}