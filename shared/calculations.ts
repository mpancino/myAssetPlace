/**
 * Shared financial calculation functions for myAssetPlace
 * These functions handle core financial calculations used throughout the application
 */

/**
 * Calculate the future value of an investment
 * FV = PV * (1 + r)^n
 * 
 * @param presentValue The initial investment amount
 * @param rate Annual interest rate (as a decimal, e.g., 0.05 for 5%)
 * @param years Number of years for the investment
 * @param compoundingPerYear Number of times compounding occurs per year (default: 1)
 * @returns The future value of the investment
 */
export function calculateFutureValue(
  presentValue: number,
  rate: number,
  years: number,
  compoundingPerYear: number = 1
): number {
  const compoundRate = rate / compoundingPerYear;
  const periods = years * compoundingPerYear;
  return presentValue * Math.pow(1 + compoundRate, periods);
}

/**
 * Calculate the present value of a future amount
 * PV = FV / (1 + r)^n
 * 
 * @param futureValue The future amount
 * @param rate Annual interest rate (as a decimal, e.g., 0.05 for 5%)
 * @param years Number of years
 * @param compoundingPerYear Number of times compounding occurs per year (default: 1)
 * @returns The present value of the future amount
 */
export function calculatePresentValue(
  futureValue: number,
  rate: number,
  years: number,
  compoundingPerYear: number = 1
): number {
  const compoundRate = rate / compoundingPerYear;
  const periods = years * compoundingPerYear;
  return futureValue / Math.pow(1 + compoundRate, periods);
}

/**
 * Calculate the payment amount for an amortized loan
 * PMT = (PV * r * (1 + r)^n) / ((1 + r)^n - 1)
 * 
 * @param principal The loan amount
 * @param rate Annual interest rate (as a decimal, e.g., 0.05 for 5%)
 * @param years Loan term in years
 * @param paymentsPerYear Number of payments per year (default: 12)
 * @returns The periodic payment amount
 */
export function calculateLoanPayment(
  principal: number,
  rate: number,
  years: number,
  paymentsPerYear: number = 12
): number {
  const periodicRate = rate / paymentsPerYear;
  const numberOfPayments = years * paymentsPerYear;
  
  if (rate === 0) {
    return principal / numberOfPayments;
  }
  
  const factor = Math.pow(1 + periodicRate, numberOfPayments);
  return (principal * periodicRate * factor) / (factor - 1);
}

/**
 * Calculate the principal and interest components of a loan payment
 * 
 * @param loanAmount Current loan balance
 * @param rate Annual interest rate (as a decimal, e.g., 0.05 for 5%)
 * @param paymentAmount The periodic payment amount
 * @param paymentsPerYear Number of payments per year (default: 12)
 * @returns Object containing principal and interest components of the payment
 */
export function calculatePrincipalAndInterest(
  loanAmount: number,
  rate: number,
  paymentAmount: number,
  paymentsPerYear: number = 12
): { principal: number; interest: number } {
  const periodicRate = rate / paymentsPerYear;
  
  // Calculate interest for this period
  const interestPayment = loanAmount * periodicRate;
  
  // Calculate principal for this period
  const principalPayment = paymentAmount - interestPayment;
  
  return {
    principal: principalPayment,
    interest: interestPayment
  };
}

/**
 * Generate an amortization schedule for a loan
 * 
 * @param principal The initial loan amount
 * @param rate Annual interest rate (as a decimal, e.g., 0.05 for 5%)
 * @param years Loan term in years
 * @param paymentsPerYear Number of payments per year (default: 12)
 * @param periods Number of periods to calculate (default: all periods)
 * @returns Array of payment objects containing payment details for each period
 */
export function generateAmortizationSchedule(
  principal: number,
  rate: number,
  years: number,
  paymentsPerYear: number = 12,
  periods: number = years * paymentsPerYear
): Array<{
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}> {
  const schedule = [];
  const paymentAmount = calculateLoanPayment(principal, rate, years, paymentsPerYear);
  let balance = principal;
  
  for (let period = 1; period <= periods; period++) {
    const { principal: principalPayment, interest: interestPayment } = 
      calculatePrincipalAndInterest(balance, rate, paymentAmount, paymentsPerYear);
    
    balance -= principalPayment;
    
    schedule.push({
      period,
      payment: paymentAmount,
      principal: principalPayment,
      interest: interestPayment,
      balance: balance > 0 ? balance : 0 // Ensure we don't show negative balance due to rounding
    });
    
    if (balance <= 0) break;
  }
  
  return schedule;
}

/**
 * Calculate the compound annual growth rate (CAGR)
 * CAGR = (FV / PV)^(1/n) - 1
 * 
 * @param initialValue Starting value of the investment
 * @param finalValue Ending value of the investment
 * @param years Number of years
 * @returns The compound annual growth rate as a decimal
 */
export function calculateCAGR(
  initialValue: number,
  finalValue: number,
  years: number
): number {
  if (initialValue <= 0 || years <= 0) {
    throw new Error('Initial value and years must be positive numbers');
  }
  return Math.pow(finalValue / initialValue, 1 / years) - 1;
}

/**
 * Calculate the inflation-adjusted value
 * 
 * @param presentValue Current value
 * @param inflationRate Annual inflation rate (as a decimal, e.g., 0.03 for 3%)
 * @param years Number of years
 * @returns The inflation-adjusted value
 */
export function calculateInflationAdjustedValue(
  presentValue: number,
  inflationRate: number,
  years: number
): number {
  return presentValue / Math.pow(1 + inflationRate, years);
}

