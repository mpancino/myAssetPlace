import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with the appropriate symbol
 * @param value The numeric value to format
 * @param currencySymbol The currency symbol to use (defaults to $)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currencySymbol = '$'): string {
  return `${currencySymbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
