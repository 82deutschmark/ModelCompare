# Stripe & Google OAuth Gap Assessment — Current Worktree State

**Date:** July 2, 2025  
**Assessed by:** Cascade (Claude Sonnet 4)  
**Worktree:** `ModelCompare-fb6bd3b6`

---

## Executive Summary

Your other developer **fixed 2 of the 4 highest-priority items** from the original gap assessment, but introduced a new bug and left the other 2 untouched. The session store pool access pattern was **NOT fixed**. Here's the full breakdown.

---

## Stripe Implementation — What Got Fixed

### ✅ FIXED: Stripe Customer Creation (was Critical #2)

**Before:** `createPaymentIntent` created payment intents without attaching to a Stripe Customer. `updateStripeCustomerId()` existed but was never called.

**Now:** `server/stripe.ts:98-114` properly implements get-or-create customer logic:
- Checks `user.stripeCustomerId` first
- Creates a new `stripe.customers.create()` with email/name metadata
- Calls `storage.updateStripeCustomerId()` to persist it
- Attaches `customer: customerId` to the payment intent
- Sets `receipt_email: user.email` for Stripe receipts

**Verdict: Fully resolved.**

### ✅ FIXED: Profile Sync on OAuth Login (was OAuth Medium #5)

**Before:** Profile image, name captured once but never updated on subsequent logins.

**Now:** `server/auth.ts:151-161` — the `else` branch for existing users calls `storage.upsertUser()` with the latest Google profile data (email, firstName, lastName, profileImageUrl) on every login.

**Verdict: Fully resolved.**

---

## Stripe Implementation — What's Still Broken

### 🔴 NEW BUG: `getUserById` Does Not Exist

`server/stripe.ts:93` calls `storage.getUserById(userId)` but this method **does not exist** in the `IStorage` interface or any implementation. The interface only has `getUser(id)`. This means **every payment intent creation will throw a runtime error**.

**Fix:** Change `storage.getUserById(userId)` → `storage.getUser(userId)` in `server/stripe.ts:93`.

### 🔴 STILL MISSING: PaymentHistory Component (was Critical #1)

- `client/src/components/PaymentHistory.tsx` — **file does not exist**
- Only `PaymentHistory.README.md` exists (333 lines of documentation for a component that was never built)
- No `/api/billing/transactions` backend endpoint
- No `payment_transactions` table in `shared/schema.ts`
- **Status: Completely unimplemented.**

### 🟡 STILL MISSING: Webhook Handling Incomplete (was Medium #6)

`server/stripe.ts:149-209` still only handles:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

Still missing: `charge.refunded`, `charge.dispute.created`, `customer.subscription.*`

### 🟡 STILL MISSING: No Refund Flow (was Medium #7)

No refund endpoint, no admin interface, no refund tracking.

### 🟡 STILL MISSING: No Payment Method Storage (was Medium #4)

Users must re-enter card details every purchase. No saved payment methods.

### 🟢 STILL PRESENT: Publishable Key Validation (was Minor #8)

`client/src/components/RealStripeCheckout.tsx:29` — `loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '')` passes empty string if key is missing. No validation, no blocking of checkout attempts.

---

## Google OAuth — What's Still Broken

### 🔴 NOT FIXED: Session Store Pool Access Pattern (was Critical #2)

**You specifically asked about this one.**

`server/auth.ts:204-206` still does:
```typescript
const poolAccessor = (dbManager as any).pool;
```

This accesses the **private** `pool` property via `as any` cast. The `DatabaseManager` class (`server/database-manager.ts:37`) declares `private pool`. There is **no `getPool()` public method** on `DatabaseManager`.

The comment on line 205 even acknowledges this: *"Note: This is a workaround since getPool() doesn't exist"*

**This was NOT fixed.** The proper fix would be to add a `getPool()` public method to `DatabaseManager`.

### 🔴 STILL PRESENT: deserializeUser Drops Email/Name (was Critical #1 variant)

`server/auth.ts:90-102` — the `deserializeUser` callback hardcodes `email: null`, `firstName: null`, `lastName: null`, `profileImageUrl: null` instead of reading them from the database result:

```typescript
const fullUser: Express.User = {
  id: user.id,
  email: null,           // ← BUG: should be user.email
  deviceId: user.deviceId || null,
  firstName: null,        // ← BUG: should be user.firstName
  lastName: null,         // ← BUG: should be user.lastName
  profileImageUrl: null,  // ← BUG: should be user.profileImageUrl
  ...
};
```

The `getUser()` query (`storage.ts:472-474`) does `select().from(users)` which returns ALL columns including email/name. But `deserializeUser` throws them away. This means **on every page refresh, the user loses their name/email/avatar** even though it's in the DB.

### 🟡 STILL PRESENT: OAuth Error Handling (was Medium #6)

`server/routes/auth.routes.ts:46` still uses `failureRedirect: '/'` with no error context. No error page, no toast, no query parameter to indicate failure reason.

### 🟡 STILL PRESENT: Refresh Token Not Stored (was Medium #4)

`server/auth.ts:116` receives `refreshToken` but never stores it.

### 🟡 STILL PRESENT: Session Secret Fallback (was Minor #8)

`server/auth.ts:222` still has `'your-secret-key-change-in-production'` as fallback. Should fail hard in production.

### 🟡 STILL PRESENT: No GOOGLE_CLIENT_ID Validation (Env Var gap)

No startup validation for `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`. Will crash with unhelpful error if missing.

---

## Summary Table

| # | Item | Severity | Status | Notes |
|---|------|----------|--------|-------|
| S1 | PaymentHistory component | 🔴 Critical | ❌ Not done | Only README exists |
| S2 | Stripe Customer creation | 🔴 Critical | ✅ **Fixed** | Proper get-or-create flow |
| S3 | Receipt/Invoice generation | 🔴 Critical | ⚠️ Partial | `receipt_email` set, no full invoices |
| S4 | `getUserById` bug | 🔴 Critical | ❌ **NEW BUG** | Will crash at runtime |
| S5 | Webhook handling | 🟡 Medium | ❌ Not done | Only 2 event types |
| S6 | Refund flow | 🟡 Medium | ❌ Not done | |
| S7 | Payment method storage | 🟡 Medium | ❌ Not done | |
| S8 | Publishable key validation | 🟢 Minor | ❌ Not done | |
| O1 | deserializeUser drops fields | 🔴 Critical | ❌ **NEW BUG** | email/name/avatar nulled |
| O2 | Session store pool access | 🔴 Critical | ❌ **Not fixed** | Still uses `(dbManager as any).pool` |
| O3 | Profile sync on login | 🟡 Medium | ✅ **Fixed** | upsertUser on every login |
| O4 | OAuth error handling | 🟡 Medium | ❌ Not done | |
| O5 | Refresh token storage | 🟡 Medium | ❌ Not done | |
| O6 | Session secret fallback | 🟢 Minor | ❌ Not done | |
| O7 | Google env var validation | 🟢 Minor | ❌ Not done | |

---

## Recommended Fix Priority

1. **`getUserById` → `getUser`** in `server/stripe.ts:93` (1-line fix, blocks all payments)
2. **`deserializeUser` field restoration** in `server/auth.ts:90-102` (use `user.email` etc. instead of `null`)
3. **Add `getPool()` to DatabaseManager** and update `auth.ts` to use it
4. **PaymentHistory component** + backend API + transactions table (largest effort)
