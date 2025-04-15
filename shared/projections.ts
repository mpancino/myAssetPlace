/**
 * Shared financial projection engine for myAssetPlace
 * This module provides functions for generating multi-year financial projections
 * based on asset data and user-defined projection parameters.
 */

import {
  Asset,
  AssetClass,
  AssetHoldingType,
  ProjectionConfig,
  ProjectionResult,
  SystemSettings
} from './schema';
import {
  calculateFutureValue,
  calculateInflationAdjustedValue
} from './calculations';

/**
 * Default projection configuration for Basic Mode
 */
export const defaultBasicProjectionConfig = (settings: SystemSettings | any): ProjectionConfig => ({
  inflationRate: settings.defaultMediumInflationRate ?? 2.5,
  growthRateScenario: 'medium',
  includeIncome: true,
  includeExpenses: true,
  period: '10-years',
  reinvestIncome: false,
  yearsToProject: settings.defaultBasicModeYears ?? 10,
  enabledAssetClasses: [], // Empty means all asset classes
  enabledAssetHoldingTypes: [], // Empty means all holding types
  includeHiddenAssets: false,
  excludeLiabilities: false,
  calculateAfterTax: false
});

/**
 * Map projection period to actual years for projection
 */
export function mapPeriodToYears(period: string, retirementAge?: number, currentAge?: number): number {
  switch (period) {
    case 'annually':
      return 1;
    case '5-years':
      return 5;
    case '10-years':
      return 10;
    case '20-years':
      return 20;
    case '30-years':
      return 30;
    case 'retirement':
      if (retirementAge && currentAge && retirementAge > currentAge) {
        return retirementAge - currentAge;
      }
      return 30; // Default if retirement age is not set
    default:
      return 10; // Default if period is not recognized
  }
}

/**
 * Get the appropriate growth rate for an asset based on the selected scenario
 */
export function getAssetGrowthRate(
  asset: Asset,
  assetClass: AssetClass | undefined,
  scenario: string
): number {
  // If asset has its own growth rate defined, use that (advanced mode)
  if (asset.growthRate !== null && asset.growthRate !== undefined) {
    return asset.growthRate / 100; // Convert percentage to decimal
  }

  // Otherwise, use the default rates from the asset class
  if (assetClass) {
    switch (scenario) {
      case 'low':
        return (assetClass.defaultLowGrowthRate ?? 2) / 100;
      case 'high':
        return (assetClass.defaultHighGrowthRate ?? 8) / 100;
      case 'medium':
      default:
        return (assetClass.defaultMediumGrowthRate ?? 5) / 100;
    }
  }

  // Fallback default
  return 0.05; // 5% as a safe default
}

/**
 * Get income yield for an asset
 */
export function getAssetIncomeYield(
  asset: Asset,
  assetClass: AssetClass | undefined
): number {
  // If asset has its own income yield defined, use that
  if (asset.incomeYield !== null && asset.incomeYield !== undefined) {
    return asset.incomeYield / 100; // Convert percentage to decimal
  }

  // Otherwise, use the default yield from the asset class
  if (assetClass && assetClass.defaultIncomeYield !== null) {
    return assetClass.defaultIncomeYield / 100;
  }

  // Fallback default
  return 0; // No income by default
}

/**
 * Calculate annual income for an asset based on its type and properties
 */
export function calculateAnnualAssetIncome(asset: Asset, assetClass: AssetClass | undefined): number {
  // Check if the asset is a liability
  if (asset.isLiability) {
    return 0; // Liabilities don't generate income
  }

  // Different asset types have different income sources
  if (assetClass?.name.toLowerCase().includes('property') && asset.isRental) {
    // Rental property income
    const annualRentalIncome = calculateRentalIncome(asset);
    return annualRentalIncome;
  } else if (assetClass?.name.toLowerCase().includes('cash') || 
             assetClass?.name.toLowerCase().includes('bank')) {
    // Interest income from cash/savings accounts
    return calculateInterestIncome(asset);
  } else if (assetClass?.name.toLowerCase().includes('share') || 
             assetClass?.name.toLowerCase().includes('stock')) {
    // Dividend income from shares
    return calculateDividendIncome(asset);
  } else if (assetClass?.name.toLowerCase().includes('employment') || 
             assetClass?.name.toLowerCase().includes('income')) {
    // Employment income
    return calculateEmploymentIncome(asset);
  }

  // For other asset types, use income yield
  const incomeYield = getAssetIncomeYield(asset, assetClass);
  return asset.value * incomeYield;
}

