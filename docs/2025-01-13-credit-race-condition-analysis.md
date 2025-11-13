# Credit System Race Condition - Analysis and Solution

**Date:** 2025-01-13
**Author:** Claude Code using Sonnet 4
**Priority:** CRITICAL - Security and Billing Issue

## Executive Summary

The current credit system has a critical race condition that allows users to make unlimited API calls by sending concurrent requests. Additionally, multiple endpoints that make expensive AI model calls have NO credit checks at all.

## Problems Identified

### 1. Race Condition in Credit Check/Deduction Flow

**Current Flow:**
```
Request 1 → checkCredits (500 credits) → PASS → Make API calls → Deduct 5 credits
Request 2 → checkCredits (500 credits) → PASS → Make API calls → Deduct 5 credits
Request 3 → checkCredits (500 credits) → PASS → Make API calls → Deduct 5 credits
```

All three requests pass the credit check before any deduction occurs, allowing users to bypass credit limits with concurrent requests.

**Root Cause:**
- `checkDeviceCredits()` (device-auth.ts:58) performs a READ operation
- Model calls execute (expensive AI operations)
- `deductCreditsForSuccessfulCalls()` (device-auth.ts:124) performs a WRITE operation
- Time gap between READ and WRITE allows race conditions

### 2. Missing Credit Checks on Critical Endpoints

The following endpoints make expensive AI model calls but have **NO authentication or credit checks**:

1. **`POST /api/models/respond`** (models.routes.ts:146)
   - Makes direct model calls
   - NO `ensureDeviceUser` middleware
   - NO `checkDeviceCredits` middleware
   - NO credit deduction

2. **`POST /api/generate`** (generate.routes.ts:18)
   - **PRIMARY UNIFIED ENDPOINT** for all modes
   - Used by: creative, battle, debate, compare, arc-agent, plan-assessment, vixra
   - Can make multiple parallel model calls
   - NO authentication
   - NO credit checks
   - NO credit deduction

3. **`POST /api/debate/session`** (debate.routes.ts:602)
   - Creates debate sessions
   - NO credit checks

4. **`POST /api/debate/stream/init`** (debate.routes.ts:663)
   - Initializes streaming debate
   - NO credit checks

### 3. Inconsistent Credit Deduction

Only `/api/models/compare` currently deducts credits. Other endpoints that make model calls do not deduct credits at all.

## Technical Details

### Current Credit Flow (storage.ts)

**PostgreSQL Implementation (lines 546-556):**
```typescript
async deductCredits(userId: string, amount: number): Promise<User> {
  const [result] = await requireDb()
    .update(users)
    .set({
      credits: sql`${users.credits} - ${amount}`,  // ← This is atomic but...
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return result;
}
```

While the SQL operation itself is atomic, the problem is:
1. Credit check happens BEFORE the expensive operation
2. Deduction happens AFTER the expensive operation
3. No locking or reservation mechanism

**In-Memory Implementation (lines 1129-1144):**
```typescript
async deductCredits(userId: string, amount: number): Promise<User> {
  const user = this.users.get(userId);
  if (!user) throw new Error(`User with id ${userId} not found`);

  const currentCredits = user.credits ?? 0;
  const updated: User = {
    ...user,
    credits: Math.max(0, currentCredits - amount),  // ← Not atomic
    updatedAt: new Date(),
  };

  this.users.set(userId, updated);
  return updated;
}
```

Even worse - the in-memory implementation is definitely not atomic and susceptible to race conditions.

### Device Authentication Flow (device-auth.ts)

```typescript
// Line 29 - ensureDeviceUser: Creates or finds user
async function ensureDeviceUser(req, res, next) {
  const deviceId = req.headers['x-device-id'];
  const user = await storage.ensureDeviceUser(deviceId);
  req.deviceUser = user;
  next();
}

// Line 58 - checkDeviceCredits: Checks if user has enough credits
async function checkDeviceCredits(req, res, next) {
  const user = req.deviceUser;
  const credits = await storage.getUserCredits(user.id);  // ← READ

  if (credits < 5) {
    return res.status(402).json({ error: 'Insufficient credits' });
  }

  next();  // ← Continue to expensive operation WITHOUT reserving credits
}

// Line 124 - deductCreditsForSuccessfulCalls: Deducts after operation
async function deductCreditsForSuccessfulCalls(req, successfulCalls) {
  const creditsToDeduct = successfulCalls * 5;
  await storage.deductCredits(req.deviceUser.id, creditsToDeduct);  // ← WRITE
}
```

## Solution Architecture

### Approach: Optimistic Credit Reservation

Instead of check → execute → deduct, we need:
**reserve → execute → commit/refund**

### Implementation Plan

#### Phase 1: Atomic Credit Reservation (CRITICAL)

**New Storage Methods:**
```typescript
interface IStorage {
  // Reserve credits before operation (atomic)
  reserveCredits(userId: string, amount: number): Promise<{
    success: boolean;
    reservationId?: string;
    remainingCredits?: number;
  }>;

  // Commit reservation after successful operation
  commitReservation(reservationId: string): Promise<void>;

  // Refund reservation if operation fails
  refundReservation(reservationId: string): Promise<void>;

  // Get pending reservations for a user (for debugging)
  getUserPendingReservations(userId: string): Promise<number>;
}
```

**PostgreSQL Implementation:**
Add a `credit_reservations` table:
```sql
CREATE TABLE credit_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'committed', 'refunded'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_credit_reservations_user_status
  ON credit_reservations(user_id, status);
```

