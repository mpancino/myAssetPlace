import { storage } from "../storage";
import { Asset, InsertAsset, InsertMortgage, Mortgage } from "@shared/schema";

// Extended Asset type to include mortgage fields for migration
interface PropertyWithMortgage extends InsertAsset {
  hasMortgage?: boolean;
  mortgageAmount?: number;
  mortgageInterestRate?: number;
  mortgageTerm?: number;
  mortgageStartDate?: string;
  mortgageLender?: string;
  mortgageType?: string;
  mortgagePaymentFrequency?: string;
}

interface AssetWithId extends Asset {
  id: number;
}

/**
 * Creates sample assets for a demo user
 * @param userId The ID of the user to create assets for
 */
export async function createDemoAssets(userId: number): Promise<Asset[]> {
  console.log(`Creating demo assets for user ID: ${userId}`);
  
  // Define the assets
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
    
    // Real Estate - Without mortgage information (will be linked later)
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
      // Add demo property expenses for primary residence
      propertyExpenses: {
        "expense-home-1": {
          id: "expense-home-1",
          categoryId: "Insurance",
          name: "Home and contents insurance",
          amount: 1200,
          frequency: "annually",
          annualTotal: 1200
        },
        "expense-home-2": {
          id: "expense-home-2",
          categoryId: "Utilities",
          name: "Water and electricity",
          amount: 250,
          frequency: "quarterly",
          annualTotal: 1000
        },
        "expense-home-3": {
          id: "expense-home-3",
          categoryId: "Maintenance",
          name: "Gardening service",
          amount: 80,
          frequency: "monthly",
          annualTotal: 960
        }
      }
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
      // Add demo property expenses
      propertyExpenses: {
        "expense-1": {
          id: "expense-1",
          categoryId: "Insurance",
          name: "Building insurance",
          amount: 800,
          frequency: "annually",
          annualTotal: 800
        },
        "expense-2": {
          id: "expense-2",
          categoryId: "Property Tax",
          name: "Annual council rates",
          amount: 1200,
          frequency: "annually",
          annualTotal: 1200
        },
        "expense-3": {
          id: "expense-3",
          categoryId: "Maintenance",
          name: "General upkeep",
          amount: 150,
          frequency: "monthly",
          annualTotal: 1800
        }
      }
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
  let primaryResidenceId: number | null = null;
  let investmentPropertyId: number | null = null;

  // Create assets one by one to handle any errors
  for (const asset of assets) {
    try {
      const createdAsset = await storage.createAsset(asset);
      createdAssets.push(createdAsset);
      console.log(`Created demo asset: ${createdAsset.name}`);
      
      // Save property IDs for mortgage linking
      if (createdAsset.name === "Primary Residence") {
        primaryResidenceId = createdAsset.id;
      } else if (createdAsset.name === "Investment Property") {
        investmentPropertyId = createdAsset.id;
      }
    } catch (error) {
      console.error(`Error creating demo asset ${asset.name}:`, error);
    }
  }

  // Create mortgages and link them to properties
  try {
    if (primaryResidenceId) {
      // Create primary residence mortgage
      const primaryMortgage: InsertMortgage = {
        userId,
        name: "Home Mortgage",
        description: "Primary residence mortgage",
        value: -280000, // Negative value as it's a liability
        interestRate: 4.5,
        loanTerm: 360, // 30 years in months
        paymentFrequency: "monthly",
        paymentAmount: 1419.47, // Calculated monthly payment
        lender: "Home Loans Inc", // Default lender value
        interestRateType: "variable", // Fixed field name to match schema
        startDate: new Date("2015-06-20"),
        originalAmount: 280000,
        securedAssetId: primaryResidenceId,
        isLiability: true,
        loanPurpose: "mortgage",
        isFixedRatePeriod: false,
        isInterestOnly: false,
        assetHoldingTypeId: 1 // Personal - default asset holding type
      };
      
      const createdMortgage = await storage.createMortgage(primaryMortgage);
      console.log(`Created mortgage for primary residence: ${createdMortgage.name} with ID ${createdMortgage.id}`);
      
      // Link mortgage to property
      await storage.linkMortgageToProperty(createdMortgage.id, primaryResidenceId);
      console.log(`Linked mortgage ${createdMortgage.id} to property ${primaryResidenceId}`);
    }
    
    if (investmentPropertyId) {
      // Create investment property mortgage
      const investmentMortgage: InsertMortgage = {
        userId,
        name: "Investment Property Mortgage",
        description: "Rental property financing",
        value: -250000, // Negative value as it's a liability
        interestRate: 3.85,
        loanTerm: 360, // 30 years in months
        paymentFrequency: "monthly",
        paymentAmount: 1172.12, // Calculated monthly payment
        lender: "Westpac Bank", // Default lender value
        interestRateType: "fixed", // Fixed field name to match schema
        startDate: new Date("2018-09-15"),
        originalAmount: 250000,
        securedAssetId: investmentPropertyId,
        isLiability: true,
        loanPurpose: "investment",
        isFixedRatePeriod: true,
        fixedRateEndDate: new Date("2025-09-15"), // 7-year fixed period
        variableRateAfterFixed: 4.25,
        isInterestOnly: false,
        assetHoldingTypeId: 1 // Personal - default asset holding type
      };
      
      const createdMortgage = await storage.createMortgage(investmentMortgage);
      console.log(`Created mortgage for investment property: ${createdMortgage.name} with ID ${createdMortgage.id}`);
      
      // Link mortgage to property
      await storage.linkMortgageToProperty(createdMortgage.id, investmentPropertyId);
      console.log(`Linked mortgage ${createdMortgage.id} to property ${investmentPropertyId}`);
    }
  } catch (error) {
    console.error("Error creating and linking mortgages:", error);
  }

  return createdAssets;
}