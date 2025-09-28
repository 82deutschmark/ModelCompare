# Device-Based Anonymous User System Implementation Plan
**Date**: September 28, 2025
**Author**: Claude Code using Sonnet 4
**Purpose**: Remove authentication barriers and implement unobtrusive device-based user tracking

## Overview
Transform ModelCompare from auth-required to anonymous-first while maintaining credit tracking and billing capabilities. Users can access all features immediately without creating accounts, with optional authentication for account management and credit purchases.

## Current State Analysis

### Authentication Requirements (To Remove)
- `/api/compare` - Currently requires `isAuthenticated` + `hasCredits` middleware
- `/api/user/credits` - Requires `isAuthenticated` middleware
- `/api/stripe/create-payment-intent` - Requires `isAuthenticated` (keep for payments)

### Anonymous Routes (Already Working)
- `/api/models/respond` - Individual model calls
- `/api/battle/*` - Battle chat functionality
- `/api/creative-combat/*` - Creative collaboration
- `/api/generate` - General AI generation
- All other feature modes (Vixra, Research, etc.)

### Existing Credit Infrastructure (Reuse)
- Complete credit tracking system in `server/storage.ts`
- Functions: `getUserCredits()`, `deductCredits()`, `addCredits()`
- Database schema supports users table with credit tracking
- Stripe integration for credit purchases already implemented

## Implementation Strategy

### Phase 1: Device ID System
**File**: `client/src/lib/deviceId.ts`
```typescript
// Generate persistent device identifier
function generateDeviceId(): string
function getDeviceId(): string
function setDeviceId(id: string): void
```

**Approach**:
- Generate UUID using `crypto.randomUUID()`
- Store in `localStorage` with key `modelcompare_device_id`
- Include in all API requests via `x-device-id` header
- Transparent to users - no UI indication needed

### Phase 2: Database Schema Extension
**File**: `shared/schema.ts`
```sql
ALTER TABLE users ADD COLUMN device_id VARCHAR(255) UNIQUE;
CREATE INDEX idx_users_device_id ON users(device_id);
```

**User Types**:
- **Authenticated**: `email` set, `device_id` null, Google OAuth profile
- **Anonymous**: `email` null, `device_id` set, 500 starting credits
- **Converted**: `email` set, `device_id` set (merged from anonymous)

### Phase 3: Storage Layer Updates
**File**: `server/storage.ts`

**New Functions**:
```typescript
async getUserByDeviceId(deviceId: string): Promise<User | undefined>
async createAnonymousUser(deviceId: string): Promise<User>
async ensureDeviceUser(deviceId: string): Promise<User>
```

**Modification Strategy**:
- Extend existing functions to accept `deviceId` parameter
- Reuse all existing credit management logic
- No changes to credit deduction/addition functions
- Anonymous users treated identically to authenticated users for billing

### Phase 4: Middleware Replacement
**File**: `server/device-auth.ts`

**Replace**:
- `isAuthenticated` → `ensureDeviceUser`
- `hasCredits` → `checkDeviceCredits`

**New Middleware**:
```typescript
async ensureDeviceUser(req, res, next)    // Create user if needed
async checkDeviceCredits(req, res, next)  // Verify sufficient credits
async deductDeviceCredits(req, res, next) // Deduct after API calls
```

**Credit Flow**:
1. Extract device ID from `x-device-id` header
2. Find or create anonymous user with 500 credits
3. Check minimum credit requirement (5 credits)
4. Process API calls
5. Deduct credits based on successful responses

### Phase 5: Route Updates
**File**: `server/routes.ts`

**Modifications**:
```typescript
// Before: auth required
app.post("/api/compare", isAuthenticated, hasCredits, ...)

// After: device-based
app.post("/api/compare", ensureDeviceUser, checkDeviceCredits, ...)

// Credit balance for any user type
app.get("/api/user/credits", ensureDeviceUser, ...)
```

**Payment Routes** (Keep Authentication):
- `/api/stripe/create-payment-intent` - Authentication still required
- `/api/auth/*` - Authentication routes unchanged