**Algorithm:**
1. **Reserve:**
   - Check current credits - pending reservations ≥ amount needed
   - Create reservation record with 5-minute expiry
   - Return reservation ID

2. **Commit:**
   - Mark reservation as 'committed'
   - Deduct credits from user

3. **Refund:**
   - Mark reservation as 'refunded'
   - No credit deduction occurs

4. **Auto-cleanup:**
   - Background job expires reservations > 5 minutes old
   - OR: Expire on credit check (lazy cleanup)

#### Phase 2: New Credit Middleware (CRITICAL)

```typescript
// New middleware: reserveDeviceCredits
async function reserveDeviceCredits(
  req: Request,
  res: Response,
  next: NextFunction,
  creditsNeeded: number = 5
) {
  const user = req.deviceUser;
  if (!user) {
    return res.status(500).json({ error: 'No user session' });
  }

  const reservation = await storage.reserveCredits(user.id, creditsNeeded);

  if (!reservation.success) {
    return res.status(402).json({
      error: 'Insufficient credits',
      message: 'You have reached your usage limit.',
      credits: reservation.remainingCredits || 0,
      requiresPayment: true
    });
  }

  // Store reservation ID for commit/refund
  req.creditReservation = reservation;
  next();
}

// New middleware: commitOrRefundCredits
async function commitOrRefundCredits(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.creditReservation) {
    return next();
  }

  // Check if operation succeeded
  const succeeded = res.locals.operationSucceeded || false;

  if (succeeded) {
    await storage.commitReservation(req.creditReservation.reservationId);
  } else {
    await storage.refundReservation(req.creditReservation.reservationId);
  }

  next();
}
```

#### Phase 3: Update All Model Endpoints (CRITICAL)

**Priority Endpoints to Fix:**

1. **`POST /api/generate`** - Unified endpoint (HIGHEST PRIORITY)
   - Add `ensureDeviceUser` middleware
   - Add dynamic credit reservation based on seats count
   - Add commit/refund logic

2. **`POST /api/models/respond`** - Single model response
   - Add `ensureDeviceUser` middleware
   - Add `reserveDeviceCredits` middleware
   - Add commit/refund logic

3. **`POST /api/models/compare`** - Already has basic checks
   - Update to use reservation system

4. **All debate endpoints** - Multiple streaming operations
   - Add credit checks
   - Add reservation system

#### Phase 4: Testing Strategy

**Unit Tests:**
- Test reservation atomicity
- Test concurrent reservations
- Test commit/refund flows
- Test expiry cleanup

**Integration Tests:**
- Send 100 concurrent requests with 10 credits
- Verify only 2 requests succeed
- Verify remaining requests get 402 error
- Verify credits are exactly 0 or 5 (no over-deduction)

**Load Tests:**
- Stress test with 1000 concurrent requests
- Verify no race conditions
- Verify database performance

## Implementation Priority

### Immediate (Today):
1. ✅ Create this analysis document
2. ⏳ Implement `reserveCredits`, `commitReservation`, `refundReservation` in storage
3. ⏳ Add `credit_reservations` table to schema
4. ⏳ Create reservation middleware

### Urgent (Next):
5. ⏳ Add credit checks to `/api/generate` endpoint
6. ⏳ Add credit checks to `/api/models/respond` endpoint
7. ⏳ Update `/api/models/compare` to use reservation system

### Important (After):
8. ⏳ Add credit checks to debate endpoints
9. ⏳ Implement cleanup job for expired reservations
10. ⏳ Write integration tests
11. ⏳ Load testing and optimization

## Estimated Impact

**Current State:**
- Users can make unlimited API calls with concurrent requests
- Major cost exposure to AI API bills
- System can be easily abused

**After Fix:**
- Atomic credit reservations prevent race conditions
- All endpoints properly enforce credit limits
- Fair usage enforcement
- Protected from abuse

## Files to Modify

1. `shared/schema.ts` - Add credit_reservations table
2. `server/storage.ts` - Add reservation methods (both DB and Memory)
3. `server/device-auth.ts` - Add reservation middleware
4. `server/routes/generate.routes.ts` - Add credit checks
5. `server/routes/models.routes.ts` - Update to use reservations
6. `server/routes/debate.routes.ts` - Add credit checks
7. `server/routes/creative.routes.ts` - Add credit checks (if still used)

## Questions for User

1. **Credit Pricing:** How many credits should each operation cost?
   - Single model call: Currently 5 credits
   - Multi-model compare: 5 credits per model?
   - Debate mode: Per turn or per session?
   - Streaming: Per chunk or per session?

2. **Reservation Expiry:** How long should credit reservations last?
   - Suggestion: 5 minutes (covers long AI responses)
   - Or: Dynamic based on operation type?

3. **Cleanup Strategy:** When should expired reservations be cleaned up?
   - Background job every N minutes?
   - Lazy cleanup on next credit check?
   - Both?

4. **Error Handling:** What happens if reservation expires during operation?
   - Auto-extend if operation is still running?
   - Fail the operation?
   - Best practice: Extend reservation if operation is still active

5. **Migration:** Do we need to handle users who currently have pending operations?
   - Safe approach: Deploy during low-traffic time
   - OR: Allow grace period where old system still works

## Next Steps

Ready to implement the solution. Waiting for user feedback on:
- Approve the overall approach
- Answer questions above
- Prioritize which endpoints to fix first
- Whether to proceed with implementation
