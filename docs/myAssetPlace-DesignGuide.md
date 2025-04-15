# myAssetPlace Design Guide

This document outlines the standardized design patterns, components, and best practices for the myAssetPlace application to ensure consistency across the platform.

## Table of Contents

1. [UI Components](#ui-components)
   - [Form Templates](#form-templates)
   - [Loading States](#loading-states)
   - [Card Layouts](#card-layouts)
   - [Button Styles](#button-styles)
2. [Code Patterns](#code-patterns)
   - [Logging Standards](#logging-standards)
   - [Form Spacing and Layout](#form-spacing-and-layout)
   - [Error Handling](#error-handling)
3. [Design System](#design-system)
   - [Colors and Typography](#colors-and-typography)
   - [Spacing Guidelines](#spacing-guidelines)
   - [Responsive Design](#responsive-design)

## UI Components

### Form Templates

We've standardized form templates to ensure consistent user experience across all forms in the application:

1. **Basic Form Template** (`FormTemplate` component) - For simple forms with a single section
2. **Tabbed Form Template** (`TabbedFormTemplate` component) - For complex forms with multiple sections
3. **Form Section** (`FormSection` component) - For organizing fields within forms

Usage example:

```tsx
<FormTemplate
  title="Add Cash Account"
  description="Enter the details of your cash account"
  onSubmit={handleSubmit}
  isSubmitting={isLoading}
  onCancel={() => navigate('/dashboard')}
>
  <FormSection title="Account Details" twoColumns>
    {/* Form fields go here */}
  </FormSection>
</FormTemplate>
```

### Loading States

Standardized loading indicators provide consistent feedback throughout the application:

1. **Standard Loading** (`LoadingState` component) - For general loading states
2. **Loading Button** (`LoadingButton` component) - For buttons in loading state
3. **Fullscreen Loading** (`FullscreenLoading` component) - For blocking operations 
4. **Card Loading** (`CardLoading` component) - For loading content within cards

Usage example:

```tsx
{isLoading ? (
  <CardLoading message="Loading account details..." />
) : (
  /* Content goes here */
)}
```

### Card Layouts

All content should be contained in cards with consistent header and content spacing:

1. **Standard cards** should use the `Card`, `CardHeader`, `CardTitle`, and `CardContent` components
2. **Action cards** should include a `CardFooter` with appropriate actions

### Button Styles

Button usage should follow these standards:

1. **Primary buttons** for main actions (submit, save, etc.)
2. **Outlined buttons** for secondary actions (cancel, back, etc.) 
3. **Ghost buttons** for tertiary actions (view, more, etc.)
4. **Destructive buttons** for delete or dangerous actions

## Code Patterns

### Logging Standards

All logging should use the standardized logger utility from `@/lib/logger.ts`:

```tsx
import logger from '@/lib/logger';

// Log levels
logger.info('component', 'Message', data);
logger.warn('component', 'Warning message', data);
logger.error('component', 'Error message', data);
logger.debug('component', 'Debug message', data);
```

This ensures consistent formatting, component tagging, and level control.

### Form Spacing and Layout

Form spacing classes are standardized in `@/lib/form-utils.ts`:

```tsx
import { formSpacing } from '@/lib/form-utils';

<div className={formSpacing.container}>
  <div className={formSpacing.section}>
    <div className={formSpacing.fieldGroup}>
      {/* Two columns of fields */}
    </div>
  </div>
</div>
```

### Error Handling

Standard error handling pattern for forms and API calls:

```tsx
try {
  // Operation
} catch (error) {
  logger.error('component', 'Error message', error);
  toast({
    title: "Error",
    description: formatErrorMessage(error),
    variant: "destructive",
  });
}
```

## Design System

### Colors and Typography

- All colors should be used from the theme variables defined in `theme.json`
- Typography should follow the predefined classes:
  - Headers: `text-2xl font-bold` for page titles, `text-xl font-semibold` for card titles
  - Body text: `text-base` for regular text, `text-sm` for secondary text
  - Labels: `text-sm font-medium` for form labels

### Spacing Guidelines

- Consistent spacing with multiples of 4px (0.25rem)
- Standard margins between sections: 24px (1.5rem)
- Standard padding within cards: 16px (1rem)

### Responsive Design

All components should be responsive following these breakpoints:

- Mobile: Up to 640px
- Tablet: 641px to 1024px
- Desktop: Above 1024px

Use Tailwind's responsive prefixes:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

---

This design guide should be followed for all new features and components added to myAssetPlace, as well as used as a reference when refactoring existing code for consistency.