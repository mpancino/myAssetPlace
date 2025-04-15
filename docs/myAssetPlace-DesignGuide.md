# myAssetPlace Design Guide & UI Standards

**Version:** 1.0  
**Date:** April 15, 2025  
**Status:** Draft

---

## 1. Introduction

This Design Guide serves as the authoritative reference for the myAssetPlace UI implementation, addressing the application's visual design, component usage, and user experience patterns. It aims to establish consistency across the application while meeting the requirements outlined in the Product Design Document (PDD).

### 1.1 Purpose

This guide provides specific UI standards to:
- Ensure visual and interaction consistency across all components and pages
- Establish clear patterns for responsive layouts and adaptive UI based on subscription modes
- Define proper usage of UI components from the shadcn/ui library and custom components
- Address identified inconsistencies in the current implementation
- Align with PDD requirements for UI/UX (particularly sections 4.1 through 4.3)

### 1.2 Scope

This document covers:
- Design principles and visual language
- Component standards and usage guidelines
- Form patterns and validation approaches
- Layout and spacing guidelines
- Responsive design patterns
- Mode adaptation (Basic vs. Advanced)
- Component-specific implementations

---

## 2. Design Principles

In alignment with REQ-002 and REQ-194, myAssetPlace adopts a modern, elegant, and intuitive design inspired by leading digital financial services. The following principles guide all UI decisions:

### 2.1 Clarity & Simplicity

- Use clear, direct language in all UI text
- Minimize visual clutter and cognitive load
- Present complex financial concepts in an understandable manner
- Implement progressive disclosure patterns

### 2.2 Consistency & Coherence

- Maintain visual and interaction consistency throughout the application
- Ensure UI patterns are predictable and recognizable
- Apply uniform styling to similar component types
- Maintain consistent spacing and alignment

### 2.3 Responsive & Adaptive

- Design responsive layouts that work well across device sizes
- Adapt UI complexity based on user's subscription mode
- Ensure touch-friendly targets on mobile devices
- Maintain hierarchy and information architecture across viewports

### 2.4 Accessible & Inclusive

- Ensure sufficient color contrast (WCAG AA compliance)
- Provide text alternatives for non-text content
- Implement keyboard navigability
- Support screen readers with proper ARIA attributes

---

## 3. Visual Design Standards

### 3.1 Color System

Color usage throughout the application must follow these guidelines:

#### 3.1.1 Primary Color Palette

- Primary color: `hsl(222.2 47.4% 11.2%)` (as defined in theme.json)
- Primary variants:
  - Light: Primary 100-300
  - Default: Primary 500
  - Dark: Primary 700-900

#### 3.1.2 Secondary Colors

- Use shadcn/ui semantic colors for:
  - Success: `hsl(143, 85%, 40%)`
  - Warning: `hsl(43, 100%, 55%)`
  - Danger/Error: `hsl(0, 84%, 60%)`
  - Info: `hsl(210, 100%, 66%)`

#### 3.1.3 Neutral Palette

- Backgrounds: Slate 50-200
- Text: Slate 700-900
- Borders: Slate 200-300
- Disabled: Slate 300-400

#### 3.1.4 Semantic Color Usage

- **Growth/Positive**: Always use Success green
- **Loss/Negative**: Always use Danger red
- **Warnings/Alerts**: Always use Warning amber
- **Information/Notes**: Always use Info blue

#### 3.1.5 Color Application Rules

- **DO NOT** hardcode colors in components - always use theme variables or Tailwind classes
- Text should always have sufficient contrast against its background
- Primary color should be used for primary actions, highlights, and brand elements
- Limit color usage to maintain visual hierarchy
- Use color consistently for similar UI elements and states

### 3.2 Typography

#### 3.2.1 Font Families

- Primary font: Inter (sans-serif)
- Monospace font (for code/numerical displays): Consolas, monospace

#### 3.2.2 Type Scale

Follow this consistent type scale:

