# myAssetPlace \- Product Design Document

**Document Information**

* **Version:** 1.12 (Revised \- Added UI Req & Renumbered)  
* **Date:** April 11, 2025  
* **Status:** Draft

---

## 1\. Introduction

*(Sections 1.1 \- 1.3 remain largely unchanged from the initial base document)*

### 1.1 Purpose

This Product Design Document (PDD) outlines the requirements, design decisions, and implementation guidelines for the Wealth Management Application called "MyAssetPlace". It serves as a reference for developers, designers, and stakeholders to understand the product vision, features, and technical implementation.

### 1.2 Product Vision

`[REQ-001]` MyAssetPlace is designed to be a comprehensive financial management platform that enables users to track various asset classes, manage cash flow, monitor balance sheets, and generate financial projections. `[REQ-002]` The application's user interface (UI) must be modern, elegant, and intuitive, drawing inspiration from the design language and user experience (UX) patterns of leading contemporary digital financial services. `[REQ-003]` The system adopts a modular architecture, where each Asset Holding Type and Asset Class contain all of their respective financial logic, including configurable tax rules designed to be updated as legislation changes. `[REQ-004]` It aims to be accessible to users with varying levels of financial literacy through adaptable interface modes, the availability of which can be tied to subscription plans. `[REQ-005]` The application will also allow for basic branding customization, such as a configurable login screen.

`[REQ-006]` MyAssetPlace is a subscription service, where users will be able to utilize different Asset Holding Types, Asset Classes, number of Assets, access to interface modes (Basic/Advanced), and interact with other services based on a set of subscription plans configured by the application administrator.

### 1.3 Target Audience

*(Describes target users, not specific requirements)*

---

## 2\. User Experience Goals

### 2.1 Core User Experience Principles

1. **Simplicity & Adaptability:** `[REQ-007]` Complex financial concepts should be presented intuitively. `[REQ-008]` Offer distinct modes (**Basic Mode** and **Advanced Mode**) to tailor the complexity. Basic Mode prioritizes ease of use and defaults, while Advanced Mode exposes more granular control. `[REQ-009]` Access to these modes can be determined by the user's subscription plan.  
2. **Cohesiveness:** `[REQ-010]` Despite the modular architecture and potentially restricted modes, the application should provide a unified and consistent experience within the scope of the user's allowed features.  
3. **Transparency:** `[REQ-011]` Calculations and data sources should be clear and explainable, even when defaults are used in Basic Mode (e.g., indicating a default rate is being applied). `[REQ-012]` Tax calculations should clearly state the rates and rules being applied based on administrator configuration.  
4. **Responsiveness:** `[REQ-013]` The application should work seamlessly on desktop, tablet, and mobile devices within the available mode(s).  
5. **Customizability:** `[REQ-014]` Users with access to Advanced Mode should be able to configure the system to match their specific financial situation. `[REQ-015]` Basic Mode users rely more on administrator-defined defaults. `[REQ-016]` These defaults serve as starting points and are always overridable in Advanced Mode. `[REQ-017]` The system also allows administrator-level UI customization (e.g., login screen).

### 2.2 Key User Flows

#### 2.2.1 Onboarding Flow

1. `[REQ-018]` User creates an account (email/password or social login via Google) via the login screen, which may display administrator-configured branding.  
2. `[REQ-019]` User completes a basic profile including country. `[REQ-020]` The country setting will determine the default tax settings (based on administrator configuration for that country), year-end dates, and available external APIs, all configurable by the administrator.  
3. `[REQ-021]` User selects or is assigned a subscription plan (including potentially a default free tier).  
4. **Mode Determination:** `[REQ-022]` The user's initial interface mode (Basic or Advanced) is determined by the permissions of their active subscription plan. `[REQ-023]` If the plan allows both, the system might default to Basic or prompt the user.  
5. `[REQ-024]` User is guided to add their first asset through an onboarding wizard, potentially simplified further if only Basic Mode is available or selected.  
6. `[REQ-025]` User is introduced to the dashboard (potentially a simplified version if in Basic Mode) with sample data visualizations.  
7. `[REQ-026]` User is prompted to explore other asset classes.  
8. `[REQ-027]` A persistent "+" sign on the UI allows the user to easily add another asset at any time.  
9. **Demo User Onboarding:** `[REQ-028]` When the demo user first logs in, they shall be guided through a simplified setup dialog sequence that captures essential information, such as their age and target retirement age, to personalize the initial experience.

#### 2.2.2 Asset Management Flow

1. `[REQ-029]` User navigates to a specific asset class (e.g., Real Estate).  
2. `[REQ-030]` User views a summary of existing assets in that class or, alternatively, views a summary of those assets grouped by Asset Holding Type.  
3. `[REQ-031]` User can explore the details of each individual asset.  
4. `[REQ-032]` User can configure, edit, or delete asset-specific details and settings through a simple wizard.  
   * `[REQ-033]` **Basic Mode:** The wizard hides advanced fields (e.g., individual growth rates, complex expense details) and automatically applies administrator-defined defaults where applicable.  
   * `[REQ-034]` **Advanced Mode:** The wizard exposes all relevant fields for detailed configuration.  
5. `[REQ-035]` User views updated financial metrics reflected in both the specific asset view and the main dashboard.

#### 2.2.3 Financial Projection Flow

1. `[REQ-036]` User selects which asset classes and holding types to include in projections.  
2. `[REQ-037]` User views forward-year projections.  
   * `[REQ-038]` **Basic Mode:** Projections run using default scenarios (e.g., medium growth) and administrator-defined assumptions (e.g., inflation, default growth rates). Configuration options are minimal.  
   * `[REQ-039]` **Advanced Mode:** User can select different scenarios (low, medium, high) and adjust parameters (inflation, growth rates) to see the impact on outcomes.  
3. `[REQ-040]` The maximum number of projection years is configurable based on their subscription plan, set by the administrator.  
4. `[REQ-041]` User can drill down into specific asset class contributions or view projections aggregated by Asset Holding Type (visual complexity might be reduced in Basic Mode).

#### 2.2.4 Settings Flow

1. `[REQ-042]` User can manage their Account Details (profile information, password).  
2. `[REQ-043]` User can manage their subscription plan and view billing history. `[REQ-044]` This includes upgrading/downgrading plans, which may affect available modes and asset limits.  
3. `[REQ-045]` User can export their data (including all assets) in a structured **JSON** format and import previously exported data.  
4. `[REQ-046]` User can customize the UI appearance (e.g., select different themes/skins).  
5. `[REQ-047]` User can configure notification preferences (e.g., when to receive emails, type of content).  
6. **Mode Toggle:** `[REQ-048]` User can switch between **Basic Mode** and **Advanced Mode** via a setting **only if their current subscription plan permits access to both modes**. `[REQ-049]` If the plan allows only one mode, this toggle should be hidden or disabled.

### 2.3 Key Administrator Flows

#### 2.3.1 Country, Holding Type, Asset Classes, and Default Asset Settings

*(Administrator defines defaults here. As noted in 2.1.5, these serve as starting points overridable in Advanced Mode.)*

1. **Country Configuration:** `[REQ-050]` Administrator can configure country-specific settings, including:  
   * `[REQ-051]` Default Currency  
   * `[REQ-052]` Financial Year End Date  
   * `[REQ-053]` Available external APIs (e.g., property valuation, stock data)  