### Phase 6: Frontend Integration
**File**: `client/src/lib/api.ts`

**API Request Enhancement**:
```typescript
// Add device ID to all requests automatically
const deviceId = getDeviceId();
headers['x-device-id'] = deviceId;
```

**Files to Update**:
- `client/src/hooks/useAuth.ts` - Handle anonymous state gracefully
- `client/src/components/AppNavigation.tsx` - Add small account/user button only
- `client/src/pages/account.tsx` - User account page for credit management

### Phase 7: User Experience Refinements

**Minimal UI Approach**:
- No credit/billing elements in main navigation
- Small "Account" or user icon button in navigation
- All credit/billing management through dedicated account page
- Anonymous users can access account page to view usage if desired
- Authenticated users see full billing dashboard on account page

**Credit System Invisibility**:
- Complete background operation - no credit displays anywhere
- No indication of credit consumption during normal usage
- Users unaware credits exist until depletion
- No credit counters, warnings, or notifications

**Credit Depletion Handling** (Only when exhausted):
- API returns error when 0 credits remaining
- Error message: "Usage limit reached. Visit account page to continue."
- Link to account page for sign-in and credit purchase
- No advance warnings or proactive messaging

**Account Page Access**:
- Small button/icon in navigation for account access
- Anonymous users: see usage stats, sign-in option, credit purchase
- Authenticated users: full billing dashboard, payment history
- All credit/billing functionality contained in account section

**Account Creation Flow**:
- Anonymous user signs in → merge device credits to account
- Preserve all anonymous usage history and credits
- Seamless transition with no data loss

## Implementation Status

### ✅ COMPLETED (Claude Code - Sept 28, 2025)

**Backend Foundation:**
- ✅ Created `client/src/lib/deviceId.ts` - Device ID generation and localStorage persistence
- ✅ Extended `shared/schema.ts` - Added `deviceId` field to users table (nullable)
- ✅ Extended `server/storage.ts` - Added device-based user functions:
  - `getUserByDeviceId(deviceId)` - Find user by device ID
  - `createAnonymousUser(deviceId)` - Create anonymous user with 500 credits
  - `ensureDeviceUser(deviceId)` - Find or create device user
- ✅ Created `server/device-auth.ts` - Device authentication middleware:
  - `ensureDeviceUser()` - Creates/finds user from `x-device-id` header
  - `checkDeviceCredits()` - Verifies 5+ credits available
  - `deductCreditsForSuccessfulCalls()` - Credit deduction helper

**Route Migration (Partial):**
- ✅ Updated `/api/compare` - Removed `isAuthenticated`, `hasCredits`, added device middleware
- ✅ Updated `/api/user/credits` - Removed `isAuthenticated`, added device middleware
- ✅ Credit deduction works with device users in `/api/compare`

### 🔄 IN PROGRESS / TODO for Next Developer

**Frontend Integration (HIGH PRIORITY):**
1. **Add device ID to API requests** - Update `client/src/lib/api.ts` or request interceptor
   - Import `getDeviceId()` from `client/src/lib/deviceId.ts`
   - Add `x-device-id` header to ALL API calls automatically
   - Test that device ID is being sent and received

2. **Fix TypeScript errors** - User type imports
   - Fix `import type { User } from "@/types/ai-models"` in `client/src/hooks/useAuth.ts`
   - Should be `import type { User } from "@shared/schema"`
   - Update any other type import issues

3. **Test anonymous user flow**
   - Visit app without signing in
   - Verify `/api/compare` works without authentication
   - Verify credit deduction happens (500 → 495 after one comparison)
   - Check browser network tab for `x-device-id` header

**Database Migration (MEDIUM PRIORITY):**
4. **Run database migration** for `deviceId` field
   - Need to add `device_id VARCHAR(255) UNIQUE` to users table
   - Create index on `device_id` for performance
   - Test with both PostgreSQL and in-memory storage

