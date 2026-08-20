# KOMPASS POS

Master Product, UX, Architecture & Development Specification

Version: 1.0
Product: Kompass POS
Parent Platform: Kompass
Tagline: ONE PLATFORM. EVERY BUSINESS.
Primary Market: South Africa
Initial Target: Small retailers, spaza shops, township businesses, informal traders, salons, barbers, takeaways and other small businesses.

## 1. ROLE

You are the lead software architect, senior full-stack developer, product engineer, UX engineer and QA engineer responsible for designing and building Kompass POS.

You are not merely generating UI screens.
You are responsible for building a production-quality, secure, maintainable, scalable application.

Before implementing any feature:

1. Understand the existing architecture.
2. Inspect existing code before modifying it.
3. Preserve working functionality.
4. Follow the design system.
5. Think about offline behaviour.
6. Think about data integrity.
7. Think about security.
8. Think about mobile usability.
9. Think about multi-tenant SaaS architecture.
10. Do not create fake functionality disguised as completed functionality.

Never sacrifice architecture for visual appearance.

## 2. PRODUCT VISION

Kompass POS is a mobile-first, offline-capable point-of-sale and small-business management platform.
It should replace several manual processes commonly used by small businesses:

- handwritten sales books
- handwritten credit books
- manual stock books
- paper receipts
- manual profit calculations
- manual expiry tracking
- manual stock counts
- spreadsheets
- fragmented customer records

The product should make the business owner's phone function as:
Digital till + stock book + credit book + receipt book + business dashboard.

The long-term product evolves into:
An AI-powered operating system for small businesses.

## 3. CORE DIFFERENTIATOR

Do NOT position Kompass as merely another POS.

The core differentiators are:

1. Offline-first POS
2. Digital Credit Book
3. Batch-level expiry tracking
4. FEFO inventory management
5. Cost and profit intelligence
6. AI-assisted product entry
7. AI business assistant
8. WhatsApp integration
9. Extremely simple mobile UX
10. Designed around real South African small-business workflows

## 4. TARGET USERS

Primary:

- spaza shops
- township retailers
- rural retailers
- convenience stores
- small general dealers
- informal traders
- small food shops
- salons
- barbers
- takeaways
- small service businesses

Secondary:

- boutiques
- hardware stores
- butcheries
- car washes
- repair businesses
- market traders
- small wholesalers

The architecture must support different business types without hard-coding the product exclusively for spaza shops.

## 5. PRODUCT PRINCIPLES

**Simplicity**

The user may have no accounting or software background.

Use "Sales" instead of "Revenue Management".
Use "People Who Owe You" instead of "Accounts Receivable".
Use "Stock" instead of "Inventory Management".
Use "Profit" instead of "Gross Margin".

Advanced reports may use formal accounting terminology.

**Speed**

A normal sale should take only a few seconds.
The POS must be usable during a busy queue.

**Offline first**

Offline is NOT a future feature.
Offline architecture must be considered from the beginning.

The user must be able to continue selling if:

- internet is unavailable
- mobile data runs out
- Wi-Fi fails
- temporary connectivity problems occur

Sales and critical local operations must continue.

## 6. TECHNOLOGY STACK

Use the existing project stack where appropriate.

Preferred architecture:

**Frontend**

- Next.js
- React
- TypeScript
- Tailwind CSS
- PWA
- Responsive design

**Backend**

Prefer:

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security

Use server-side API routes/server actions where appropriate.

**Offline**

Use:

- IndexedDB
- Dexie.js or equivalent local persistence layer
- service worker/PWA caching
- local transaction queue
- background synchronization

**AI**

Abstract the AI provider behind a service layer.
The application should not tightly couple business logic directly to one AI provider.

Potential providers:

- OpenAI
- Anthropic Claude

**Messaging**

Prepare architecture for:

- WhatsApp Cloud API
- email
- SMS

## 7. MULTI-TENANT ARCHITECTURE

Kompass is SaaS.
Every business must be isolated.

Core hierarchy:

```
Platform
  |
  └── Business
        |
        ├── Locations
        |
        ├── Users
        |
        ├── Products
        |
        ├── Customers
        |
        ├── Suppliers
        |
        ├── Sales
        |
        ├── Credit Accounts
        |
        ├── Inventory
        |
        ├── Expenses
        |
        └── Reports
```

Every business-owned record must contain a `business_id`.
Never rely solely on frontend filtering for tenant isolation.
Use PostgreSQL Row Level Security.

## 8. USER ROLES

Initial roles:

