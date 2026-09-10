# Nepali Threads

A production-oriented ecommerce platform for a family-run Nepali clothing business.

**Live preview:** [nepali-threads.com](https://nepali-threads.com)

Nepali Threads began as my full-stack capstone project and was later rebuilt into the current platform as my family and I moved toward operating it as a real business. The current version is a modern TypeScript/Next.js application with content management, payments, inventory, customer accounts, object storage, transactional email, testing, and production deployment workflows.

## Stack

- **Next.js 16 + React 19 + TypeScript**
- **Payload CMS 3**
- **Neon PostgreSQL**
- **Stripe Checkout + webhooks**
- **Cloudflare R2** object storage
- **Resend** transactional email
- **Vercel** hosting
- Tailwind CSS

## Product capabilities

- Product and variant catalog managed through Payload CMS
- Customer accounts and authentication
- Shopping cart and checkout flows
- Stripe payment processing and webhook handling
- Persistent orders and inventory updates
- Product media stored in Cloudflare R2
- Transactional customer and administrative email
- Inventory-intake validation tooling
- Automated tests, type checking, dependency checks, and production builds

## From capstone to production platform

The original Nepali Threads project was built during my full-time software development program using React, Django, Python, REST APIs, and Stripe. That version is preserved separately in my GitHub history and represents my earlier, primarily hand-coded full-stack work.

The current application is a ground-up modernization designed around the requirements of an actual family business: easier catalog administration, production payments, inventory operations, customer communication, deployment safety, and maintainability.

That progression—from learning full-stack development conventionally to directing a larger AI-assisted production project—is one of the reasons I keep both generations of the application visible.

## Engineering highlights

### Payments and order lifecycle

Stripe Checkout handles payment collection while webhook processing drives server-side order persistence and inventory behavior. Secrets and webhook credentials are supplied through environment configuration and are not stored in the repository.

### Content and inventory

Payload CMS provides the administrative interface and application data model. Inventory tooling includes a dry-run planner that validates incoming CSV data before any live records are changed.

```bash
npm run inventory:plan -- docs/inventory-intake-template.csv
```

### Production verification

The project has a combined verification gate covering tests, type checking, dependency review, and production builds.

```bash
npm run check
```

Individual verification commands are also available:

```bash
npm test
npm run typecheck
npm run audit:production
npm run build
```

## Development approach

The current platform is developed with an **AI-assisted engineering workflow**. I own the business requirements, product direction, architecture decisions, validation, release approval, and operational context. AI tools accelerate implementation, testing, review, debugging, and documentation.

The original capstone remains useful evidence of my pre-AI development foundation; this repository demonstrates how I now use that foundation with modern engineering tools to build larger systems faster.

## Local development

Requirements:

- Node.js 20.18.1+
- npm
- Development PostgreSQL database
- Development credentials for external services as required

```bash
npm install
cp .env.example .env.local
npm run dev
```

The committed `.env.example` contains placeholders only. Production credentials and data should never be committed.

## Repository map

```text
src/app/(frontend)/         Public storefront
src/app/(payload)/          Payload admin and API shell
src/app/api/                Checkout and Stripe webhooks
src/collections/            Payload collections
src/components/storefront/  Storefront components
src/lib/                    Orders, inventory, Stripe, email, formatting
migrations/                 Payload/Postgres migrations
docs/                       Operations and project documentation
```

## Current status

The platform is deployed but still being prepared for public launch. Core storefront, catalog, cart, checkout, order, inventory, account, and email functionality exists; remaining work is focused on production catalog/content, policy content, operational cleanup, and broader integration coverage.

This repository intentionally documents unfinished areas rather than presenting the application as more production-ready than it is.
