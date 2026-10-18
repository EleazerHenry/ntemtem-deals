# CLAUDE.md — Ntemtem Deals

Project context for Claude Code. Read this first, every session.

## What this is

**Ntemtem Deals** is a Ghana e-commerce platform. Customers browse a
curated catalogue of products (phone accessories, car accessories, home
gadgets, fashion, electronics, home essentials), place and pay for orders
online, and the business sources each item from China per order and
delivers it in Ghana.

It is a real client project. The client is the **same owner as Osika
Express** (the China-to-Ghana freight forwarding platform). He paid a
GHS 5,000 deposit of a GHS 15,000 total build.

## Business model — IMPORTANT

- **Pre-order / order-on-demand.** There is NO stock. The client sources
  each product from China after the customer orders and pays.
- Delivery time: **10-12 days after purchase** — shown clearly on every
  product so customers know what to expect.
- The schema supports an `IN_STOCK` stock type for the future (hybrid
  model) but EVERYTHING launches as `PREORDER`.

## Who's who

- Developer: Eleazer Henry (Kobby), Pegasus Dev Corp, Cape Coast, Ghana
- Client: owner of Ntemtem Deals (same person as Osika Express client)

## Tech stack (same as Osika Express — proven)

- Next.js 16 (App Router, no Cache Components) + TypeScript
- Tailwind CSS + shadcn/ui components
- Prisma v6 ORM (NOT v7) + PostgreSQL on Supabase
- NextAuth (credentials provider, JWT) — email + password, no OAuth for v1
- Paystack for payments (card + MoMo all networks)
- Cloudinary for product photos (q_auto, f_auto, c_limit w_1200)
- Deployed on Vercel
- Package manager: npm only (never pnpm/yarn)

## Brand

- Logo: Ntemtem Deals — a fast shopping cart with a shopping bag,
  Ghana flag accents. Tagline "Fast Deals • Quality Products • To Ghana"
- Brand colours: **orange #F7941D / #F57C00 (primary), black #1A1A1A,
  Ghana accents (red #CE1126, gold #FCD116, green #006B3F)**
- Feel: premium, modern, Shopify-level polish. NOT a cheap template.
- Logo files go in public/ — use a transparent PNG for navbar/footer.

## The schema (13 models)

See prisma/schema.prisma. Models: User, Category, Product,
ProductVariant, Address, DeliveryZone, Cart, CartItem, Order,
OrderItem, OrderStatusHistory, Payment, Coupon.

Key design decisions:
- Products have OPTIONAL variants (hasVariants flag). Simple products
  sell directly; products with options (colours, sizes) use variants.
- OrderItem stores SNAPSHOTS (productName, variantName, price) so order
  history never changes when a product is later edited. Critical.
- Guest checkout allowed: Order can belong to a userId OR carry
  guestName/guestEmail/guestPhone with no account.
- Every order status change writes an OrderStatusHistory row for the
  customer-facing tracking timeline.

## Order lifecycle

PENDING (ordered, awaiting payment) -> CONFIRMED (paid) ->
SOURCING (being bought in China) -> SHIPPED (en route) ->
ARRIVED (in Ghana) -> DELIVERED. Plus CANCELLED.

## Delivery

Four cities with admin-editable fees: Accra, Kumasi, Cape Coast,
Takoradi. Free pickup possible per city (isPickup flag). Fees come
from the DeliveryZone table (awaiting client's actual figures).

## Payments

Paystack handles card + all MoMo networks through one integration.
Flow: /api/payments/initialize -> Paystack checkout -> callback ->
verify against Paystack API -> mark order CONFIRMED + payment SUCCESS.
Test card: 4084 0840 8408 4081. Graceful fallback when keys missing.

## The two sides of the product

1. STOREFRONT (customers) — premium, Shopify-level:
   - Landing page: hero, featured products, category tiles, promos
   - Catalogue: grid, search, filter by category/price, sort
   - Product detail: photos, description, price, delivery estimate,
     variant selector, add to cart
   - Cart (slide-in drawer) + checkout (address -> payment -> confirm)
   - Guest checkout with optional account creation at the end
   - Customer account: order history, order tracking timeline, profile
   - WhatsApp floating button + "Chat to order" links (Ghana commerce)
   - About, Contact, FAQ, policies (delivery, returns, terms)

2. ADMIN (client runs it himself — like Shopify admin):
   - Products: add/edit/delete, upload photos (drag & drop, Cloudinary),
     set price + compare-at price, assign/create categories, add
     variants, mark featured/active. MUST be simple for a non-technical
     owner — plain language, previews, hints, mobile-friendly.
   - Orders: view all, update status (writes OrderStatusHistory),
     see customer + delivery details, mark paid/delivered
   - Delivery zones: edit fees per city
   - Coupons: create discount codes
   - Settings: business info, policies, about text
   - Dashboard: sales, orders, revenue, top products

## v1 scope (what GHS 15,000 covers)

IN: full storefront, self-service admin, Paystack payments, guest
checkout, discount codes, order tracking timeline, WhatsApp button,
4-city delivery, Cloudinary product photos.

OUT (post-beta / v1.1): product reviews & ratings, wishlist, real
stock-quantity tracking, loyalty points, abandoned-cart emails,
SMS notifications, Google OAuth.

## Conventions

- npm only. Prisma stays v6.
- All API routes: try/catch, Zod validation, proper HTTP codes,
  getServerSession for protected routes, ADMIN role check on /api/admin/*.
- Graceful fallback for all third-party services (Paystack, Cloudinary)
  so missing keys never crash the app.
- Keep .env and .env.local in sync, both gitignored. Never commit secrets.
- After a schema change: npx prisma db push then npx prisma generate.
- Confirm Vercel build is GREEN before reporting a task done — a failed
  build means the live site hasn't changed.
- Each client owns their own infrastructure (Supabase, Vercel, Cloudinary,
  Paystack, domain). Ntemtem gets fresh accounts — separate from Osika.

## Build order (phases)

0. Foundation: schema -> DB, design system, repo, CLAUDE.md  <- current
1. Admin product management (so client can add products in parallel)
2. Storefront catalogue (homepage, category, product detail)
3. Cart + checkout
4. Paystack payments
5. Customer accounts + order tracking
6. Polish (premium design pass, mobile, WhatsApp, deploy)

## Working style

- Work one feature at a time, commit each separately.
- Run npm run dev and verify after each. Confirm Vercel green after push.
- If a component has 3+ interactive features, split the build into parts
  (avoids request timeouts — learned on Osika shipments client).
- If anything is ambiguous, ask before large changes.

## Outstanding from client (chasing)

- Delivery fees per city (Accra/Kumasi/Cape Coast/Takoradi)
- Free pickup location(s)?
- Paystack account opened + test keys
- WhatsApp number, email, socials for the site
- Confirmed: refunds yes (T&C apply); domain ntemtemdeals.com;
  delivery 10-12 days; he uploads products & photos himself.
