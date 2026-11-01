# Capise — Personal Finance App
### Comprehensive Feature & Architecture Document

---

## Table of Contents
1. [App Overview](#1-app-overview)
2. [Tech Stack](#2-tech-stack)
3. [Authentication & User Management](#3-authentication--user-management)
4. [Dashboard](#4-dashboard)
5. [Accounts](#5-accounts)
6. [Transactions](#6-transactions)
7. [Categories](#7-categories)
8. [Budgets](#8-budgets)
9. [Bills & Recurring Transactions](#9-bills--recurring-transactions)
10. [Goals (Savings Goals)](#10-goals-savings-goals)
11. [Investments](#11-investments)
12. [Loans & EMI Tracker](#12-loans--emi-tracker)
13. [People (Lending & Borrowing)](#13-people-lending--borrowing)
14. [Net Worth Tracker](#14-net-worth-tracker)
15. [Tax Planner](#15-tax-planner)
16. [Reports & Analytics](#16-reports--analytics)
17. [Calendar View](#17-calendar-view)
18. [Intelligence & AI Analytics Hub](#18-intelligence--ai-analytics-hub)
19. [Proactive AI Engine](#19-proactive-ai-engine)
20. [AI Copilot (Chat Assistant)](#20-ai-copilot-chat-assistant)
21. [CSV Import Engine](#21-csv-import-engine)
22. [Automated Cron Jobs (Background Engine)](#22-automated-cron-jobs-background-engine)
23. [Data Models Reference](#23-data-models-reference)
24. [API Reference Summary](#24-api-reference-summary)
25. [Architecture & Infrastructure](#25-architecture--infrastructure)
26. [Enterprise Error Handling & Offline Architecture](#26-enterprise-error-handling--offline-architecture)
27. [Custom Branded Motion Spinner System](#27-custom-branded-motion-spinner-system)
28. [Pre-Deployment Verification & System Diagnostics](#28-pre-deployment-verification--system-diagnostics)
29. [Theme Engine (Futuristic Dual Dark & Light Mode)](#29-theme-engine-futuristic-dual-dark--light-mode)

---

## 1. App Overview

**Capise** is a full-stack, AI-powered personal finance management platform that gives users a complete, real-time picture of their financial life. It goes beyond simple expense tracking — it actively monitors spending patterns, forecasts future financial states, provides proactive nudges, and uses Google Gemini AI to act as a conversational financial advisor.

### Key Value Propositions

| Pillar | Description |
|--------|-------------|
| **Complete Financial Picture** | Aggregates accounts, transactions, investments, loans, and taxes in one place |
| **Proactive Intelligence** | Background AI engine monitors finances and surfaces actionable nudges without user prompting |
| **AI-Powered Copilot** | Gemini-powered chat assistant that can answer questions and execute financial actions |
| **Autonomous Automation** | Background cron jobs auto-post recurring bills, debit EMIs, trigger SIPs, and compute net worth |
| **Real-Time Analytics** | Spending velocity, health score, cashflow forecasting, and monthly AI-generated reviews |

---

## 2. Tech Stack

### Frontend (Client)
| Technology | Purpose |
|------------|---------|
| **React 19** | Core UI framework with Suspense-based lazy loading |
| **Redux Toolkit** | Global state management (auth, transactions, intelligence, proactive, etc.) |
| **React Router v6** | Client-side routing with protected routes |
| **Tailwind CSS** | Utility-first styling |
| **MUI X Charts** | BarChart, LineChart, PieChart for data visualization |
| **Lucide React** | Icon system |
| **React Hook Form + Zod** | Form management and schema validation |
| **@react-oauth/google** | Google One Tap / Sign-in With Google button |
| **date-fns** | Date utilities for time-range calculations |
| **Vite** | Build tooling and dev server |

### Backend (Server)
| Technology | Purpose |
|------------|---------|
| **Node.js + Express 5** | REST API framework |
| **MongoDB + Mongoose 9** | NoSQL database with compound indexes for fast queries |
| **JWT + HTTP-only Cookies** | Session management and authentication |
| **bcryptjs** | Password hashing |
| **google-auth-library** | Google OAuth ID Token verification |
| **@google/genai (Gemini)** | AI Copilot, What-If simulations, Monthly Reviews |
| **Nodemailer + Brevo SMTP** | Transactional email (verification, password reset) |
| **node-cron** | Scheduled background jobs |
| **compression (Gzip/Brotli)** | Response compression for high throughput |

---

## 3. Authentication & User Management

### 3.1 Registration (Email & Password)
- Users register with their **name**, **email**, and **password**.
- On successful registration, a **24-hour email verification token** is generated and a verification email is sent via Brevo SMTP.
- The user is immediately logged in (JWT issued) while email verification is pending.
- Passwords are hashed with **bcrypt (10 rounds)** before storage.

### 3.2 Login (Email & Password)
- Standard email + password login.
- If the account was created with Google Sign-In (no password set), a descriptive error message is shown, guiding the user to use Google login.
- On success, a JWT is issued via **HTTP-only cookie** and also returned in the response body.

### 3.3 Google OAuth 2.0 (Sign In With Google)
- Uses the **`@react-oauth/google`** package on the client to render Google's One Tap / Sign-in button.
- The client receives a **Google ID Token (credential)** on success.
- The credential is sent to `POST /api/auth/google` on the server.
- The server verifies the token using `google-auth-library`'s `OAuth2Client.verifyIdToken()`.
- **New users**: A new account is created automatically with `authProvider: 'google'`, no password required. Email is auto-verified (trusted by Google).
- **Existing users (same email)**: The Google ID is linked to the existing account, and email is marked as verified.

### 3.4 Email Verification
- A unique, SHA-256 hashed token is stored in the DB with a 24-hour expiry.
- The user clicks the verification link (`/verify-email/:token`), which calls `POST /api/auth/verify-email/:token`.
- On success, `isEmailVerified` is set to `true` and the temporary token is cleared.
- Users can **resend** the verification email via `POST /api/auth/resend-verification`.

### 3.5 Forgot Password
- User submits their email to `POST /api/auth/forgot-password`.
- A **generic response** is always returned (prevents email enumeration attacks).
- A SHA-256 hashed reset token with a **1-hour expiry** is stored.
- A password reset link is emailed to the user.
- Google-only accounts are blocked from this flow with an appropriate message.

### 3.6 Reset Password
- User visits `/reset-password/:token` and submits a new password.
- The server verifies the token hash and expiry.
- Password is updated, reset token is cleared, and the user is automatically logged in.

### 3.7 Profile Management
- Users can update their **name** and **profile picture** via `PUT /api/auth/profile`.
- Password can be changed through the same endpoint.
- Google users have their profile photo automatically pulled from their Google account.

### 3.8 User Model Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Display name |
| `email` | String | Unique, lowercase |
| `password` | String | Optional (not required for Google users) |
| `googleId` | String | Google subject ID for OAuth |
| `authProvider` | Enum | `local` or `google` |
| `profilePic` | String | Avatar URL |
| `isEmailVerified` | Boolean | Email verification status |
| `emailVerificationToken` | String | Hashed verification token |
| `emailVerificationExpires` | Date | Token expiry (24 hours) |
| `resetPasswordToken` | String | Hashed reset token |
| `resetPasswordExpires` | Date | Reset token expiry (1 hour) |

### 3.9 Silent Session & Token Expiration Auto-Redirect
- When a user's JWT authentication token or session cookie expires, protected API requests return `401 Unauthorized`.
- **Zero-Error UX**: Instead of throwing noisy error popups or error alerts, the client Axios interceptor (`Client/src/services/api.js`) catches the 401 response and suppresses both global error toasts and console alerts.
- **Session Cleanup**: The client immediately removes cached user data (`localStorage.removeItem('user')`) and dispatches the `capise:auth-expired` custom DOM event.
- **Redux Sync**: The root Redux store dispatches `sessionExpired()`, resetting authentication state.
- **Seamless Navigation**: The browser automatically performs `window.location.replace('/login')` for any protected page, delivering a clean transition directly to the login screen without trapped browser history.

---

## 4. Dashboard

The Dashboard is the **mission control center** — a high-performance, single-API call that runs all database queries in parallel via `Promise.all` with `.lean()` POJOs.

> **Performance Note:** The dashboard aggregates 12 different data sources simultaneously, reducing server response time from ~250ms (sequential) to ~15ms (parallel).

### 4.1 Snapshot Metrics (Point-in-Time)
Real-time figures representing the user's current financial state:

| Metric | Calculation |
|--------|-------------|
| **Net Worth** | Cash + Investments + Owed-to-Me − Loans − I-Owe |
| **Cash Available** | Sum of all account balances |
| **Total Debt** | Sum of remaining principal across all active loans |
| **Total Investments** | Sum of current value of all active investments |
| **Total Taxes** | Total tax liability from current financial year's TaxRecord |
| **Owed to Me** | Unsettled "lent" lending records (outstanding balance) |
| **I Owe** | Unsettled "borrowed" lending records (outstanding balance) |

### 4.2 Period Flow Metrics
Computed for the selected time range (This Week / This Month / Last Month / This Year / All Time):

- **Period Income** — Total income transactions in range
- **Period Expense** — Total expense transactions in range
- **Savings Rate** — `(Income - Expense) / Income × 100`
- **Period-over-Period Comparison** — % change in income, expenses, and savings rate vs. the equivalent prior period

### 4.3 Spending Velocity
Predictive analytics on spending pace:

| Field | Description |
|-------|-------------|
| `dailyRate` | Average daily spending so far in the period |
| `projectedTotal` | Projected month-end expense at current pace |
| `daysElapsed` / `daysRemaining` | Period progress |
| `pctOfPeriodElapsed` | % of the month that has passed |

### 4.4 Charts & Visualizations
Capise features a comprehensive, high-density visualization suite built on top of **MUI X Charts**:
- **Cash Flow Chart (`CashFlowChart.jsx`)**: Daily income vs. expense bars with net margin indicator.
- **Category Donut Chart (`CategoryDonutChart.jsx`)**: Hierarchical categorical expense distribution with interactive hover breakdown and dynamic percentage shares.
- **Net Worth Trend Chart (`NetWorthTrendChart.jsx`)**: 6-month historical net worth trajectory with smooth spline curves and asset/liability spread.
- **Monthly Cash Flow Comparison Chart (`MonthlyCashFlowComparisonChart.jsx`)**: Comparative month-over-month bars tracking income velocity vs. expense growth.
- **Spending Burn Rate Chart (`SpendingBurnChart.jsx`)**: Daily cumulative expenditure plotted against the ideal monthly safe-budget pacing line to immediately spot mid-month overspending.
- **Account Breakdown**: Visual distribution of liquid balances across top accounts.

### 4.5 Visual Polish, Contrast & Layout Density
- **Whitespace Optimization**: Card margins, inner paddings, and grid gutters have been compressed to eliminate dead vertical white space and maximize data density across widescreen and mobile viewports.
- **High-Contrast Typography & Theming**:
  - **Financial Health & Resilience Numbers**: Explicitly colored with dynamic high-contrast status tokens (Emerald `#10b981` for optimal, Amber `#f59e0b` for moderate, Rose `#f43f5e` for caution), completely eliminating low-contrast white-on-white text visibility bugs.
  - **Budget Names & Headroom**: Headroom percentages and budget titles styled with crisp high-contrast foreground classes ensuring 100% legibility in both light and dark modes.
- **Edge-Case Resilience**:
  - **Zero-Data State**: Graceful fallbacks and contextual empty illustrations when transactions or budgets are empty.
  - **High-Volume / Large Balances**: Automatic numerical formatting with Indian numbering system conventions (Lakhs `₹L`, Crores `₹Cr`) prevents layout overflowing.

### 4.6 Widgets
- **Upcoming Bills & EMIs** — Next 6 items due within 30 days (from recurring rules + loan EMIs)
- **Active Budgets & Headroom** — Current spend vs. limit with live headroom indicator for each active budget
- **Active Goals** — Top 3 in-progress goals with progress % and monthly target pacing
- **Recent Transactions** — Last 6 transactions with category, account, and real-time ledger link

### 4.7 Dashboard Time Filter
Users can filter the dashboard period using buttons: `This Week`, `This Month`, `Last Month`, `This Year`, `All Time`. All period metrics and charts recalculate instantly.

---

## 5. Accounts

The Accounts module tracks every financial account the user holds.

### 5.1 Supported Account Types
| Type | Notes |
|------|-------|
| **Bank** | Savings/current bank accounts |
| **Cash** | Physical cash wallet |
| **Credit Card** | With credit limit, billing cycle, payment due day |
| **UPI** | UPI-linked wallets or apps |
| **FD (Fixed Deposit)** | Fixed deposit accounts |
| **Other** | Any other financial account |

### 5.2 Account Fields
- **Name**, **Type**, **Opening Balance**, **Current Balance**
- **Currency** (default: INR)
- **Notes**
- **Credit Card specific**: Credit Limit, Issuer, Last 4 Digits, Billing Cycle Day, Payment Due Day
- **isArchived** — Archived accounts are hidden from active views but retained for history

### 5.3 Balance Management
Account balances are dynamically updated when transactions, lending repayments, goal contributions, or loan payments are recorded.

### 5.4 Performance
Indexed on `{ user, isArchived }` and `{ user, type }` for fast filtered queries.

---

## 6. Transactions

The transaction system is the financial ledger — the core data backbone of Capise.

### 6.1 Transaction Types
| Type | Description |
|------|-------------|
| **Income** | Money received (salary, freelance, dividends, etc.) |
| **Expense** | Money spent (shopping, food, bills, etc.) |
| **Transfer** | Money moved between two accounts |

### 6.2 Transaction Fields

| Field | Description |
|-------|-------------|
| `type` | Income / Expense / Transfer |
| `amount` | Positive decimal (min 0.01) |
| `date` | Transaction date |
| `account` | Source account (required) |
| `toAccount` | Destination account (Transfers only) |
| `category` | Linked category (required for user-created Income/Expense) |
| `subcategory` | Optional sub-category |
| `merchant` | Merchant / payee name |
| `notes` | Free-form notes |
| `tags` | Array of string tags |
| `attachmentUrl` | Receipt/invoice image URL |
| `lendingRef` | ObjectId reference to linked Lending record (if originating from People module) |
| `isSystemGenerated` | Boolean flag indicating whether the transaction was created automatically |

### 6.3 MUI Table & Data Presentation
The transactions view is powered by a high-performance **MUI Table**:
- **Default Chronological Ordering**: Transactions are sorted descending by creation time (`createdAt: -1` and `date: -1`) by default, ensuring recently recorded actions appear at the top immediately.
- **Interactive Multi-Column Sorting**: Users can sort by any column header (Date, Merchant, Category, Account, Amount, Type) in ascending or descending order with single-click controls.
- **Data Grouping**: Built-in capability to group transactions on the client by Date (e.g., Today, Yesterday, This Month), Category, or Account.
- **High-Performance Pagination**: Server-side pagination with selectable page sizes and smooth row transitions.

### 6.4 Hierarchical Category & Subcategory Filtering
- **Dynamic Dependent Subcategory Filter**: The subcategory filter dropdown is conditionally active and filtered strictly by the chosen parent category. When no parent category is selected, subcategory filtering is disabled to prevent schema mismatches and invalid query combinations.
- **Rich Multi-Axis Filters**: Filter simultaneously by Date Range, Type (Income, Expense, Transfer), Account, Parent Category, Child Subcategory, and Merchant/Notes text search.

### 6.5 Real-Time Account Ledger Synchronization & Edge Cases
Financial integrity is strictly enforced across all transaction lifecycles:
- **Transaction Creation**:
  - `Expense`: Immediately decrements the linked account's `currentBalance`.
  - `Income`: Immediately increments the linked account's `currentBalance`.
  - `Transfer`: Atomically decrements the source account and increments the destination account.
- **Transaction Update (Amount / Account Changes)**:
  - If the amount is modified, the controller computes the exact delta (`delta = newAmount - oldAmount`) and adjusts the account balance accordingly without double-counting.
  - If the source account is changed, the old account is restored by the previous amount and the new account is debited/credited.
- **Transaction Deletion**:
  - Deleting an expense transaction restores the debited funds back into the source account.
  - Deleting an income transaction deducts the credited funds.
  - If a transaction linked to a People lending record is deleted, the corresponding lending record link is safely updated to maintain ledger consistency.

### 6.6 Database Indexes
- `{ user, date: -1, createdAt: -1 }` — Chronological listing with creation time tiebreaker
- `{ user, type, date: -1 }` — Type-filtered listing
- `{ user, category, date: -1 }` — Category analytics
- `{ user, account }` — Account-specific history

### 6.7 Budget Guardrails
After each expense transaction, the **Budget Guardrail Service** checks if any active budget for the transaction's category has been breached. If so, a warning is returned to the client.

---

## 7. Categories

Categories allow users to organize income and expenses into an intuitive, two-tier taxonomy.

### 7.1 Features & Hierarchy
- Users can create custom categories with a **name**, **color**, and **icon**.
- Two-tier nested taxonomy (**Parent Category $\rightarrow$ Subcategory**).
- Each transaction links to a primary category and optionally a subcategory.
- Instant search filter in the Categories view for quick lookups across names and subcategories.

### 7.2 77 Reserved System Categories & Auto-Seeding
Capise includes **77 reserved system categories** covering every standard financial aspect across 13 core domains:
- **Housing & Utilities**: Rent, Mortgage, Electricity, Water, Gas, Internet & Broadband, Maintenance.
- **Food & Dining**: Groceries, Dining Out, Food Delivery, Coffee & Snacks, Alcohol & Bars.
- **Transportation**: Fuel & Petrol, Public Transit, Cabs & Rideshare, Vehicle Maintenance, Parking, Tolls.
- **Healthcare & Medical**: Doctor Visits, Pharmacy & Medicines, Health Insurance, Dental & Eye Care.
- **Personal Care & Lifestyle**: Gym & Fitness, Salon & Spa, Clothing & Apparel.
- **Shopping & Retail**: Electronics, Home & Furniture, Books & Media.
- **Entertainment & Leisure**: Streaming Services, Movies & Events, Gaming, Hobbies.
- **Education & Learning**: Tuition & Courses, Books & Supplies.
- **Family & Pets**: Childcare, Pet Supplies & Vet.
- **Financial & Insurance**: Bank Fees & Charges, Insurance Premiums, Taxes & Legal.
- **Travel & Holidays**: Flights, Hotels & Stays, Sightseeing & Activities.
- **People & Lending**: Lent Money, Borrowed Money, Debt Repayment, Lending Collection.
- **Income**: Salary, Freelance & Consulting, Business Income, Dividends & Interest, Gifts & Grants, Rental Income.

### 7.3 Reserved Name Collision Guard
- To maintain system integrity and prevent collisions with automated modules, users **cannot create custom categories using any of the 77 reserved names** (case-insensitive and trimmed comparison).
- The API returns `400 Bad Request` with an explicit error message: `"Category name '<name>' is reserved by the system. Please choose a different custom name."`
- Client-side validation in `CategoryFormModal.jsx` alerts users before form submission.

### 7.4 System Category Deletion Protection
- All 77 default categories are permanent system assets tagged with `isDefault: true`.
- **API Guard**: Attempts to delete a default system category via `DELETE /api/categories/:id` are blocked with `403 Forbidden` (`"Default system categories cannot be deleted."`).
- **UI Guard**: The Categories dashboard renders a distinct `Default` badge for system categories and disables the delete action button.

### 7.5 Differential Seeder
- The server provides `ensureDefaultCategoriesForUser(userId)`.
- It executes automatically on new user registration and Google OAuth sign-in.
- It scans existing categories and seeds only missing default categories, ensuring 100% presence without duplicating user data.

---

## 8. Budgets

The Budget module enables spending limits per category with progress tracking.

### 8.1 Budget Configuration

| Field | Description |
|-------|-------------|
| `name` | Budget label |
| `category` | The spending category to track |
| `period` | `monthly`, `weekly`, `yearly`, or `custom` |
| `startDate` / `endDate` | For custom periods |
| `limit` | Maximum spending limit |
| `alertThreshold` | % of limit to trigger warning (default: 80%) |
| `rollover` | Carry unused budget forward to next period |
| `isActive` | Active/inactive toggle |

### 8.2 Budget Tracking
- Real-time spend is calculated by summing all expense transactions in the budget's period that match its category.
- The Dashboard shows spent vs. limit for each active budget.
- When a new transaction is saved, `checkBudgetGuardrails()` runs to detect breaches and near-misses.

---

## 9. Bills & Recurring Transactions

The Recurring module automates repeating financial events (subscriptions, rent, salaries, utilities, EMIs).

### 9.1 Recurring Rule Fields

| Field | Description |
|-------|-------------|
| `name` | Rule name (e.g., "Netflix Subscription", "Monthly Rent") |
| `type` | Income / Expense / Transfer |
| `amount` | Fixed amount per occurrence |
| `frequency` | `daily`, `weekly`, `monthly`, or `yearly` |
| `time` | Exact scheduled execution time in `HH:mm` format (e.g. `'09:00'`, `'14:30'`) |
| `nextRunDate` | When the rule next triggers (combines date and exact time) |
| `endDate` | Optional expiry date for the rule |
| `autoPost` | If `true` (default), transactions are automatically created by the cron daemon at the exact scheduled date and time. If `false`, user manually confirms. |
| `account` | Source account |
| `toAccount` | Destination account (Transfers) |
| `category` / `merchant` | Classification |

### 9.2 Exact-Time Auto-Posting Engine (Per-Minute Cron Daemon)
When `autoPost` is enabled, the **Per-Minute Recurring Execution Daemon** (`* * * * *`) checks for rules where `nextRunDate <= now`. At the exact scheduled date and time:
1. An atomic `Transaction` is created with notes tag `[Auto-posted at HH:mm]`.
2. The linked `Account` balance is updated atomically (`$inc: { currentBalance: ... }`).
3. The rule's `nextRunDate` is advanced to the next cycle (daily, weekly, monthly, yearly) **preserving the exact scheduled time (`HH:mm`)**.
4. If an `endDate` was configured and has been passed, the rule is automatically marked `isActive: false`.

### 9.3 Manual Fallback Override ("Pay Now")
For rules where `autoPost` is disabled, or as a manual override if the user wants to settle a bill early, each rule features an explicit **Pay Now** button (`POST /api/recurring/:id/pay`). Clicking this creates the transaction immediately, updates the account balance, and advances `nextRunDate` while preserving the configured execution time.

### 9.4 Dashboard & Zombie Subscription Clean-Up
- Upcoming recurring bills within the next 30 days are surfaced on the Dashboard as "Upcoming Bills & EMIs."
- The **Zombie Subscription & Price-Hike Detector** scans for unused subscriptions and price increases, offering 1-click pause and cancellation.

---

## 10. Goals (Savings Goals)

The Goals module lets users set and track financial savings targets.

### 10.1 Goal Fields

| Field | Description |
|-------|-------------|
| `name` | Goal name (e.g., "Emergency Fund", "Vacation") |
| `targetAmount` | Total amount to save |
| `currentAmount` | Amount saved so far |
| `deadline` | Optional target completion date |
| `icon` | Lucide icon name |
| `color` | Display color |
| `contributions` | Array of contribution records (amount, date, linked transaction) |
| `isCompleted` | Marks when goal is achieved |

### 10.2 Virtual Computations
- **`percentage`**: `min(100, (currentAmount / targetAmount) × 100)`
- **`remaining`**: `max(0, targetAmount - currentAmount)`

### 10.3 Contributions
Each contribution links to a real transaction, maintaining financial integrity and a full audit trail.

### 10.4 Dashboard Integration
Top 3 incomplete goals appear on the Dashboard with progress bars.

### 10.5 Proactive Integration
Goal monthly requirements feed into the **Safe-to-Spend** calculator — money needed for goals is treated as a committed expenditure, reducing discretionary daily spend.

---

## 11. Investments

A comprehensive investment portfolio tracker supporting 12 asset types.

### 11.1 Supported Investment Types
`Stocks` · `Mutual Fund` · `ETF` · `Fixed Deposit` · `PPF` · `EPF` · `NPS` · `Gold` · `Silver` · `Crypto` · `Bonds` · `Other`

### 11.2 Core Fields

| Field | Description |
|-------|-------------|
| `name` | Investment name |
| `type` | Asset class |
| `platform` | Broker/platform (e.g., Zerodha, Groww) |
| `investedAmount` | Total capital deployed |
| `currentValue` | Current market value |
| `buyPrice` / `quantity` | For unit-based assets (stocks, ETFs) |
| `purchaseDate` / `maturityDate` | Entry and maturity dates |
| `symbol` | AMFI scheme code or ticker for live sync |
| `valueHistory` | Array of `{ date, value }` for charting |

### 11.3 Virtual Computations
- **`profitLoss`**: `currentValue - investedAmount`
- **`returnPct`**: `(profitLoss / investedAmount) × 100`

### 11.4 SIP (Systematic Investment Plan) Automation
For mutual funds and recurring investments:

| Field | Description |
|-------|-------------|
| `isSip` | Enable SIP mode |
| `sipAmount` | Amount per SIP installment |
| `sipFrequency` | `monthly`, `weekly`, or `quarterly` |
| `sipDay` | Day of month/week to execute |
| `nextSipDate` | Next scheduled SIP date |
| `sipAccount` | Account to debit |

The **SIP Cron Job** runs nightly and automatically creates investment contribution records and linked debit transactions when a SIP is due.

### 11.5 Live Market Price Sync
When `autoSyncPrice: true` and a `symbol` is set, the **SIP Cron Job** also attempts to fetch the latest NAV/price and update `currentValue`, appending to `valueHistory`.

---

## 12. Loans & EMI Tracker

Track borrowings with full amortization, EMI auto-debit, and payment history.

### 12.1 Loan Types
`Home Loan` · `Car Loan` · `Personal Loan` · `Education Loan` · `Gold Loan` · `Business Loan` · `Other`

### 12.2 Loan Fields

| Field | Description |
|-------|-------------|
| `name` | Loan label |
| `lender` | Bank or person name |
| `principal` | Original loan amount |
| `interestRate` | Annual interest rate (%) |
| `tenureMonths` | Loan duration in months |
| `startDate` | Disbursement date |
| `emiAmount` | Calculated/stored EMI amount |
| `autoDebit` | If true, EMI is auto-debited by cron |
| `debitDay` | Day of month to auto-debit |
| `debitAccount` | Account to debit EMI from |
| `payments[]` | Payment history (principal, interest, date, linked transaction) |
| `isActive` | Active/closed status |

### 12.3 Virtual Computations
- **`paidPrincipal`**: Sum of principal components in payments
- **`paidInterest`**: Sum of interest components in payments
- **`remainingPrincipal`**: `max(0, principal - paidPrincipal)` — used for net worth liabilities

### 12.4 EMI Auto-Debit (Cron)
The **Loan EMI Cron Job** runs nightly. For loans with `autoDebit: true`, it checks `nextEmiDate`, creates a linked expense transaction, records the payment (with interest/principal split), and advances `nextEmiDate`.

### 12.5 Dashboard Integration
Upcoming EMIs within 30 days appear in the Dashboard's "Upcoming Bills & EMIs" widget. Total remaining loan principal contributes to the Net Worth "Total Debt" metric.

---

## 13. People (Lending & Borrowing)

Track money lent to or borrowed from individuals.

### 13.1 Lending Types
| Type | Meaning |
|------|---------|
| `lent` | I gave money to someone (they owe me) |
| `borrowed` | I received money from someone (I owe them) |

### 13.2 Lending Fields

| Field | Description |
|-------|-------------|
| `person` | Contact name |
| `type` | `lent` or `borrowed` |
| `amount` | Original principal |
| `dueDate` | Expected repayment date |
| `interestRate` | Optional annual interest rate |
| `repayments[]` | Array of partial/full repayments |
| `isSettled` | Marks when fully repaid |
| `account` | Source/destination account |
| `linkedTransaction` | ObjectId reference to the automatically created ledger transaction |

### 13.3 Automatic Ledger & Account Balance Synchronization
The People module is fully bi-directionally synchronized with the core transaction ledger and account balances:

1. **Automatic Transaction Creation**:
   - **Lending (`type: 'lent'`)**: When you record money lent to someone, the system automatically creates an **Expense** transaction with the default category `Lent Money`, linked to the chosen account. The account balance is immediately debited.
   - **Borrowing (`type: 'borrowed'`)**: When you record money borrowed from someone, the system automatically creates an **Income** transaction with the default category `Borrowed Money`, credited to the chosen account. The account balance is immediately increased.
   - The transaction's `lendingRef` and the lending record's `linkedTransaction` are cross-referenced for full auditability.

2. **Real-Time Amount & Account Update Sync**:
   - When modifying the amount in a lending record, the system automatically updates the linked transaction amount.
   - The exact difference (`delta = newAmount - oldAmount`) is computed and applied to the linked account's balance in real time.
   - If the account is switched, the previous account is refunded and the new account is adjusted.

3. **Settlement Automation**:
   - When a lending record is marked as settled:
     - For **Lent Money**: An **Income** transaction (`Lending Collection`) is generated, crediting the payback amount into the specified account.
     - For **Borrowed Money**: An **Expense** transaction (`Debt Repayment`) is generated, debiting the payoff from the specified account.
     - The lending record status updates to `isSettled: true`.

4. **Edge-Case & Deletion Reconciliation**:
   - **Deleting Linked Transactions**: If a user deletes the auto-generated transaction directly from the Transactions page, the system reverses the account balance change and clears the `linkedTransaction` reference, preventing orphaned records and balance discrepancies.
   - **Deleting Lending Record**: Deleting a lending record cleanly reconciles account balances without leaving ghost transactions.

### 13.4 Virtual Computations
- **`totalRepaid`**: Sum of all repayments
- **`outstanding`**: `max(0, amount - totalRepaid)`

### 13.5 Dashboard Integration
- **Owed to Me**: Sum of outstanding `lent` records
- **I Owe**: Sum of outstanding `borrowed` records
- Both feed into the Net Worth calculation.

---

## 14. Net Worth Tracker

### 14.1 Overview
Net Worth is computed in real-time on the Dashboard and historically snapshotted by a nightly cron job.

### 14.2 Snapshot Structure

| Component | Description |
|-----------|-------------|
| `cashAndBankBalances` | Sum of all Bank + Cash + UPI account balances |
| `investmentValue` | Sum of all active investment current values |
| `otherAssets` | FD and other account balances |
| `totalAssets` | `cash + investments + other` |
| `loanBalances` | Total remaining loan principal |
| `creditCardBalances` | Total outstanding credit card balances |
| `totalLiabilities` | `loans + credit cards` |
| `netWorth` | `totalAssets - totalLiabilities` |

### 14.3 Historical Snapshots
The **Net Worth Cron Job** runs every night and saves a `NetWorthSnapshot` document. The Dashboard displays a 6-month sparkline trend using these snapshots.

---

## 15. Tax Planner & Intelligence

A comprehensive India-centric tax planner and liability estimator supporting both **New Tax Regime (Section 115BAC)** and **Old Tax Regime**, with live comparison, automatic transaction synchronization, slab breakdowns, and advance tax scheduling.

### 15.1 Tax Record Fields

| Field | Description |
|-------|-------------|
| `financialYear` | Selected financial year (e.g., `"2025-2026"`, `"2024-2025"`, `"2023-2024"`) |
| `regime` | Selected regime: `'new'` (Default) or `'old'` |
| `salaryIncome` | Employment income (from Form 16) |
| `businessIncome` | Freelance / business profits |
| `capitalGains` | Equity, mutual fund, crypto, or real estate capital gains |
| `otherIncome` | Bank interest, dividends, rental income |
| `standardDeduction` | ₹75,000 for FY 2024-25 / FY 2025-26 under New Regime; ₹50,000 for FY 2023-24 and Old Regime |
| `deduction80C` | EPF, PPF, ELSS, Life Insurance (capped at ₹1,50,000 under Old Regime) |
| `deduction80D` | Health insurance / Mediclaim premiums (up to ₹1,00,000 under Old Regime) |
| `deduction80CCD` | National Pension Scheme (NPS Section 80CCD(1B) — up to ₹50,000 under Old Regime) |
| `homeLoanInterest` | Section 24(b) home loan interest for self-occupied property (up to ₹2,00,000 under Old Regime) |
| `hraExemption` | House Rent Allowance exemption under Section 10(13A) |
| `otherDeductions` | Donations (80G), education loan interest (80E), savings interest (80TTA) |
| `tdsPaid` | Tax deducted at source (from Form 26AS / AIS) |
| `advanceTaxPaid` | Advance tax paid via Challan 280 |
| `calculatedNewRegimeTax` | Tax computed under New Regime |
| `calculatedOldRegimeTax` | Tax computed under Old Regime |
| `recommendedRegime` | Optimal regime recommendation (`'new'` or `'old'`) |
| `taxSavings` | Amount saved by choosing the optimal regime |
| `calculatedTaxLiability` | Final calculated tax liability according to chosen regime |

### 15.2 New Tax Regime Slabs (Finance Act 2024)
Applicable for FY 2024-25 & FY 2025-26:

| Income Slab | Rate | Tax in Slab |
|-------------|------|-------------|
| Up to ₹3,00,000 | 0% | Nil |
| ₹3,00,001 – ₹7,00,000 | 5% | ₹20,000 |
| ₹7,00,001 – ₹10,00,000 | 10% | ₹30,000 |
| ₹10,00,001 – ₹12,00,000 | 15% | ₹30,000 |
| ₹12,00,001 – ₹15,00,000 | 20% | ₹60,000 |
| Above ₹15,00,000 | 30% | 30% of excess |

- **Section 87A Full Rebate**: Taxable income up to ₹7,00,000 incurs **₹0 tax** (rebate covers up to ₹25,000).
- **Section 87A Marginal Relief**: For taxable income slightly above ₹7,00,000, tax liability before cess is legally capped to `(Taxable Income − ₹7,00,000)`, preventing punitive spikes.
- **Health & Education Cess**: 4% applied to tax after rebate and marginal relief.

### 15.3 Old Tax Regime Slabs & Deductions
| Income Slab | Rate |
|-------------|------|
| Up to ₹2,50,000 | 0% |
| ₹2,50,001 – ₹5,00,000 | 5% |
| ₹5,00,001 – ₹10,00,000 | 20% |
| Above ₹10,00,000 | 30% |

- **Section 87A Rebate**: Taxable income up to ₹5,00,000 incurs **₹0 tax** (rebate up to ₹12,500).
- Standard Deduction of ₹50,000 + deductions for Sections 80C, 80D, 80CCD, 24(b), and HRA.
- Health & Education Cess: 4%.

### 15.4 Automatic Transaction Synchronization (1-Click Sync)
- **Endpoint**: `GET /api/taxes/auto-summary/:year`
- Automatically scans user transactions between 1 April and 31 March of the financial year.
- Aggregates salary credits, business/freelance income, dividend/investment gains, TDS deductions, and advance tax payments.
- Pre-fills the tax form in 1 click, eliminating manual tallying.

### 15.5 Advance Tax Quarterly Schedule
If net tax liability after TDS exceeds **₹10,000**, Capise automatically computes and displays the mandatory quarterly payment schedule:
- **15%** by 15 June
- **45%** by 15 September
- **75%** by 15 December
- **100%** by 15 March

---

## 16. Reports & Analytics

The Reports module provides deeper analytical views beyond the Dashboard, complete with CSV export and an **Institutional-Grade PDF Print Engine**.

### 16.1 Report Types
- **Income vs. Expense Report** — Period-based income/expense comparison
- **Category Report** — Spending breakdown by category with charts
- **Account Report** — Activity per account
- **Custom Date Ranges** — Fully configurable time periods

### 16.2 Executive PDF & Print Dossier Engine
When printing or exporting to PDF via the **Print / Export PDF** button (`window.print()`):
- **Curated Letterhead**: Displays the official Capise Private Wealth emblem, document title, client identity (name & email), audit timeframe, scope, generation timestamp, and unique cryptographic audit reference (e.g. `CPS-REP-YYYYMMDD-XXXX`).
- **High-Contrast KPI Summaries**: Total Inflow, Total Outflow, Net Retained Capital, and Capital Retention % formatted with high-contrast borders and exact print colors (`print-color-adjust: exact`).
- **Unpaginated Category Ledger Matrix**: Bypasses screen pagination to print the **complete** category breakdown table with transaction counts, amounts, percentage shares, and colored indicators.
- **Multi-Month Trajectory Table**: 6-month historical trajectory table with alternating rows and period aggregate totals.
- **Liquid Reserves & Balances Snapshot**: Audit table of all active accounts and liquid cash reserves.
- **Institutional Certification & Sign-off**: Audit certification block with signature line and confidentiality legal disclaimer.
- **Clean Page Architecture**: Automatic reset of desktop sidebar indents (`md:pl-64`), omission of all navigation chrome, buttons, and floating widgets, with strict page-break avoidance (`break-inside: avoid`).

---

## 17. Calendar View

The Calendar module (`/calendar`) provides a date-based view of financial events.

### 17.1 Features
- Visual monthly/weekly calendar with financial events overlaid
- Upcoming bills, EMIs, and recurring transactions shown on their due dates
- Past transactions browsable by date

---

## 18. Intelligence & AI Analytics Hub

The Intelligence page (`/intelligence`) is a dedicated analytics hub with four tabs.

### 18.1 Tab 1: Financial Health Score

An algorithmic score (0–100) computed from 4 pillars:

| Pillar | Max Score | Metric |
|--------|-----------|--------|
| **Savings Rate** | 30 | % of income saved (last 6 months) |
| **Debt-to-Income (DTI)** | 30 | Monthly debt obligations / monthly income |
| **Cash Cushion** | 20 | Months of expenses covered by liquid cash |
| **Budget Adherence** | 20 | Whether active budgets are in use |

**Scoring Benchmarks:**
- 80–100: Excellent 🟢
- 60–79: Good 🟡
- 40–59: Fair 🟠
- 0–39: Needs Attention 🔴

### 18.2 Tab 2: Spending Insights

Deep-dive analytics on current month spending:

- **Day-of-Week Breakdown** — Which days the user spends most (weekend vs. weekday)
- **Top Merchants Leaderboard** — Ranked by total spend
- **Category Trend Analysis** — Month-over-month category spend change (current vs. previous month)
- **Anomaly Detection** — Transactions significantly above category averages flagged as anomalies
- **6-Month Category Heatmap** — Spending pattern over time by category

### 18.3 Tab 3: Forecasting

Forward-looking financial projections:

- **14-Day Cashflow Forecast** — Predicts account balances 14 days out based on scheduled bills and spending velocity
- **6-Month Long-Term Projection** — Projects income, expenses, savings, and net worth using historical averages and committed obligations
- **Spending Velocity Tracker** — Current pace vs. monthly budget

### 18.4 Tab 4: Monthly Review

An AI-generated narrative digest of the previous month's finances (powered by Gemini):

- **AI Summary** — Plain-language narrative (e.g., "You saved 22% this month, better than your 3-month average...")
- **Financial Health Score** for the reviewed month
- **Top Spending Categories** for the month
- **Anomalies Detected** — Unusual transactions flagged by the AI
- **Budget Performance** — Which budgets were within/over limit
- **Net Worth Change** — Month-over-month net worth delta
- **Largest Transactions** — Top 5 biggest expense events
- **Personalized Insights & Recommendations** — AI-generated actionable advice

#### Executive PDF Dossier Export
The Monthly Review includes an **Executive Print / PDF Export Engine**:
- **Official Dossier Letterhead**: Branded header with client name, email, review cycle, health assessment grade, and reference ID.
- **Health & Wealth Scorecard**: High-contrast, publication-grade print representation of the Health Score Gauge, Cashflow velocity, and Wealth Trajectory.
- **AI Executive Briefing**: Formatted insights and actionable recommendations that print cleanly without screen artifacts.
- **Budget Compliance Audit Table**: Full printable table showing Category, Budget Limit, Actual Spend, Variance (Headroom or Overspend), and Compliance Status.
- **Certification & Sign-Off**: Verification seal and confidentiality statement.

> Monthly reviews are auto-generated by the **Monthly Review Cron Job** on the 3rd of each month and cached in the `MonthlyReviewDigest` collection.

---

## 19. Proactive AI Engine

The Proactive Intelligence system runs in the background and surfaces actionable insights without the user needing to ask.

### 19.1 Safe-to-Spend Precision Engine

**"How much can I safely spend today?"** — an algorithmic daily discretionary allowance that protects users from overspending while honoring future commitments.

#### Precision Architecture & Mathematical Model:
1. **Operating Liquid vs. Dedicated Reserve Separation**:
   - Accounts are segregated between active **Operating Liquid Accounts** (`Bank`, `Cash`, `UPI`) and dedicated **Emergency/Savings Reserves** (Fixed Deposits, Emergency Funds, Provident Funds).
   - If a user has only reserve accounts, a protected 60% emergency cushion is automatically cordoned off to prevent risking rainy-day funds.
2. **Rolling 30-Day Forward Commitment Schedule**:
   - **Upcoming Recurring Bills**: Scans recurring rules due within the next 30 days (excluding SIP/investment transfers).
   - **Upcoming Loan EMIs**: Tally of debt obligations scheduled over the 30-day forward window.
   - **Monthly Goal Allocation**: Pro-rated monthly targets for active savings goals (capped at 20% of monthly income to prevent cashflow starvation).
   ```
   Committed Expenditures = Upcoming Bills + Upcoming Loan EMIs + Monthly Goal Allocation
   Uncommitted Operating Buffer = max(0, Operating Liquid Balance - Committed Expenditures)
   ```
3. **Pacing Clamping & Safety Boundaries**:
   - Days remaining in month is clamped to a **minimum 10-day pacing horizon**, eliminating artificial spikes on the last 1–2 days of the month.
   - **Ceiling Guard**: Daily allowance is strictly capped at `Uncommitted Operating Buffer / 15` to ensure at least two weeks of liquidity cushion.
   - **Realistic Floor**: Maintained with a realistic floor (₹500/day) preventing panic-inducing zero states when non-discretionary balances are tight.
   - Completely prevents outlier spikes (such as erroneous ₹4,86,000/day figures) and reflects true disposable liquidity.

### 19.2 Proactive Nudges

The system generates contextual nudges and displays them to the user. Examples of nudge types:

| Nudge Type | Trigger |
|-----------|---------|
| **Budget Warning** | Spending approaching/exceeding a budget limit |
| **Low Balance Alert** | Account balance below a safe threshold |
| **Upcoming Bill Reminder** | Large bill due within 3 days |
| **Goal Behind Schedule** | Savings goal not on track for deadline |
| **Subscription Anomaly** | Unusual subscription charge detected |
| **Overdraft Risk** | Forecasted account going negative |

Users can **dismiss** nudges via `POST /api/proactive/nudges/:id/dismiss`.

### 19.3 Autonomous Salary Distributor (50/30/20)

On salary day, the system can automatically generate a **budget allocation plan** based on the 50/30/20 rule (or custom splits):

- **50% Needs** — Bills, EMIs, rent, groceries
- **30% Wants** — Dining out, entertainment, shopping
- **20% Savings** — Goals, investments, emergency fund

**Flow:**
1. System detects a large income transaction (≥ ₹25,000)
2. Generates a personalized distribution plan
3. User reviews and can **Execute** the plan (auto-creates transfer transactions)
4. Or **Dismiss** it

### 19.4 Zombie Subscription Detector

Identifies "zombie subscriptions" — recurring charges the user may have forgotten about:

- Scans transaction history for recurring merchant patterns
- Flags subscriptions that haven't been used recently or show unexpected price hikes
- Compares current subscription amounts to historical averages to detect **price hike alerts**
- Users can mark subscriptions as **Cancelled** or **Acknowledge** price hikes

### 19.5 Overdraft Shield

A 14-day cash flow forecast that predicts whether any account will go negative:

- Aggregates upcoming bills, EMIs, and estimated daily spend
- Simulates day-by-day balance progression
- If overdraft risk is detected, proposes an **Auto-Rebalance** action (transfers from surplus accounts)
- `POST /api/proactive/overdraft-shield/rebalance` executes the rebalance

### 19.6 Predictive "What-If" Multiverse Financial Time Machine

A twin-universe simulation engine powered by Google Gemini AI and rigorous deterministic mathematical projections:

- Users explore hypothetical life decisions:
  - *"What if I buy a car with a ₹15L loan at 9% interest?"*
  - *"What if I increase my monthly mutual fund SIP by ₹10,000 for 3 years?"*
  - *"What if my rent increases by 20% while switching jobs?"*

#### Simulation Mechanics:
1. **36-Month Twin Multiverse Trajectories**:
   - Generates dual month-by-month financial trajectories over a 1 to 5 year horizon:
     - **Baseline Universe**: Projects existing income, committed obligations, current SIPs, and amortizing debt.
     - **Simulated Universe**: Applies the hypothetical scenario's capital cost, recurring delta, or debt repayment schedule.
   - Computes month-by-month trajectory points for: Liquid Savings, Investments, Loan Debt, and Net Worth.
2. **Stress-Testing & Bottleneck Detection**:
   - Evaluates minimum projected liquid runway (`simMinRunwayMonths`).
   - Identifies the exact **bottleneck month** where liquidity is under the highest strain.
   - Calculates the net impact on target goals (e.g., *"Delayed by 4 months"* or *"Accelerated by 3 months faster"*).
3. **Gemini AI Strategic Synthesis**:
   - Multi-model fallback (`gemini-2.5-flash` with fallback to `gemini-2.0-flash`) with low temperature (0.1).
   - Generates an executive Risk Verdict (`LOW_RISK`, `MODERATE_RISK`, `HIGH_RISK`), title, and narrative trade-off analysis.
   - Produces interactive **Action Proposals** (e.g., *"Set Up SIP Rule"*, *"Create Vehicle Budget"*) executable directly from the simulator modal.

---

## 20. AI Copilot (Chat Assistant)

The **AI Copilot** is a Gemini-powered conversational financial assistant embedded in the app (accessible via the Copilot Drawer).

### 20.1 Capabilities

**Q&A Mode** — Ask any financial question and get personalized, context-aware answers:
- *"How much did I spend on dining out this month?"*
- *"What's my true savings rate across the last 6 months?"*
- *"Which of my investments or subscriptions need review?"*

**Action Mode & Smart Proposals** — The Copilot generates actionable proposal buttons directly beneath its replies:
- Single-click action buttons allowing users to create transactions, set up budgets, adjust SIPs, or log loan payments without leaving the chat.

### 20.2 Context Injection
Before calling Gemini, the service builds a comprehensive financial context object containing:
- Account balances, recent transactions (categorized, with merchant data)
- Active budgets and their utilization
- Loan summary (remaining balance, EMIs)
- Investment portfolio (returns, SIP status)
- Goals (progress, timeline)
- Recurring rules (scheduled bills)
- Tax record summary, Monthly review digest, Safe-to-Spend figure

### 20.3 1-Click Action Proposals & Generative Tool Execution
When the Copilot identifies a financial action or optimization, it generates a structured JSON action proposal block rendered as interactive buttons inside the chat interface. Clicking a proposal dispatches `POST /api/proactive/copilot/execute-action` to the **Copilot Action Execution Service**, which performs atomic database updates and immediately invalidates cached data.

#### Full Catalog of Supported 1-Click Actions:
1. **Goals**:
   - `CREATE_GOAL` / `CREATE_SINKING_FUND` — Create a new goal with target amount, deadline, and optional initial funding deposit.
   - `CONTRIBUTE_TO_GOAL` — Allocate surplus liquidity towards a goal, debiting the funding account and creating a transfer transaction.
   - `UPDATE_GOAL` — Modify goal target amounts or completion dates.
2. **Budgets**:
   - `CREATE_BUDGET` / `BUDGET_GUARD` — Establish a new monthly spending guardrail for any category.
   - `UPDATE_BUDGET_LIMIT` — Dynamically calibrate an overspent or tight category limit.
3. **Transactions & Cash Flow**:
   - `LOG_TRANSACTION` — Quick-log income or expense with automatic ledger account balance adjustment.
   - `TRANSFER_MONEY` — Transfer funds between accounts with atomic source debit and destination credit.
4. **Investments & Wealth Compounding**:
   - `CREATE_INVESTMENT` — Record new mutual fund, stock, or ETF holding positions.
   - `LOG_INVESTMENT_TOPUP` — Deploy idle cash into an existing holding.
   - `UPDATE_INVESTMENT_SIP` / `ADJUST_SIP` — Set up or increase systematic monthly SIP amounts.
5. **Loans & Debt Reduction**:
   - `CREATE_LOAN` — Record new loans with automatic amortization EMI computation.
   - `PREPAY_LOAN_PRINCIPAL` — Reduce loan principal debt with immediate interest savings.
   - `RECORD_LOAN_EMI_PAYMENT` — Record monthly EMI installment with interest/principal split.
6. **People & Lending**:
   - `CREATE_LENDING` — Record money lent or borrowed with auto-linked ledger transactions.
   - `RECORD_LENDING_REPAYMENT` — Record partial or full repayment with bank balance sync.
   - `SETTLE_LENDING` — Mark debt as completely cleared with final settlement transaction.
   - `GENERATE_WHATSAPP_REMINDER` — Open pre-filled WhatsApp reminder with 1 click.
7. **Bills & Subscriptions**:
   - `CREATE_RECURRING_RULE` — Schedule recurring bills with automated cron auto-posting.
   - `CANCEL_SUBSCRIPTION` — Deactivate unwanted zombie subscriptions.
   - `ACKNOWLEDGE_PRICE_HIKE` — Update subscription record to acknowledge new pricing.
8. **Accounts & Emergency Shields**:
   - `CREATE_ACCOUNT` — Add new bank, credit card, cash wallet, or FD account.
   - `EXECUTE_AUTO_REBALANCE` — Prevent overdraft fees by rebalancing funds between accounts.
   - `BUFFER_RESERVE` — Cordon off liquid funds into dedicated emergency reserves.

Action schemas can be queried programmatically via `GET /api/proactive/copilot/actions`.

### 20.4 AI Model & Resilience
Uses **Google Gemini** (`gemini-2.5-flash` with automatic fallback to `gemini-2.0-flash`) with:
- Low temperature (0.1) for deterministic, accurate financial responses
- JSON response mode for structured action outputs
- Transient retry logic and graceful degradation to maintain 100% chat availability

---

## 21. CSV Import Engine

Users can bulk-import transactions from bank statements exported as CSV files.

### 21.1 Features
- **Smart CSV Parser** — Handles quoted fields, multiple delimiters, and various line endings
- **Column Mapping** — User maps CSV columns to transaction fields (date, amount, description, type)
- **Merchant Auto-Categorization** — A heuristics-based categorizer assigns categories based on merchant names/narrations
- **Narration Cleaning** — Raw bank narrations are cleaned and normalized into readable merchant names
- **Duplicate Detection** — Prevents re-importing already-existing transactions
- **Budget Guardrail Check** — After import, checks all expense transactions against active budgets
- **Bulk Insert** — All valid transactions are bulk-inserted for performance

---

## 22. Automated Cron Jobs (Background Engine)

Six cron jobs run autonomously in the background, forming the automation layer of Capise.

| Job | Schedule | Description |
|-----|----------|-------------|
| **Recurring Job** | Nightly (midnight) | Auto-posts recurring transaction rules with `autoPost: true` and advances `nextRunDate` |
| **Loan EMI Job** | Nightly | Auto-debits EMIs for loans with `autoDebit: true` (creates transactions, splits interest/principal) |
| **SIP Job** | Nightly | Executes due SIP investments, updates `currentValue`, fetches live NAV, appends to `valueHistory` |
| **Net Worth Job** | Nightly | Computes and saves a `NetWorthSnapshot` for all users |
| **Monthly Review Job** | 3rd of each month | Generates AI-powered Monthly Review Digest for all users |
| **Proactive Guardian Job** | Twice daily | Runs the proactive intelligence checks and generates/refreshes nudges for all users |

---

## 23. Data Models Reference

### Collections Summary

| Collection | Purpose |
|------------|---------|
| `users` | Authentication, profile, verification tokens |
| `accounts` | Financial accounts (bank, cash, credit, etc.) |
| `transactions` | All financial events (income, expense, transfer) |
| `categories` | Transaction classification tree |
| `budgets` | Spending limits per category |
| `recurringrules` | Scheduled repeating transactions |
| `goals` | Savings targets with contributions |
| `investments` | Portfolio positions with SIP config |
| `loans` | Loan records with payment history |
| `lendings` | Personal lending/borrowing records |
| `networthsnapshots` | Daily net worth history |
| `taxrecords` | Per-financial-year tax data |
| `monthlyreviewdigests` | AI-generated monthly financial reports |
| `proactivenudges` | Generated alerts and action prompts |
| `salarydistributionplans` | Salary day allocation plans |

---

## 24. API Reference Summary

### Auth Routes (`/api/auth`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Email/password login |
| POST | `/google` | Public | Google OAuth login/register |
| POST | `/logout` | Public | Clear session cookie |
| POST | `/forgot-password` | Public | Request password reset email |
| POST | `/reset-password/:token` | Public | Set new password with token |
| POST | `/verify-email/:token` | Public | Confirm email address |
| POST | `/resend-verification` | Public | Re-send verification email |
| GET | `/profile` | Private | Get own profile |
| PUT | `/profile` | Private | Update name/password/photo |

### Core Data Routes
| Prefix | Resource |
|--------|----------|
| `/api/accounts` | Account CRUD |
| `/api/categories` | Category CRUD |
| `/api/transactions` | Transaction CRUD + filtering |
| `/api/recurring` | Recurring rule CRUD |
| `/api/budgets` | Budget CRUD |
| `/api/goals` | Goal CRUD + contributions |
| `/api/investments` | Investment CRUD |
| `/api/loans` | Loan CRUD + payments |
| `/api/lending` | Lending CRUD + repayments |
| `/api/networth` | Net worth history |
| `/api/taxes` | Tax record management |
| `/api/reports` | Analytical report queries |
| `/api/calendar` | Calendar event queries |
| `/api/dashboard` | Aggregated dashboard data |

### Intelligence Routes (`/api/intelligence`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health-score` | Financial health score with pillars |
| GET | `/spending-insights` | Deep spending analytics |
| GET | `/cashflow-forecast` | 14-day cashflow projection |
| GET | `/longterm-projection` | 6-month financial projection |
| GET | `/monthly-review` | Fetch monthly review digest |
| POST | `/generate-review` | Force-generate a review |
| GET | `/monthly-reviews` | List all past reviews |

### Proactive Routes (`/api/proactive`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/nudges` | Get active proactive nudges |
| POST | `/nudges/:id/dismiss` | Dismiss a nudge |
| GET | `/safe-to-spend` | Daily discretionary budget |
| GET | `/copilot/actions` | Manifest of all supported 1-click action proposals |
| POST | `/copilot/chat` | Chat with AI Copilot |
| POST | `/copilot/execute-action` | Execute a Copilot action |
| GET | `/salary-distribution/latest` | Latest salary plan |
| POST | `/salary-distribution/generate` | Generate new salary plan |
| POST | `/salary-distribution/execute` | Execute salary plan |
| GET | `/subscriptions/audit` | Zombie subscription report |
| POST | `/subscriptions/cancel` | Mark subscription cancelled |
| GET | `/overdraft-shield/forecast` | 14-day overdraft forecast |
| POST | `/overdraft-shield/rebalance` | Execute auto-rebalance |
| POST | `/what-if/simulate` | Run What-If simulation |

---

## 25. Architecture & Infrastructure

### 25.1 Frontend Architecture

```
Client/src/
├── main.jsx                        # App entry point (GoogleOAuthProvider, Redux store)
├── App.jsx                         # Route definitions with lazy-loaded pages & auth listeners
├── pages/                          # Route-level page components
│   ├── Dashboard/                  # Main dashboard (compressed whitespace, multi-chart)
│   ├── Intelligence/               # Analytics hub (4 tabs: Health Score, Insights, Forecasting, Review)
│   ├── Transactions/               # MUI Table with sorting, grouping & cascading subcategory filter
│   ├── Accounts/                   # Multi-account balances & credit tracking
│   ├── Investments/                # Portfolio positions with SIP config & NAV sync
│   ├── Goals/                      # Savings targets & milestone tracking
│   ├── Loans/                      # Amortization, EMI auto-debit & debt payoff
│   ├── Reports/                    # Analytical reports & visualizations
│   ├── Budgets/                    # Budget guardrails & headroom monitoring
│   ├── People/                     # Lending/borrowing with auto-synced ledger transactions
│   ├── NetWorth/                   # Asset/liability tracking & historical snapshots
│   ├── Calendar/                   # Due-date calendar overlay
│   ├── Taxes/                      # Indian New Tax Regime calculations
│   ├── Bills/                      # Recurring subscriptions & zombie detector
│   ├── Login.jsx, Register.jsx     # Auth entrypoints
│   ├── ForgotPassword.jsx, ResetPassword.jsx
│   ├── VerifyEmail.jsx, Profile.jsx
├── components/                     # Reusable UI components & modals
│   ├── ui/
│   │   └── CapiseLoader.jsx        # Custom branded orbital motion spinner
│   ├── ErrorBoundary.jsx           # Top-level React error boundary
│   ├── GoogleAuthButton.jsx
│   ├── AICopilotDrawer.jsx         # Gemini AI Copilot with action proposals
│   ├── ActionCenterDrawer.jsx
│   ├── CSVImporterModal.jsx
│   ├── OverdraftShieldModal.jsx
│   ├── SalaryDistributorModal.jsx
│   ├── SubscriptionAuditModal.jsx
│   ├── WhatIfSimulatorModal.jsx     # 36-Month Multiverse time-machine
│   └── ProtectedRoute.jsx, Pagination.jsx
├── context/                        # Global application contexts
│   ├── ToastContext.jsx            # Animated floating notifications with "Copy Ref"
│   └── NetworkStatusContext.jsx    # Real-time online/offline monitoring
├── constants/
│   └── reservedCategories.js       # 77 system reserved categories manifest
├── store/                          # Redux Toolkit slices (authSlice with sessionExpired)
├── services/                       # API service functions & Axios interceptors (api.js)
├── layouts/                        # MainLayout (sidebar + header + offline banner)
└── utils/
    ├── errorHandler.js             # Client error normalization & user-friendly messages
    └── formatCurrency.js           # Indian currency formatting (₹)
```

### 25.2 Backend Architecture

```
Server/
├── server.js                       # Express app entry point & uncaught exception handlers
├── config/db.js                    # MongoDB connection
├── routes/                         # Express router definitions (17 route files)
├── controllers/                    # Business logic handlers
│   ├── categoryController.js       # 77 default categories seeder & reserved name guards
│   ├── transactionController.js    # Ledger balance sync (create, update, delete)
│   ├── lendingController.js        # People lending/borrowing transaction automation
│   ├── dashboardController.js      # Parallel Promise.all dashboard aggregation
│   └── ... (13 other controllers)
├── models/                         # Mongoose schemas (15 models)
├── services/                       # Service layer (11 services)
│   ├── aiCopilotService.js         # Gemini Copilot inference & action pill generation
│   ├── proactiveIntelligenceService.js # Precision Safe-to-Spend & proactive nudges
│   ├── whatIfSimulationService.js  # 36-Month twin multiverse simulation engine
│   ├── subscriptionDetectorService.js
│   ├── overdraftShieldService.js
│   ├── salaryDistributorService.js
│   ├── monthlyReviewService.js
│   ├── csvIngestionService.js
│   ├── budgetGuardrailService.js
│   └── copilotActionExecutionService.js
├── middleware/
│   ├── authMiddleware.js           # JWT protect middleware
│   └── errorMiddleware.js          # Centralized error handler, 500 masking & tracking ID
├── utils/
│   ├── AppError.js                 # Operational error classes (BadRequest, Unauthorized, etc.)
│   ├── generateToken.js            # JWT signing + HTTP-only cookie setter
│   ├── sendEmail.js                # Nodemailer email dispatch
│   ├── cache.js                    # In-memory TTL cache
│   └── merchantCategorizer.js     # Heuristic category assignment
├── logs/
│   └── error.log                   # Server-side persistent exception log
└── cron/                           # Scheduled background automation jobs
```

### 25.3 Security Design

| Measure | Implementation |
|---------|---------------|
| **JWT in HTTP-only Cookie** | Prevents XSS token theft |
| **Silent Expiration Redirect** | Auto-cleans expired credentials on 401 and navigates to `/login` |
| **bcrypt password hashing** | 10 salt rounds |
| **SHA-256 token hashing** | Verification and reset tokens stored hashed, raw token only in email link |
| **Email enumeration prevention** | Forgot password always returns generic message |
| **Google token verification** | Server-side `verifyIdToken()` with audience check |
| **Auth middleware** | All private routes protected via `protect` middleware |
| **Server Error Masking** | 500 errors never leak DB credentials, SQL/Mongo queries, or file paths |

### 25.4 Performance Design

| Technique | Benefit |
|-----------|---------|
| **Parallel Promise.all queries** | Dashboard goes from ~250ms → ~15ms |
| **`.lean()` POJOs** | Eliminates Mongoose document overhead on read-heavy queries |
| **Compound database indexes** | Fast lookups by user + date, user + type, user + category |
| **Gzip/Brotli compression** | Reduces response payload size by 60–80% |
| **In-memory TTL cache** | Safe-to-Spend and other expensive calculations cached to avoid re-computation |
| **Route-level code splitting** | All pages are lazy-loaded, reducing initial bundle size |
| **50mb body limit** | Supports large CSV imports and base64 images |

### 25.5 Email Service
- Provider: **Brevo (formerly Sendinblue)** via SMTP relay
- Transactional emails: Email Verification, Password Reset
- Nodemailer configured with `smtp-relay.brevo.com:587` (STARTTLS)
- Sender identity: `Capise <harshalrptl62@gmail.com>`

---

## 26. Enterprise Error Handling & Offline Architecture

Capise features a production-grade, dual-tier error handling architecture designed to deliver actionable, friendly guidance to end users while giving developers complete debugging diagnostics.

### 26.1 Client-Side Error Formatting (4xx)
- **User-Centric Messaging**: Client-induced operational errors (validation failures, incorrect credentials, reserved category collisions, unauthorized actions) preserve clean, specific, and actionable messages.
- **Normalization Engine (`errorHandler.js`)**: All raw Axios errors are intercepted and translated into human-readable sentences without developer acronyms or raw HTTP codes.

### 26.2 Server-Side Error Sanitization & Developer Diagnostics (5xx)
- **Zero Information Leakage**: Any unhandled server exception or 500 internal server error automatically masks its stack trace and internal database queries from client responses.
- **Sanitized Client Message**: Returns a standard friendly notification:
  > *"Something went wrong on our servers. Our engineering team has been alerted. Please try again shortly."*
- **Unique Error Reference ID**: Every 5xx error generates a collision-resistant tracking reference (e.g., `ERR-CAP-MVW9T7V7-29DF26`).
  - Returned in the JSON response payload (`errorId`).
  - Logged with the full stack trace, HTTP method, URL, user identity, IP address, and sanitized request body to both terminal standard error and `Server/logs/error.log`.
- **Interactive Floating Toast**: Displays an animated notification with a **1-click "Copy Ref"** button, allowing the user to copy the exact tracking ID to share with support.

### 26.3 Offline Detection & Pre-Flight Interception
- **Real-Time Network Listener (`NetworkStatusContext.jsx`)**: Continuously monitors the browser's `navigator.onLine` state and network events (`online`, `offline`).
- **Global Sticky Warning Banner**: When connection drops, an amber offline banner appears at the top of the interface notifying the user that they are offline.
- **Pre-Flight Request Guard**: In `Client/src/services/api.js`, outbound requests check `navigator.onLine`. If offline, requests are rejected locally before hitting the network stack, preventing pending timeout freezes and displaying an immediate offline notification.

### 26.4 Top-Level React Error Boundary (`ErrorBoundary.jsx`)
- Catches unhandled JavaScript rendering and component lifecycle exceptions.
- Prevents white-screen crashes by rendering a clean Capise-branded recovery card with options to reload the application or return to the dashboard.

---

## 27. Custom Branded Motion Spinner System

Capise utilizes a dedicated, highly polished motion loading spinner component (`CapiseLoader.jsx`):

### 27.1 Design & Visual Geometry
- **Dual Orbital Rings**: Concentric, counter-rotating SVG orbital paths with shimmering Emerald gradients (`#10b981` to `#047857`) symbolizing the cyclical, interconnected nature of personal finance.
- **Central Pulsing Core Node**: A central metallic node that gently pulses, representing financial balance and real-time core ledger processing.
- **Size & Mode Adaptability**: Supports dynamic sizes (`sm`, `md`, `lg`, `xl`) and optional fullscreen overlay mode with blurred backdrop filters (`backdrop-blur-sm`).

### 27.2 Application Integration
Integrated across all async data fetching boundaries, including:
- Initial application boot and authentication verification
- Dashboard, Transactions, Accounts, Budgets, Goals, Loans, People, NetWorth, Investments, Bills, Calendar, and Intelligence pages
- AI Copilot inference drawer and What-If Time Machine simulation modal
- Modal submission states (CSV Import, Salary Distribution, Subscription Audit)

---

## 28. Pre-Deployment Verification & System Diagnostics

Prior to production deployment, a master automated test suite was executed against the primary target account:
- **Target Demo Account**: `demo@capise.app`
- **Database**: MongoDB Atlas Cluster (`cluster0.kqxzfhk.mongodb.net`)
- **AI Models**: Google Gemini 2.5 Flash / 2.0 Flash

### 28.1 Verification Results Matrix (28/28 Scenarios Passed)

| Module | Verification Test | Result |
| :--- | :--- | :---: |
| **Infra** | MongoDB Atlas Connection | ✅ PASSED |
| **Auth** | Login with `demo@capise.app` / `demo@123` | ✅ PASSED |
| **Auth** | Profile & Email Verification Validation | ✅ PASSED |
| **Categories** | All 77 Default Reserved Categories Auto-Seeded | ✅ PASSED |
| **Categories** | Reserved Name Collision Guard (`Food`, `Rent`, etc.) | ✅ PASSED |
| **Categories** | Default Category Deletion Protection (403 Forbidden) | ✅ PASSED |
| **Accounts** | 7 Active Accounts Loaded & Balances Reconciled | ✅ PASSED |
| **Proactive** | Safe-to-Spend Limit Precision Calculation (₹1,210/day) | ✅ PASSED |
| **Proactive** | Proactive Nudges & Alerts Generation (14 active nudges) | ✅ PASSED |
| **Copilot** | Live Gemini AI Copilot Generative Chat Inference | ✅ PASSED |
| **Copilot** | Smart Action Proposals Generation & Pill Buttons | ✅ PASSED |
| **What-If** | 36-Month Twin Multiverse Time-Machine Trajectories | ✅ PASSED |
| **What-If** | Net Worth Delta & Bottleneck Runway Analysis | ✅ PASSED |
| **Transactions** | Historical Transactions Loaded (100 records) | ✅ PASSED |
| **Ledger Sync** | Transaction Create Decrements Account Balance | ✅ PASSED |
| **Ledger Sync** | Transaction Update Adjusts Account Balance Delta | ✅ PASSED |
| **Ledger Sync** | Transaction Delete Restores Account Balance Exactly | ✅ PASSED |
| **People** | Lending/Borrowing Ledger & Auto-Created Transactions | ✅ PASSED |
| **Budgets** | Active Budget Guardrails & Headroom Query | ✅ PASSED |
| **Goals** | Savings Goals Targets & Progress Pacing Query | ✅ PASSED |
| **Loans** | Debt Portfolio & EMI Auto-Debit Query | ✅ PASSED |
| **Investments** | Investment Holdings & Asset Allocation Query | ✅ PASSED |
| **Bills** | Recurring Rules & Zombie Subscription Audit Query | ✅ PASSED |
| **Intelligence** | 6-Pillar Financial Resilience Health Score (100/100) | ✅ PASSED |
| **Error System** | Client-Side Error (400) Actionable Message Separation | ✅ PASSED |
| **Error System** | Server-Side Error (500) Sanitization & Tracking ID (`ERR-CAP-XXXXX`) | ✅ PASSED |
| **Auth Expiry** | Silent Auto-Redirect on 401 Session Expiration | ✅ PASSED |
| **Build** | Client Production Build (`npm run build` in 7.51s, 0 errors) | ✅ PASSED |

---

## 29. Theme Engine (Futuristic Dual Dark & Light Mode)

Capise features a native, high-contrast, futuristic theme engine that empowers users to transition seamlessly between a vibrant light workspace and a deep, low-eye-strain dark terminal aesthetic.

### 29.1 Architecture & Modern Web Standards Compliance
- **Anti-FOUC (Flash of Unstyled Content) Hydration**: An inline script in `<head>` executes prior to DOM rendering, checking `localStorage.getItem('capise_theme')` and OS `prefers-color-scheme`. It immediately applies the `.dark` class to `document.documentElement` to prevent white flicker upon page load.
- **Native Color-Scheme Metadata**: Declares `<meta name="color-scheme" content="light dark" />` in HTML and dynamically keeps `document.documentElement.style.colorScheme` aligned with the active theme mode to optimize browser-native scrollbars, form controls, and selection highlights.
- **Dynamic OS Listener**: Subscribes to `window.matchMedia('(prefers-color-scheme: dark)')` to react in real-time when the host operating system switches between daytime and nighttime schedules without requiring a browser refresh.
- **Synchronized Material UI Theme**: Custom `ThemeContext` automatically updates the Material UI `createTheme` instance, cascading dark backgrounds (`#0f172a`), borders (`#1e293b`), and sort arrows across MUI Table containers, headers, and pagination cells.

### 29.2 Futuristic Palette Specification

| Token | Light Mode Value | Dark Mode Value | Aesthetic Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#f9fafb` (gray-50) | `#090d16` (deep space) | Eliminates blinding eye strain while avoiding dull grey |
| **Elevated Surfaces** | `#ffffff` (pure white) | `#0f172a` (slate-900) | Provides crisp card elevation and layered depth |
| **Structural Borders** | `#e5e7eb` (gray-200) | `#1e293b` (slate-800) | Sharp component delineations with zero visual noise |
| **Primary Typography** | `#111827` (gray-900) | `#f8fafc` (slate-50) | Maximum contrast ratio exceeding WCAG AAA standards |
| **Secondary Typography** | `#4b5563` (gray-600) | `#cbd5e1` (slate-300) | Highly legible secondary metrics, timestamps, and badges |
| **Muted Captions** | `#9ca3af` (gray-400) | `#94a3b8` (slate-400) | Subtitle text, axis labels, and placeholder hints |
| **Form Inputs** | `#ffffff` on `#d1d5db` | `#0b1120` on `#334155` | Deep recessed inputs with luminous `#6366f1` focus rings |
| **Accent Glows** | Neutral shadows | Subtle 5% indigo aura | Luminous futuristic floating effect on cards & modals |

### 29.3 User Controls & Navigation Integration
- **Desktop Sidebar Brand Header**: High-contrast icon toggle with animated Sun/Moon transitions positioned alongside the Action Center bell.
- **Mobile Top Header**: Direct-access theme toggle button in the sticky mobile navigation bar.
- **Profile Preferences**: Dedicated "Appearance & Theme" settings section featuring a 3-state segmented controller (`Light`, `Dark`, `System`).
- **Reactive Visual Charts**: All Recharts visualizations (`CashFlowChart`, `CategoryDonutChart`, `BudgetComparisonChart`, `NetWorthTrendChart`, `SpendingBurnChart`, `HealthScoreGaugeChart`) leverage the `useTheme()` hook to dynamically re-color axis ticks, grid lines, slice cuts, and center metrics.

---

## 30. Progressive Web App (PWA) Architecture & Offline Engine

Capise is built as an installable, high-performance Progressive Web App (PWA). It conforms strictly to modern W3C Web App Manifest specifications and Chromium / Safari PWA standards, allowing users to run Capise as a native desktop or mobile application directly from their operating system's dock, taskbar, or home screen.

### 30.1 Web App Manifest Specification (`manifest.webmanifest`)
The manifest configures the installation metadata, standalone UI windowing, themes, and native application shortcuts:

- **Application Identity**:
  - `name`: `Capise — Autonomous Personal Finance`
  - `short_name`: `Capise`
  - `description`: Autonomous personal finance platform with real-time proactive intelligence, automated wealth tracking, and multi-tier budget optimization.
  - `start_url`: `/`
  - `scope`: `/`
  - `id`: `/`
- **Display & Color Framing**:
  - `display`: `standalone` (removes browser URL bar, navigation buttons, and tabs for an immersive native software experience).
  - `orientation`: `any` (responsive rotation support across phone, tablet, and desktop displays).
  - `theme_color`: `#4f46e5` (vibrant Capise Indigo system titlebar and status bar color).
  - `background_color`: `#090d16` (Capise deep space dark splash screen background).
- **Multi-Resolution & Maskable Icons**:
  - Standard square PNG icons: `48x48`, `96x96`, `144x144`, `192x192`, `512x512` (`purpose: "any"`).
  - Adaptive Android maskable icons: `192x192`, `512x512` (`purpose: "maskable"`) with 10% safe zone margins to prevent clipping on circular or squircle icon shapes.
  - Apple Touch Icons: `180x180` high-density iOS icon with black-translucent status bar styling.
- **Quick-Access Application Shortcuts**:
  - `Dashboard`: Direct leap to high-level wealth breakdown and cashflow metrics (`/dashboard`).
  - `Transactions Feed`: Quick entry to transaction logger and filter list (`/transactions`).
  - `Budgets & Guardrails`: Real-time budget tracking and spending headroom (`/budgets`).
  - `Net Worth`: Real-time asset and liability balance sheet inspection (`/networth`).

### 30.2 Production Service Worker Architecture (`public/sw.js`)
Capise employs an asynchronous Service Worker with a multi-tiered caching strategy tailored for financial data security and instant offline availability:

1. **Pre-Cached Application Shell**:
   - During the `install` lifecycle event, the service worker immediately fetches and caches critical assets (`/`, `/index.html`, `/manifest.webmanifest`, `/favicon.png`, and high-res icon assets).
   - Calls `self.skipWaiting()` to immediately activate without waiting for existing tabs to close.
2. **Immediate Activation & Cache Invalidation**:
   - During the `activate` event, obsolete cache buckets (`capise-v...`) are pruned automatically, and `self.clients.claim()` binds the worker to all open browser tabs simultaneously.
3. **Smart Tiered Caching Strategy**:
   - **Navigation Requests (`request.mode === 'navigate'`)**: Network-First strategy. The service worker attempts to load fresh content from the server; if the user is offline or experiences packet drop, it transparently serves the cached App Shell (`/index.html`), allowing client-side React Router 7 to boot without an error screen.
   - **Static Assets (JS / CSS / Fonts / Images / SVGs)**: Cache-First with Background Revalidation (Stale-While-Revalidate). Cached assets load instantaneously within milliseconds, while a background fetch updates the cache if updated bundles are deployed.
   - **API & Financial Data Security Passthrough (`/api/*`)**: To strictly adhere to personal financial data privacy (avoiding storing sensitive bank balances or transactions in plaintext browser CacheStorage) and prevent stale data bugs, all `/api/` traffic bypasses the Service Worker cache. Real-time API communication, offline guards, and automatic 401 session expiration are handled natively by Axios and Capise's `api.js` interceptor stack, ensuring 100% exact feature and data parity between browser and PWA standalone mode.

### 30.3 In-App Install Banners & Native Integration (`usePwaInstall`)
- **Reactive Install Hook (`usePwaInstall.js`)**:
  - Intercepts and holds the Chromium `beforeinstallprompt` event so the app can present customized, non-intrusive install triggers.
  - Automatically detects when running inside standalone mode (`display-mode: standalone` or `navigator.standalone === true`) to hide redundant prompts.
  - Detects Apple iOS Safari browsers to present specific step-by-step guidance.
- **Visual In-App Triggers**:
  - **Floating Install Banner (`PwaInstallBanner.jsx`)**: Sleek, glassmorphic floating prompt at the bottom corner with 1-click install button, dismiss countdown, and app preview icon.
  - **Desktop Sidebar & Mobile Drawer Button (`PwaInstallButton.jsx`)**: Permanent install button located in navigation footers, showing "Installed ✓" once added.
  - **Profile Settings Card**: "Progressive Web App" card in user settings with offline-readiness badge and installation controls.

### 30.4 End-User Installation Guide

#### A. Google Chrome / Brave / Microsoft Edge (Desktop: macOS, Windows, Linux)
1. Open Capise in your browser (`http://localhost:5173` or your production domain).
2. Click the **"Install Capise App"** button located in the desktop sidebar or click the floating prompt in the bottom corner.
3. *Alternatively*, click the **Install icon** (monitor with a down arrow) in the browser's URL address bar, or open the browser menu (**⋮**) and choose **"Install Capise..."**.
4. Confirm by clicking **"Install"**.
5. Capise will immediately open in its own dedicated, native borderless window and place a shortcut in your Applications folder, Launchpad, or Windows Start Menu.

#### B. Android (Google Chrome / Brave)
1. Navigate to the Capise URL in Chrome on your Android smartphone or tablet.
2. An **"Install Capise App"** floating card will appear automatically at the bottom of the screen. Tap **"Install Now"**.
3. *Alternatively*, tap Chrome's three dots menu (**⋮**) in the top-right corner and select **"Add to Home screen"** or **"Install app"**.
4. Tap **"Install"** in the native dialog.
5. The Capise icon will appear on your device's home screen and app drawer, launching fullscreen with no browser address bar.

#### C. Apple iOS / iPadOS (Safari)
1. Open the Capise URL in **Safari** on your iPhone or iPad.
2. Tap the **Share** button (the square with an arrow pointing upward: `⎋`) in the bottom navigation bar.
3. Scroll down in the share sheet and tap **"Add to Home Screen"** (`⊞`).
4. Tap **"Add"** in the top-right corner.
5. Capise will be installed onto your home screen with its high-resolution retina icon and will launch in standalone native mode.

---

*Document updated and verified based on full codebase analysis of Capise — Personal Finance App.*
*Last Updated: November 2026*