/**
 * Calculate annual expenses for an asset
 */
export function calculateAnnualAssetExpenses(asset: Asset): number {
  let totalExpenses = 0;

  // Add property expenses if they exist
  if (asset.propertyExpenses && typeof asset.propertyExpenses === 'object') {
    Object.values(asset.propertyExpenses).forEach(expense => {
      if (expense && expense.annualTotal) {
        totalExpenses += expense.annualTotal;
      }
    });
  }

  // Add investment expenses if they exist
  if (asset.investmentExpenses && typeof asset.investmentExpenses === 'object') {
    Object.values(asset.investmentExpenses).forEach(expense => {
      if (expense && expense.annualTotal) {
        totalExpenses += expense.annualTotal;
      }
    });
  }

  // Include mortgage payments if applicable
  if (asset.hasMortgage && asset.mortgageAmount && asset.mortgageInterestRate) {
    const monthlyPayment = calculateMortgagePayment(
      asset.mortgageAmount,
      asset.mortgageInterestRate / 100,
      asset.mortgageTerm ?? 360 // Default to 30 years if not specified
    );
    
    totalExpenses += monthlyPayment * 12;
  }

  return totalExpenses;
}

/**
 * Calculate rental income for a property asset
 */
function calculateRentalIncome(asset: Asset): number {
  if (!asset.rentalIncome) return 0;
  
  // Calculate annual rental income based on frequency
  let annualAmount = 0;
  switch (asset.rentalFrequency) {
    case 'weekly':
      annualAmount = asset.rentalIncome * 52;
      break;
    case 'fortnightly':
      annualAmount = asset.rentalIncome * 26;
      break;
    case 'monthly':
    default:
      annualAmount = asset.rentalIncome * 12;
      break;
  }
  
  // Apply vacancy rate if specified
  if (asset.vacancyRate && asset.vacancyRate > 0) {
    annualAmount *= (1 - asset.vacancyRate / 100);
  }
  
  return annualAmount;
}

/**
 * Calculate interest income for a cash/savings account
 */
function calculateInterestIncome(asset: Asset): number {
  if (!asset.interestRate) return 0;
  
  // Simple annual interest calculation
  return asset.value * (asset.interestRate / 100);
}

/**
 * Calculate dividend income from shares
 */
function calculateDividendIncome(asset: Asset): number {
  // If dividend yield is specified directly
  if (asset.dividendYield) {
    return asset.value * (asset.dividendYield / 100);
  }
  
  // If there's dividend history, we could calculate an average
  if (asset.dividendHistory && Array.isArray(asset.dividendHistory)) {
    // Sum up all dividends from the past year
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    
    const recentDividends = asset.dividendHistory.filter(
      div => new Date(div.date) >= oneYearAgo
    );
    
    return recentDividends.reduce((sum, div) => sum + div.amount, 0);
  }
  
  return 0;
}

/**
 * Calculate annual employment income
 */