2. **Asset Holding Type Management:** `[REQ-054]` Administrator can add and manage Asset Holding Types. `[REQ-055]` Initial types include: Personal, Superannuation (or country-specific equivalent like 401k for the US), Family Trust.  
3. **Asset Holding Type Configuration:** `[REQ-056]` For each Holding Type, the administrator can set the specific tax rules and parameters. `[REQ-057]` This configurability by the administrator is essential to allow the application's calculations to remain accurate by adapting to future changes in tax legislation for different countries and holding types. The administrator can set:  
   * a. `[REQ-058]` The country or region where it is applicable.  
   * b. `[REQ-059]` Income tax rates and brackets specific to that holding type.  
   * c. `[REQ-060]` Capital gains tax rates and rules specific to that holding type.  
   * d. `[REQ-061]` Any specific expenses associated with managing assets under that holding type.  
   * e. `[REQ-062]` **Example (Australia):** For 'Personal' (Australia), configure income tax brackets, Medicare levy. For 'Superannuation' (Australia), configure contribution tax rates, earnings tax rate. **(See Appendix 9.4 for illustrative details and required configuration fields).**  
4. **Asset Class Configuration:** `[REQ-063]` For each Asset Class, the administrator can configure:  
   * a. `[REQ-064]` Default low, medium, and high growth rate assumptions that inheriting assets can use.  
   * b. `[REQ-065]` Relevant expense categories (e.g., maintenance for property, brokerage fees for shares).  
   * c. `[REQ-066]` Default income assumptions (e.g., rental yield for properties, dividend yield for shares).  
5. **Default Settings:** `[REQ-067]` Administrator can create default settings for Asset Holding Types and Asset Classes that users can adopt or override (in Advanced Mode).  
6. **API Key Management:** `[REQ-068]` Administrator can securely input and manage API keys for integrated third-party services (e.g., Domain Property API, Stock Price API, HERE API).

#### 2.3.2 Subscription Types/Handling

1. **Subscription Configuration:** `[REQ-069]` A subscription plan can be configured by the administrator to limit:  
   * a. `[REQ-070]` The number of allowed Asset Holding Types.  
   * b. `[REQ-071]` The number of allowed Asset Classes.  
   * c. `[REQ-072]` The number of Assets permitted within each Asset Class. *(Note: If a user exceeds this limit due to adding new assets or a plan downgrade, assets will be hidden/disabled on a **Last-In, First-Out (LIFO)** basis to meet the limit. Hidden assets are excluded from all calculations \- see point 5 below.)*  
   * d. `[REQ-073]` Access to specific third-party API integrations (e.g., property valuation, share price feeds, financial insights).  
   * e. **Allowed User Interface Modes:** `[REQ-074]` Specify whether the plan includes: Basic Mode Only, Advanced Mode Only, or Both Basic and Advanced Modes (user can toggle).  
   * f. `[REQ-075]` The maximum number of years for financial projections.  
2. **Subscription Duration:** `[REQ-076]` Subscriptions can be configured with specific durations (e.g., monthly, annually).  
3. **Upgrade Prompts:** `[REQ-077]` If a user attempts an action exceeding their current subscription limits (including trying to access a restricted mode or add assets beyond the limit), they will be prompted to upgrade their plan or manage existing assets.  
4. **Expiration/Downgrade Handling:**  
   * `[REQ-078]` If a subscription expires, the user might be reverted to a default free tier with its associated mode and asset limitations.  
   * `[REQ-079]` If a user downgrades to a plan that restricts their current mode (e.g., downgrading from a plan with "Both Modes" to "Basic Mode Only" while they are currently using Advanced Mode), the system must gracefully switch them to an allowed mode (e.g., force switch to Basic Mode) upon the plan change taking effect. `[REQ-080]` They will be notified of this change. `[REQ-081]` Asset limits will also be enforced (see point 5).  
   * `[REQ-082]` Users will be consistently prompted to renew or select a new plan upon login and when attempting to access restricted features if their subscription expires or lacks necessary permissions.  
5. **Data Retention & Limit Enforcement:** `[REQ-083]` Assets will **never** be deleted automatically if a subscription is downgraded or expires. `[REQ-084]` Assets exceeding the limits of the current plan (number of assets per class, etc.) will become hidden/disabled based on a **Last-In, First-Out (LIFO)** principle (i.e., the most recently added assets exceeding the limit are hidden first). `[REQ-085]` **Hidden/disabled assets are completely excluded from all application calculations (e.g., net worth, cashflow, projections) and visualizations** and will not appear in asset lists until an appropriate subscription is re-enabled or the user manually deletes other assets to fall within limits. `[REQ-086]` Features associated with a mode (e.g., detailed configurations made in Advanced Mode) might become hidden if the user loses access to that mode, but the underlying data related to *visible* assets should ideally be preserved.  
6. **Default/Minimum Subscription:** `[REQ-087]` A default free or minimum-tier subscription plan must always be configured, including its allowed interface mode(s) and asset limits.  
7. **Subscription Cost & Payment:** `[REQ-088]` Administrator can define the cost for each subscription tier and configure accepted payment methods (integration with a payment gateway required).

#### 2.3.3 Branding/UI Configuration

1. **Login Splash Screen:** `[REQ-089]` Administrator can configure the text content and upload/select an image to be displayed on the application login screen.

---

## 3\. Feature Requirements

### 3.1 Authentication and User Management

* `[REQ-090]` **Account Creation:** Secure email/password registration with email verification and input validation.  
* `[REQ-091]` **Social Login:** Integration with Google OAuth via Firebase Authentication for simplified sign-up/sign-in.  
* `[REQ-092]` **Session Management:** Secure session handling using industry best practices (e.g., secure cookies, reasonable timeouts, refresh tokens).  
* `[REQ-093]` **Profile Management:** Users can view and edit their profile information (name, email, country, preferences).  
* `[REQ-094]` **Security Features:** Enforce password strength requirements, securely hash and salt stored credentials.  
* `[REQ-095]` **Route Protection:** All application features and data require user authentication.  
* `[REQ-096]` **Data Isolation:** Users must only be able to access and modify their own financial data. Implement robust ownership checks.  
* `[REQ-097]` **API Security:** All API requests must be properly authenticated and authorized.

### 3.2 Asset Holding Type Configuration

*(This section describes the conceptual tax settings managed by the Admin per Holding Type)*

#### 3.2.1 Tax Settings Module per Holding Type

* `[REQ-098]` **Tax Bracket Configuration:** Administrator can set up income tax brackets and rates for applicable holding types (e.g., Personal).  
* `[REQ-099]` **Capital Gains Tax:** Administrator can configure capital gains tax rates and rules (e.g., discount eligibility) for applicable holding types.  
* `[REQ-100]` **Dividend Tax:** Administrator can set dividend tax rates or rules (e.g., imputation credit handling for Australia) for applicable holding types.  
* `[REQ-101]` **Holding Type Tax Rules:** The system logic must apply the correct tax treatment based on the assigned holding type of an asset, using the rates and rules configured by the administrator for that Hholding type and country.  
* `[REQ-102]` **Tax Projection:** The projection engine must incorporate the relevant administrator-configured tax rules based on holding type to estimate future tax liabilities.  
* **Reference:** Refer to Appendix 9.4 for illustrative details and required configuration fields specific to Australian holding types.

### 3.3 Asset Class Modules

* `[REQ-103]` *(General Requirement)* **Overview and Management:** Each Asset Class page must provide an overview/summary of all assets within that class. It must also include clear actions (e.g., buttons, wizards) to add, edit, and delete assets belonging to that class.  
* `[REQ-104]` *(General Requirement)* **Basic Mode Simplification:** In Basic Mode, input forms and display details for assets within these modules will be simplified:  
  * `[REQ-105]` Fields requiring nuanced financial understanding (e.g., individual growth rate overrides, complex fee structures, detailed tax adjustments beyond defaults) will be hidden.  
  * `[REQ-106]` Administrator-defined default values (growth rates, standard fees, income assumptions) will be used automatically for calculations and projections related to assets added/managed in Basic Mode. `[REQ-107]` The UI should subtly indicate when a default is being used.

