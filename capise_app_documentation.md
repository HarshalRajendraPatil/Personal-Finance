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

### 4.4 Charts
- **Cash Flow Bar Chart** — Daily income vs. expense bars (MUI BarChart)
- **Expense Breakdown Pie Chart** — Top 5 spending categories (MUI PieChart)
- **Net Worth Sparkline** — 6-month net worth trend (MUI LineChart)
- **Account Breakdown** — Top 6 accounts by balance

### 4.5 Widgets
- **Upcoming Bills & EMIs** — Next 6 items due within 30 days (from recurring rules + loan EMIs)
- **Active Budgets** — Current spend vs. limit for each active budget
- **Active Goals** — Top 3 in-progress goals with progress %
- **Recent Transactions** — Last 6 transactions with category and account

### 4.6 Dashboard Time Filter
Users can filter the dashboard period using buttons: `This Week`, `This Month`, `Last Month`, `This Year`, `All Time`. All period metrics recalculate instantly.

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

### 6.3 Filtering & Pagination
Transactions support rich filtering:
- By date range, by type, by account, by category
- By search term (merchant/notes)
- Server-side pagination with total count

### 6.4 Database Indexes
- `{ user, date: -1 }` — Chronological listing
- `{ user, type, date: -1 }` — Type-filtered listing
- `{ user, category, date: -1 }` — Category analytics
- `{ user, account }` — Account-specific history

### 6.5 Budget Guardrails
After each expense transaction, the **Budget Guardrail Service** checks if any active budget for the transaction's category has been breached. If so, a warning is returned to the client.

---

## 7. Categories

Categories allow users to organize income and expenses.

### 7.1 Features
- Users can create custom categories with a **name**, **color**, and **icon**
- Categories can be nested (**parent/child** structure for subcategories)
- Default system categories are seeded for new users
- Each transaction links to a primary category and optionally a subcategory

### 7.2 Usage
Categories power the expense breakdown charts, budget tracking, and AI analytics. They appear across: Transactions, Budgets, Reports, and Intelligence tabs.

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

The Recurring module automates repeating financial events.

### 9.1 Recurring Rule Fields

| Field | Description |
|-------|-------------|
| `name` | Rule name (e.g., "Netflix Subscription", "Monthly Rent") |
| `type` | Income / Expense / Transfer |
| `amount` | Fixed amount per occurrence |
| `frequency` | `daily`, `weekly`, `monthly`, or `yearly` |
| `nextRunDate` | When the rule next triggers |
| `endDate` | Optional expiry date for the rule |
| `autoPost` | If `true`, transactions are auto-created by cron. If `false`, user manually confirms. |
| `account` | Source account |
| `toAccount` | Destination account (Transfers) |
| `category` / `merchant` | Classification |

### 9.2 Auto-Posting (Cron)
When `autoPost` is enabled, the **Recurring Cron Job** (runs at midnight daily) automatically creates the transaction and advances `nextRunDate` to the next occurrence.

### 9.3 Dashboard Integration
Upcoming recurring bills within the next 30 days are surfaced on the Dashboard as "Upcoming Bills & EMIs."

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
| `account` | Account used for the original transaction |

### 13.3 Virtual Computations
- **`totalRepaid`**: Sum of all repayments
- **`outstanding`**: `max(0, amount - totalRepaid)`

### 13.4 Dashboard Integration
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

## 15. Tax Planner

An India-centric tax planning tool for the current financial year (New Tax Regime).

### 15.1 Tax Record Fields

| Field | Description |
|-------|-------------|
| `financialYear` | E.g., `"2025-26"` |
| `salaryIncome` | Employment income |
| `businessIncome` | Business/freelance income |
| `capitalGains` | Gains from investments |
| `otherIncome` | Dividends, interest, etc. |
| `standardDeduction` | Default ₹50,000 |
| `deduction80C` | ELSS, PPF, LIC, etc. |
| `deduction80D` | Health insurance premium |
| `otherDeductions` | NPS, HRA, etc. |
| `tdsPaid` | TDS already deducted |
| `advanceTaxPaid` | Advance tax payments |
| `calculatedTaxLiability` | Computed tax due |

### 15.2 Tax Brackets (New Regime — Configurable via .env)
| Income Slab | Rate |
|-------------|------|
| Up to ₹3,00,000 | 0% |
| ₹3,00,001 – ₹6,00,000 | 5% |
| ₹6,00,001 – ₹9,00,000 | 10% |
| ₹9,00,001 – ₹12,00,000 | 15% |
| ₹12,00,001 – ₹15,00,000 | 20% |
| Above ₹15,00,000 | 30% |

Tax rebate of up to ₹7,00,000 applies under Section 87A.

---

## 16. Reports & Analytics

The Reports module provides deeper analytical views beyond the Dashboard.

### 16.1 Report Types
- **Income vs. Expense Report** — Period-based income/expense comparison
- **Category Report** — Spending breakdown by category with charts
- **Account Report** — Activity per account
- **Custom Date Ranges** — Fully configurable time periods

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

> Monthly reviews are auto-generated by the **Monthly Review Cron Job** on the 3rd of each month and cached in the `MonthlyReviewDigest` collection.

---

## 19. Proactive AI Engine

The Proactive Intelligence system runs in the background and surfaces actionable insights without the user needing to ask.

### 19.1 Safe-to-Spend

**"How much can I safely spend today?"** — a dynamic daily allowance calculation.

```
Safe-to-Spend = (Liquid Balance - Committed Expenditures) / Days Remaining in Month

Where Committed Expenditures =
  Upcoming Bills (rest of month) +
  Upcoming Loan EMIs (rest of month) +
  Monthly Goal Targets (pro-rated)
```