function calculateEmploymentIncome(asset: Asset): number {
  // Use type assertion to access employment-specific fields that might not be in the Asset type
  const employmentAsset = asset as any;
  if (!employmentAsset.baseSalary) return 0;
  
  // Calculate annual salary based on payment frequency
  let annualSalary = 0;
  switch (employmentAsset.paymentFrequency) {
    case 'weekly':
      annualSalary = employmentAsset.baseSalary * 52;
      break;
    case 'fortnightly':
      annualSalary = employmentAsset.baseSalary * 26;
      break;
    case 'monthly':
      annualSalary = employmentAsset.baseSalary * 12;
      break;
    case 'annually':
    default:
      annualSalary = employmentAsset.baseSalary;
      break;
  }
  
  // Add bonus if applicable
  let bonusAmount = 0;
  if (employmentAsset.bonusType === 'fixed' && employmentAsset.bonusFixedAmount) {
    bonusAmount = employmentAsset.bonusFixedAmount;
  } else if (employmentAsset.bonusType === 'percentage' && employmentAsset.bonusPercentage) {
    bonusAmount = annualSalary * (employmentAsset.bonusPercentage / 100);
  } else if (employmentAsset.bonusType === 'mixed' && employmentAsset.bonusFixedAmount && employmentAsset.bonusPercentage) {
    bonusAmount = employmentAsset.bonusFixedAmount + (annualSalary * (employmentAsset.bonusPercentage / 100));
  }
  
  // Apply bonus likelihood if specified
  if (bonusAmount > 0 && employmentAsset.bonusLikelihood && employmentAsset.bonusLikelihood < 100) {
    bonusAmount *= (employmentAsset.bonusLikelihood / 100);
  }
  
  return annualSalary + bonusAmount;
}

/**
 * Calculate monthly mortgage payment
 */
