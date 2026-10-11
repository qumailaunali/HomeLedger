# HomeLedger 🏠💰

A modern, fast, and elegant Household Expense Management Progressive Web Application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **Neon PostgreSQL**.

Designed to replace manual Excel-based household expense spreadsheets with zero friction, instant daily data entry, and automatic yearly budget tracking.

---

## 🌟 Key Features

### 1. Unified Balance & Inflow System
- **Automatic Current Balance Calculation**:
  $$\text{Balance} = \text{Starting Balance} + \text{Total Money Received} - \text{Total Expenses}$$
- Dedicated **"Receive Money"** inflow recording with sources (*Salary, House money, Cash received, Bank Transfer*).
- Safe decimal financial arithmetic preventing floating-point inaccuracies.

### 2. Three Specialized Expense Categories
- **Home Expenses**: Regular household bills, groceries, van fees, petrol, maid salary (*Masi*), and maintenance.
  - Expected monthly amounts with visual progress indicators (*Within Budget, Near Budget, Over Budget*).
- **Shopping Expenses**: Personal yearly budgets tracked individually for each family member (*Sarah, Qumail, Taha, Farida, Others*).
  - Multi-year budget tracking (*2025, 2026, 2027*) protecting historical data.
  - Dedicated "Others" category for general household goods (*Eye glasses, medicine, car wash, etc.*).
- **Outing & Dining Expenses**: Restaurant bills with venue, party size, payment method, average cost, and largest outing records.

### 3. Rapid Daily Data Entry (< 5 seconds)
- Prominent **`+ Add Expense`** button accessible from anywhere on mobile or desktop.
- Auto-focusing amount field with mobile numeric keyboard support (`inputMode="decimal"`).
- **"Save & Add Another"** for entering multiple expenses in rapid succession.
- 1-click **Duplicate Expense** action.

### 4. Excel-Style Spreadsheet View (`/records`)
- Dedicated spreadsheet table view with sticky headers and zebra striping.
- Running balance computed per transaction row.
- Instant search across descriptions, categories, persons, places, and amounts.
- Type filtering (*All, Home, Shopping, Outing, Received*).
- Safe deletion modal with transaction details verification.
- Modal editing with automatic recalculation of balances and budgets.

### 5. Financial Analytics (`/analytics`)
- 6-month spending and inflow comparison charts.
- Donut expense division breakdown (*Home vs Shopping vs Outing*).
- Home expense category ranking by percentage of total spend.
- Family shopping budget comparison bar charts.
- Outing analytics (*Average cost, largest outing, visit frequency*).

### 6. Excel & CSV Export / Import (`/export`)
- **Multi-Sheet Excel Workbook (`.xlsx`)**: Formatted worksheets for *Summary, Home, Shopping, Outing, and Received Money*.
- Universal CSV export and full JSON database backups.
- **CSV Import Workflow**: Upload $\rightarrow$ Validation Preview $\rightarrow$ Confirm & Import.

### 7. Progressive Web App (PWA)
- Installable on iPhone, Android, and Desktop as a standalone application.
- Responsive mobile bottom navigation bar with elevated touch target.
- Desktop sidebar with collapsible layout.
- Light, Dark, and System theme support with persistence.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24)
- PostgreSQL database (Neon Serverless PostgreSQL connection configured)

### 1. Environment Setup
Create a `.env` file in the project root:
```env
# Neon PostgreSQL Connection URL
DATABASE_URL="postgresql://neondb_owner:npg_biEN6n4WdyPu@ep-purple-wave-b3sjrqdu-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Neon S3-compatible Object Storage
AWS_ENDPOINT_URL_S3="https://br-dawn-hat-b3vn8i9v.storage.c-4.ap-southeast-1.aws.neon.tech"
AWS_ACCESS_KEY_ID="nak_live_f6519b2f5c7d400fa09018798e909b8e"
AWS_SECRET_ACCESS_KEY="nsk_live_95d78ee0e00a8bc4f6e102685dea067043b231489a6de792c7fabc4a9eaeb49f"
AWS_REGION="ap-southeast-1"

# JWT Secret
JWT_SECRET="homeledger-production-ready-jwt-secret-key-999238"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Database Sync & Realistic Data Seeding
Synchronize Prisma schema with Neon PostgreSQL and seed realistic Pakistani household records:
```bash
# Push schema to PostgreSQL
npx prisma db push

# Seed categories, shopping limits, income, and expenses
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Financial Unit Tests
```bash
npm run test
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## 📂 Project Structure

```
HomeLedger/
├── prisma/
│   ├── schema.prisma       # PostgreSQL schema (Household, User, Expense, Income, etc.)
│   └── seed.ts             # Realistic seed data (Sarah, Qumail, Taha, Masi, Madrasa, etc.)
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker for offline app shell
│   └── icon-192.png        # PWA app icons
├── src/
│   ├── app/
│   │   ├── actions.ts      # Server Actions (CRUD, settings, import, seeding)
│   │   ├── layout.tsx      # Root layout with ThemeProvider, ToastProvider & PWA
│   │   ├── page.tsx        # Dashboard page with financial overview
│   │   ├── records/        # All Records (Excel spreadsheet view)
│   │   ├── home/           # Dedicated Home expenses table & budget status
│   │   ├── shopping/       # Dedicated Shopping expenses table & yearly budgets
│   │   ├── outing/         # Dedicated Outing dining table & metrics
│   │   ├── analytics/      # Financial charts & category breakdowns
│   │   ├── export/         # Multi-sheet Excel export, CSV, and import workflow
│   │   └── settings/       # Household settings, categories & yearly budget limits
│   ├── components/
│   │   ├── dashboard/      # Summary cards, spending charts, shopping progress
│   │   ├── modals/         # Quick Add Expense, Receive Money, Edit, Safe Delete
│   │   ├── navigation/     # Desktop Sidebar, Mobile Bottom Nav, Top Bar
│   │   └── ui/             # Toast notification system
│   ├── lib/
│   │   ├── currency.ts     # Precise decimal arithmetic & PKR formatting
│   │   ├── date.ts         # Timezone-safe calendar date handling
│   │   ├── ledger-service.ts# Server calculations for balances and summaries
│   │   └── prisma.ts       # Prisma client singleton
│   └── tests/
│       └── financial-calculations.test.ts # Financial calculation test suite
```
