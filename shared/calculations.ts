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