**Owner** — Full access.
**Manager** — Sales, inventory, customers, suppliers and reports.
**Cashier** — POS and limited customer functions.
**Stock Manager** — Inventory, stock receiving and stock taking.

Permissions must be configurable later.

## 9. PRIMARY NAVIGATION

Mobile:

```
HOME
SALE
PRODUCTS
CREDIT
MORE
```

MORE:

```
Inventory
Stock Take
Suppliers
Purchases
Customers
Expenses
Reports
Expiry
Settings
```

Desktop/tablet can use a persistent sidebar.

## 10. DASHBOARD

The dashboard should answer:

- How much did I sell today?
- How much profit did I make?
- How much money is owed to me?
- What stock is low?
- What stock is expiring?
- What needs attention?

Example:

```
GOOD MORNING 👋

TODAY

Sales
R4,285

Profit
R1,420

67 sales

----------------------------

CREDIT

R6,420 owed
23 customers

5 overdue

----------------------------

STOCK

7 products low

----------------------------

EXPIRY

3 products expiring soon

----------------------------

AI BUSINESS TIP

Coke 500ml sales increased this week.

Consider checking your stock level.
```

Do not overwhelm the dashboard with charts.
Important information first.

## 11. POS

The POS must be optimized for touch.

Features:

- product search
- barcode scanning
- category browsing
- favourite products
- quick-add products
- quantity controls
- cart
- discounts
- payment methods (cash, card, EFT, other, credit)
- customer selection
- receipt generation
- returns/refunds
- sale cancellation with permissions
- offline sales

## 12. PAYMENT FLOW

Normal flow:

```
Select Products → Cart → Checkout → Select Payment → Confirm →
Sale Recorded → Stock Reduced → Profit Recorded → Receipt Generated
```

Credit:

```
Select Products → Cart → Credit → Select Customer → Confirm Due Date →
Credit Sale Recorded → Stock Reduced → Customer Balance Increased → Receipt Generated
```

## 13. CREDIT BOOK

This is a core feature.
Call the module: CREDIT BOOK
Do not hide it inside generic accounting.
The owner should immediately understand it.

The credit system must support:

- customer profiles
- credit sales
- credit limits
- due dates
- partial payments
- full payments
- outstanding balances
- payment history
- purchase history
- overdue accounts
- reminders
- account statements
- adjustments
- refunds
- credit status

## 14. CUSTOMER PROFILE

Fields: Name, Phone, Address, Optional ID/reference, Credit limit, Notes, Status, Created date.

Do not make sensitive information mandatory.
Only collect information necessary for the business workflow.

## 15. CREDIT SALE

Example:

```
Customer: John Mokoena
Purchase: Coke 500ml x2, Bread x1, Sugar 2kg x1
Total: R86
Previous balance: R214
New balance: R300
Due date: 30 August 2026
```

The system records a CREDIT_SALE transaction.

## 16. PARTIAL PAYMENTS

Example: Outstanding R300, customer pays R100, remaining R200.

Never overwrite historical transactions.
Record: PAYMENT amount = R100.
Balance should be derived from the ledger.

## 17. CREDIT LEDGER

Do NOT simply store `customer.balance = 300` as the source of truth.

Use transactions: CREDIT_SALE, PAYMENT, REFUND, ADJUSTMENT.

Balance is calculated from the transaction ledger.
This ensures an auditable history.

## 18. CREDIT LIMITS

Example: Credit limit R500, current balance R450, new purchase R100.

Show:

```
Credit limit exceeded.
Current balance: R450
New purchase: R100
New balance: R550
Credit limit: R500
```

Allow owner/manager override if permitted.

## 19. CREDIT REMINDERS

Allow configurable reminders: 7 days before due date, 3 days before, due date, 3 days overdue, manually send.

Channels: WhatsApp, SMS, email.
Automated communication must be opt-in.

## 20. PRODUCTS

Product fields: id, business_id, name, description, category_id, barcode, sku, image_url, unit, minimum_stock, active, created_at, updated_at.

Pricing should not be treated as static forever.
Maintain pricing/cost history.

## 21. PRODUCT COST TRACKING

Record: Cost price, Selling price, Markup, Margin, Supplier, Purchase date.

Example: Cost R10, Selling R15, Gross profit R5, Gross margin 33.33%.
The system should automatically calculate these.

## 22. COST HISTORY

If a product changes from R10 cost to R11 cost, do not overwrite historical sale costs.

Every sale item must capture the cost at the time of sale: unit_cost, unit_price, quantity, profit.

