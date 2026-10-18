HANDOFF PROMPT — paste as your first message to Claude Code
============================================================

You are starting a new project: NTEMTEM DEALS — a premium Ghana
e-commerce platform. A CLAUDE.md file is in the project root with the
full context — read it first.

This is the developer's first e-commerce build, so we are being
deliberate: foundation first, then build in phases. Quality and a
Shopify-level premium feel are the goal.

## Before writing any code

1. Read CLAUDE.md in the project root.
2. Read prisma/schema.prisma — understand all 11 models, especially:
   - Products have OPTIONAL variants (hasVariants flag)
   - OrderItem stores SNAPSHOTS so order history never changes
   - Guest checkout: Order can be a user OR guest contact details
   - Every status change writes an OrderStatusHistory row
3. Confirm the stack is set up: Next.js 14, Prisma v6, Tailwind,
   shadcn/ui, npm. Run npm install, then npm run dev, confirm it starts.
4. Report back before building.

## Phase 0 — Foundation (do this first)

- Set up the Prisma schema (already provided) and run npx prisma db push
  against the Ntemtem Supabase project (fresh — NOT the Osika one).
- Run npx prisma generate.
- Run the seed (npx prisma db seed) — creates admin, categories,
  delivery zones, sample coupon. (Products are added by the client
  himself later via the admin.)
- Set up a design system matching the brand: orange #F7941D primary,
  black #1A1A1A, Ghana accents. Premium, modern, NOT templated. Use the
  frontend-design approach — intentional typography, generous
  whitespace, consistent components.
- Confirm the DB connection works (npx prisma studio shows the seeded
  rows).

Report back when Phase 0 is green, then we will do Phase 1.

## The phases after (do NOT start these yet)

1. Admin product management — so the client can add products in parallel
   with the rest of the build. Add/edit/delete products, Cloudinary photo
   upload (drag & drop), categories, variants, featured/active. Must be
   SIMPLE for a non-technical owner.
2. Storefront catalogue — homepage, category pages, product detail.
3. Cart (slide-in drawer) + checkout (address -> payment -> confirm),
   guest checkout with optional account creation.
4. Paystack payments — card + MoMo, verify on callback.
5. Customer accounts + order tracking timeline.
6. Polish — premium design pass, mobile, WhatsApp button, deploy.

## Rules

- Work one feature at a time, one commit each. Confirm Vercel build GREEN
  after every push before reporting done.
- If a component has 3+ interactive features, split the build into parts
  (avoids request timeouts).
- npm only. Prisma v6. Never commit secrets (.env, .env.local gitignored).
- Graceful fallback for Paystack and Cloudinary so missing keys never
  crash the app.
- All /api/admin/* routes check the ADMIN role.
- If anything is ambiguous, ask before large changes.

## Start here

Do the 4 pre-flight checks, then Phase 0. Report back.
