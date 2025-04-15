/**
 * Form Utilities
 * 
 * This utility provides standardized form utility functions and constants
 * to ensure consistency across the application.
 */

// Standard spacing classes for form elements
export const formSpacing = {
  // Overall form spacing
  container: "space-y-6",
  
  // Section spacing
  section: "space-y-4 mb-6",
  
  // Field spacing
  field: "space-y-2",
  
  // Field groups (horizontal layouts)
  fieldGroup: "grid grid-cols-1 md:grid-cols-2 gap-6",
  
  // Field group with 3 columns on large screens
  fieldGroup3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  
  // Button group spacing
  buttonGroup: "flex justify-end space-x-2 mt-6",
};

// Standard error message formatting
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
};

// Get appropriate form field size class
export type FieldSize = 'sm' | 'md' | 'lg' | 'full';

export const getFieldSizeClass = (size: FieldSize = 'full'): string => {
  switch (size) {
    case 'sm': return 'w-32';
    case 'md': return 'w-48';
    case 'lg': return 'w-64';
    case 'full':
    default: return 'w-full';
  }
};

// Helper to determine if a form field should be required
// This supports conditional requirements based on other form values
export const isFieldRequired = (
  fieldName: string, 
  requiredFields: string[], 
  conditionalRequirements?: Record<string, (formValues: any) => boolean>,
  formValues?: any
): boolean => {
  // Always required if in requiredFields array
  if (requiredFields.includes(fieldName)) return true;
  
  // Check conditional requirements
  if (conditionalRequirements && fieldName in conditionalRequirements && formValues) {
    return conditionalRequirements[fieldName](formValues);
  }
  
  return false;
};

// Format required field label
export const formatRequiredLabel = (label: string, isRequired: boolean): string => {
  return isRequired ? `${label}*` : label;
};