#### 3.3.1 Real Estate Module

* `[REQ-108]` **Property Management:** Add, edit, delete property assets with details like address, property type, purchase date, purchase price.  
* `[REQ-109]` **Valuation Tracking:** Allow manual entry and tracking of current and historical property values. `[REQ-110]` Integrate with property valuation APIs (e.g., Domain for Australia) based on subscription level and administrator configuration.  
* `[REQ-111]` **Mortgage Management:** Track mortgage details (lender, initial amount, interest rate, term, repayment frequency) and current balances. `[REQ-112]` Calculate principal and interest components of repayments.  
* `[REQ-113]` **Expense Tracking:** Allow users to log property-related expenses (e.g., repairs, insurance, council rates) with categorization.  
* `[REQ-114]` **Rental Income:** Track rental income, frequency, and vacancy periods for income projections.  
* `[REQ-115]` **Offset Account Integration:** Ability to link a Cash Account (see 3.3.4) as an offset account against a mortgage to calculate interest savings.  
* `[REQ-116]` **No Mortgage Option:** Support for properties owned outright without an associated mortgage.  
* `[REQ-117]` **Holding Type Classification:** Assign properties to relevant holding types (e.g., Personal, Self Managed Super, Family Trust).  
* `[REQ-118]` **Individual Asset Growth Rate:** Allow users to set or override default low/medium/high growth rate assumptions for individual properties (Advanced Mode).  
* `[REQ-119]` **Address Validation:** Integrate with address validation/geocoding services (e.g., HERE API) to ensure data quality and potentially display map thumbnails.  
* `[REQ-120]` **Map Thumbnail:** On Real Estate asset overview cards/listings, display a map thumbnail using an integrated mapping API, where available and feasible.

#### 3.3.2 Share Holdings Module

* `[REQ-121]` **Stock Portfolio Management:** Add, edit, delete stock/ETF investments (ticker symbol, exchange, quantity, purchase date, purchase price).  
* `[REQ-122]` **Valuation Tracking:** Track current and historical values. `[REQ-123]` Integrate with stock price APIs (choose a free/freemium service) based on subscription level and administrator configuration to provide near real-time updates.  
* `[REQ-124]` **Dividend Management:** Allow users to record received dividends. Track dividend yield and project future dividend income based on historical data or user inputs.  
* `[REQ-125]` **Performance Metrics:** Calculate and display gain/loss (realized and unrealized), portfolio performance (e.g., time-weighted return), and asset allocation.  
* `[REQ-126]` **Holding Type Classification:** Assign shareholdings to relevant holding types.  
* `[REQ-127]` **Individual Asset Growth Rate:** Allow users to set or override default low/medium/high growth rate assumptions for individual holdings (Advanced Mode).

#### 3.3.3 Superannuation Module (Adaptable by Country)

* `[REQ-128]` **Account Management:** Add, edit, delete superannuation/retirement accounts (e.g., Super fund name, member number).  
* `[REQ-129]` **Balance Tracking:** Track current and historical account balances.  
* `[REQ-130]` **Contribution Management:** Track employer contributions (Super Guarantee for Australia), personal contributions (concessional/non-concessional), and government co-contributions.  
* `[REQ-131]` **Investment Mix:** Allow users to specify the asset allocation within their super account (e.g., % in Australian Shares, International Shares, Fixed Interest, Cash) (Advanced Mode).  
* `[REQ-132]` **Fee Analysis:** Allow users to input administration and investment fees to model their impact on long-term growth (Advanced Mode).  
* `[REQ-133]` **Individual Asset Growth Rate:** Allow users to set or override default low/medium/high growth rate assumptions based on their investment mix or overall fund performance (Advanced Mode).

#### 3.3.4 Cash Accounts Module

* `[REQ-134]` **Account Management:** Add, edit, delete bank accounts, savings accounts, and term deposits (institution, account name, BSB/Account number \- optional).  
* `[REQ-135]` **Balance Tracking:** Track current and historical balances.  
* `[REQ-136]` **Interest Management:** Allow users to input interest rates to project interest income.  
* `[REQ-137]` **Offset Functionality:** Designate cash accounts that can be linked to mortgages (see 3.3.1) or loans (see 3.3.7) for offset calculations.  
* `[REQ-138]` **Liquidity Analysis:** Tag accounts for specific purposes like 'Emergency Fund'.  
* `[REQ-139]` **Holding Type Classification:** Assign cash accounts to relevant holding types.  
* `[REQ-140]` **Individual Asset Growth Rate:** Typically low/zero for cash, but allow setting an interest rate.

#### 3.3.5 Stock Options Module

* `[REQ-141]` **Option Management:** Add, edit, delete employee stock options (grant date, number of options, strike price, expiration date).  
* `[REQ-142]` **Vesting Schedule:** Track vesting dates, number of vested/unvested options, and status.  
* `[REQ-143]` **Valuation:** Estimate current and projected values based on the current underlying stock price and potential growth scenarios (requires integration with share pricing).  
* `[REQ-144]` **Exercise Analysis:** Provide basic analysis on the potential value upon exercising (intrinsic value). *(Note: Optimal exercise timing recommendations are complex and likely out of scope for V1 unless simplified significantly)*.  
* `[REQ-145]` **Tax Implications:** Estimate potential tax impact upon exercise based on country/holding type rules (requires careful implementation based on local regulations) (Advanced Mode).  
* `[REQ-146]` **Holding Type Classification:** Assign options to relevant holding types.  
* `[REQ-147]` **Individual Asset Growth Rate:** Growth is tied to the underlying stock's performance.

#### 3.3.6 Salary & Income Module

* `[REQ-148]` *(Treated as a Personal Asset Class for cashflow/projection purposes)*  
* `[REQ-149]` **Employment Income:** Track salary, wages, bonuses, and payment frequency.  
* `[REQ-150]` **Tax Withholding:** Estimate Pay-As-You-Go (PAYG) tax withheld based on income and country/holding type tax settings configured by the administrator.  
* `[REQ-151]` **Growth Projections:** Allow users to model anticipated salary increases over time (e.g., % increase per year).  
* `[REQ-152]` **Superannuation Contributions:** Automatically calculate mandatory employer contributions based on income (e.g., Australian Super Guarantee).  
* `[REQ-153]` **Income Visualization:** Display charts showing income breakdown (e.g., salary vs. bonus) and trends over time within the cashflow section.  
* `[REQ-154]` **Expense Tracking:** Allow high-level tracking of regular living expenses with categorization to feed into cashflow analysis.

#### 3.3.7 Loans Module

* `[REQ-155]` **Loan Management:** Add, edit, delete various loan types (e.g., personal loans, car loans, investment loans unrelated to a specific property mortgage).  
* `[REQ-156]` **Loan Details:** Track lender, initial amount, interest rate, term, repayment frequency, and purpose.  
* `[REQ-157]` **Balance Tracking:** Calculate and track the outstanding loan balance over time.  
* `[REQ-158]` **Offset Account Integration:** Ability to link a Cash Account (see 3.3.4) as an offset account against a loan to calculate interest savings, similar to mortgage offset functionality. *(Note: This feature might be simplified or hidden in Basic Mode).*  
* `[REQ-159]` **Holding Type Classification:** Assign loans to relevant holding types (usually Personal, but could be Trust etc.).

