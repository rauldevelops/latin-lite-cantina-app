# Latin Lite Food Delivery Application
## Project Roadmap & Technical Specification

**Document Version:** 1.0  
**Date:** January 16, 2026  
**Target Launch:** July 2026 (MVP)

---

## Executive Summary

Latin Lite is a weekly meal delivery service offering fresh, Latin-inspired meals cooked and packaged every weekday morning. This document outlines the development roadmap for a custom full-stack application to replace the current manual workflow (Microsoft Access + email-based ordering) with an integrated system serving four user types: customers, admin/staff, kitchen, and drivers.

**Primary MVP Goal:** Eliminate manual order entry by connecting customer-facing ordering directly to the backend database, reducing errors and saving hours of administrative work weekly.

---

## Table of Contents

1. [Business Rules & Constraints](#1-business-rules--constraints)
2. [User Roles & Features](#2-user-roles--features)
3. [Phase 1: MVP](#3-phase-1-mvp)
4. [Phase 2: Operations & Logistics](#4-phase-2-operations--logistics)
5. [Phase 3: Analytics & Growth](#5-phase-3-analytics--growth)
6. [Tech Stack Recommendation](#6-tech-stack-recommendation)
7. [Database Schema (Core)](#7-database-schema-core)
8. [Data Migration Plan](#8-data-migration-plan)
9. [Development Timeline](#9-development-timeline)
10. [Cost Estimates](#10-cost-estimates)
11. [Security Considerations](#11-security-considerations)
12. [Open Questions & Decisions](#12-open-questions--decisions)

---

## 1. Business Rules & Constraints

### Ordering Rules
- **Order window:** Customers can order for the upcoming week until Tuesday of that delivery week
- **Delivery days:** Monday through Friday
- **Minimum order:** 3 days per week, at least 1 "completa" per day
- **Completa definition:** 1 entrée + 3 sides (4 individually packaged containers)
- **Maximum per day:** 4 completas + 4 extra entrées + 4 extra sides (current system limit)

### Menu Structure
- **Entrées:** 2-4 options daily (2 rotating specials + 2 staples: Masitas de Pollo, Turkey Picadillo)
- **Sides:** 11-12 options (soups, rice, beans, vegetables, desserts)
- **Menu variants:** ~4 rotating configurations that mix and match between weeks
- **Menu finalization:** Tuesday before the delivery week, published Wednesday

### Delivery & Pricing
- **Delivery zones:** Limited geographic boundaries with potential for expansion
- **Delivery fee structure (proposed):** Fixed fee per delivery day + per-meal/per-bag fee
- **Pickup option:** Available as alternative to delivery
- **Payment methods:** Cash, check, credit card
- **Credit accounts:** Small number of grandfathered elderly customers on payment terms

### Current Scale
- **Active customers:** ~130/week (historically up to 300, capacity for 500)
- **Customer database:** Thousands of past customers to migrate

---

## 2. User Roles & Features

### 2.1 Customers
| Feature | MVP | Phase 2 | Phase 3 |
|---------|-----|---------|---------|
| Account creation/login | ✓ | | |
| Browse weekly menu | ✓ | | |
| Build orders (completas + extras) | ✓ | | |
| Select delivery days | ✓ | | |
| Choose delivery or pickup | ✓ | | |
| Save delivery address | ✓ | | |
| Pay by credit card | ✓ | | |
| View order history | ✓ | | |
| Email order confirmations | ✓ | | |
| Dietary preferences/allergens | | ✓ | |
| SMS notifications | | ✓ | |
| Subscription auto-ordering | | | ✓ |
| Referral program | | | ✓ |

### 2.2 Admin/Staff
| Feature | MVP | Phase 2 | Phase 3 |
|---------|-----|---------|---------|
| View all orders | ✓ | | |
| Create/edit orders on behalf of customers | ✓ | | |
| Manage customer accounts | ✓ | | |
| Create/edit weekly menus | ✓ | | |
| Manage menu items (entrées, sides) | ✓ | | |
| Generate prep sheets (quantities per day) | ✓ | | |
| Process refunds/adjustments | ✓ | | |
| Record cash/check payments | ✓ | | |
| Manage credit account customers | ✓ | | |
| Manage delivery zones | | ✓ | |
| View delivery status | | ✓ | |
| Recipe/ingredient management | | | ✓ |
| Nutritional calculation | | | ✓ |
| Food cost & margin analysis | | | ✓ |
| Profit per meal/order reporting | | | ✓ |
| QuickBooks integration | | | ✓ |

### 2.3 Kitchen
| Feature | MVP | Phase 2 | Phase 3 |
|---------|-----|---------|---------|
| View daily prep sheets | ✓ | | |
| Print prep sheets | ✓ | | |
| Daily cook quantities dashboard | | ✓ | |
| Flag low ingredients | | ✓ | |
| Inventory management | | ✓ | |
| Recipe reference | | | ✓ |

### 2.4 Drivers
| Feature | MVP | Phase 2 | Phase 3 |
|---------|-----|---------|---------|
| View daily delivery list | ✓ | | |
| Print delivery manifest | ✓ | | |
| Mark orders delivered/undelivered | | ✓ | |
| Add delivery notes (gate codes, instructions) | | ✓ | |
| Optimized route calculation | | ✓ | |
| Mobile-friendly interface | | ✓ | |

---

## 3. Phase 1: MVP

**Goal:** Replace manual order entry workflow, accept online payments, generate prep sheets.  
**Timeline:** Months 1-4 (February - May 2026)  
**Target Launch:** Early June 2026 (buffer before July deadline)

### 3.1 MVP Feature Set

#### Customer Portal (Mobile-First Web App)
1. **Authentication**
   - Email/password registration and login
   - Password reset via email
   - Guest checkout option (creates account automatically)

2. **Menu Browsing**
   - View current week's menu organized by day
   - See entrée and side options for each day
   - Clear indication of daily specials vs. staples
   - Menu not visible until published (Wednesday before)

3. **Order Builder**
   - Select delivery days (minimum 3)
   - For each day, build completas (1 entrée + 3 sides)
   - Add extra entrées or sides
   - Real-time price calculation
   - Order summary/review before checkout

4. **Checkout**
   - Confirm/edit delivery address
   - Select delivery or pickup
   - Credit card payment via Stripe
   - Order confirmation screen
   - Email receipt

5. **Account Management**
   - View order history
   - Update profile (name, email, phone)
   - Manage saved addresses
   - View upcoming orders

#### Admin Dashboard
1. **Order Management**
   - List all orders with filters (date, status, customer)
   - View order details
   - Create new order (for phone orders)
   - Edit existing orders
   - Cancel orders and process refunds
   - Record offline payments (cash/check)
   - Mark credit account orders

2. **Customer Management**
   - Search customers
   - View customer details and order history
   - Edit customer information
   - Flag credit account customers
   - Add notes to customer profiles

3. **Menu Management**
   - Create/edit menu items (entrées and sides)
   - Set item availability (staple vs. rotating)
   - Build weekly menus
   - Assign items to specific days
   - Publish/unpublish menus
   - Clone previous weeks as templates

4. **Reporting**
   - Daily prep sheet generation
   - Order counts by day
   - Item quantities needed per day
   - Print-friendly formats
   - Export to PDF

#### Kitchen View
1. **Prep Sheets**
   - View prep requirements by day
   - Quantities for each menu item
   - Print-optimized layout

#### Driver View
1. **Delivery Manifest**
   - List of deliveries for selected day
   - Customer name, address, order contents
   - Print-optimized layout

### 3.2 MVP User Flows

#### Customer: Place an Order
```
1. Visit site → See current menu (or "menu coming soon")
2. Click "Order Now" → Prompted to log in or continue as guest
3. Select delivery days (checkboxes for Mon/Tue/Wed/Thu/Fri, min 3)
4. For each selected day:
   a. Add completa(s): choose 1 entrée + 3 sides
   b. Optionally add extra entrées or sides
5. Review order summary with itemized pricing
6. Enter/confirm delivery address (or select pickup)
7. Enter payment information
8. Submit order → Confirmation page + email
```

#### Admin: Process Phone Order
```
1. Log in to admin dashboard
2. Search for existing customer or create new
3. Click "Create Order"
4. Select week and delivery days
5. Build order same as customer flow
6. Select payment method:
   - Card: enter payment details
   - Cash/Check: mark for collection
   - Credit account: defer payment
7. Save order → Confirmation shown
```

#### Admin: Generate Prep Sheet
```
1. Log in to admin dashboard
2. Navigate to Reports → Prep Sheets
3. Select date
4. View itemized quantities
5. Print or export PDF
```

### 3.3 MVP Data Model (Simplified)

```
Users
├── id, email, password_hash, role, created_at
├── Customers (role = 'customer')
│   └── CustomerProfiles (phone, email, addresses, credit_account, notes)
├── Staff (role = 'admin' | 'kitchen' | 'driver')

MenuItems
├── id, name, type (entree|side), is_staple, price, description, active

WeeklyMenus
├── id, week_start_date, status (draft|published)
└── WeeklyMenuDays
    └── day_of_week, menu_item_id, is_special

Orders
├── id, customer_id, week_start_date, status, payment_status
├── payment_method, stripe_payment_id, total_amount
├── delivery_address, is_pickup, notes, created_at
└── OrderDays
    ├── day_of_week, delivery_fee
    └── OrderItems
        └── menu_item_id, quantity, is_completa_part, completa_group_id

Payments
└── id, order_id, amount, method, status, recorded_by, created_at
```

---

## 4. Phase 2: Operations & Logistics

**Timeline:** Months 5-7 (June - August 2026)

### 4.1 Features

#### Enhanced Customer Experience
- **Dietary preferences:** Save allergens and preferences to profile
- **SMS notifications:** Order confirmations, delivery reminders, menu alerts
- **Order modifications:** Edit orders until Tuesday cutoff

#### Kitchen Dashboard
- **Live prep view:** Real-time updates as orders come in
- **Ingredient alerts:** Flag when supplies may be running low (based on order volume)
- **Basic inventory:** Track stock levels for key ingredients

#### Driver Mobile Interface
- **Route optimization:** Automatic route calculation using Google Maps API
- **Delivery management:** 
  - Mark each stop as delivered/attempted/failed
  - Add notes (gate codes, "leave at door," etc.)
  - Capture signature or photo proof (optional)
- **Customer notes:** View and add persistent delivery instructions
- **Offline support:** Queue updates when connection is poor

#### Delivery Zone Management
- **Zone configuration:** Define delivery boundaries (zip codes or polygon map)
- **Zone-based fees:** Different delivery fees by zone
- **Expansion tracking:** Log requests from outside zones for demand analysis

#### Admin Enhancements
- **Delivery tracking:** See real-time delivery status
- **Driver assignment:** Assign orders to drivers
- **Communication:** Send SMS to customers about delivery issues

---

## 5. Phase 3: Analytics & Growth

**Timeline:** Months 8-12 (September 2026 - January 2027)

### 5.1 Subscription Model

- **Subscription plans:** Weekly recurring orders with set number of completas
- **Preference-based selection:** System auto-selects meals based on dietary preferences
- **Skip/pause:** Easy week skipping without canceling
- **Subscription discounts:** Incentive pricing for subscribers

### 5.2 Recipe & Cost Management

- **Recipe database:** Ingredients and quantities for each menu item
- **Nutritional calculation:** Auto-calculate calories, macros, allergens
- **Food cost tracking:** 
  - Cost per ingredient (with price history)
  - Cost per recipe
  - Cost per meal
- **Margin analysis:**
  - Profit per menu item
  - Profit per order
  - Weekly/monthly reporting

### 5.3 Business Intelligence

- **Customer analytics:**
  - Order frequency and trends
  - Customer lifetime value
  - Churn risk identification
  - Popular items by customer segment
- **Operational analytics:**
  - Demand forecasting
  - Optimal prep quantities
  - Delivery efficiency metrics
- **Financial dashboards:**
  - Revenue by period
  - Costs breakdown
  - Profitability trends

### 5.4 Integrations

- **QuickBooks:** Sync invoices, payments, and expenses
- **Marketing:** Email marketing integration (Mailchimp, etc.)
- **Referral program:** Customer referral tracking and rewards

---

## 6. Tech Stack Recommendation

### 6.1 Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14+ (App Router) | Full-stack React, excellent DX, API routes built-in, great hosting options |
| **Language** | TypeScript | Type safety, better maintainability, catches errors early |
| **Styling** | Tailwind CSS | Rapid development, mobile-first, consistent design system |
| **UI Components** | shadcn/ui | High-quality, accessible components, fully customizable |
| **Database** | PostgreSQL | Robust, relational (perfect for order data), excellent free tiers |
| **ORM** | Prisma | Type-safe database queries, excellent migrations, great DX |
| **Authentication** | NextAuth.js (Auth.js) | Free, flexible, supports multiple providers, built for Next.js |
| **Payments** | Stripe | Industry standard, excellent docs, handles PCI compliance |
| **Email** | Resend | Modern email API, generous free tier (3,000/month), great DX |
| **SMS** | Twilio | Reliable, well-documented, pay-as-you-go |
| **Hosting** | Vercel | Optimized for Next.js, generous free tier, automatic deployments |
| **Database Hosting** | Neon or Supabase | Generous free tiers, managed PostgreSQL, easy setup |
| **File Storage** | Vercel Blob or Cloudflare R2 | For receipts, images if needed |
| **Maps/Routing** | Google Maps API | Route optimization for drivers (Phase 2) |

### 6.2 Why This Stack?

**Aligns with your learning:** You're already studying Next.js, React, TypeScript, and PostgreSQL. No new languages to learn.

**Solo developer friendly:**
- One codebase for frontend and backend
- Excellent documentation for all tools
- Strong typing catches bugs before runtime
- Active communities for support

**Budget conscious:**
- Vercel free tier: 100GB bandwidth, serverless functions included
- Neon free tier: 0.5GB storage, 190 compute hours/month
- Resend free tier: 3,000 emails/month
- Total monthly cost at MVP scale: ~$0-20

**Security:**
- Stripe handles all PCI compliance for card data
- NextAuth.js provides secure session management
- Prisma prevents SQL injection by default
- Vercel provides SSL automatically

**Scalable:**
- Can handle your growth from 130 → 500 customers easily
- Easy to upgrade to paid tiers when needed
- No architectural changes needed to scale

### 6.3 Alternative Considerations

| If you prefer... | Consider... | Trade-off |
|------------------|-------------|-----------|
| More backend control | Separate Express.js API | More setup, two deployments to manage |
| Simpler auth | Clerk | Easier setup, but paid at scale ($25/month after 10k MAU) |
| Cheaper SMS | Amazon SNS | Cheaper but more complex setup |
| Self-hosting | Railway or Fly.io | More control, slightly more DevOps work |

### 6.4 Development Tools

- **Version Control:** GitHub (free for private repos)
- **IDE:** VS Code with TypeScript, Prisma, and Tailwind extensions
- **API Testing:** Thunder Client (VS Code) or Postman
- **Database GUI:** Prisma Studio (built-in) or TablePlus
- **Design:** Figma (free tier) for wireframes if needed

---

## 7. Database Schema (Core)

```prisma
// schema.prisma - Core MVP models

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  CUSTOMER
  ADMIN
  KITCHEN
  DRIVER
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  CREDIT_ACCOUNT
}

enum PaymentMethod {
  CARD
  CASH
  CHECK
  CREDIT_ACCOUNT
}

enum MenuItemType {
  ENTREE
  SIDE
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  role          UserRole  @default(CUSTOMER)
  firstName     String
  lastName      String
  phone         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Customer-specific
  addresses     Address[]
  orders        Order[]
  isCreditAccount Boolean @default(false)
  notes         String?
  
  // Staff-specific
  createdOrders Order[]   @relation("CreatedBy")
  
  @@index([email])
  @@index([role])
}

model Address {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  street        String
  unit          String?
  city          String
  state         String
  zipCode       String
  isDefault     Boolean  @default(false)
  deliveryNotes String?  // Gate codes, special instructions
  createdAt     DateTime @default(now())
  
  orders        Order[]
  
  @@index([userId])
  @@index([zipCode])
}

model MenuItem {
  id          String       @id @default(cuid())
  name        String
  description String?
  type        MenuItemType
  price       Decimal      @db.Decimal(10, 2)
  isStaple    Boolean      @default(false)  // Always available (masitas, picadillo)
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  weeklyMenuItems WeeklyMenuItem[]
  orderItems      OrderItem[]
  
  @@index([type])
  @@index([isActive])
}

model WeeklyMenu {
  id            String   @id @default(cuid())
  weekStartDate DateTime // Monday of the week
  isPublished   Boolean  @default(false)
  publishedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  menuItems     WeeklyMenuItem[]
  orders        Order[]
  
  @@unique([weekStartDate])
  @@index([weekStartDate])
  @@index([isPublished])
}

model WeeklyMenuItem {
  id           String   @id @default(cuid())
  weeklyMenuId String
  weeklyMenu   WeeklyMenu @relation(fields: [weeklyMenuId], references: [id])
  menuItemId   String
  menuItem     MenuItem   @relation(fields: [menuItemId], references: [id])
  dayOfWeek    Int        // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  isSpecial    Boolean    @default(false)  // Daily special vs staple
  
  @@unique([weeklyMenuId, menuItemId, dayOfWeek])
  @@index([weeklyMenuId])
  @@index([dayOfWeek])
}

model Order {
  id              String        @id @default(cuid())
  orderNumber     String        @unique  // Human-readable: LL-2026-001234
  customerId      String
  customer        User          @relation(fields: [customerId], references: [id])
  weeklyMenuId    String
  weeklyMenu      WeeklyMenu    @relation(fields: [weeklyMenuId], references: [id])
  
  status          OrderStatus   @default(PENDING)
  paymentStatus   PaymentStatus @default(PENDING)
  paymentMethod   PaymentMethod?
  
  // Delivery info
  isPickup        Boolean       @default(false)
  addressId       String?
  address         Address?      @relation(fields: [addressId], references: [id])
  
  // Pricing
  subtotal        Decimal       @db.Decimal(10, 2)
  deliveryFee     Decimal       @db.Decimal(10, 2) @default(0)
  totalAmount     Decimal       @db.Decimal(10, 2)
  
  // Stripe
  stripePaymentIntentId String?
  
  // Metadata
  notes           String?
  createdById     String?       // Staff who created (for phone orders)
  createdBy       User?         @relation("CreatedBy", fields: [createdById], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  orderDays       OrderDay[]
  payments        Payment[]
  
  @@index([customerId])
  @@index([weeklyMenuId])
  @@index([status])
  @@index([createdAt])
}

model OrderDay {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  dayOfWeek   Int      // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  deliveryFee Decimal  @db.Decimal(10, 2) @default(0)
  
  orderItems  OrderItem[]
  
  @@unique([orderId, dayOfWeek])
  @@index([orderId])
}

model OrderItem {
  id            String   @id @default(cuid())
  orderDayId    String
  orderDay      OrderDay @relation(fields: [orderDayId], references: [id], onDelete: Cascade)
  menuItemId    String
  menuItem      MenuItem @relation(fields: [menuItemId], references: [id])
  quantity      Int      @default(1)
  unitPrice     Decimal  @db.Decimal(10, 2)
  
  // Completa tracking
  completaGroupId String?  // Groups items that form a completa together
  isCompleta      Boolean  @default(false)  // Is this part of a completa?
  
  @@index([orderDayId])
  @@index([completaGroupId])
}

model Payment {
  id          String        @id @default(cuid())
  orderId     String
  order       Order         @relation(fields: [orderId], references: [id])
  amount      Decimal       @db.Decimal(10, 2)
  method      PaymentMethod
  status      PaymentStatus
  reference   String?       // Check number, Stripe ID, etc.
  recordedById String?
  notes       String?
  createdAt   DateTime      @default(now())
  
  @@index([orderId])
}
```

---

## 8. Data Migration Plan

### 8.1 Overview

Migrate existing customer data from Microsoft Access to PostgreSQL to enable:
- Existing customers to log in without re-registering
- Historical context for customer relationships
- Marketing outreach to inactive customers

### 8.2 Migration Steps

#### Step 1: Export from Access
1. Export customer table to CSV
2. Export any order history if available and clean
3. Document field mappings

#### Step 2: Data Cleaning
1. Standardize phone number formats
2. Validate/clean email addresses
3. Normalize address formats
4. Identify and merge duplicate records
5. Flag credit account customers

#### Step 3: Import Script
```typescript
// Pseudocode for migration script
async function migrateCustomers(csvPath: string) {
  const customers = await parseCSV(csvPath);
  
  for (const customer of customers) {
    // Generate temporary password (will force reset on first login)
    const tempPassword = generateSecureRandom();
    
    await prisma.user.create({
      data: {
        email: customer.email,
        passwordHash: await hash(tempPassword),
        role: 'CUSTOMER',
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: normalizePhone(customer.phone),
        isCreditAccount: customer.creditAccount === 'Y',
        notes: customer.notes,
        addresses: {
          create: {
            street: customer.street,
            city: customer.city,
            state: customer.state,
            zipCode: customer.zip,
            isDefault: true,
            deliveryNotes: customer.deliveryNotes,
          }
        }
      }
    });
  }
}
```

#### Step 4: Customer Communication
1. Email migrated customers about the new system
2. Provide password reset link
3. Highlight benefits of new ordering system

### 8.3 Data Mapping

| Access Field | PostgreSQL Field | Transformation |
|--------------|------------------|----------------|
| CustomerID | (not imported) | Generate new cuid |
| FirstName | firstName | Trim whitespace |
| LastName | lastName | Trim whitespace |
| Email | email | Lowercase, validate format |
| Phone | phone | Format as +1XXXXXXXXXX |
| Address | street | Parse if combined |
| City | city | Standardize |
| State | state | 2-letter code |
| Zip | zipCode | Validate 5-digit |
| CreditAcct | isCreditAccount | Y/N → boolean |
| Notes | notes | Preserve as-is |

---

## 9. Development Timeline

### Month 1 (February 2026): Foundation
**Week 1-2:**
- Set up development environment
- Initialize Next.js project with TypeScript
- Configure Prisma with PostgreSQL
- Set up GitHub repository
- Implement basic project structure

**Week 3-4:**
- Design and implement database schema
- Set up NextAuth.js authentication
- Create basic user registration/login
- Build customer profile management

### Month 2 (March 2026): Menu & Ordering Core
**Week 1-2:**
- Build menu item management (admin)
- Create weekly menu builder (admin)
- Design menu display components (customer)

**Week 3-4:**
- Build order builder UI (customer)
- Implement completa selection logic
- Create order summary and cart
- Build order submission flow

### Month 3 (April 2026): Payments & Admin
**Week 1-2:**
- Integrate Stripe payment processing
- Handle payment success/failure flows
- Build order confirmation and receipts
- Set up Resend for email notifications

**Week 3-4:**
- Build admin order management dashboard
- Create order-on-behalf-of-customer flow
- Implement cash/check payment recording
- Build customer search and management

### Month 4 (May 2026): Reporting & Polish
**Week 1-2:**
- Build prep sheet generation
- Create print-friendly report layouts
- Build delivery manifest view
- Implement order history for customers

**Week 3-4:**
- Responsive design polish (mobile-first)
- Error handling and edge cases
- Performance optimization
- Security audit

### Month 5 (June 2026): Testing & Migration
**Week 1-2:**
- Internal testing with staff
- Data migration from Access
- Staff training

**Week 3-4:**
- Beta testing with select customers
- Bug fixes and refinements
- Soft launch preparation

### Month 6 (July 2026): Launch
**Week 1:**
- Soft launch to existing customers
- Monitor for issues
- Rapid bug fixes

**Week 2-4:**
- Full launch
- Customer support
- Begin Phase 2 planning

---

## 10. Cost Estimates

### Development Phase (Months 1-6)

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Vercel Hosting | $0 | 100GB bandwidth, sufficient for dev/beta |
| Neon PostgreSQL | $0 | 0.5GB storage, 190 compute hours |
| GitHub | $0 | Unlimited private repos |
| Resend Email | $0 | 3,000 emails/month |
| Stripe | 2.9% + $0.30/txn | No monthly fee, only per transaction |
| Google Maps API | $200 credit/month | More than enough for Phase 2 |
| **Total Fixed** | **~$0/month** | |

### Post-Launch Estimates (130 customers)

| Service | Estimated Cost | Calculation |
|---------|----------------|-------------|
| Vercel | $0-20/month | Likely within free tier |
| Neon | $0-19/month | May need Pro for 10GB ($19) |
| Resend | $0/month | ~500 emails/month well within free |
| Twilio (Phase 2) | ~$15/month | ~500 SMS × $0.03 |
| Stripe fees | ~$150/month | Assuming ~$5,000 revenue, 2.9% + $0.30 |
| **Total** | **~$35-50/month** | (excluding Stripe transaction fees) |

### Scale Estimates (500 customers)

| Service | Estimated Cost |
|---------|----------------|
| Vercel Pro | $20/month |
| Neon Pro | $19/month |
| Resend Pro | $20/month (50k emails) |
| Twilio | ~$50/month |
| Stripe fees | ~$600/month (on ~$20k revenue) |
| **Total** | **~$110/month** | (excluding Stripe) |

---

## 11. Security Considerations

### Authentication & Authorization
- Passwords hashed with bcrypt (via NextAuth.js)
- Role-based access control (customer, admin, kitchen, driver)
- Session tokens with secure, HTTP-only cookies
- CSRF protection built into Next.js

### Payment Security
- **No card data stored in your database**
- Stripe handles all PCI compliance
- Use Stripe Elements for card input (never touches your server)
- Store only Stripe customer IDs and payment intent IDs

### Data Protection
- All traffic over HTTPS (automatic with Vercel)
- Database connections encrypted
- Environment variables for all secrets
- Input validation with Zod schemas
- Prisma prevents SQL injection

### Recommended Practices
1. Enable 2FA for admin accounts (Phase 2)
2. Audit log for sensitive actions (order edits, refunds)
3. Regular database backups (Neon does this automatically)
4. Rate limiting on authentication endpoints
5. Input sanitization for all user content

---

## 12. Open Questions & Decisions

### Pricing & Business Logic (RESOLVED)
1. **Delivery fee structure:** Per meal (not per day or flat)
2. **Completa pricing:** Flat bundle price regardless of item selection
3. **Extra items pricing:** A la carte with uniform pricing per category (e.g. all extra entrees same price, all extra sides same price)
4. **Minimum order enforcement:** Hard block — prevent submission and alert user with reason
5. **Order cutoff:** Midnight Tuesday (start of Wednesday)

### Operations (RESOLVED)
6. **Multiple addresses:** No — one delivery address per order
7. **Partial delivery:** Food brought back to store, customer must pick up
8. **Order modifications:** No customer-facing modifications. Admin emergency edits only (not MVP)
9. **Pickup location:** One location

### Technical (RESOLVED)
10. **Email templates:** Brand colors/logo available
11. **Domain:** Domain registered
12. **Existing website:** This app will replace the current site

### Phase 2+ Planning (OPEN)
13. **Subscription frequency:** Weekly only, or also bi-weekly options?
14. **Subscription customization:** Can subscribers exclude certain ingredients/categories?
15. **Driver count:** How many drivers typically? Do they need individual logins?

---

## Next Steps

1. **Review this document** and answer the open questions
2. **Set up development environment:**
   - Install Node.js 20+, VS Code, Git
   - Create GitHub account/repository
   - Create accounts: Vercel, Neon, Stripe (test mode), Resend
3. **Complete Scrimba course** (you mentioned ~1 month remaining)
4. **Begin Month 1 tasks** in late February

I recommend we create a more detailed technical specification for the order builder component, as it's the most complex piece of the MVP. We can also set up the initial project structure together when you're ready to start coding.

---

*Document prepared for Latin Lite by Claude*  
*Last updated: January 16, 2026*
