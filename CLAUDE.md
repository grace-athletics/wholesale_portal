# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Watch mode
npx vitest run src/test/example.test.ts   # Run a single test file
```

## Architecture

This is a **wholesale B2B portal** for MGB (a sports glove company) built with Vite + React + TypeScript + Tailwind + shadcn/ui. It has two distinct portals under one app: a **client portal** (subscription-gated) and an **admin portal** (role-gated).

### Auth & Access Control

`AuthContext` (`src/contexts/AuthContext.tsx`) is the single source of truth for session state. It loads three things on login: the Supabase session, the `profiles` row (subscription status), and the `user_roles` row (admin | client).

Three route guard components live in `ProtectedRoute.tsx`:
- `PublicOnlyRoute` — redirects logged-in users to the right portal
- `AuthOnlyRoute` — requires auth but not subscription (used for `/subscribe`)
- `ProtectedRoute` — requires auth + optional `requireSubscription` or `requireAdmin`

Admins bypass all subscription checks. Subscription status is polled every 60s via the `check-subscription` Edge Function and synced back to `profiles.subscription_status`.

### Routing

`App.tsx` defines the full route tree. Client routes nest inside a `ProtectedRoute` + `CartProvider` + `AppLayout variant="client"`. Admin routes nest inside `ProtectedRoute requireAdmin` + `AppLayout variant="admin"`. The layout renders either `ClientSidebar` or `AdminSidebar` based on the variant prop.

### Pricing Engine

All pricing logic lives in `src/lib/pricing.ts` — do not duplicate it elsewhere.

Key rules:
- **Stock pricing** unlocks when the cart contains `stock_min_qty` or more units of the *exact same model* (same `product_id` + `leather_type` + `builder_recipe_url` + `has_flag`). `countSameModel()` determines this.
- **Upcharges** stack on top: Japanese Kip leather adds `japanese_kip_upcharge`; flag adds `flag_upcharge`.
- `leather_price_overrides` overrides `base_price` for specific leather types (used for trainer tier pricing).
- `CartContext` calls `recalculateItems()` after every mutation so pricing stays consistent across all items.

Cart is persisted to `localStorage` under key `mgb-cart`.

### Supabase

Client: `src/integrations/supabase/client.ts`. Types auto-generated in `src/integrations/supabase/types.ts` — do not hand-edit.

**Edge Functions** (in `supabase/functions/`):
- `check-subscription` — hits Stripe, updates `profiles.subscription_status`
- `create-checkout` — creates Stripe checkout session for subscription
- `create-order-checkout` — creates Stripe checkout for order payment
- `customer-portal` — opens Stripe billing portal
- `generate-order-pdf` — generates and stores order PDF, updates `orders.pdf_url`
- `auth-email-hook` — custom branded auth emails

**Key tables:** `profiles`, `user_roles`, `products`, `orders`, `order_items`, `order_images`, `order_status_history`, `client_logos`.

Products have flexible pricing fields stored as JSONB: `leather_options`, `leather_price_overrides`, `position_options`.

`client_logos` stores logo URLs per placement zone (palm, thumb, wrist, batting positions) for each user.

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_STRIPE_PUBLISHABLE_KEY
```

### Notes

- `lovable-tagger` (`componentTagger()`) is a Lovable-editor dev tool loaded only in development mode via `vite.config.ts`. It has no effect on production builds and can be removed when fully off Lovable.
- Prices are stored and calculated in **cents** (integers). `formatCents()` in `pricing.ts` handles display formatting.
- The `/mockups` route is intentionally kept but the Mockup Generator opens externally (see comment in `App.tsx`).