### 3.4 Supporting Modules

#### 3.4.1 Projection Settings Module

* **Scenario Definition:**  
  * `[REQ-160]` **Basic Mode:** Projections run using a default scenario (e.g., Medium) based on administrator-defined defaults for growth, inflation etc. User configuration is hidden.  
  * `[REQ-161]` **Advanced Mode:** Allow users to select low, medium, high scenarios and configure parameters.  
* **Inflation Settings:**  
  * `[REQ-162]` **Basic Mode:** Uses administrator-defined default. Hidden from user.  
  * `[REQ-163]` **Advanced Mode:** Allow users to set the assumed inflation rate.  
* `[REQ-164]` **Asset Class/Holding Type Enablement:** Available in both modes, allows users to toggle what's included in projections.  
* `[REQ-165]` **Financial Insights Toggle:** Allow users to enable or disable optional AI-powered financial insights (requires OpenAI API integration and subscription).  
* `[REQ-166]` **Projection Rules:** Projections must only ever use data from the underlying assets that are enabled and selected by the user for the specific projection run (and not hidden due to subscription limits).  
* `[REQ-167]` **Projection Period Options:** Projections must offer the option to display results from the current date to the end of the current financial year, followed by annual increments, OR simply project forward for a specified number of years.

#### 3.4.2 Community Forum ("NoAdviceBoard")

* `[REQ-168]` **Forum Functionality:** Implement a message board feature allowing users to ask questions and discuss financial topics.  
* `[REQ-169]` **Admin-Defined Threads:** The administrator must be able to create and manage discussion categories/threads (e.g., "Finding Professionals", "Superannuation Strategies", "Property Investing Tips").  
* `[REQ-170]` **User Profiles:** Users must be able to create a unique nickname and select/upload an avatar for use within the forum.  
* `[REQ-171]` **Moderation:** Basic moderation tools for the administrator (e.g., delete posts, ban users). *(Note: Explicitly state this is not financial advice)*.

### 3.5 Dashboard and Reporting

#### 3.5.1 Dashboard

* **Basic Mode View:** `[REQ-172]` The dashboard may present a simplified view, potentially corresponding to the "Basic Dashboard Option" described in 4.1.1. This might involve: Fewer, higher-level metric tiles; Simplified charts focusing on key totals (Net Worth, Cash); Less emphasis on detailed breakdowns unless explicitly requested.  
* **Advanced Mode View:** `[REQ-173]` Presents the full dashboard with all tabs (Balance Sheet, Cashflow, Projections), detailed breakdowns, and configurable views.  
* `[REQ-174]` **Balance Sheet Tab:** Display a summary of total assets, total liabilities, and calculated net worth, aggregated across all included *visible* asset classes and holding types.  
* `[REQ-175]` **Cashflow Tab:** Display a summary of total income, total expenses, and net cash flow over a selected period (e.g., monthly, annually) based on *visible* assets and income sources.  
* `[REQ-176]` **Projections Tab:** Display high-level summaries and charts of the X-year financial projections based on user settings, selected scenarios, and *visible* assets. `[REQ-177]` Include key metrics like projected net worth and cash flow over time. `[REQ-178]` The maximum projection period (X) is determined by the user's subscription plan.  
* `[REQ-179]` **Future Worth Tiles:** The dashboard should prominently display tiles or cards showing the projected future net worth at key intervals (e.g., 1 year, 5 years, retirement age) based on the primary projection settings.  
* `[REQ-180]` **Asset Allocation View:** Provide visual breakdowns (e.g., pie charts, bar charts) of asset allocation by asset class and by holding type for *visible* assets.  
* `[REQ-181]` **Quick Action Buttons:** Include prominent buttons or links for common actions like "Add Asset", "Run Projection", "View Cashflow".

#### 3.5.2 Recent Activity

* `[REQ-182]` **Activity Log:** Maintain a log of significant user actions (e.g., adding/editing/deleting assets, changing major settings).  
* `[REQ-183]` **Filtering:** Allow users to filter the activity log by asset class, action type, or date range.  
* `[REQ-184]` **Detail View:** Provide the ability to view specific details related to each logged activity.  
* `[REQ-185]` **Timeline Visualization:** Optionally display activities in a chronological timeline view.

#### 3.5.3 Export/Import

* `[REQ-186]` **Data Export:** Allow users to export all their financial data (assets, liabilities, transactions, settings) into a structured **JSON** file.  
* `[REQ-187]` **Data Import:** Allow users to import data from a previously exported **JSON** file. `[REQ-188]` Implement robust validation to ensure data integrity during import. `[REQ-189]` Asset limits based on the current subscription must be enforced during import.  
* `[REQ-190]` **Backup Reminder:** Optionally prompt users periodically to back up their data via the export feature.  
* `[REQ-191]` **Import Verification:** Provide feedback to the user confirming the success or failure of the import process, including details of any validation errors or assets not imported due to limits.

### 3.6 General UI/Branding Features

#### 3.6.1 Configurable Login Splash Screen

* `[REQ-192]` The application login screen shall display a designated area containing text and an image. `[REQ-193]` The specific text content and the image displayed must be configurable via the Administrator Console (see 2.3.3).

---

## 4\. UI/UX Design Specifications

### 4.1 Design System

#### 4.1.1 Look and Feel \- Ultra Simplistic and Modern

* `[REQ-194]` **Inspiration:** Aim for a clean, intuitive interface similar to modern FinTech apps (e.g., Revolut.com). (Related to REQ-002)  
* **Progressive Disclosure & Mode Adaptation:**  
  * `[REQ-195]` **Subscription-Based Access:** The UI must reflect the mode(s) allowed by the user's subscription. If only Basic Mode is allowed, Advanced Mode features and toggles are simply not rendered.  
  * `[REQ-196]` **Clear Mode Indicator:** The UI should clearly indicate whether the user is currently in Basic or Advanced Mode.  
  * `[REQ-197]` **Contextual Hiding:** In Basic Mode, UI elements (input fields, configuration options, complex chart controls, advanced settings) related to granular control are hidden, not just disabled. The layout should adapt cleanly.  
  * `[REQ-198]` **Use Defaults:** Basic Mode relies heavily on administrator-defined defaults (Section 2.3.1). Advanced Mode allows overriding these.  
* **Enhanced Onboarding Wizard:**  
  * `[REQ-199]` **Subscription-Aware Guidance:** Onboarding adapts based on the mode(s) available in the user's initial plan.  
  * `[REQ-200]` **Contextual Explanations:** Briefly explain *why* certain information is needed during onboarding (e.g., "Country helps determine tax rules").  
  * `[REQ-201]` **Skip/Optional Steps:** Allow skipping non-critical setup steps.  
* **Simplified Views:**  
  * `[REQ-202]` **Basic Mode Dashboard:** Corresponds to the simplified dashboard concept, focusing on high-level summaries.  
  * `[REQ-203]` **View Switching:** Users must be able to easily switch views between aggregating assets by asset class and aggregating by holding type on relevant screens (Dashboard, Asset Overviews).  
* **Clear Language and Visuals:**  
  * `[REQ-204]` **Mode-Appropriate Language:** Use even simpler language in Basic Mode. Tooltips explaining defaults might be useful.  
  * `[REQ-205]` **Action-Oriented Labels:** Use clear button labels (e.g., "Add Property Asset").  
  * `[REQ-206]` **Simple Visualizations:** Basic Mode should prioritize the simplest chart types for core metrics. Advanced Mode can offer more complex visualizations.  