- Display: 3rem (48px) / font-weight: 700
- Heading 1: 2.25rem (36px) / font-weight: 700
- Heading 2: 1.875rem (30px) / font-weight: 600
- Heading 3: 1.5rem (24px) / font-weight: 600
- Heading 4: 1.25rem (20px) / font-weight: 500
- Heading 5: 1.125rem (18px) / font-weight: 500
- Body: 1rem (16px) / font-weight: 400
- Small: 0.875rem (14px) / font-weight: 400
- XSmall: 0.75rem (12px) / font-weight: 400

#### 3.2.3 Typography Usage Guidelines

- Page titles should use Heading 1
- Section titles should use Heading 2 or Heading 3
- Subsection titles should use Heading 4
- Card titles should use Heading 4 or Heading 5
- Body text should use Body size
- Secondary information should use Small size
- Labels should use Small or Body size based on context
- Ensure good typographic hierarchy through size and weight contrast

### 3.3 Spacing System

Use a consistent 4px-based spacing scale:

- `space-xs`: 0.25rem (4px)
- `space-sm`: 0.5rem (8px)
- `space-md`: 1rem (16px)
- `space-lg`: 1.5rem (24px)
- `space-xl`: 2rem (32px)
- `space-2xl`: 3rem (48px)
- `space-3xl`: 4rem (64px)

#### 3.3.1 Spacing Guidelines

- Use consistent spacing between related elements
- Maintain 16px (1rem) margins between most components
- Use 24px (1.5rem) or 32px (2rem) margins between major sections
- Form fields should have consistent spacing (24px recommended)
- Card padding should be consistent (16px or 24px recommended)
- Maintain adequate whitespace to ensure readability and visual hierarchy

### 3.4 Shape & Borders

- Border radius: 0.5rem (8px) for consistency (as specified in theme.json)
- Card borders: 1px solid border color
- Input borders: 1px solid border color
- Border colors should use the neutral palette
- Active/focus states should use the primary color for borders

### 3.5 Shadows & Elevation

Follow a consistent elevation system with these shadow levels:

- Level 0 (no elevation): No shadow
- Level 1 (subtle): `0 1px 3px rgba(0, 0, 0, 0.1)`
- Level 2 (medium): `0 4px 6px rgba(0, 0, 0, 0.1)`
- Level 3 (pronounced): `0 10px 15px -3px rgba(0, 0, 0, 0.1)`
- Level 4 (elevated): `0 20px 25px -5px rgba(0, 0, 0, 0.1)`

#### 3.5.1 Elevation Usage

- Cards: Level 1 or Level 2
- Dropdowns/Popovers: Level 2
- Modals/Dialogs: Level 3
- Floating action buttons: Level 2
- Header/Navigation: Level 1
- Toast notifications: Level 3

---

## 4. Component Standards

### 4.1 Button Standards

All buttons must follow these standards for consistency:

#### 4.1.1 Button Variants

- **Primary**: Filled with primary color, white text
- **Secondary**: Outlined with primary color border
- **Ghost**: No background/border, primary color text
- **Destructive**: Filled with danger color, white text
- **Link**: No background/border, underlined text

#### 4.1.2 Button Sizes

- **Small**: Padding 8px 12px, text size 14px
- **Default**: Padding 10px 16px, text size 16px
- **Large**: Padding 12px 20px, text size 16px

#### 4.1.3 Button States

All buttons must have visually distinct states for:
- Default
- Hover
- Active/Pressed
- Focus
- Disabled

#### 4.1.4 Button Usage Guidelines

- **Primary** buttons should be used for the most important action on a page
- **Secondary** buttons should be used for alternative actions
- **Ghost** buttons should be used for less prominent actions
- **Destructive** buttons should be used for actions that delete or remove data
- **Link** buttons should be used for navigation or minor actions
- Limit the number of primary buttons on a page (ideally one per section)
- Maintain consistent button ordering (primary action on the right)
- Use icons in buttons consistently and sparingly
- Button text should clearly describe the action (e.g., "Save Changes" instead of "Submit")

### 4.2 Form Components

All form implementations must follow these standards:

