# Mortgage Refactoring Checklist

This document outlines the plan to improve the mortgage system architecture, addressing the issues identified in the current implementation.

## Section 1: Legacy Code Identification & Analysis ✓

1. **Identify property components with mortgage code** ✓
   - Reviewed `property-form.tsx`: Already includes text about removing mortgage fields
   - Reviewed `mortgage-details.tsx`: Expects property + mortgage data, handles API data

2. **Identify loan components that handle mortgages** ✓
   - Reviewed `loan-form.tsx`: Has special handling for mortgages via `isMortgage` flag
   - Includes field mapping (e.g., loanProvider → lender, originalLoanAmount → originalAmount)
   - Has conditional endpoint for editing mortgages

3. **Review API endpoints for mortgages** ✓
   - `/api/mortgages` endpoints exist for CRUD operations
   - `/api/properties/:id/mortgages` endpoint for getting mortgages by property

4. **Examine schema for legacy fields** ✓
   - `assets` table includes legacy mortgage fields (lines 205-214)
   - `mortgages` table exists as a separate entity
   - Bidirectional relationship via `linkedMortgageId` in assets and `securedAssetId` in mortgages

5. **Analyze property-mortgage relationship** ✓
   - Properties can link to mortgages via both legacy fields and the new relationship
   - API has migration function to convert from old to new structure
   - Asset detail page handles both old and new relationships

6. **Identify field naming inconsistencies** ✓
   - Frontend: `loanProvider` vs Backend: `lender`
   - Frontend: `originalLoanAmount` vs Backend: `originalAmount`
   - Frontend: `termMonths` vs Backend: `loanTerm`

## Section 2: Data Model Cleanup

1. **Update schema.ts to finalize mortgage-property relationship**
   - [x] Remove legacy mortgage fields from property schema (lines 205-214) 
   - [x] Remove mortgageId field from insertPropertySchema
   - [x] Strengthen relationship between mortgages and properties with clear documentation

2. **Create migration function for existing data**
   - [ ] Verify `migratePropertyMortgageData` works for all scenarios
   - [ ] Add function to cleanup legacy fields after migration

3. **Update asset model types**
   - [ ] Remove mortgage fields from Asset type
   - [ ] Update InsertProperty type to remove mortgage fields

## Section 3: Backend Implementation

1. **Enhance existing mortgage endpoints**
   - [ ] Add validation to mortgage creation endpoints
   - [ ] Improve error handling for mortgage operations
   - [ ] Ensure proper linkage with properties

2. **Update property endpoints**
   - [ ] Ensure property API doesn't require mortgage data
   - [ ] Maintain backward compatibility during transition
   - [ ] Add validation to prevent invalid mortgage data

3. **Storage layer updates**
   - [ ] Finalize the storage.linkMortgageToProperty method
   - [ ] Update unlinkMortgageFromProperty to handle legacy data
   - [ ] Add explicit data migration functions for batch operations

## Section 4: Frontend Implementation

1. **Update property form**
   - [ ] Remove any remaining mortgage fields
   - [ ] Update property creation/edit workflow
   - [ ] Add clear UX for adding mortgages to properties

2. **Improve mortgage component**
   - [ ] Update MortgageDetails to only use new relationship model
   - [ ] Enhance mortgage display for multiple mortgages
   - [ ] Add clear buttons for edit/create mortgage actions

3. **Update loan form for mortgages**
   - [ ] Fix field mapping for mortgage operations
   - [ ] Enhance UX for mortgage creation
   - [ ] Add validation for mortgage-property relationship

4. **Asset detail page updates**
   - [ ] Update to use only the new relationship model
   - [ ] Improve mortgage display section
   - [ ] Handle properties with multiple mortgages

## Section 5: Legacy Code Removal

1. **Remove legacy mortgage fields**
   - [ ] Remove hasMortgage checks from components
   - [ ] Remove legacy API handling for mortgage data in properties
   - [ ] Clean up any database migration code for legacy fields

2. **Clean up asset detail page**
   - [ ] Remove conditional rendering based on hasMortgage
   - [ ] Update property tab to reference mortgages properly
   - [ ] Remove any references to legacy mortgage fields

3. **Update projections engine**
   - [ ] Ensure projections use the new mortgage relationships
   - [ ] Update any projection code that relied on legacy fields

## Section 6: Testing & Calculations

1. **Test mortgage calculations**
   - [ ] Verify amortization schedules are correct
   - [ ] Test interest calculation functions
   - [ ] Ensure mortgage balance calculations are accurate

2. **Test property + mortgage integration**
   - [ ] Test property value vs mortgage balance
   - [ ] Verify net equity calculations
   - [ ] Test projected property + mortgage values

3. **End-to-end testing**
   - [ ] Test property creation -> mortgage addition flow
   - [ ] Test mortgage editing and deletion
   - [ ] Test mortgage payments and balance updates

## Section 7: Documentation

1. **Update internal documentation**
   - [ ] Document new mortgage-property relationship
   - [ ] Update API documentation for mortgage endpoints
   - [ ] Add comments to clarify relationship in code

2. **User documentation**
   - [ ] Update help text for property and mortgage forms
   - [ ] Create guidelines for managing mortgages
   - [ ] Document how to view and update mortgages

## Section 8: Final Cleanup & Optimization

1. **Code optimization**
   - [ ] Refactor any repeated code in mortgage components
   - [ ] Optimize mortgage calculations for performance
   - [ ] Clean up any debug logging

2. **Database cleanup**
   - [ ] Remove any unused mortgage columns from properties table
   - [ ] Optimize mortgage-property queries
   - [ ] Add indexes for common queries

3. **Final validation**
   - [ ] Verify all mortgage features work correctly
   - [ ] Check calculations are accurate in all scenarios
   - [ ] Ensure property-mortgage relationship is correctly maintained

## Implementation Order

1. Complete Section 1 (Legacy Code Identification) ✓
2. Complete Section 2 (Data Model Cleanup)
3. Complete Section 3 (Backend Implementation)
4. Complete Section 4 (Frontend Implementation)
5. Complete Section 5 (Legacy Code Removal)
6. Complete Section 6 (Testing & Calculations)
7. Complete Section 7 (Documentation)
8. Complete Section 8 (Final Cleanup & Optimization)