This is essential for accurate historical profit reports.

## 23. SELLING PRICE RECOMMENDATIONS

Allow the owner to configure: desired markup %, desired margin %, rounding rules.

Example: Cost R10, Markup 30%, Suggested price R13.

The AI may recommend a price based on available business data.
Never claim a market price unless the application has a reliable market-price source.
AI recommendations must be clearly labelled as recommendations.

## 24. INVENTORY

Inventory must support: stock received, stock sold, stock adjustments, damaged stock, lost stock, returned stock, expired stock, stock transfers later, stock takes, supplier purchases.

Use an inventory movement ledger.
Do not rely exclusively on manually overwriting `current_stock`.

## 25. INVENTORY MOVEMENT TYPES

Examples: PURCHASE, SALE, RETURN, ADJUSTMENT, DAMAGE, EXPIRED, STOCK_TAKE, TRANSFER.

Every movement must be auditable.

## 26. EXPIRY MANAGEMENT

Expiry tracking is a core feature.
Do NOT store expiry only on the product.
Expiry belongs to an inventory batch.

Example:

```
Milk 1L
Batch A: 12 units, Expires 25 Aug
Batch B: 20 units, Expires 5 Sep
Batch C: 30 units, Expires 18 Sep
```

## 27. INVENTORY BATCH

Create `inventory_batches`: id, business_id, product_id, supplier_id, batch_reference, quantity_received, quantity_remaining, unit_cost, received_date, expiry_date, created_at, updated_at.

Expiry date may be nullable for products that do not expire.

## 28. FEFO

Implement First Expired, First Out.

When selling an expiring product:

1. Find available batches.
2. Ignore expired stock unless explicitly permitted.
3. Sort by earliest expiry date.
4. Deduct from the earliest-expiring batch first.
5. Continue into later batches if required.

Example: Batch A 10 units expires 25 Aug, Batch B 20 units expires 5 Sep. Sale of 3 units deducts Batch A = 3, remaining Batch A = 7, Batch B = 20.

## 29. EXPIRY DASHBOARD

Display expiring soon items with categories:

- Normal: > 30 days
- Expiring Soon: <= 30 days
- Urgent: <= 7 days
- Expired: past expiry date

These thresholds should eventually be configurable.

## 30. EXPIRED PRODUCT PROTECTION

Allow the owner to enable: "Prevent sale of expired stock".

If enabled, warn and block the sale. Manager override may be supported later.

## 31. EXPIRY ALERTS

Support dashboard alerts, push notifications, WhatsApp, email, SMS.
Configurable notification periods: 30, 14, 7, 3, 1 days, expired.

## 32. EXPIRY + PROFIT

The system should calculate risk (cost exposure vs. potential revenue/profit at risk).
Display e.g. "R180 of stock cost is at risk if these units expire."
AI may recommend a promotion. Never automatically change the selling price without owner approval.

## 33. BARCODE SCANNING

Support phone camera barcode scanning. Later support external Bluetooth/USB scanners.

Sale flow: Scan → Find product → Add to cart.
Receiving flow: Scan → Find product → Enter quantity → Enter cost → Enter expiry → Save batch.

## 34. AI PRODUCT CAPTURE

Allow: Scan Barcode, Take Photo, Add Manually.

Photo flow: Take photo → AI vision/OCR → Suggest product information → User confirms → Save product.
AI must not silently create incorrect data. Always show suggested values for confirmation.

## 35. EXPIRY OCR

Allow "SCAN EXPIRY DATE" when receiving stock. Use OCR/vision to identify e.g. "EXP 05/09/26" and convert to "5 September 2026". Always require user confirmation before saving.

## 36. STOCK TAKING

Stock Take mode must be fast. Scan product, compare system stock vs. physical count, record difference + reason, save adjustment, create a STOCK_TAKE inventory movement. Never silently modify stock.

## 37. PURCHASING

Allow: Supplier, Product, Quantity, Cost, Date, Expiry, Batch. Inventory increases automatically.

## 38. SUPPLIERS

Supplier fields: Name, Phone, Email, Address, Notes.
Track: purchase history, products supplied, costs, last purchase, price changes.

## 39. RECEIPTS

Every completed sale should generate a receipt with business info, receipt number, date/time, cashier, line items, discount, total, payment method, customer where applicable.
Delivery methods: print, WhatsApp, SMS, email, QR code.

## 40. RETURNS

Support item-level returns. When returned: sale is linked, inventory can increase, profit is reversed, payment adjustment recorded, credit account adjusted if applicable. Require permissions for refunds.

