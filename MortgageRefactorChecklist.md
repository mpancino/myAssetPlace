# myAssetPlace Mortgage Refactor Checklist

## Overview
This checklist outlines the development tasks needed to improve the mortgage asset class in myAssetPlace, ensuring proper separation of concerns between properties and mortgages while maintaining their relationship for accurate financial calculations.

## 1. Legacy Code Identification & Analysis

### 1.1 Component Code Inventory
- [ ] Review all property-related components for mortgage code usage
- [ ] Identify all mortgage field references in property forms
- [ ] Find embedded mortgage display components in property views
- [ ] Document all mortgage-related UI elements for replacement

### 1.2 API and Storage Code Inventory
- [ ] Catalog all mortgage-related API endpoints 
- [ ] Identify all storage methods that process mortgage data
- [ ] Find outdated or unused mortgage code
- [ ] List all mortgage calculation functions for standardization

### 1.3 Utility Function Review
- [ ] Review mortgage calculation utilities
- [ ] Identify any utility functions mixing property and mortgage concerns
- [ ] Document shared functions that need separation
- [ ] List any dead code for removal

## 2. Schema and Data Model Improvements

### 2.1 Property Schema Cleanup
- [ ] Remove all mortgage-related fields from `insertPropertySchema`
  - [ ] `hasMortgage`
  - [ ] `mortgageAmount`
  - [ ] `mortgageInterestRate`
  - [ ] `mortgageTerm`
  - [ ] `mortgageStartDate` 
  - [ ] `mortgageLender`
  - [ ] `mortgageType`
  - [ ] `mortgagePaymentFrequency`
- [ ] Only keep `mortgageId` field for backward compatibility
- [ ] Identify and mark legacy database columns for future removal

### 2.2 Mortgage Schema Standardization
- [ ] Review and standardize `insertMortgageSchema` field names
- [ ] Ensure all required fields have proper validation
- [ ] Add computed fields for mortgage calculations
- [ ] Strengthen relationships with properties
- [ ] Ensure `securedAssetId` properly references property assets

### 2.3 Data Model Relationships
- [ ] Fix `linkedMortgageId` in assets table or add if not present
- [ ] Ensure bidirectional relationship between properties and mortgages
- [ ] Verify relations are correctly defined in Drizzle schema
- [ ] Add proper cascade/set null behavior for referential integrity

## 3. Backend API and Storage Improvements

### 3.1 API Endpoint Updates
- [ ] Review/update `/api/mortgages` endpoints
- [ ] Create `/api/properties/:id/mortgages` endpoint
- [ ] Add proper error handling to all endpoints
- [ ] Include detailed logging for mortgage operations

### 3.2 Storage Method Updates
- [ ] Update `storage.ts` mortgage-related methods
- [ ] Add transaction support for linked operations
- [ ] Improve error handling in storage methods
- [ ] Optimize data access patterns

### 3.3 Migration Support
- [ ] Create functions to handle legacy data migration
- [ ] Add validation for migrated mortgage data
- [ ] Create recovery mechanisms for failed migrations
- [ ] Create database migration script to safely remove legacy columns in production

## 4. Frontend Component Updates

### 4.1 Property Form Updates
- [ ] Remove all mortgage input fields from property forms
- [ ] Replace with informative mortgage section
- [ ] Add UI to link existing mortgages to properties
- [ ] Create "Add Mortgage" button linking to mortgage creation

### 4.2 Mortgage Display Components
- [ ] Create `PropertyMortgageList` component
- [ ] Create `MortgageSummaryCard` for property views
- [ ] Develop `MortgageDetailView` with amortization schedule
- [ ] Create mortgage tables with payment breakdowns

### 4.3 Property Detail Page
- [ ] Update property detail page to show linked mortgages
- [ ] Add mortgage payment information to property cashflow 
- [ ] Create clear navigation to mortgage details/edit pages
- [ ] Show mortgage impact on property performance

### 4.4 Navigation Flow
- [ ] Establish clear property → mortgage navigation paths
- [ ] Ensure mortgage forms link back to related properties
- [ ] Add breadcrumbs for proper context

## 5. Legacy Code Removal

### 5.1 Component Code Cleanup
- [ ] Remove legacy mortgage code from property components
- [ ] Update all components to use new mortgage architecture
- [ ] Clean up obsolete imports and constants

### 5.2 API and Storage Cleanup
- [ ] Remove outdated mortgage functions in API routes
- [ ] Clean up storage methods that mixed property/mortgage concerns
- [ ] Add deprecation notices to any methods that can't be removed yet

### 5.3 Utility Function Cleanup
- [ ] Refactor utility functions that mixed concerns
- [ ] Remove dead code
- [ ] Create new, dedicated mortgage utility functions as needed

## 6. Cashflow and Financial Calculations

### 6.1 Mortgage Payment Calculations
- [ ] Update mortgage payment calculation logic
- [ ] Ensure consistent calculation across application
- [ ] Support different payment frequencies
- [ ] Create helper functions for common calculations

### 6.2 Property Cashflow Integration
- [ ] Update property cashflow to include mortgage payments
- [ ] Ensure mortgage expenses appear in expense breakdowns
- [ ] Add mortgage interest/principal split to reports
- [ ] Create offset account support if applicable

### 6.3 Projection Support
- [ ] Update projection calculations to handle mortgages
- [ ] Ensure mortgage balances decrease over projection time
- [ ] Model refinancing scenarios if needed
- [ ] Include mortgage in asset/liability projections

## 7. Testing and Verification

### 7.1 Unit Tests
- [ ] Create tests for mortgage calculations
- [ ] Test mortgage schema validation
- [ ] Verify mortgage-property relationships
- [ ] Test edge cases (zero interest, etc.)

### 7.2 Integration Tests
- [ ] Test mortgage creation flow
- [ ] Test linking mortgages to properties
- [ ] Test mortgage updates
- [ ] Verify cashflow calculations

### 7.3 UI Testing
- [ ] Verify mortgage forms work properly
- [ ] Test navigation between properties and mortgages
- [ ] Check responsive design of mortgage components
- [ ] Verify accessibility of mortgage forms

## 8. Documentation and Final Cleanup

### 8.1 Code Documentation
- [ ] Add JSDoc comments to all mortgage-related functions
- [ ] Document mortgage data model
- [ ] Add inline comments for complex calculations
- [ ] Create function header documentation

### 8.2 User Documentation
- [ ] Update property documentation to reference mortgage management
- [ ] Create mortgage management documentation
- [ ] Add examples of property-mortgage relationships
- [ ] Document mortgage calculations

### 8.3 Performance Optimization
- [ ] Review and optimize mortgage-related queries
- [ ] Add appropriate indexes
- [ ] Optimize mortgage components for re-rendering
- [ ] Ensure large mortgage lists perform well

## Implementation Order

1. Legacy code identification & analysis (§1)
2. Schema and data model improvements (§2)
3. Backend API and storage improvements (§3)
4. Frontend component updates (§4)
5. Legacy code removal (§5)
6. Cashflow and financial calculations (§6)
7. Testing and verification (§7)
8. Documentation and final cleanup (§8)

This checklist will be used to track progress and ensure a complete implementation of the mortgage refactoring.