#### 4.2.1 Form Layout

- Use `@/components/ui/form` components consistently
- Organize forms in logical groups with clear section headings
- Maintain consistent spacing between form fields (24px)
- For complex forms, use tabs to organize content (like in Share/Stock Option forms)
- Use a consistent grid layout for form fields (1 column on mobile, 2 columns on desktop)
- Group related fields together visually

#### 4.2.2 Form Field Components

- Labels should be consistently positioned (top-aligned)
- Help text should be consistently positioned under fields
- Error messages should appear under fields
- Required fields should be visually indicated with an asterisk (*)
- Disabled fields should have a consistent visual treatment
- Maintain consistent heights for similar input types

#### 4.2.3 Form Validation

- Use Zod with `zodResolver` for all form validation
- Show inline validation errors under each field
- Display a summary of errors when appropriate
- Consistent error styling across all forms
- Required fields should be validated on form submission
- Optional fields should be clearly marked as such

#### 4.2.4 Form Actions

- Submit/Save buttons should be primary buttons
- Cancel/Back buttons should be secondary or ghost buttons
- Form action buttons should be consistently positioned (right-aligned)
- Show appropriate loading states during submission
- Disable submit button when the form is invalid or submitting

### 4.3 Card Standards

All card components must follow these standards:

#### 4.3.1 Card Structure

- Cards should use shadcn/ui Card components
- Consistent padding within cards (16px or 24px)
- Use CardHeader, CardContent, and CardFooter components appropriately
- CardHeader should contain a title and optional description
- CardContent should contain the main content
- CardFooter should contain actions related to the card

#### 4.3.2 Card Usage

- Use cards to group related content
- Maintain consistent spacing between cards
- Apply consistent elevation to cards
- Use consistent border radius on all cards

### 4.4 Navigation Components

#### 4.4.1 Sidebar Navigation

- Use consistent styling for sidebar navigation
- Highlight active items clearly
- Group related navigation items
- Use consistent icons for navigation items
- Ensure the sidebar is collapsible on mobile

#### 4.4.2 Tabs

- Use shadcn/ui Tabs component consistently
- Maintain consistent tab styling across the application
- Highlight active tabs clearly
- Use consistent spacing and alignment for tab content

#### 4.4.3 Breadcrumbs

- Implement consistent breadcrumbs for deep navigation
- Show the complete path from home to the current page
- Use consistent separator and styling

### 4.5 Data Display Components

#### 4.5.1 Tables

- Use shadcn/ui Table components consistently
- Maintain consistent header styling
- Use consistent cell padding and alignment
- Implement consistent sorting and filtering interfaces
- Ensure tables are responsive on mobile

#### 4.5.2 Charts

- Use ReCharts library consistently
- Implement consistent chart styling and colors
- Provide appropriate legends and labels
- Ensure charts are responsive
- Implement consistent tooltips for data points

#### 4.5.3 Stats Cards

- Use consistent layout for stats/metric cards
- Include appropriate icons or visuals
- Use consistent typography for values and labels
- Show trend indicators when appropriate

### 4.6 Feedback & Messaging Components

#### 4.6.1 Toast Notifications

- Use shadcn/ui Toast components consistently
- Position toasts consistently (top-right recommended)
- Use appropriate variants for different messages (success, error, info, warning)
- Ensure toasts are dismissible
- Show toasts for important user actions and system events

#### 4.6.2 Loading States

- Implement consistent loading indicators
- Use appropriate size for loading indicators based on context
- Show loading states for all asynchronous operations
- Provide meaningful loading messages when appropriate

#### 4.6.3 Empty States

- Implement consistent empty state patterns
- Include helpful guidance in empty states
- Use appropriate visuals for empty states
- Provide clear calls to action

---

## 5. Layout Patterns

### 5.1 Page Structure

All pages should follow this consistent structure:

#### 5.1.1 Desktop Layout

- Sidebar navigation (fixed position, 64px width collapsed, 256px expanded)
- Main content area (remaining viewport width)
- Page header with title, breadcrumbs, and actions
- Page content with appropriate padding (24px)
- Footer (if applicable)