## 41. EXPENSES

Allow simple expense recording (Electricity, Transport, Rent, Stock delivery, Packaging, Other).
Fields: category, amount, description, date, payment_method. Do not turn this into full accounting in V1.

## 42. REPORTING

Initial reports:

- **Sales**: today, yesterday, week, month, custom range
- **Profit**: revenue, cost of goods, gross profit, gross margin
- **Products**: best sellers, slow sellers, low stock, expired, expiring
- **Credit**: total outstanding, overdue, due soon, customer balances, payments received
- **Inventory**: stock value, stock movements, adjustments, expired losses

## 43. AI BUSINESS ASSISTANT

Create an AI assistant that understands the business data and can answer questions like "How much did I sell today?", "Who owes me money?", "What stock is expiring?", etc.
The AI must use authorized business data only. Never expose data belonging to another business.

## 44. WHATSAPP

Prepare integration architecture for WhatsApp: receipts, credit reminders, customer communication, and orders (WhatsApp → Order → POS → Inventory → Payment). Will eventually integrate with the Kompass WhatsApp product.

## 45. OFFLINE-FIRST ARCHITECTURE

This is one of the most important technical requirements.

Local database: IndexedDB. Store locally: products, product image metadata, inventory, customers, credit balances, open cart, recent sales, pending transactions, settings.

Offline: User → Local DB → Transaction Queue.
Online: Transaction Queue → Sync Engine → Supabase.

## 46. SYNC MODEL

Never rely on overwriting values. Two offline devices decrementing the same product must both persist as distinct transactions; inventory is derived from valid movements/transactions, not overwritten.

## 47. OFFLINE TRANSACTION IDS

Every locally-created transaction must have a unique client-generated ID (`client_transaction_id`). This prevents duplicate transactions when retrying synchronization. Sync operations must be idempotent.

## 48. SYNC STATES

Transactions may have: PENDING, SYNCING, SYNCED, FAILED, CONFLICT. Display a small, non-technical sync indicator (✓ Synced / ↻ Syncing… / ⚠ Offline).

## 49. NETWORK STATUS

Show subtle status: "● Online" or "● Offline — sales continue". The second message is important because the user should understand that offline mode is intentional.

## 50. DESIGN SYSTEM

The product must NOT look AI-generated. Avoid excessive gradients, glowing cards, purple AI gradients, excessive glassmorphism, giant rounded pills everywhere, generic futuristic dashboards, excessive emojis, unnecessary animations, overly decorative interfaces.

The product should look like a serious commercial SaaS product designed by a professional product designer.

## 51. BRAND DIRECTION

Primary visual direction: Deep Green + Warm Gold + Off-White. Green communicates growth, money, business, trust, agriculture/community, stability. Gold should be used as an accent, not the dominant colour. Do not make the product look like a banking application.

## 52. RECOMMENDED COLOUR SYSTEM

- Primary (Deep Kompass Green): `#0B5D3B`
- Primary Dark: `#07442C`
- Primary Light: `#E8F3ED`
- Accent Gold: `#D6A84F`
- Warm Gold Light: `#F7EEDB`
- Background: `#F7F8F6`
- Surface: `#FFFFFF`
- Main Text: `#17221D`
- Secondary Text: `#66736C`
- Border: `#DDE4DF`
- Success: green family
- Warning: warm amber
- Danger: a restrained red

Do not use the accent gold for large backgrounds.

## 53. TYPOGRAPHY

Use a professional modern sans-serif. Primary recommendation: Inter (400 body, 500 labels, 600 buttons, 700 headings). Alternative: Manrope. Avoid overly trendy display fonts — the product must feel established and trustworthy.

## 54. UI CHARACTER

Think: Modern South African fintech + Practical retail software + Warm local business identity. Not: AI startup landing page.

Use generous spacing, clear hierarchy, strong typography, subtle borders, modest shadows, 8–12px corner radius, large touch targets, strong contrast.

## 55. GOLD USAGE

Gold should represent important highlights, premium plan, AI insights, special alerts, key business opportunities (e.g. "💡 AI INSIGHT" with a subtle gold background). Do not use gold for every button — primary actions remain green.

## 56. ICONOGRAPHY

Use one consistent icon library — preferred: Lucide Icons. Do not mix multiple icon styles. Icons should support comprehension, not decorate every sentence.

## 57. MOBILE UX