* **Contextual Help:**  
  * `[REQ-207]` **Mode-Specific Tips:** Tips and help content should be relevant to the current mode.  
  * `[REQ-208]` **Embedded Help:** Link to help articles/FAQs within complex sections.  
  * `[REQ-209]` **Clear CTAs:** Guide users on the next logical step.  
* **Sensible Defaults:**  
  * `[REQ-210]` **Core to Basic Mode:** Defaults are automatically applied in Basic Mode.  
  * `[REQ-211]` **Overrides in Advanced:** Advanced Mode allows users to override these defaults.

#### 4.1.2 Design Principle \- Guided Configuration

* `[REQ-212]` Utilize simple dialogs, wizards, and step-by-step flows to guide users through complex configuration tasks (e.g., adding assets, setting up projections, configuring tax details if exposed to the user). `[REQ-213]` Wizards should adapt to the current mode.

#### 4.1.3 Dynamic UI Adaptation

* `[REQ-214]` Design key UI components (like asset input forms, display cards) to be adaptable, ideally driven by metadata or configuration, allowing the UI to adjust gracefully as underlying data models for asset classes evolve over time without requiring extensive frontend rewrites for minor changes.

#### 4.1.4 Component Library

* `[REQ-215]` **UI Framework:** React with shadcn/ui components.  
* `[REQ-216]` **Styling:** TailwindCSS.  
* `[REQ-217]` **Form Controls:** Standardized inputs, selects, checkboxes, radios from shadcn/ui.  
* `[REQ-218]` **Cards:** Consistent card design for asset representation.  
* `[REQ-219]` **Data Tables:** Use shadcn/ui data tables (or similar) with sorting and filtering capabilities.  
* `[REQ-220]` **Charts:** Recharts library for data visualization.  
* `[REQ-221]` **Modals:** Consistent modal/dialog design for forms, confirmations, and wizards.  
* `[REQ-222]` **Icons:** Utilize a consistent icon library (e.g., Lucide Icons included with shadcn/ui).

### 4.2 Layout and Navigation

#### 4.2.1 Responsive Framework

* `[REQ-223]` **Desktop Layout:** Consider a 2 or 3-column layout (e.g., collapsible sidebar navigation, main content area, optional details panel).  
* `[REQ-224]` **Tablet Layout:** Adapt to a 1 or 2-column layout, potentially with navigation transitioning to a top bar or persistent sidebar.  
* `[REQ-225]` **Mobile Layout:** Single-column layout with collapsible 'hamburger' menu or bottom navigation bar.

#### 4.2.2 Navigation Structure

* `[REQ-226]` **Primary Navigation:** Use a persistent sidebar (desktop) or collapsible menu (mobile/tablet) for main sections (Dashboard, Asset Classes, Projections, Settings, Forum). `[REQ-227]` Navigation items or sections might be hidden if they correspond *only* to a mode disallowed by the subscription.  
* `[REQ-228]` **Secondary Navigation:** Use tabs or sub-menus within sections where needed (e.g., within Dashboard: Balance Sheet, Cashflow, Projections tabs).  
* `[REQ-229]` **Breadcrumbs:** Implement breadcrumbs, especially on deeper pages or mobile/tablet views, to show the user's location within the application hierarchy.  
* `[REQ-230]` **Quick Actions:** Consider a Floating Action Button (FAB) on mobile for primary actions like "Add Asset".

#### 4.2.3 Dashboard Layout

* `[REQ-231]` **Mode Adaptation:** The dashboard layout dynamically changes based on the selected mode (Basic vs. Advanced), as described in 3.5.1 and 4.1.1.  
* `[REQ-232]` **Card Grid:** Use a responsive grid layout for key metric cards (Net Worth, Cash Balance, etc.).  
* `[REQ-233]` **Chart Section:** Dedicate areas for primary visualizations (Asset Allocation, Net Worth Projection).  
* `[REQ-234]` **Tab Structure:** Implement clear tabs for switching between Balance Sheet, Cashflow, and Projections views (primarily in Advanced Mode).  
* `[REQ-235]` **Asset Breakdown:** Ensure clear visual separation and labeling for breakdowns by asset class and holding type.

### 4.3 Wireframes and Mockups

* `[REQ-236]` *(Note: Detailed wireframes and mockups are required and should be created by the design team, then attached or linked as appendices to this document.)*

#### 4.3.1 Key Screens (Examples requiring wireframes)

* `[REQ-237]` Login Screen (including configurable splash text/image area)  
* `[REQ-238]` Mode Toggle (Settings): Appearance when enabled (plan allows both modes), disabled/hidden (plan allows only one mode).  
* `[REQ-239]` Subscription Plan Selection/Management: Clearly indicating which modes and limits are included in each plan.  
* `[REQ-240]` Upgrade Prompts: Specifically mentioning mode access or asset limits as a reason to upgrade.  
* `[REQ-241]` Basic Mode Dashboard: Simplified layout compared to the Advanced version.  
* `[REQ-242]` Advanced Mode Dashboard: Full-featured layout.  
* `[REQ-243]` Asset Class Landing Pages: Showing asset summaries (list/card view), aggregation toggles (by class/holding type), and add/edit actions. Hidden assets due to limits should not be displayed.  
* `[REQ-244]` Asset Detail/Edit Wizard (Basic Mode): Showing hidden fields compared to Advanced.  
* `[REQ-245]` Asset Detail/Edit Wizard (Advanced Mode): Showing all fields.  
* `[REQ-246]` Basic Mode Projection Screen: Minimal configuration, showing results based on defaults and visible assets.  
* `[REQ-247]` Advanced Mode Projection Setup & Results: Full configuration options and detailed results based on visible assets.  
* `[REQ-248]` Settings Pages: User Profile, Subscription Management, Export/Import, Notifications.  
* `[REQ-249]` Community Forum (NoAdviceBoard): Thread list, post view, user profile/avatar display.  
* `[REQ-250]` Onboarding Flow Screens: Welcome, profile setup, first asset addition guide.  
* `[REQ-251]` Administrator Console Screens: Country config, Holding Type config (including detailed Tax parameters), Asset Class config, Subscription config, User management, Forum moderation, API Key Management, Run Calculation Tests, **Login Splash Screen Config**.

---

## 5\. Technical Requirements

### 5.1 Frontend Architecture

#### 5.1.1 Technology Stack

* `[REQ-252]` **Framework:** React (latest stable version) with TypeScript.  
* **State Management:**  
  * `[REQ-253]` **Server State/Caching:** TanStack Query (React Query) for managing API data, caching, and synchronization.  
  * `[REQ-254]` **Global UI State:** React Context or Zustand for application-wide state (e.g., user settings, theme, active mode, allowed modes from subscription).  
  * `[REQ-255]` **Local/Feature State:** Component state (`useState`, `useReducer`) or feature-specific context/Zustand stores.  
* `[REQ-256]` **Routing:** `wouter` or `react-router-dom` for client-side routing.  
* `[REQ-257]` **Form Handling:** `react-hook-form` with `Zod` for schema-based validation.  
* `[REQ-258]` **UI Components:** `shadcn/ui` built on Radix UI and styled with TailwindCSS.  
* `[REQ-259]` **Charting:** `Recharts` for data visualizations.  
* `[REQ-260]` **API Client:** Custom `fetch` wrapper or `axios` instance configured for base URL, authentication headers, and standardized error handling.  
* `[REQ-261]` **Image Handling:** Need strategy for handling administrator-uploaded images (storage, delivery, e.g., cloud storage like S3/GCS/Azure Blob).

