import { describe, it, expect } from 'vitest';
import { 
  getAssetGrowthRate, 
  getAssetIncomeYield, 
  calculateAnnualAssetIncome,
  calculateAnnualAssetExpenses,
  mapPeriodToYears,
  generateProjections,
  defaultBasicProjectionConfig
} from './projections';
import { 
  Asset, 
  AssetClass, 
  AssetHoldingType,
  ProjectionConfig,
  SystemSettings
} from './schema';

describe('projection utilities', () => {
  // Sample data for testing
  const sampleAssetClass: AssetClass = {
    id: 1,
    name: 'Real Estate',
    description: 'Property investments',
    defaultLowGrowthRate: 2,
    defaultMediumGrowthRate: 5,
    defaultHighGrowthRate: 8,
    defaultIncomeYield: 3,
    isLiability: false,
    expenseCategories: null,
    color: '#4CAF50'
  };
  
  const sampleAsset = {
    id: 1,
    name: 'Investment Property',
    description: 'Rental property',
    userId: 1,
    assetClassId: 1,
    assetHoldingTypeId: 1,
    value: 500000,
    purchaseDate: new Date('2020-01-01'),
    purchasePrice: 450000,
    growthRate: 4.5,
    incomeYield: 3.2,
    isHidden: false,
    isLiability: false,
    propertyType: 'residential',
    address: '123 Main St',
    suburb: 'Suburbia',
    state: 'State',
    postcode: '12345',
    country: 'Country',
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 1,
    isRental: true,
    rentalIncome: 2000,
    rentalFrequency: 'monthly',
    vacancyRate: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  } as unknown as Asset;

  const sampleSystemSettings: SystemSettings = {
    id: 1,
    defaultBasicModeYears: 10,
    defaultAdvancedModeYears: 30,
    defaultInflationRate: 2.5,
    defaultLowInflationRate: 1.5,
    defaultMediumInflationRate: 2.5,
    defaultHighInflationRate: 4.0
  } as SystemSettings;

  it('should get correct growth rate based on scenario', () => {
    // Asset has its own growth rate
    expect(getAssetGrowthRate(sampleAsset, sampleAssetClass, 'medium')).toBeCloseTo(0.045);
    
    // Asset without custom growth rate
    const assetWithoutGrowth = { ...sampleAsset, growthRate: null };
    expect(getAssetGrowthRate(assetWithoutGrowth, sampleAssetClass, 'low')).toBeCloseTo(0.02);
    expect(getAssetGrowthRate(assetWithoutGrowth, sampleAssetClass, 'medium')).toBeCloseTo(0.05);
    expect(getAssetGrowthRate(assetWithoutGrowth, sampleAssetClass, 'high')).toBeCloseTo(0.08);
    
    // No asset class provided
    expect(getAssetGrowthRate(assetWithoutGrowth, undefined, 'medium')).toBeCloseTo(0.05);
  });
  
  it('should get correct income yield', () => {
    // Asset has its own income yield
    expect(getAssetIncomeYield(sampleAsset, sampleAssetClass)).toBeCloseTo(0.032);
    
    // Asset without custom income yield
    const assetWithoutYield = { ...sampleAsset, incomeYield: null };
    expect(getAssetIncomeYield(assetWithoutYield, sampleAssetClass)).toBeCloseTo(0.03);
    
    // No asset class provided
    expect(getAssetIncomeYield(assetWithoutYield, undefined)).toBeCloseTo(0);
  });
  
  it('should calculate annual rental income correctly', () => {
    const rentalAsset = { ...sampleAsset, isRental: true, rentalIncome: 2000, rentalFrequency: 'monthly', vacancyRate: 5 };
    expect(calculateAnnualAssetIncome(rentalAsset, sampleAssetClass)).toBeCloseTo(22800); // 2000 * 12 * 0.95
    
    // Weekly rental
    const weeklyRental = { ...rentalAsset, rentalIncome: 500, rentalFrequency: 'weekly' };
    expect(calculateAnnualAssetIncome(weeklyRental, sampleAssetClass)).toBeCloseTo(24700); // 500 * 52 * 0.95
    
    // Fortnightly rental
    const fortnightlyRental = { ...rentalAsset, rentalIncome: 1000, rentalFrequency: 'fortnightly' };
    expect(calculateAnnualAssetIncome(fortnightlyRental, sampleAssetClass)).toBeCloseTo(24700); // 1000 * 26 * 0.95
  });

  it('should map projection periods to years correctly', () => {
    expect(mapPeriodToYears('annually')).toBe(1);
    expect(mapPeriodToYears('5-years')).toBe(5);
    expect(mapPeriodToYears('10-years')).toBe(10);
    expect(mapPeriodToYears('20-years')).toBe(20);
    expect(mapPeriodToYears('30-years')).toBe(30);
    
    // Retirement calculation
    expect(mapPeriodToYears('retirement', 65, 40)).toBe(25);
    expect(mapPeriodToYears('retirement', 65, 65)).toBe(0);
    expect(mapPeriodToYears('retirement', 65, 70)).toBe(30); // Default when current age > retirement age
    expect(mapPeriodToYears('retirement')).toBe(30); // Default when ages not provided
    
    // Unknown period
    expect(mapPeriodToYears('unknown')).toBe(10); // Default to 10 years
  });

  it('creates correct default basic projection config', () => {
    const config = defaultBasicProjectionConfig(sampleSystemSettings);
    
    expect(config.inflationRate).toBe(2.5);
    expect(config.growthRateScenario).toBe('medium');
    expect(config.yearsToProject).toBe(10);
    expect(config.includeIncome).toBe(true);
    expect(config.includeExpenses).toBe(true);
    expect(config.includeHiddenAssets).toBe(false);
  });

  it('correctly calculates annual asset expenses', () => {
    // Asset with property expenses
    const assetWithExpenses = { 
      ...sampleAsset,
      propertyExpenses: {
        'expense-1': { id: 'expense-1', category: 'Insurance', description: 'Home Insurance', amount: 1200, frequency: 'annually', annualTotal: 1200 },
        'expense-2': { id: 'expense-2', category: 'Maintenance', description: 'General Maintenance', amount: 100, frequency: 'monthly', annualTotal: 1200 }
      }
    };
    
    expect(calculateAnnualAssetExpenses(assetWithExpenses)).toBeCloseTo(2400);
    
    // Asset with mortgage
    const assetWithMortgage = {
      ...sampleAsset,
      hasMortgage: true,
      mortgageAmount: 300000,
      mortgageInterestRate: 4,
      mortgageTerm: 360 // 30 years in months
    };
    
    // Monthly payment on $300k loan, 4% interest, 30 year term should be around $1432
    // Annual payments would be around $17,184
    expect(calculateAnnualAssetExpenses(assetWithMortgage)).toBeGreaterThan(17000);
    expect(calculateAnnualAssetExpenses(assetWithMortgage)).toBeLessThan(17500);
  });
});