Design mobile-first. Minimum touch target: 44px. Important POS buttons should be larger. The checkout button should always be easy to reach. Avoid tiny text and complex tables on mobile — use cards and expandable sections.

## 58. DESKTOP UX

Desktop can provide sidebar, tables, analytics, reports, management screens — but the same core application must remain usable on a phone.

## 59. DASHBOARD CARD PRIORITY

Priority order: 1. Sales, 2. Profit, 3. Credit, 4. Low stock, 5. Expiry, 6. AI insights. Do not make decorative analytics the primary content.

## 60. DATABASE TABLES

Initial schema: businesses, locations, users, roles, permissions, products, categories, product_price_history, suppliers, supplier_products, purchases, purchase_items, inventory_batches, inventory_movements, customers, credit_accounts, credit_transactions, sales, sale_items, payments, refunds, receipts, expenses, stock_takes, stock_take_items, notifications, ai_insights, audit_logs, sync_queue.

## 61. IMPORTANT DATA INTEGRITY RULES

Never permanently overwrite financial history. Never delete completed sales. Use status: VOIDED, REFUNDED, CANCELLED where appropriate. Every important financial/inventory action must be auditable.

## 62. SECURITY

Implement Supabase RLS, tenant isolation, server-side authorization, role permissions, secure environment variables, no API secrets in frontend, input validation, rate limiting where appropriate, audit logs, secure file uploads, protected AI endpoints. Never trust client-side authorization.

## 63. AUDIT LOG

Record sensitive actions: user, action, entity, entity ID, old value, new value, timestamp, location. Examples: changed product price, voided sale, adjusted stock, changed credit balance, recorded payment, changed user permissions.

## 64. BUSINESS ONBOARDING

New business flow: Create Account → Business Name → Business Type → Location → Currency → Receipt Details → Add First Products → Invite Staff → Start Selling.

Currency should default to ZAR, but the architecture should not hard-code ZAR into the database.

## 65. BUSINESS TYPES

Initial choices: General Retail, Spaza / Convenience, Salon, Barber, Takeaway, Butchery, Boutique, Hardware, Car Wash, Services, Other. Business type can determine default UI configuration later.

## 66. FIRST-RUN EXPERIENCE

The user should be able to reach the first sale quickly: Register → Add product → Sell. Do not force the user through 20 configuration screens.

## 67. PRODUCT ENTRY UX

Offer: Scan Barcode, Take Photo, Add Manually. If barcode exists, find product; if not, offer to create it.

## 68. PRODUCT DETAIL

Show: image, name, selling price, cost price, profit, stock, low stock threshold, expiry, supplier, sales history, cost history.

## 69. AI BUSINESS INSIGHTS

Do not generate random AI summaries. Insights must be based on actual data. Every AI insight should have a reason/data reference internally.

## 70. PERFORMANCE

The POS must feel fast. Avoid unnecessary API requests, loading entire product databases, blocking checkout on network requests, giant client bundles. The POS checkout must work locally first.

## 71. ACCESSIBILITY

Support keyboard navigation, sufficient contrast, screen reader labels, visible focus, large touch targets, readable text. Colour should never be the only status indicator.

## 72. ERROR UX

Do not display technical errors (e.g. `PostgrestException 23505`). Show plain language, e.g.: "We couldn't save that sale yet. Your sale is safely stored on this device and we'll try again when you're connected." Technical details go into logs.

## 73. DEVELOPMENT PHASES

- **Phase 1 — Foundation**: project architecture, authentication, multi-tenancy, business setup, users, roles, design system, responsive shell, database, RLS, PWA foundation, IndexedDB foundation.
- **Phase 2 — POS**: products, categories, POS, cart, payments, receipts, sales history, inventory deductions.
- **Phase 3 — Inventory**: stock receiving, suppliers, batches, stock movements, stock take, low-stock alerts, cost history.
- **Phase 4 — Credit Book**: customers, credit accounts, credit sales, payments, partial payments, balances, due dates, overdue, account history, reminders.
- **Phase 5 — Expiry**: expiry batches, FEFO, expiry dashboard, expiry alerts, expired stock, expiry reports, expiry protection.
- **Phase 6 — Reporting**: sales reports, profit reports, inventory reports, credit reports, expense reports, export.
- **Phase 7 — AI**: AI product capture, OCR expiry capture, AI business assistant, business insights, price recommendations, stock recommendations.
- **Phase 8 — WhatsApp**: WhatsApp receipts, credit reminders, customer messages, WhatsApp orders, integration with Kompass WhatsApp platform.

## 74. TESTING REQUIREMENTS