#### 5.1.2 Component Structure

* `[REQ-262]` **Directory Structure:** Organize components logically (e.g., `pages/`, `components/ui/`, `components/features/`, `layouts/`, `hooks/`, `contexts/`, `lib/`).  
* `[REQ-263]` **Page Components:** Top-level components corresponding to application routes. Includes Login Page component capable of displaying configured splash content.  
* `[REQ-264]` **UI Components:** Generic, reusable UI elements (Button, Card, Input) largely derived from `shadcn/ui`.  
* `[REQ-265]` **Layout Components:** Components defining the overall page structure (Sidebar, Header, Main Content Area).  
* `[REQ-266]` **Feature Components:** Components specific to a particular feature or asset class (e.g., `PropertyForm`, `AssetAllocationChart`).  
* `[REQ-267]` **Form Components:** Reusable form structures or specialized input components.  
* `[REQ-268]` **Conditional Rendering:** Components will need to implement conditional rendering logic based on the allowed modes from the subscription *and* the user's selected mode (if choice is permitted).

#### 5.1.3 State Management Strategy

* `[REQ-269]` **Server State:** Use TanStack Query for fetching, caching, and updating data from the backend API. Leverage its caching mechanisms to minimize redundant requests. Includes fetching login splash configuration.  
* `[REQ-270]` **Global UI State:** Needs to store: Allowed modes based on the current subscription (fetched from backend); User's currently selected mode (if choice is allowed); User authentication status, theme preference, potentially other application settings.  
* `[REQ-271]` This state dictates overall UI rendering and behavior. `[REQ-272]` Persist relevant parts (e.g., theme, selected mode) in local storage and potentially sync to the backend user profile.  
* `[REQ-273]` **Form State:** Manage form state using `react-hook-form`.  
* `[REQ-274]` **Asset-Class State:** Complex state specific to an asset class module might warrant its own Context or Zustand store if shared across multiple components within that feature.  
* `[REQ-275]` **Settings State:** Manage user-specific application settings via Context or Zustand, persisting changes to the backend.

#### 5.1.4 Frontend Validation

* `[REQ-276]` Implement client-side input validation using `Zod` schemas integrated with `react-hook-form` to provide immediate feedback to the user and prevent submission of invalid data. `[REQ-277]` Ensure type checking for all form fields. `[REQ-278]` Validation rules might differ slightly based on mode if certain fields are hidden/required only in one mode.

#### 5.1.5 Logging

* `[REQ-279]` Implement comprehensive console logging during development to trace UI changes, state updates, API requests/responses, and calculation steps. `[REQ-280]` Ensure logs can be easily enabled/disabled for production builds.

### 5.2 Backend Architecture

#### 5.2.1 API Design

* `[REQ-281]` **Framework:** Node.js with Express.js and TypeScript.  
* `[REQ-282]` **API Style:** RESTful API following standard conventions (HTTP verbs, status codes, resource-based URLs).  
* `[REQ-283]` **Authentication:** Implement secure session-based authentication managed via Passport.js. (See 5.4 for detailed architecture).  
* `[REQ-284]` **Validation:** Use `Zod` for validating incoming request bodies, query parameters, and route parameters against defined schemas on the server-side.  
* `[REQ-285]` **Error Handling:** Implement centralized error handling middleware to catch errors, log them appropriately, and return standardized JSON error responses to the client (avoid leaking sensitive stack traces).  
* `[REQ-286]` **Authorization:** Endpoints related to switching modes or accessing mode-specific features must include authorization checks against the user's subscription plan permissions. `[REQ-287]` Data access endpoints must enforce ownership/tenancy rules. `[REQ-288]` Admin-only endpoints must check for administrator role/permissions.  
* `[REQ-289]` **Subscription Info Endpoint:** An endpoint is needed to provide the frontend with the current user's subscription details, including allowed modes and asset limits.  
* **Configuration Endpoints:**  
  * `[REQ-290]` Endpoint required for frontend to retrieve current login splash screen configuration (text, image URL).  
  * `[REQ-291]` Endpoints required for administrator to manage login splash screen text and image (upload/set URL).

#### 5.2.2 Data Storage

* `[REQ-292]` **Database:** PostgreSQL (latest stable version).  
* `[REQ-293]` **ORM/Query Builder:** Drizzle ORM for type-safe database interactions and schema definition.  
* `[REQ-294]` **Schema Management:** Define the database schema using Drizzle schema files. `[REQ-295]` The schema must enforce referential integrity using foreign key constraints where appropriate.  
* `[REQ-296]` **Data Access Layer:** Implement a clear data access layer (repositories or services) that encapsulates database interactions using the Drizzle client. `[REQ-297]` Queries retrieving assets for calculations (dashboard, projections) must filter out hidden/disabled assets based on LIFO rule and subscription limits.  
* `[REQ-298]` **Migrations:** Use Drizzle Kit for generating and managing database schema migrations.  
* `[REQ-299]` **Transaction Management:** Critical operations involving multiple database writes (e.g., adding complex assets with related data, processing financial transactions affecting multiple tables) **must** be wrapped in database transactions to ensure atomicity (all changes succeed or fail together).  
* `[REQ-300]` **In-Memory Option (Development):** Optionally provide an in-memory storage implementation (conforming to the data access layer interface) for simplified local development and testing, separate from the primary PostgreSQL implementation.  
* `[REQ-301]` **User Preference:** Store the user's preferred mode (Basic/Advanced) in the user profile table (if choice is allowed by subscription).  
* `[REQ-302]` **Admin Defaults & Settings:** Ensure administrator-configurable defaults (growth rates, inflation, tax parameters, etc.) and settings are stored efficiently and are easily queryable by the backend logic. `[REQ-303]` Tax parameters need to be structured per Country and Holding Type. `[REQ-304]` **Database needs fields/tables to store administrator-configured settings, including login splash screen text and image reference/URL.**  
* `[REQ-305]` **Subscription Plan Schema:** The table defining subscription plans must include fields indicating allowed modes (e.g., 'basic\_only', 'advanced\_only', 'both') and limits (asset counts per class, etc.).  
* `[REQ-306]` **User Subscription Record:** The table linking users to their active subscription plan needs to be readily accessible for authorization checks.  
* `[REQ-307]` **Asset Visibility Status:** Asset tables need a mechanism to track visibility status based on subscription limits (e.g., an `is_hidden` boolean flag, potentially combined with creation timestamp for LIFO logic).  
* `[REQ-308]` **Image Storage:** Need strategy for storing administrator-uploaded images (e.g., storing URLs pointing to cloud storage in the database).

#### 5.2.3 Security Features

* `[REQ-309]` **Authentication:** Securely hash and salt passwords (e.g., using `bcrypt`). Implement robust authentication logic via Passport.js. (See 5.4).  
* `[REQ-310]` **Session Management:** Use secure, HTTP-only cookies for session tokens. `[REQ-311]` Implement CSRF (Cross-Site Request Forgery) protection (e.g., using `csurf` middleware or double-submit cookie pattern). `[REQ-312]` Set appropriate cookie flags (Secure, SameSite). (See 5.4).  
* `[REQ-313]` **Authorization:** Implement middleware to check user permissions before allowing access to specific routes or data. `[REQ-314]` Ensure users can only access their own data (tenant isolation). `[REQ-315]` Check subscription permissions for feature access. `[REQ-316]` Implement administrator role checks.  
* `[REQ-317]` **Input Validation:** Enforce strict server-side validation on all incoming data using Zod schemas, including validation for image uploads (file type, size limits).  
* `[REQ-318]` **Error Handling:** Return generic error messages in production to avoid revealing implementation details. Log detailed errors server-side.  
* `[REQ-319]` **Database Encryption:** Sensitive user data stored in the database (e.g., API keys entered by the admin, potentially certain PII if collected) should be encrypted at rest. `[REQ-320]` Evaluate PostgreSQL encryption options or application-level encryption.  
* `[REQ-321]` **Rate Limiting & Security Headers:** Implement rate limiting on sensitive endpoints (login, registration, image uploads) and set appropriate security headers (e.g., `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`).

