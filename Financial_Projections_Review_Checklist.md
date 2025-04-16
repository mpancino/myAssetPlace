# Financial Projections Review Checklist

## Documentation Review
- [ ] Review PDD requirements for Phase 7: Financial Projections
- [ ] Compare against build checklist items related to projections
- [ ] Document key architectural components required by PDD
- [ ] Identify user stories and acceptance criteria

## Current Cashflow Implementation
- [ ] Review cashflow page implementation and component structure
- [ ] Verify regular income calculations (employment, investments, etc.)
- [ ] Verify regular expense calculations for all asset types
- [ ] Examine interest expense calculations for all loan types
  - [ ] Mortgages with property linkage
  - [ ] Standalone loans
  - [ ] Different payment frequencies
- [ ] Validate payment amount calculations
  - [ ] Automatic calculation based on term and rate
  - [ ] Manual entry support
- [ ] Assess cashflow summary visualization
- [ ] Verify net cashflow calculation

## Balance Sheet Implementation
- [ ] Review balance sheet page implementation
- [ ] Verify asset categorization and grouping
- [ ] Verify liability categorization and grouping
- [ ] Validate current valuation methods for each asset class
- [ ] Examine equity calculation methodology
- [ ] Assess balance sheet visualization components
- [ ] Verify growth rate application for assets

## Projection Configuration
- [x] Examine projection time horizon settings
  - Current implementation offers preset periods (1, 5, 10, 20, 30 years)
  - "Until retirement" option calculates years based on user age and target retirement age
  - The period selection drives the yearsToProject configuration parameter
- [x] Assess growth rate configuration options
  - Projection offers three preset scenarios (low, medium, high)
  - Advanced mode allows custom growth rates 
  - Asset-specific growth rates override global settings when available
- [x] Verify inflation rate settings
  - Global inflation rate setting affects all projected values
  - Inflation adjustments are applied to both income and expenses
  - System settings provide default inflation rate values
- [x] Review scenario creation and management
  - Basic scenario support via growthRateScenario parameter
  - No persistent saving of multiple scenarios for comparison
  - PDD may require enhanced scenario management functionality
- [x] Validate UI controls for user configuration
  - User interface provides a sidebar with projection configuration options
  - Advanced mode reveals additional configuration options
  - Options directly map to ProjectionConfig parameters

## Cashflow-to-Cash Account Configuration
- [x] Review configuration interface for cashflow allocation
  - Found that the current `ProjectionConfig` type does not include options for cashflow allocation
  - Need to add a new configuration parameter to specify a target cash account ID
  - Need to add a boolean flag to enable/disable cashflow allocation
- [x] Verify mechanism to add net cashflow to selected cash account
  - Current implementation calculates `netCashflow` for each projection year
  - However, this cashflow is not applied to any asset value in the projection
  - Need to implement logic to add the netCashflow to a specified cash account's value each year
- [x] Examine handling of cashflow when not allocated to cash account
  - Currently, cashflow is calculated but exists as a separate metric only
  - It has no effect on asset values or net worth trajectory
  - In projections, it's simply reported as part of the `cashflow` object in the result
- [ ] Test positive cashflow allocation
  - Once implemented, need to test how positive cashflow (income > expenses) affects the target cash account
  - Verify growth compounds correctly in subsequent years
- [ ] Test negative cashflow allocation (cash account depletion)
  - Need to test how negative cashflow (expenses > income) depletes the target cash account
  - Verify appropriate handling when cash account reaches zero
- [ ] Validate fallback behavior when selected cash account is depleted
  - Need to design and implement a fallback strategy for when the target cash account is depleted
  - Options include: creating a negative balance, using another account, or capping expenses
- [ ] Review visualization of allocated vs. unallocated cashflow in projections
  - Current projection visualization does not show impact of cashflow allocation
  - Need to enhance charts to show cashflow allocation effects

## Projection Calculations
- [x] Verify forward projection of asset values
  - [x] Real estate appreciation
    - Current implementation uses basic growth rate based on asset class
    - PDD may require more sophisticated real estate valuation models
  - [x] Investment growth
    - Uses asset-specific growth rates when available, falls back to defaults
    - Compounds annually for projection periods
  - [x] Cash account interest
    - Interest calculation appears basic (simple interest)
    - Could be enhanced with more sophisticated compounding options
  - [ ] Retirement account growth
    - Current implementation treats retirement accounts like other investments
    - Need to verify special rules for retirement accounts (tax benefits, withdrawal limits)