function calculateMortgagePayment(principal: number, annualRate: number, termMonths: number): number {
  // Handle edge case of zero interest
  if (annualRate === 0) {
    return principal / termMonths;
  }
  
  const monthlyRate = annualRate / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Generate financial projections based on assets and configuration
 * 
 * @param assets Array of user assets to include in projections
 * @param assetClasses Map of asset class IDs to asset class data
 * @param holdingTypes Map of holding type IDs to holding type data
 * @param config Projection configuration parameters
 * @returns ProjectionResult containing projected values
 */
export function generateProjections(
  assets: Asset[],
  assetClasses: Record<number, AssetClass>,
  holdingTypes: Record<number, AssetHoldingType>,
  config: ProjectionConfig
): ProjectionResult {
  // Filter assets based on configuration
  const filteredAssets = assets.filter(asset => {
    // Filter out hidden assets if specified
    if (!config.includeHiddenAssets && asset.isHidden) {
      return false;
    }
    
    // Filter out liabilities if specified
    if (config.excludeLiabilities && asset.isLiability) {
      return false;
    }
    
    // Filter by enabled asset classes if specified
    if (config.enabledAssetClasses.length > 0 && 
        !config.enabledAssetClasses.includes(asset.assetClassId)) {
      return false;
    }
    
    // Filter by enabled holding types if specified
    if (config.enabledAssetHoldingTypes.length > 0 && 
        !config.enabledAssetHoldingTypes.includes(asset.assetHoldingTypeId)) {
      return false;
    }
    
    return true;
  });
  
  // Initialize projection result structure
  const totalYears = config.yearsToProject;
  const totalAssetValue: number[] = new Array(totalYears + 1).fill(0);
  const totalLiabilityValue: number[] = new Array(totalYears + 1).fill(0);
  const netWorth: number[] = new Array(totalYears + 1).fill(0);
  
  // Initialize asset class and holding type breakdowns
  const assetClassValues: Record<number, number[]> = {};
  const holdingTypeValues: Record<number, number[]> = {};
  
  // Initialize cashflow arrays
  const totalIncome: number[] = new Array(totalYears + 1).fill(0);
  const totalExpenses: number[] = new Array(totalYears + 1).fill(0);
  const netCashflow: number[] = new Array(totalYears + 1).fill(0);
  
  // Generate dates array
  const currentYear = new Date().getFullYear();
  const dates: string[] = [];
  for (let i = 0; i <= totalYears; i++) {
    dates.push((currentYear + i).toString());
  }
  
  // First calculate initial values (year 0)
  filteredAssets.forEach(asset => {
    const currentValue = asset.value;
    
    // Add to asset or liability totals
    if (asset.isLiability) {
      totalLiabilityValue[0] += currentValue;
    } else {
      totalAssetValue[0] += currentValue;
    }
    
    // Add to asset class breakdown
    if (!assetClassValues[asset.assetClassId]) {
      assetClassValues[asset.assetClassId] = new Array(totalYears + 1).fill(0);
    }
    assetClassValues[asset.assetClassId][0] += asset.isLiability ? -currentValue : currentValue;
    
    // Add to holding type breakdown
    if (!holdingTypeValues[asset.assetHoldingTypeId]) {
      holdingTypeValues[asset.assetHoldingTypeId] = new Array(totalYears + 1).fill(0);
    }
    holdingTypeValues[asset.assetHoldingTypeId][0] += asset.isLiability ? -currentValue : currentValue;
    
    // Calculate initial income and expenses (for year 1)
    if (config.includeIncome) {
      const assetClass = assetClasses[asset.assetClassId];
      totalIncome[0] += calculateAnnualAssetIncome(asset, assetClass);
    }
    
    if (config.includeExpenses) {
      totalExpenses[0] += calculateAnnualAssetExpenses(asset);
    }
  });
  
  // Calculate net worth for year 0
  netWorth[0] = totalAssetValue[0] - totalLiabilityValue[0];
  
  // Calculate cashflow for year 0
  netCashflow[0] = totalIncome[0] - totalExpenses[0];
  
  // Project future values year by year
  for (let year = 1; year <= totalYears; year++) {
    // Copy previous year's totals as starting point
    totalAssetValue[year] = totalAssetValue[year - 1];
    totalLiabilityValue[year] = totalLiabilityValue[year - 1];
    totalIncome[year] = 0;
    totalExpenses[year] = 0;
    
    // Process each asset to update its projected value
    filteredAssets.forEach(asset => {
      const assetClass = assetClasses[asset.assetClassId];
      const growthRate = getAssetGrowthRate(asset, assetClass, config.growthRateScenario);
      let projectedValue = 0;
      
      // Project current asset value
      if (asset.isLiability) {
        // For liabilities, we need to handle differently based on type
        if (asset.loanTerm && asset.startDate) {
          // Amortizing loan: calculate remaining balance
          const loanStartDate = new Date(asset.startDate);
          const currentDate = new Date();
          const monthsElapsed = (currentDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
                               (currentDate.getMonth() - loanStartDate.getMonth());
          const totalLoanTermMonths = asset.loanTerm;
          const remainingTermMonths = Math.max(0, totalLoanTermMonths - monthsElapsed);
          const monthsToProject = year * 12;
          
          if (monthsToProject >= remainingTermMonths) {
            // Loan will be paid off
            projectedValue = 0;
          } else {
            // Calculate remaining balance after projection period
            const monthlyPayment = calculateMortgagePayment(
              asset.originalLoanAmount ?? asset.value,
              asset.interestRate ?? 5, // Fallback to 5% if not specified
              totalLoanTermMonths
            );
            
            // Simple approximation for remaining balance
            // For more accuracy, we would need a full amortization schedule
            const initialBalance = asset.value;
            const projectedInterestRate = (asset.interestRate ?? 5) / 100 / 12; // Monthly rate
            let remainingBalance = initialBalance;
            
            for (let month = 0; month < monthsToProject; month++) {
              const interestPayment = remainingBalance * projectedInterestRate;
              const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);
              remainingBalance -= principalPayment;
              
              if (remainingBalance <= 0) {
                break;
              }
            }
            
            projectedValue = Math.max(0, remainingBalance);
          }
        } else {
          // Non-amortizing liability: Apply growth rate (could be negative for liabilities that grow)
          projectedValue = calculateFutureValue(asset.value, growthRate, year);
        }
        
        // Update total liabilities
        totalLiabilityValue[year] -= (totalLiabilityValue[year - 1] - projectedValue);
      } else {
        // Regular asset growth projection
        projectedValue = calculateFutureValue(asset.value, growthRate, year);
        
        // If reinvestment of income is enabled, add income back into asset value
        if (config.reinvestIncome) {
          const annualIncome = calculateAnnualAssetIncome(asset, assetClass);
          // Simplistic model: assume income from previous year is reinvested at the same growth rate
          const reinvestedIncome = calculateFutureValue(annualIncome, growthRate, year - 1);
          projectedValue += reinvestedIncome;
        }
        
        // Update total assets
        totalAssetValue[year] -= (totalAssetValue[year - 1] - projectedValue);
      }
      
      // Update asset class breakdowns
      if (assetClassValues[asset.assetClassId]) {
        assetClassValues[asset.assetClassId][year] = projectedValue * (asset.isLiability ? -1 : 1);
      }
      
      // Update holding type breakdowns
      if (holdingTypeValues[asset.assetHoldingTypeId]) {
        holdingTypeValues[asset.assetHoldingTypeId][year] = projectedValue * (asset.isLiability ? -1 : 1);
      }
      
      // Calculate projected income and expenses
      if (config.includeIncome) {
        // Project income growth based on asset growth
        const baseIncome = calculateAnnualAssetIncome(asset, assetClass);
        const projectedIncome = baseIncome * Math.pow(1 + growthRate, year);
        totalIncome[year] += projectedIncome;
      }
      
      if (config.includeExpenses) {
        // Project expenses with inflation
        const baseExpenses = calculateAnnualAssetExpenses(asset);
        const projectedExpenses = baseExpenses * Math.pow(1 + (config.inflationRate / 100), year);
        totalExpenses[year] += projectedExpenses;
      }
    });
    
    // Calculate net worth and cashflow for this year
    netWorth[year] = totalAssetValue[year] - totalLiabilityValue[year];
    netCashflow[year] = totalIncome[year] - totalExpenses[year];
    
    // Apply inflation adjustment if needed
    if (config.inflationRate > 0) {
      const inflationFactor = Math.pow(1 + (config.inflationRate / 100), year);
      
      // Adjust all monetary values for this year for inflation
      totalAssetValue[year] = totalAssetValue[year] / inflationFactor;
      totalLiabilityValue[year] = totalLiabilityValue[year] / inflationFactor;
      netWorth[year] = netWorth[year] / inflationFactor;
      totalIncome[year] = totalIncome[year] / inflationFactor;
      totalExpenses[year] = totalExpenses[year] / inflationFactor;
      netCashflow[year] = netCashflow[year] / inflationFactor;
      
      // Adjust asset class and holding type breakdowns
      Object.keys(assetClassValues).forEach(classId => {
        const id = parseInt(classId);
        assetClassValues[id][year] = assetClassValues[id][year] / inflationFactor;
      });
      
      Object.keys(holdingTypeValues).forEach(typeId => {
        const id = parseInt(typeId);
        holdingTypeValues[id][year] = holdingTypeValues[id][year] / inflationFactor;
      });
    }
  }
  
  // Format the result
  const result: ProjectionResult = {
    totalAssetValue,
    totalLiabilityValue,
    netWorth,
    assetBreakdown: Object.entries(assetClassValues).map(([id, values]) => ({
      assetClassId: parseInt(id),
      assetClass: assetClasses[parseInt(id)]?.name || 'Unknown',
      values
    })),
    holdingTypeBreakdown: Object.entries(holdingTypeValues).map(([id, values]) => ({
      holdingTypeId: parseInt(id),
      holdingType: holdingTypes[parseInt(id)]?.name || 'Unknown',
      values
    })),
    cashflow: {
      totalIncome,
      totalExpenses,
      netCashflow
    },
    dates,
    inflationAdjusted: config.inflationRate > 0
  };
  
  return result;
}