### 5.3 Integration Requirements

#### 5.3.1 External Services API Integration

* `[REQ-322]` **Firebase Authentication:** Integrate with Firebase SDK for Google OAuth 2.0 sign-in flow. Backend uses Firebase Admin SDK for token verification.  
* **Stock Price API:**  
  * `[REQ-323]` Integrate with a free or freemium stock price API (e.g., Alpha Vantage, Financial Modeling Prep \- research required for suitability and terms).  
  * `[REQ-324]` API key management handled by the Administrator.  
  * `[REQ-325]` Provide stubbed/mocked responses if the API key is not configured or for development/testing.  
  * `[REQ-326]` Access controlled by user subscription level.  
* **Property Valuation API (Australia):**  
  * `[REQ-327]` Integrate with the Domain API (requires registration/key).  
  * `[REQ-328]` API key management handled by the Administrator.  
  * `[REQ-329]` Provide stubbed/mocked responses if the API key is not configured.  
  * `[REQ-330]` Access controlled by user subscription level.  
* **Address Validation/Geocoding API:**  
  * `[REQ-331]` Integrate with a service like HERE API, Mapbox, or OpenStreetMap Nominatim (check terms) for address validation and potentially retrieving coordinates for map display.  
  * `[REQ-332]` API key management handled by the Administrator.  
  * `[REQ-333]` Provide stubbed/mocked responses if the API key is not configured.  
* **OpenAI API (Optional):**  
  * `[REQ-334]` Integrate with OpenAI API for generating financial insights based on user data (requires careful prompt engineering and clear indication to the user that this is AI-generated). Feature scope needs further definition.  
  * `[REQ-335]` API key management handled by the Administrator.  
  * `[REQ-336]` Access controlled by user subscription level and user toggle (3.4.1).  
  * `[REQ-337]` Provide stubbed/mocked responses if the API key is not configured.  
* `[REQ-338]` **Payment Gateway:** Integrate with a payment provider (e.g., Stripe, Braintree) for handling subscription payments.  
* `[REQ-339]` **Cloud Storage (for Images):** Integrate with a cloud storage provider (e.g., AWS S3, Google Cloud Storage, Azure Blob Storage) for hosting administrator-uploaded images like the login splash screen image.

#### 5.3.2 Internal Integration Points

* `[REQ-340]` **Dashboard Integration:** All asset class modules must provide aggregated data (balances, values, income, expenses) for *visible* assets to the backend service responsible for compiling dashboard summaries.  
* `[REQ-341]` **Projection System:** The projection engine must be able to query data from all relevant *visible* asset class modules based on user selections and apply configured growth rates, contributions, expenses, and tax rules.  
* `[REQ-342]` **Cashflow System:** Income (salary, rent, dividends, interest) and expenses (living expenses, property expenses, loan repayments) from various modules related to *visible* assets must feed into the cashflow calculation service.  
* `[REQ-343]` **Activity Logging:** Backend services responsible for creating, updating, or deleting data must trigger events or directly write entries to the activity log module. `[REQ-344]` Hiding/unhiding assets due to subscription changes should also be logged. `[REQ-345]` Administrator changes to configuration (like splash screen) should be logged.

### 5.4 Authentication Architecture

#### 5.4.1 Overview

`[REQ-346]` The authentication system utilizes a server-side session approach managed by `express-session` and `Passport.js` on the Express.js backend. `[REQ-347]` It supports both traditional email/password login and social login via Google, leveraging Firebase Authentication for the Google OAuth flow and backend token verification.

#### 5.4.2 Core Components

* `[REQ-348]` **React Frontend:** Handles user interface elements (forms, buttons) and interacts with Firebase Auth SDK for Google Sign-In.  
* `[REQ-349]` **Express.js Backend API:** Manages authentication logic, session lifecycle, user data persistence, and communication with Firebase Admin SDK.  
* `[REQ-350]` **PostgreSQL Database:** Stores user profiles, securely hashed passwords (using `bcrypt`), Firebase UIDs for linked Google accounts, and session data (via `connect-pg-simple` or similar).  
* `[REQ-351]` **Passport.js:** Middleware orchestrating authentication strategies (`passport-local` for email/password, custom logic for Firebase token verification).  
* `[REQ-352]` **`express-session`:** Middleware managing session creation, persistence (via store), and cookie handling.  
* `[REQ-353]` **Firebase Auth SDK (Client):** Used on the frontend to initiate Google Sign-In and retrieve ID tokens.  
* `[REQ-354]` **Firebase Admin SDK (Server):** Used on the backend to verify Firebase ID tokens received from the client.  
* `[REQ-355]` **`bcrypt`:** Library for hashing and comparing passwords securely.  
* `[REQ-356]` **CSRF Protection Middleware:** (e.g., `csurf`) To prevent cross-site request forgery attacks.

#### 5.4.3 Email/Password Flow

* `[REQ-357]` **Registration:** Frontend sends email/password \-\> Backend validates, checks for existing user, hashes password with `bcrypt`, stores user record in DB.  
* `[REQ-358]` **Login:** Frontend sends email/password \-\> Backend uses `passport-local` strategy \-\> Strategy retrieves user, compares hash with `bcrypt.compare` \-\> On success, `req.logIn()` establishes session \-\> `express-session` creates session ID cookie and saves session data server-side.

#### 5.4.4 Google (Firebase) Login Flow

* `[REQ-359]` **Initiation:** Frontend uses Firebase Auth SDK (`signInWithPopup` or `signInWithRedirect`) for Google login.  
* `[REQ-360]` **Token Retrieval:** Frontend receives Firebase ID Token upon successful Firebase authentication.  
* `[REQ-361]` **Backend Verification:** Frontend sends ID Token to backend endpoint \-\> Backend uses Firebase Admin SDK (`verifyIdToken`) to validate token \-\> Extracts user info (Firebase UID, email).  
* `[REQ-362]` **User Linking/Creation:** Backend finds user by Firebase UID or email; creates new user if not found, storing Firebase UID.  
* `[REQ-363]` **Session Establishment:** Backend calls `req.logIn()` to establish server-side session.

#### 5.4.5 Session Management

* `[REQ-364]` **Cookie:** `express-session` sends a secure, HttpOnly, SameSite session ID cookie to the client upon login.  
* `[REQ-365]` **Storage:** Session data (linking session ID to user ID) is stored server-side in PostgreSQL (using `connect-pg-simple`) or Redis. Avoid MemoryStore in production.  
* `[REQ-366]` **Authenticated Requests:** Frontend automatically includes the session cookie. Backend middleware (`express-session`) retrieves session data. Protected routes use `req.isAuthenticated()` or check `req.user`/`req.session` to verify authentication.  
* `[REQ-367]` **CSRF Protection:** Middleware generates and validates CSRF tokens for requests modifying state when using session cookies.

#### 5.4.6 Logout Flow

* `[REQ-368]` Frontend requests logout endpoint \-\> Backend calls `req.logOut()` (Passport), `req.session.destroy()` (`express-session`) \-\> Session data removed from store, session cookie cleared.

