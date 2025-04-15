import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with the appropriate symbol
 * @param value The numeric value to format
 * @param compact Whether to use compact notation for large numbers
 * @param currencySymbol The currency symbol to use (defaults to $)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currencySymbol = '$', compact = false): string {
  // Handle zero case
  if (value === 0) return `${currencySymbol}0`;
  
  // For negative values, we want to move the negative sign outside the currency symbol
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // Smart compact display based on the magnitude of the number
  if (compact) {
    // Different formatting based on magnitude
    if (absValue >= 1000000000) {
      // Billions - format as $X.XXB
      const formatter = new Intl.NumberFormat('en', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
      return `${isNegative ? '-' : ''}${currencySymbol}${formatter.format(absValue)}`;
    } 
    else if (absValue >= 1000000) {
      // Millions - format as $X.XXM
      const formatter = new Intl.NumberFormat('en', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
      return `${isNegative ? '-' : ''}${currencySymbol}${formatter.format(absValue)}`;
    }
    else if (absValue >= 1000) {
      // Thousands - format as $X,XXXk
      const formatter = new Intl.NumberFormat('en', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });
      return `${isNegative ? '-' : ''}${currencySymbol}${formatter.format(absValue)}`;
    }
  }

  // Standard currency formatting for smaller numbers or when compact is false
  const formatter = new Intl.NumberFormat('en', {
    minimumFractionDigits: absValue < 10 ? 2 : 0,
    maximumFractionDigits: absValue < 10 ? 2 : 0
  });
  
  return `${isNegative ? '-' : ''}${currencySymbol}${formatter.format(absValue)}`;
}