describe('projection engine', () => {
  // Sample data for full projection testing
  const assetClasses: Record<number, AssetClass> = {
    1: {
      id: 1,
      name: 'Real Estate',
      description: 'Property investments',
      defaultLowGrowthRate: 2,
      defaultMediumGrowthRate: 5,
      defaultHighGrowthRate: 8,
      defaultIncomeYield: 3,
      isLiability: false,
      expenseCategories: null,
      color: '#4CAF50'
    },
    2: {
      id: 2,
      name: 'Cash',
      description: 'Cash accounts',
      defaultLowGrowthRate: 1,
      defaultMediumGrowthRate: 2,
      defaultHighGrowthRate: 3,
      defaultIncomeYield: 2,
      isLiability: false,
      expenseCategories: null,
      color: '#2196F3'
    },
    3: {
      id: 3,
      name: 'Loans',
      description: 'Loans and mortgages',
      defaultLowGrowthRate: 0,
      defaultMediumGrowthRate: 0,
      defaultHighGrowthRate: 0,
      defaultIncomeYield: 0,
      isLiability: true,
      expenseCategories: null,
      color: '#F44336'
    }
  };
  
  const holdingTypes: Record<number, AssetHoldingType> = {
    1: {
      id: 1,
      name: 'Personal',
      description: 'Personal assets',
      countryId: 1,
      taxSettings: null
    }
  };
  
  const assets: Asset[] = [
    // Property asset
    {
      id: 1,
      name: 'Investment Property',
      description: 'Rental property',
      userId: 1,
      assetClassId: 1,
      assetHoldingTypeId: 1,
      value: 500000,
      purchaseDate: new Date('2020-01-01'),
      purchasePrice: 450000,
      growthRate: 4.5,
      incomeYield: 3.2,
      isHidden: false,
      isLiability: false,
      propertyType: 'residential',
      isRental: true,
      rentalIncome: 2000,
      rentalFrequency: 'monthly',
      vacancyRate: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Asset,
    
    // Cash asset
    {
      id: 2,
      name: 'Savings Account',
      description: 'High interest savings',
      userId: 1,
      assetClassId: 2,
      assetHoldingTypeId: 1,
      value: 50000,
      interestRate: 2.5,
      isHidden: false,
      isLiability: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Asset,
    
    // Loan/mortgage liability
    {
      id: 3,
      name: 'Home Mortgage',
      description: 'Primary residence mortgage',
      userId: 1,
      assetClassId: 3,
      assetHoldingTypeId: 1,
      value: 300000,
      isHidden: false,
      isLiability: true,
      mortgageAmount: 300000,
      mortgageInterestRate: 4,
      mortgageTerm: 360, // 30 years in months
      startDate: new Date('2020-01-01'),
      originalLoanAmount: 350000,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Asset
  ];
  
  const projectionConfig: ProjectionConfig = {
    inflationRate: 2.5,
    growthRateScenario: 'medium',
    includeIncome: true,
    includeExpenses: true,
    period: '10-years',
    reinvestIncome: false,
    yearsToProject: 10,
    enabledAssetClasses: [],
    enabledAssetHoldingTypes: [],
    includeHiddenAssets: false,
    excludeLiabilities: false,
    calculateAfterTax: false
  };

  it('generates projections correctly', () => {
    const projections = generateProjections(assets, assetClasses, holdingTypes, projectionConfig);
    
    // Test structure of projection results
    expect(projections.totalAssetValue.length).toBe(11); // 0 to 10 years
    expect(projections.netWorth.length).toBe(11);
    expect(projections.dates.length).toBe(11);
    expect(projections.assetBreakdown.length).toBe(3); // 3 asset classes
    
    // Initial values (year 0)
    expect(projections.totalAssetValue[0]).toBeCloseTo(550000); // 500k property + 50k cash
    expect(projections.totalLiabilityValue[0]).toBeCloseTo(300000); // 300k mortgage
    expect(projections.netWorth[0]).toBeCloseTo(250000); // 550k - 300k
    
    // Check that assets grow over time (year 5)
    expect(projections.totalAssetValue[5]).toBeGreaterThan(projections.totalAssetValue[0]);
    
    // Check that liabilities decrease over time (year 5) due to mortgage payments
    expect(projections.totalLiabilityValue[5]).toBeLessThan(projections.totalLiabilityValue[0]);
    
    // Check net worth increases (year 5)
    expect(projections.netWorth[5]).toBeGreaterThan(projections.netWorth[0]);
    
    // Check cashflow
    expect(projections.cashflow.totalIncome[0]).toBeGreaterThan(0);
    expect(projections.cashflow.totalExpenses[0]).toBeGreaterThan(0);
    
    // Verify asset breakdown
    const realEstateBreakdown = projections.assetBreakdown.find(b => b.assetClassId === 1);
    expect(realEstateBreakdown).toBeDefined();
    expect(realEstateBreakdown?.values[0]).toBeCloseTo(500000);
    
    // Verify holding type breakdown
    const personalHoldingBreakdown = projections.holdingTypeBreakdown.find(b => b.holdingTypeId === 1);
    expect(personalHoldingBreakdown).toBeDefined();
    expect(personalHoldingBreakdown?.values[0]).toBeCloseTo(250000); // Net of all assets and liabilities
  });

  it('respects asset filtering in projection config', () => {
    // Create config that excludes liabilities
    const noLiabilitiesConfig: ProjectionConfig = {
      ...projectionConfig,
      excludeLiabilities: true
    };
    
    const projections = generateProjections(assets, assetClasses, holdingTypes, noLiabilitiesConfig);
    
    // Should only have assets, no liabilities
    expect(projections.totalLiabilityValue[0]).toBeCloseTo(0);
    expect(projections.netWorth[0]).toBeCloseTo(550000); // Just the assets
    
    // Create config that only includes real estate
    const onlyRealEstateConfig: ProjectionConfig = {
      ...projectionConfig,
      enabledAssetClasses: [1] // Only Real Estate
    };
    
    const realEstateProjections = generateProjections(assets, assetClasses, holdingTypes, onlyRealEstateConfig);
    
    // Should only have real estate assets
    expect(realEstateProjections.totalAssetValue[0]).toBeCloseTo(500000); // Just the property
    expect(realEstateProjections.assetBreakdown.length).toBe(1); // Only one asset class
  });

  it('handles inflation adjustment correctly', () => {
    // Create config with higher inflation
    const highInflationConfig: ProjectionConfig = {
      ...projectionConfig,
      inflationRate: 5.0 // 5% inflation
    };
    
    const projections = generateProjections(assets, assetClasses, holdingTypes, highInflationConfig);
    
    // Inflation-adjusted values should be lower than non-adjusted
    const nonAdjustedProjections = generateProjections(
      assets, 
      assetClasses, 
      holdingTypes,
      { ...projectionConfig, inflationRate: 0 }
    );
    
    // Year 5 values should be lower with inflation adjustment
    expect(projections.totalAssetValue[5]).toBeLessThan(nonAdjustedProjections.totalAssetValue[5]);
    expect(projections.netWorth[5]).toBeLessThan(nonAdjustedProjections.netWorth[5]);
  });
});