#### 5.4.7 Security Best Practices Summary

* `[REQ-369]` Password hashing (`bcrypt`).  
* `[REQ-370]` HTTPS enforced.  
* `[REQ-371]` Secure cookie attributes (HttpOnly, Secure, SameSite).  
* `[REQ-372]` CSRF protection implemented.  
* `[REQ-373]` Server-side verification of social login tokens (Firebase Admin SDK).  
* `[REQ-374]` Input validation (Zod).  
* `[REQ-375]` Rate limiting on authentication endpoints.  
* `[REQ-376]` Use of persistent session store.

---

## 6\. Testing and Demo Requirements

### 6.1 Demo User

* `[REQ-377]` **Creation:** Implement functionality (e.g., a specific backend endpoint or seed script) to create a pre-populated demo user account.  
* `[REQ-378]` **Test Data:** The demo account must contain a diverse range of sample assets across different classes and holding types, including properties, shares, cash, superannuation, and sample income/expenses, to effectively showcase application features. Some data should allow testing asset limits.  
* `[REQ-379]` **Subscription Scenarios:** Consider having multiple demo users or configurations representing different subscription tiers (e.g., Basic Only, Both Modes, different asset limits) to test restrictions and toggling.  
* `[REQ-380]` **Onboarding:** Ensure the specific demo user onboarding flow (2.2.1.9) is triggered upon first login.

### 6.2 Administrator Access (Development)

* `[REQ-381]` **Login Button:** During development and testing phases, include a clearly marked "Administrator Login" button or mechanism on the login screen that bypasses standard user authentication and grants access to the administrator console/UI. `[REQ-382]` This must be disabled or removed in production builds.  
* `[REQ-383]` **Demo Button:** Similarly, provide a "Demo Login" button to easily access the pre-configured demo user account(s). `[REQ-384]` This must be disabled or removed in production builds.

### 6.3 Unit & Integration Testing

* `[REQ-385]` **Calculation Test Suite:** Develop a comprehensive suite of unit tests specifically targeting the financial calculation logic within each asset class module, the projection engine, and tax calculations (using configured parameters). Focus on logic coverage, boundary conditions, and edge cases.  
* `[REQ-386]` **Test Report Generation:** Implement functionality, accessible via the **Settings page (or an admin panel)**, to run this calculation test suite and generate a report (e.g., PDF or HTML) summarizing the test cases executed and their pass/fail status. This serves as a verification tool for calculation accuracy.  
* `[REQ-387]` **Component & API Testing:** Implement standard unit and integration tests for frontend components and backend API endpoints covering core functionality, validation, and authorization. Includes testing the login splash screen display and configuration endpoints. Authentication flows must be thoroughly tested.  
* `[REQ-388]` **Subscription/Mode Coverage:** Test cases must cover scenarios where mode access and asset visibility are restricted by subscription, including UI rendering, API authorization, LIFO hiding logic, calculation exclusion, and graceful switching on plan changes.

---

## 7\. Deployment Considerations *(Placeholder)*

*(This section would typically cover hosting, CI/CD pipeline, database management, monitoring, image hosting/CDN strategy, etc. \- To be detailed later)*

---

## 8\. Future Considerations *(Placeholder)*

*(Ideas for V2+, e.g., more asset classes, advanced reporting, budgeting tools, multi-currency support, more detailed tax handling, more admin branding options \- To be detailed later)*

---

## 9\. Appendices

### 9.1 Glossary

*(Define key financial terms used within the application and document, e.g., Net Worth, Asset Allocation, Capital Gains, Offset Account, Vesting Schedule, Assessable Income, Concessional Contribution, LIFO, etc.)*

### 9.2 Wireframes and Mockups

*(Link to or embed detailed wireframes and mockups for key screens)*

### 9.3 API Specifications

*(Link to detailed API documentation, e.g., OpenAPI/Swagger specification)*

### 9.4 Appendix: Australian Tax Rule Specifications (Illustrative)

**Disclaimer:** The following rules, rates, and thresholds are **illustrative examples only** and **must not** be used directly in the application without verification against current, official Australian Taxation Office (ATO) information. The application **must** use the tax parameters configured by the Administrator in Section 2.3.1. The structure below indicates the *types* of parameters the administrator needs to configure for Australian holding types.

#### 9.4.1 Personal Holding Type (Illustrative \- Australia)

* `[REQ-389]` **Financial Year:** Administrator must configure the start/end dates (e.g., 1 July \- 30 June).  
* `[REQ-390]` **Assessable Income Calculation:** Logic required to sum relevant income sources (salary, investment income, net capital gains) less allowable deductions (related to income generation, potentially simplified categories).  
* `[REQ-391]` **Income Tax Brackets (Resident):** Administrator must configure multiple tiers, each specifying: Lower Income Threshold ($); Upper Income Threshold ($); Base Tax Amount ($); Marginal Tax Rate (%).  
* `[REQ-392]` **Medicare Levy:** Administrator must configure: Standard Levy Rate (%); Lower Income Threshold ($) (Single & Family); Upper Income Threshold ($) (Single & Family).  
* `[REQ-393]` **Medicare Levy Surcharge:** Administrator must configure: Applicability; Income Thresholds ($) (Single & Family); Surcharge Rates (%).  
* `[REQ-394]` **Tax Offsets:** Administrator must be able to configure rules and amounts for relevant offsets (e.g., LITO, LMITO if applicable): Offset Name; Income Thresholds ($); Maximum Offset Amount ($); Phase-in/Phase-out Rates (%).  
* `[REQ-395]` **Dividend Imputation:** Administrator must configure: Applicability; Franking Credit Gross-up logic; Company Tax Rate (%); Handling of franking credits as a tax offset.

#### 9.4.2 Superannuation Holding Type (Illustrative \- Australia)

* `[REQ-396]` **Accumulation Phase (Earnings Tax):** Administrator must configure: Standard Tax Rate on Earnings (%).  
* `[REQ-397]` **Concessional Contributions Tax:** Administrator must configure: Standard Tax Rate (%); Division 293 Income Threshold ($); Division 293 Additional Tax Rate (%).  
* `[REQ-398]` **Non-Concessional Contributions:** Generally 0% tax on entry if within cap.  
* `[REQ-399]` **Contribution Caps:** Administrator must configure: Annual Concessional Cap ($); Annual Non-Concessional Cap ($); Total Super Balance (TSB) Threshold ($); Bring-forward rule period.  
* `[REQ-400]` **Pension Phase:** Administrator must configure: Earnings Tax Rate (%); Withdrawal Tax Rate (%); Transfer Balance Cap (TBC) ($).

#### 9.4.3 Capital Gains Tax (CGT) (Illustrative \- Australia)

* `[REQ-401]` **Calculation Logic:** Required logic for: Capital Gain \= Capital Proceeds \- Cost Base. Capital Loss \= Cost Base \- Capital Proceeds. Netting gains and losses. Carrying forward net losses.  
* `[REQ-402]` **CGT Discount:** Administrator must configure: Holding Period Threshold; Discount Percentage (%) for 'Personal'; Discount Percentage (%) for 'Superannuation (Accumulation)'.  
* `[REQ-403]` **Integration with Income Tax:** Logic required to add the discounted Net Capital Gain to the assessable income for the 'Personal' holding type before applying income tax brackets.  
* `[REQ-404]` **Superannuation CGT:** Apply relevant tax rate based on administrator configuration. Generally 0% in pension phase.  
* `[REQ-405]` **Exemptions:** Logic may need to account for exemptions (e.g., Main Residence Exemption for Personal property \- potentially simplified or requires user input).