#### 5.1.2 Mobile Layout

- Full-width header with navigation menu button
- Slide-out navigation drawer
- Stacked content layout
- Floating action button for primary actions
- Adjusted padding for smaller screens (16px)

### 5.2 Grid System

Use Tailwind's responsive grid system consistently:

- Desktop: 12-column grid
- Tablet: 8-column grid
- Mobile: 4-column grid
- Consistent gutters (16px or 24px)

#### 5.2.1 Responsive Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

#### 5.2.2 Common Grid Patterns

- Full-width sections: `col-span-12`
- Two-column layout: `md:grid-cols-2`
- Three-column layout: `lg:grid-cols-3`
- Sidebar + content: `grid-cols-1 md:grid-cols-4` (sidebar: `md:col-span-1`, content: `md:col-span-3`)

### 5.3 Responsive Design Guidelines

- Design mobile-first, then enhance for larger screens
- Use flexible layouts that adapt to different screen sizes
- Ensure touch targets are adequate on mobile (minimum 44x44 pixels)
- Avoid horizontal scrolling on mobile
- Implement appropriate stacking on smaller screens
- Consider different navigation patterns for mobile
- Test across all supported screen sizes

---

## 6. Form Implementation Patterns

To ensure consistency, all forms should follow these implementation patterns:

### 6.1 Standard Form Structure

```tsx
// 1. Import standard form components and hooks
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

// 2. Define form schema with Zod
const formSchema = z.object({
  // form fields here
});

// 3. Infer TypeScript type from schema
type FormValues = z.infer<typeof formSchema>;

// 4. Component implementation
export function StandardForm() {
  // 5. Initialize form with useForm hook
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // default values here
    }
  });

  // 6. Handle form submission
  const onSubmit = (values: FormValues) => {
    // submission logic here
  };

  // 7. Render form with consistent layout
  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Title</CardTitle>
        <CardDescription>Form description</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Form fields go here */}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="ghost" type="button">Cancel</Button>
            <Button type="submit">Submit</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
```

### 6.2 Form Field Patterns

For consistent form fields, use these patterns:

#### 6.2.1 Text Input

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Field Label</FormLabel>
      <FormControl>
        <Input placeholder="Enter value" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### 6.2.2 Select Input

```tsx
<FormField
  control={form.control}
  name="selectField"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Select Label</FormLabel>
      <Select
        onValueChange={field.onChange}
        defaultValue={field.value}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### 6.2.3 Checkbox Input

```tsx
<FormField
  control={form.control}
  name="checkboxField"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Checkbox Label</FormLabel>
        <FormDescription>Additional description</FormDescription>
      </div>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 6.3 Form Layout Patterns

#### 6.3.1 Single Column Form

```tsx
<CardContent className="space-y-6">
  {/* Form fields stacked vertically */}
</CardContent>
```

#### 6.3.2 Two Column Form

```tsx
<CardContent>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Form fields arranged in two columns on desktop */}
  </div>
</CardContent>
```

#### 6.3.3 Form with Sections

```tsx
<CardContent className="space-y-8">
  <div className="space-y-6">
    <h3 className="text-lg font-medium">Section Title</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Form fields for this section */}
    </div>
  </div>
  
  <div className="space-y-6">
    <h3 className="text-lg font-medium">Another Section</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Form fields for this section */}
    </div>
  </div>
</CardContent>
```

#### 6.3.4 Tabbed Form