/**
 * Calculate the required savings amount to meet a future goal
 * 
 * @param futureGoal Target future amount
 * @param currentSavings Current savings amount
 * @param yearsToGoal Years until the goal
 * @param expectedReturn Expected annual return rate (as a decimal)
 * @param contributionsPerYear Number of contributions per year (default: 12)
 * @returns Required periodic contribution amount
 */
export function calculateRequiredSavings(
  futureGoal: number,
  currentSavings: number,
  yearsToGoal: number,
  expectedReturn: number,
  contributionsPerYear: number = 12
): number {
  const periodicRate = expectedReturn / contributionsPerYear;
  const periods = yearsToGoal * contributionsPerYear;
  
  if (expectedReturn === 0) {
    return (futureGoal - currentSavings) / periods;
  }
  
  // Future value of current savings
  const futureValueOfCurrentSavings = calculateFutureValue(
    currentSavings,
    expectedReturn,
    yearsToGoal,
    contributionsPerYear
  );
  
  // Amount needed from new contributions
  const amountNeededFromContributions = futureGoal - futureValueOfCurrentSavings;
  
  if (amountNeededFromContributions <= 0) {
    return 0; // Goal already met with current savings
  }
  
  // Calculate payment using the formula for future value of an annuity
  const annuityFactor = (Math.pow(1 + periodicRate, periods) - 1) / periodicRate;
  return amountNeededFromContributions / annuityFactor;
}

/**
 * Calculate the interest earned on a savings account
 * 
 * @param principal Initial account balance
 * @param rate Annual interest rate (as a decimal, e.g., 0.025 for 2.5%)
 * @param months Number of months to calculate interest for
 * @param compoundingFrequency How often interest is compounded ('daily', 'monthly', 'quarterly', 'annually')
 * @param additionalDeposits Monthly additional deposits (default: 0)
 * @returns Object containing final balance and interest earned
 */
export function calculateSavingsInterest(
  principal: number,
  rate: number,
  months: number,
  compoundingFrequency: 'daily' | 'monthly' | 'quarterly' | 'annually' = 'monthly',
  additionalDeposits: number = 0
): { finalBalance: number; interestEarned: number } {
  // Convert annual rate to the appropriate periodic rate
  let periodsPerYear: number;
  switch (compoundingFrequency) {
    case 'daily':
      periodsPerYear = 365;
      break;
    case 'monthly':
      periodsPerYear = 12;
      break;
    case 'quarterly':
      periodsPerYear = 4;
      break;
    case 'annually':
      periodsPerYear = 1;
      break;
    default:
      periodsPerYear = 12; // Default to monthly
  }

  const periodicRate = rate / periodsPerYear;
  const totalPeriods = (months / 12) * periodsPerYear;
  
  let balance = principal;
  const monthlyToPeriodFactor = periodsPerYear / 12;
  
  // Simple calculation without additional deposits
  if (additionalDeposits === 0) {
    balance = principal * Math.pow(1 + periodicRate, totalPeriods);
  } else {
    // For accounts with regular deposits, calculate period by period
    for (let i = 0; i < totalPeriods; i++) {
      // Add interest for this period
      balance = balance * (1 + periodicRate);
      
      // Add deposit if applicable (we need to adjust for different compounding frequencies)
      if (i % monthlyToPeriodFactor < 1) {
        balance += additionalDeposits;
      }
    }
  }
  
  return {
    finalBalance: balance,
    interestEarned: balance - principal - (additionalDeposits * months)
  };
}

/**
 * Generate a savings projection with monthly details
 * 
 * @param principal Initial account balance
 * @param rate Annual interest rate (as a decimal, e.g., 0.025 for 2.5%)
 * @param months Number of months to project
 * @param compoundingFrequency How often interest is compounded
 * @param additionalDeposits Monthly additional deposits
 * @returns Array of monthly projection data
 */
export function generateSavingsProjection(
  principal: number,
  rate: number,
  months: number,
  compoundingFrequency: 'daily' | 'monthly' | 'quarterly' | 'annually' = 'monthly',
  additionalDeposits: number = 0
): Array<{
  month: number;
  balance: number;
  interestEarned: number;
  totalInterest: number;
  deposits: number;
}> {
  // Convert annual rate to the appropriate periodic rate
  let periodsPerYear: number;
  switch (compoundingFrequency) {
    case 'daily':
      periodsPerYear = 365;
      break;
    case 'monthly':
      periodsPerYear = 12;
      break;
    case 'quarterly':
      periodsPerYear = 4;
      break;
    case 'annually':
      periodsPerYear = 1;
      break;
    default:
      periodsPerYear = 12;
  }

  const periodicRate = rate / periodsPerYear;
  const projections = [];
  
  let balance = principal;
  let totalInterest = 0;
  let totalDeposits = 0;
  
  // Calculate monthly values
  for (let month = 1; month <= months; month++) {
    let monthlyInterest = 0;
    const periodsThisMonth = periodsPerYear / 12;
    
    // Simulate each compounding period within the month
    for (let p = 0; p < periodsThisMonth; p++) {
      const interestForPeriod = balance * periodicRate;
      balance += interestForPeriod;
      monthlyInterest += interestForPeriod;
    }
    
    // Add monthly deposit at the end of the month
    if (additionalDeposits > 0) {
      balance += additionalDeposits;
      totalDeposits += additionalDeposits;
    }
    
    totalInterest += monthlyInterest;
    
    projections.push({
      month,
      balance,
      interestEarned: monthlyInterest,
      totalInterest,
      deposits: totalDeposits
    });
  }
  
  return projections;
}