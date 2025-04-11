import { describe, it, expect } from 'vitest';
import {
  calculateFutureValue,
  calculatePresentValue,
  calculateLoanPayment,
  calculateCAGR,
  calculateInflationAdjustedValue,
  calculateRequiredSavings
} from './calculations';

describe('Financial Calculations', () => {
  // Test precision for floating point comparisons
  const PRECISION = 0.0001;

  describe('calculateFutureValue', () => {
    it('should calculate future value with annual compounding', () => {
      // $10,000 invested for 5 years at 5% with annual compounding
      const result = calculateFutureValue(10000, 0.05, 5);
      expect(result).toBeCloseTo(12762.82, 2);
    });

    it('should calculate future value with quarterly compounding', () => {
      // $10,000 invested for 5 years at 5% with quarterly compounding
      const result = calculateFutureValue(10000, 0.05, 5, 4);
      expect(result).toBeCloseTo(12833.59, 2);
    });

    it('should return the same value with 0% interest rate', () => {
      const result = calculateFutureValue(10000, 0, 5);
      expect(result).toBe(10000);
    });
  });

  describe('calculatePresentValue', () => {
    it('should calculate present value with annual discounting', () => {
      // $10,000 in 5 years at 5% with annual discounting
      const result = calculatePresentValue(10000, 0.05, 5);
      expect(result).toBeCloseTo(7835.26, 2);
    });

    it('should calculate present value with monthly discounting', () => {
      // $10,000 in 5 years at 5% with monthly discounting
      const result = calculatePresentValue(10000, 0.05, 5, 12);
      expect(result).toBeCloseTo(7790.93, 2);
    });

    it('should return the same value with 0% interest rate', () => {
      const result = calculatePresentValue(10000, 0, 5);
      expect(result).toBe(10000);
    });
  });

  describe('calculateLoanPayment', () => {
    it('should calculate monthly payment for a mortgage', () => {
      // $200,000 mortgage for 30 years at 4.5%
      const result = calculateLoanPayment(200000, 0.045, 30);
      expect(result).toBeCloseTo(1013.37, 2);
    });

    it('should calculate payment for an interest-free loan', () => {
      // $10,000 loan for 5 years at 0%
      const result = calculateLoanPayment(10000, 0, 5);
      expect(result).toBeCloseTo(166.67, 2);
    });

    it('should calculate payment for different payment frequencies', () => {
      // $10,000 loan for 1 year at 6%, paid quarterly
      const result = calculateLoanPayment(10000, 0.06, 1, 4);
      expect(result).toBeCloseTo(2563.36, 2);
    });
  });

  describe('calculateCAGR', () => {
    it('should calculate compound annual growth rate correctly', () => {
      // $10,000 grew to $15,000 over 5 years
      const result = calculateCAGR(10000, 15000, 5);
      expect(result).toBeCloseTo(0.0845, 4); // 8.45%
    });

    it('should handle negative growth', () => {
      // $10,000 shrank to $8,000 over 3 years
      const result = calculateCAGR(10000, 8000, 3);
      expect(result).toBeCloseTo(-0.0718, 4); // -7.18%
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateCAGR(0, 15000, 5)).toThrow();
      expect(() => calculateCAGR(10000, 15000, 0)).toThrow();
      expect(() => calculateCAGR(-1000, 15000, 5)).toThrow();
    });
  });

  describe('calculateInflationAdjustedValue', () => {
    it('should calculate inflation-adjusted value correctly', () => {
      // $10,000 adjusted for 3% inflation over 10 years
      const result = calculateInflationAdjustedValue(10000, 0.03, 10);
      expect(result).toBeCloseTo(7440.94, 2);
    });

    it('should return the same value with 0% inflation', () => {
      const result = calculateInflationAdjustedValue(10000, 0, 5);
      expect(result).toBe(10000);
    });
  });

  describe('calculateRequiredSavings', () => {
    it('should calculate required monthly savings to reach a goal', () => {
      // Need $50,000 in 10 years, starting with $5,000, 6% return
      const result = calculateRequiredSavings(50000, 5000, 10, 0.06, 12);
      expect(result).toBeCloseTo(265.24, 2);
    });

    it('should return 0 if current savings will exceed goal', () => {
      // Need $10,000 in 10 years, but already have $15,000
      const result = calculateRequiredSavings(10000, 15000, 10, 0.05);
      expect(result).toBe(0);
    });

    it('should calculate savings with 0% return', () => {
      // Need $10,000 in 5 years, starting with $0, 0% return
      const result = calculateRequiredSavings(10000, 0, 5, 0);
      expect(result).toBeCloseTo(166.67, 2);
    });
  });
});