```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Section 1</TabsTrigger>
    <TabsTrigger value="tab2">Section 2</TabsTrigger>
  </TabsList>
  
  <TabsContent value="tab1">
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Form fields for tab 1 */}
      </CardContent>
    </Card>
  </TabsContent>
  
  <TabsContent value="tab2">
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Form fields for tab 2 */}
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

## 7. Mode Adaptation (Basic vs. Advanced)

### 7.1 UI Adaptation Principles

In accordance with REQ-008, REQ-197, and REQ-198, the UI must adapt based on the user's mode:

#### 7.1.1 Basic Mode UI

- Hide advanced configuration options
- Use administrator-defined defaults
- Present simplified visualizations
- Reduce form complexity
- Focus on essential information
- Use simpler language and more guidance

#### 7.1.2 Advanced Mode UI

- Show all configuration options
- Allow overriding defaults
- Present detailed visualizations
- Allow full form complexity
- Present comprehensive information
- Use more technical language where appropriate

### 7.2 Implementation Guidelines

#### 7.2.1 Conditional Rendering

Use this pattern for conditional rendering based on mode:

```tsx
import { useMode } from "@/hooks/use-mode";

function Component() {
  const { mode } = useMode();
  
  return (
    <div>
      {/* Always shown content */}
      
      {mode === "advanced" && (
        <div className="mt-4">
          {/* Advanced mode content */}
        </div>
      )}
    </div>
  );
}
```

#### 7.2.2 Form Field Conditionals

For forms, conditionally render fields based on mode:

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem className={mode === "basic" ? "hidden" : ""}>
      <FormLabel>Advanced Field Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### 7.2.3 Default Values

Apply defaults based on mode:

```tsx
const defaultValues = {
  // Common defaults
  name: existingData?.name || "",
  
  // Mode-specific defaults
  growthRate: mode === "basic" 
    ? assetClass?.defaultMediumGrowthRate // Use admin default in basic mode
    : existingData?.growthRate || 0 // Allow custom value in advanced mode
};
```

---

## 8. Component-Specific Guidelines

### 8.1 Asset Forms

All asset forms must follow these guidelines:

- Wrap in a consistent Card component
- Use tabs for organizing complex forms
- Group related fields logically
- Maintain consistent spacing between fields
- Implement consistent validation patterns
- Show appropriate loading and success states
- Use consistent button styling and positioning
- Adapt complexity based on user mode

### 8.2 Dashboard Components

Dashboard components must follow these guidelines:

- Use consistent card styling for metrics
- Implement consistent chart styling and colors
- Maintain consistent spacing between sections
- Use appropriate loading states
- Adapt visualization complexity based on user mode
- Implement consistent empty states
- Use consistent typography for metrics and labels

### 8.3 Navigation Components

Navigation components must follow these guidelines:

- Use consistent styling for active/inactive states
- Maintain consistent spacing and padding
- Implement consistent iconography
- Use appropriate loading states
- Adapt to different screen sizes consistently

---

## 9. Documentation & Resources

### 9.1 Component Library

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form Documentation](https://react-hook-form.com/docs)
- [Zod Documentation](https://zod.dev/)
- [Recharts Documentation](https://recharts.org/en-US/)

### 9.2 Design Resources

- Design tokens (colors, spacing, etc.)
- Icon library
- UI component examples
- Form templates

---

## 10. Appendices

### 10.1 UI Audit Results

#### 10.1.1 Form Structure Inconsistencies

- Some forms use tabs for organization while others don't implement the same pattern
- Field grouping varies between forms: some use grid layouts, others use stacked fields
- Card components are used inconsistently across forms

#### 10.1.2 Component Usage Inconsistencies

- Loading states vary across components
- Button styles and positioning are inconsistent
- Card implementations vary in structure and styling

#### 10.1.3 Visual Design Inconsistencies

- Color usage isn't consistent across the application
- Typography varies between similar elements
- Spacing is inconsistent between components

#### 10.1.4 Responsive Design Issues

- Some forms adapt well for mobile while others don't adjust appropriately
- Grid systems are inconsistently implemented

#### 10.1.5 UI Pattern Inconsistencies

- Navigation patterns vary across the application
- Error handling UI varies across components

#### 10.1.6 Code-Level UI Inconsistencies

- Different state management approaches are used
- Console logging patterns are inconsistent

### 10.2 Design System Tokens

- Color palette
- Typography scale
- Spacing scale
- Elevation levels
- Border radius tokens

---

## 11. Change Log

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | April 15, 2025 | Initial version |

---

**Document End**