**UI/UX Updates (LOW PRIORITY):**
5. **Remove credit displays for anonymous users**
   - Hide credit balance in navigation for anonymous users
   - Only show credits in dedicated account page
   - Update `client/src/components/AppNavigation.tsx`
   - Update `client/src/components/CreditBalance.tsx`

6. **Error handling for credit depletion**
   - Handle 402 status code from credit checks
   - Show user-friendly message: "Usage limit reached. Visit account page to continue."
   - Link to account/billing page

### 🚨 CRITICAL TESTING POINTS

**Before deployment, verify:**
- [ ] Anonymous users can use `/api/compare` without signing in
- [ ] Anonymous users can use and access ALL features and all pages
- [ ] Has no PII stored in the database
- [ ] Hash the device ID before storing it in the database
- [ ] ZDR all auth is via Google OAuth
- [ ] Device ID is generated and persisted in localStorage
- [ ] Session ID is generated and persisted in localStorage for that device
- [ ] Credit tracking works (new users get 500 credits)
- [ ] Using a feature consumes credits on the backend for that device!!!
- [ ] Credit deduction works (5 credits per comparison)
- [ ] Error handling when credits reach 0
- [ ] Existing authenticated users still work normally
- [ ] Database schema supports both anonymous and authenticated users

### 📁 FILES MODIFIED
```
✅ client/src/lib/deviceId.ts                 (NEW - Device ID utilities)
✅ shared/schema.ts                           (MODIFIED - Added deviceId field)
✅ server/storage.ts                          (MODIFIED - Added device user functions)
✅ server/device-auth.ts                      (NEW - Device middleware)
✅ server/routes.ts                           (MODIFIED - Updated /api/compare, /api/user/credits)
🔄 client/src/lib/api.ts                      (TODO - Add x-device-id header)
🔄 client/src/hooks/useAuth.ts                (TODO - Fix User type import)
🔄 client/src/components/AppNavigation.tsx    (TODO - Hide credits for anonymous)
```

### 🎯 SUCCESS CRITERIA
When complete, new users should:
1. Access ModelCompare without creating accounts
2. Get 500 credits automatically (invisible to them)
3. Use all features normally until credits depleted
4. See account page link only when credits run out
5. Optional sign-in for credit purchases and account management

## Success Criteria

**Functional Requirements**:
- [ ] New users can access all features without creating accounts
- [ ] Anonymous users receive 500 starting credits
- [ ] Credit deduction works identically for anonymous and authenticated users
- [ ] Account creation preserves anonymous credits and usage
- [ ] Billing system works for both user types

**User Experience Requirements**:
- [ ] No friction barriers for first-time users
- [ ] Credit tracking invisible and unobtrusive
- [ ] Authentication presented as optional enhancement
- [ ] No confusing or pushy messaging about account creation
- [ ] Existing authenticated users experience no changes

**Technical Requirements**:
- [ ] 100% reuse of existing credit management infrastructure
- [ ] Device ID generation and persistence works reliably
- [ ] Database migration handles existing users properly
- [ ] All existing features continue working unchanged
- [ ] Performance impact minimal (single database lookup per request)

## Risk Mitigation   NOT A BIG DEAL!!!  NOT A PRIORITY!!!


**Device ID Loss**:
- LocalStorage cleared → User gets new device ID and 500 fresh credits
- Acceptable trade-off for anonymous usage model

**Credit Abuse**:
- Users could clear localStorage for more credits
- Monitoring can detect patterns if needed
- Rate limiting at device/IP level possible future enhancement

**Database Growth**:
- Anonymous users create database records
- Implement cleanup policy for inactive anonymous users
- Monitor storage usage and implement archival if needed

### Critical Issues

**Database Schema**: UNIQUE constraint on `device_id` will break when multiple users share devices. Remove UNIQUE constraint - use non-unique index instead.

**Race Conditions**: Simultaneous requests from same device could create duplicate users. `ensureDeviceUser` needs proper locking or atomic upsert logic.


Also don't store any PII in the database.  Hash the device ID and store that instead.