Displayed on the Dashboard and in the Proactive section. Cached with a TTL to avoid redundant DB queries.

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

### 19.6 What-If Financial Time Machine

A Gemini-powered simulation engine. Users can ask:

- *"What if I buy a car with a ₹15L loan at 9% interest?"*
- *"What if I increase my savings by ₹5,000/month?"*
- *"What if my rent increases by 20%?"*

The simulator:
1. Fetches the user's complete financial snapshot
2. Applies the hypothetical scenario
3. Projects the impact on net worth, savings rate, and monthly cash flow over 1–5 years
4. Returns Gemini-generated narrative analysis with trade-off assessment

---

## 20. AI Copilot (Chat Assistant)

The **AI Copilot** is a Gemini-powered conversational financial assistant embedded in the app (accessible via the Copilot Drawer).

### 20.1 Capabilities

**Q&A Mode** — Ask any financial question and get personalized, context-aware answers:
- *"How much did I spend on food last month?"*
- *"What's my savings rate this year?"*
- *"Which of my investments are underperforming?"*

**Action Mode** — The Copilot can execute real financial actions:
- Add a transaction, create a budget, set a savings goal, log a loan payment

### 20.2 Context Injection
Before calling Gemini, the service builds a comprehensive financial context object containing:
- Account balances, recent transactions (categorized, with merchant data)
- Active budgets and their utilization
- Loan summary (remaining balance, EMIs)
- Investment portfolio (returns, SIP status)
- Goals (progress, timeline)
- Recurring rules (scheduled bills)
- Tax record summary, Monthly review digest, Safe-to-Spend figure

### 20.3 Action Execution
When the Copilot identifies an action request, it returns a structured JSON action object. The client sends this to `POST /api/proactive/copilot/execute-action`, which routes to the **Copilot Action Execution Service** to write the change to the database.

### 20.4 AI Model
Uses **Google Gemini** (`gemini-2.5-flash` with fallback to `gemini-3.5-flash-lite`) with:
- Low temperature (0.1) for deterministic, accurate financial responses
- JSON response mode for structured action outputs
- Multi-model fallback with retry logic to ensure reliability

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
├── main.jsx              # App entry point (GoogleOAuthProvider, Redux store)
├── App.jsx               # Route definitions with lazy-loaded pages
├── pages/                # Route-level page components
│   ├── Dashboard/        # Main dashboard
│   ├── Intelligence/     # Analytics hub (4 tabs)
│   ├── Transactions/
│   ├── Accounts/
│   ├── Investments/
│   ├── Goals/
│   ├── Loans/
│   ├── Reports/
│   ├── Budgets/
│   ├── People/
│   ├── NetWorth/
│   ├── Calendar/
│   ├── Taxes/
│   ├── Bills/
│   ├── Login.jsx, Register.jsx
│   ├── ForgotPassword.jsx, ResetPassword.jsx
│   ├── VerifyEmail.jsx, Profile.jsx
├── components/           # Reusable UI components
│   ├── GoogleAuthButton.jsx
│   ├── AICopilotDrawer.jsx
│   ├── ActionCenterDrawer.jsx
│   ├── CSVImporterModal.jsx
│   ├── OverdraftShieldModal.jsx
│   ├── SalaryDistributorModal.jsx
│   ├── SubscriptionAuditModal.jsx
│   ├── WhatIfSimulatorModal.jsx
│   └── ProtectedRoute.jsx, Pagination.jsx
├── store/                # Redux Toolkit slices
├── services/             # API service functions
├── layouts/              # MainLayout (sidebar + header)
└── utils/                # Helpers (formatCurrency, etc.)
```

### 25.2 Backend Architecture

```
Server/
├── server.js             # Express app entry point
├── config/db.js          # MongoDB connection
├── routes/               # Express router definitions (17 route files)
├── controllers/          # Business logic handlers (17 controllers)
├── models/               # Mongoose schemas (15 models)
├── services/             # Service layer (11 services)
│   ├── aiCopilotService.js
│   ├── budgetGuardrailService.js
│   ├── copilotActionExecutionService.js
│   ├── csvIngestionService.js
│   ├── monthlyReviewService.js
│   ├── ocrReceiptService.js
│   ├── overdraftShieldService.js
│   ├── proactiveIntelligenceService.js
│   ├── salaryDistributorService.js
│   ├── subscriptionDetectorService.js
│   └── whatIfSimulationService.js
├── cron/                 # Scheduled background jobs
│   ├── index.js          # Cron job registration
│   └── jobs/
│       ├── recurringJob.js
│       ├── loanEmiJob.js
│       ├── sipJob.js
│       ├── netWorthJob.js
│       ├── reviewJob.js
│       └── proactiveGuardianJob.js
├── middleware/authMiddleware.js   # JWT protect middleware
└── utils/
    ├── generateToken.js   # JWT signing + cookie setter
    ├── sendEmail.js       # Nodemailer email dispatch
    ├── cache.js           # In-memory TTL cache
    └── merchantCategorizer.js  # Heuristic category assignment
```

### 25.3 Security Design

| Measure | Implementation |
|---------|---------------|
| **JWT in HTTP-only Cookie** | Prevents XSS token theft |
| **bcrypt password hashing** | 10 salt rounds |
| **SHA-256 token hashing** | Verification and reset tokens stored hashed, raw token only in email link |
| **Email enumeration prevention** | Forgot password always returns generic message |
| **Google token verification** | Server-side `verifyIdToken()` with audience check |
| **Auth middleware** | All private routes protected via `protect` middleware |

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

*Document generated based on full codebase analysis of Capise v1.0 — Personal Finance App.*
*Last Updated: September 2026*
