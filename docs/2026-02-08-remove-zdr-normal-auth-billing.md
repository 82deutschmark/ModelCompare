# Remove ZDR, Implement Normal Auth & Billing

**Date:** 2026-02-08
**Author:** Claude Code using Sonnet 4.5
**Goal:** Rip out the ZDR/device-ID-only approach and implement standard Google OAuth + Stripe like a normal application.

## Context

A previous AI agent implemented a "Zero Data Retention" (ZDR) policy that:
- Removed email, firstName, lastName, profileImageUrl columns from the users table
- Hashed device IDs and Stripe customer IDs before storage
- Made device-ID the primary auth mechanism instead of Google OAuth
- Added ZDR comments throughout the codebase

This was enterprise-grade GDPR compliance on a hobby project with 4-5 users. It broke basic billing functionality (can't send receipts without email) and made the auth flow unnecessarily complex.

**We're removing all of it.**

## What Changes

### 1. Database Schema (`shared/schema.ts`)

**Add columns back to users table:**
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email"),                    // NEW - from Google OAuth
  firstName: varchar("first_name"),           // NEW - from Google OAuth
  lastName: varchar("last_name"),             // NEW - from Google OAuth
  profileImageUrl: text("profile_image_url"), // NEW - from Google OAuth
  deviceId: varchar("device_id"),             // KEEP - still useful for anonymous browsing
  credits: integer("credits").default(500),
  stripeCustomerId: varchar("stripe_customer_id"),  // UNHASH - store plain Stripe ID
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**No payment_transactions table needed** - use Stripe Dashboard for all payment history, refunds, and customer management. That's what it's for.

### 2. Storage Layer (`server/storage.ts`)

- Update `ensureDeviceUser()` to store plain device IDs (remove hashing)
- Update `upsertUser()` to persist email, firstName, lastName, profileImageUrl
- Remove `hashStripeId()` - store Stripe IDs as-is
- Update User type to include new fields

### 3. Google OAuth (`server/auth.ts`)

- GoogleStrategy callback: **persist email/name/photo to database** (currently only in session)
- Remove credit merging complexity (simplify: OAuth user IS the user)
- Remove `(dbManager as any).pool` hack for session store
- Keep device-ID as fallback for anonymous browsing, but OAuth is primary

### 4. Stripe Integration (`server/stripe.ts`)

- **Create Stripe Customer** on first purchase:
  ```typescript
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    metadata: { userId: user.id }
  });
  await storage.updateStripeCustomerId(user.id, customer.id);
  ```
- Attach customer to PaymentIntent
- Enable Stripe receipts (automatic with customer email)
- All payment history, refunds, disputes handled via **Stripe Dashboard** - no custom UI

### 5. Remove ZDR Throughout

**Files with ZDR references to clean up:**
- `shared/schema.ts` - Remove "ZDR" and "NO PII" comments
- `server/device-auth.ts` - Remove "ZDR" comments (lines 259, 267, 277)
- `server/storage.ts` - Remove `hashStripeId()`, remove hashing logic
- `CHANGELOG.md` - Leave history but don't add more ZDR references
- `scripts/migrate-remove-pii.js` - DELETE this file entirely
- `docs/28SeptDeviceID.md` - Leave as historical reference

### 6. Device-ID Strategy Going Forward

Device-ID still serves a purpose: **anonymous users can browse and try the app without signing in.** But:
- Google OAuth is the **primary** auth for paying users
- Device-ID users get 500 free credits to try things out
- When they sign in with Google, their device credits merge into their OAuth account
- Stripe purchases require Google OAuth (need email for receipts)

## Files to Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add email/name/photo columns, remove ZDR comments |
| `server/storage.ts` | Update user methods, remove hashing |
| `server/auth.ts` | Persist OAuth profile data to DB, simplify callback |
| `server/stripe.ts` | Create Stripe customers, attach to payments |
| `server/device-auth.ts` | Remove ZDR comments |
| `scripts/migrate-remove-pii.js` | DELETE |

## Migration

Run `npm run db:push` after schema changes to update PostgreSQL.

Existing users (if any) will get null for new columns until they sign in with Google OAuth, which is fine.

## Verification

1. Start dev server: `npm run dev`
2. Sign in with Google OAuth → verify email/name stored in DB
3. Buy credits → verify Stripe Customer created, payment logged
4. Check Stripe Dashboard → verify customer record exists with email
5. Check Stripe Dashboard → verify transaction visible there (no custom UI needed)