Every major module requires unit tests (business logic), integration tests (database operations), and E2E tests (important user workflows) — e.g. create→sell→stock decreases→profit calculated; receive→batch→expiry→sell→FEFO deduction; credit sale→balance increases→partial payment→balance decreases; offline sale→internet restored→sync→sale appears server-side.

## 75. OFFLINE TESTING

Explicitly test: start online → load products → disconnect → multiple sales → credit sale → payment → stock adjustment → close/reopen app → restore internet → sync → confirm no duplicates, correct balances, correct inventory, correct profit.

## 76. DEMO DATA

Create optional development/demo data (Demo Store with sample products, customers, credit balances, partial payments, expiring products, suppliers, sales history). Demo data must never leak into production accounts.

## 77. FUTURE FEATURES

Do not implement yet, but architect so they are possible: multi-branch, multi-location inventory, loyalty, promotions, online store, customer ordering, delivery, staff shifts, cash drawer management, VAT, tax reports, accounting integrations, payment terminal integrations, supplier ordering, purchase orders, advanced forecasting, mobile native wrappers, Android/iOS store apps, franchise management.

## 78. PRODUCT PHILOSOPHY

Kompass must feel like "Someone understands how my shop actually works," not "Someone took enterprise accounting software and made the buttons smaller." The product must be simple, fast, local, reliable, affordable, professional, offline-capable, AI-assisted (not AI-dependent).

## 79. BRAND POSITIONING

Primary: Kompass POS. Descriptor: Smart POS & Business Management. Supporting statement: "Sell. Track. Know your business." Alternative: "Your till. Your stock book. Your credit book. Your business — in one app." Do not overload the UI with marketing copy.

## 80. DESIGN DIRECTION

Visual reference: Professional South African fintech + Modern retail POS + Warm community-focused brand + Minimal SaaS UI. Avoid copying competitors' branding, UI, or proprietary assets — research only for feature expectations, UX conventions, market positioning, pricing models, common workflows.

## 81. COMPETITIVE POSITIONING

South African POS products already demonstrate demand for POS, inventory, reporting, barcode scanning, offline capability, customer management, multi-device usage (e.g. iZaphaPRO, SmartSpaza, Spaza POS, Yoco, Quick Till). Kompass differentiates through POS + Offline + Credit Book + Expiry Batches + FEFO + Profit Intelligence + AI + WhatsApp. The Credit Book and expiry management should receive significantly more product attention than generic competitors.

## 82. IMPORTANT DEVELOPMENT RULE

Do not attempt to build every feature simultaneously. Work incrementally. For each phase: design, database, backend, UI, offline behaviour, validation, error handling, tests, mobile testing, review, then proceed. Do not move to the next phase with broken core functionality.

## 83. DEFINITION OF DONE

A feature is not complete merely because the UI exists. A feature is complete when: UI works, mobile works, desktop works where applicable, database works, validation works, authorization works, offline behaviour is defined, synchronization works where applicable, errors are handled, audit trail exists where necessary, tests exist, and loading/empty/success/failure states exist.

## 84. FIRST DEVELOPMENT TASK

Before writing substantial application code: inspect the existing repository, identify current stack, existing routes, existing components, existing database/schema, authentication, environment variables, existing design system, reusable components. Produce a short architecture assessment, then propose the implementation order. Do NOT blindly overwrite the existing application.

## 85. INITIAL BUILD ORDER

1. Design system
2. App shell
3. Authentication
4. Business onboarding
5. Database foundation
6. Product management
7. POS
8. Inventory ledger
9. Offline transaction queue
10. Sync engine
11. Credit Book
12. Batch/expiry management
13. Reports
14. AI
15. WhatsApp

## 86. FINAL PRODUCT TEST

Before declaring MVP complete, verify the real-world scenario of a small rural shop owner (Android phone, 500 products, intermittent internet, credit customers, expiry-dated products, changing supplier costs, one employee) being able to: sell → receive cash → send receipt → sell on credit → record customer → set due date → receive partial payment later → receive new stock → record cost → record expiry → see low-stock products → see expiring products → perform stock take → see profit → lose internet → continue selling → reconnect → synchronize safely.

If this workflow works reliably and simply, Kompass POS has achieved its core purpose.

## 87. THE NORTH STAR

Do not build Kompass to impress developers. Build it so a small-business owner can look at their phone and immediately understand: What did I sell? What did I make? What stock do I have? What is about to expire? Who owes me money? What do I need to buy? Is my business making money?

That is the product.
