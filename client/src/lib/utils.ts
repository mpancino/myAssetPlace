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
export function formatCurrency(value: number, compact = false, currencySymbol = '$'): string {
  // For very large numbers, we may want a more compact representation
  if (compact && Math.abs(value) >= 1000000) {
    const formatter = new Intl.NumberFormat('en', {
      notation: 'compact',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    return `${currencySymbol}${formatter.format(value)}`;
  }

  // Standard currency formatting
  return `${currencySymbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