- [x] Verify forward projection of liabilities
  - [x] Loan amortization
    - Basic amortization calculation is implemented for mortgages and loans
    - Monthly payments are calculated based on loan terms
    - Method uses loan payment, interest rate, and balance to project future balances
  - [x] Interest expense reduction over time
    - Interest portion of payments decreases as principal is paid down
    - This is correctly modeled in the amortization calculations
- [ ] Examine handling of time-limited assets/income
  - [ ] Employment income to retirement age
    - Need to verify if employment income projection stops at retirement age
  - [ ] Stock option vesting and expiry
    - Need to check specific handling of stock options with vesting schedules
- [x] Validate income adjustments for inflation
  - Inflation adjustment is applied to income values when enabled
  - Uses the configurable inflationRate parameter
- [x] Validate expense adjustments for inflation
  - Expenses are also adjusted for inflation when enabled
  - Uses the same inflationRate as income adjustments
- [x] Verify net worth calculation over projection period
  - Net worth is calculated as totalAssetValue - totalLiabilityValue
  - Calculation is performed for each projection year
  - When cashflow allocation is implemented, it will affect net worth trajectory

## Projection Visualization
- [ ] Review chart implementation for projected net worth
- [ ] Verify tabular data display for projected values
- [ ] Assess asset allocation visualization over time
- [ ] Examine cashflow projection visualization
- [ ] Validate filtering options for projection view
- [ ] Test responsiveness of projection visualizations

## Architecture Review
- [ ] Evaluate separation of concerns in projection code
- [ ] Review shared calculation functions
- [ ] Assess data flow from current values to projected values
- [ ] Examine caching strategies for projection data
- [ ] Verify client/server responsibilities for calculations
- [ ] Review error handling in projection calculations

## Performance Assessment
- [ ] Test projection calculation performance with large asset counts
- [ ] Assess rendering performance of projection visualizations
- [ ] Verify responsiveness of UI during calculation
- [ ] Examine memory usage during projection calculations

## Gap Analysis
- [x] Identify missing features compared to PDD requirements
  - Primary gap: Cashflow allocation to cash accounts is not implemented
  - Scenario management could be enhanced with saving/comparing multiple scenarios
  - Retirement accounts may need special handling beyond standard asset growth
- [x] Document architectural improvements needed
  - Add `allocateCashflow` and `targetCashAccountId` to ProjectionConfig
  - Enhance projection generation to modify cash account balances based on cashflow
  - Add fallback mechanisms for negative cashflow when cash accounts are depleted
- [x] List enhancement opportunities
  - Persistent scenario saving and comparison
  - More sophisticated asset-specific growth models (especially for real estate)
  - Automatic rebalancing simulation based on target asset allocations
  - Visualization enhancements showing impact of cashflow allocation
- [x] Prioritize implementation backlog
  1. Implement cashflow allocation to cash accounts (high priority)
  2. Add fallback handling for depleted cash accounts 
  3. Enhance visualization to show cashflow allocation effects
  4. Implement scenario comparison features
  5. Add advanced asset-specific projection models

## Final Recommendations
- [x] Summarize key findings
  - The current projection implementation provides a solid foundation
  - Cashflow is calculated but not integrated into asset values over time
  - Core projection mechanisms work well for basic asset and liability modeling
  - Configuration UI offers good flexibility but lacks some advanced features
- [x] Outline critical fixes needed
  - Add ProjectionConfig schema updates for cashflow allocation
  - Implement logic to add net cashflow to specified cash account
  - Modify projection visualization to show effects of cashflow allocation
- [x] Suggest optimization opportunities
  - Cache projection results for frequently used configurations
  - Consider running complex projections in a web worker to avoid UI blocking
  - Implement incremental rendering for projection charts with large datasets
- [x] Provide roadmap for completing Phase 7 implementation
  1. Update ProjectionConfig schema in shared/schema.ts
  2. Modify projection UI to include cashflow allocation options
  3. Enhance generateProjections function to handle cashflow allocation
  4. Update visualization components to show cashflow allocation effects
  5. Test with various scenarios (positive/negative cashflow, account depletion)
  6. Document the new functionality for users