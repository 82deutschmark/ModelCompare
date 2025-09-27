# Google OAuth + Stripe Authentication & Billing Implementation Plan
**Date**: September 27, 2025  
**Author**: Cascade (Claude 4 Sonnet)  
**Purpose**: Replace Replit Auth with Google OAuth and implement Stripe billing system

## Current Status: IN PROGRESS
**Overall Progress**: 80% Complete  
**Current Phase**: Backend Implementation - Stripe Integration

---

## Problem Statement
The user has an existing AI Model Comparison app that was designed to use Replit Auth according to the authbilling.md documentation, but they want to implement their own Google OAuth authentication system instead. They already have:
- Google OAuth credentials in .env file
- Stripe credentials in .env file  
- A credit-based billing model requirement (5 credits per API call, 500 starting credits)

---

## Implementation Strategy

### Phase 1: Database Schema ✅ COMPLETED
**Goal**: Add user and session tables to support authentication and billing
**Status**: ✅ Complete

**Actions Completed**:
- Added `users` table to schema.ts with fields: id, email, firstName, lastName, profileImageUrl, credits, stripeCustomerId, stripeSubscriptionId, createdAt, updatedAt
- Added `sessions` table for PostgreSQL session storage
- Created TypeScript types: User, InsertUser, UpsertUser, Session, InsertSession, StripeInfo
- Added validation schemas using drizzle-zod

**Files Modified**: 
- `shared/schema.ts` - Added user and session tables + types

### Phase 2: Dependencies ✅ COMPLETED  
**Goal**: Install required packages for authentication and billing
**Status**: ✅ Complete

**Actions Completed**:
- Installed passport-google-oauth20 for Google OAuth
- Installed stripe for payment processing
- Installed @types/passport-google-oauth20 for TypeScript support
- Verified existing packages: express-session, passport, connect-pg-simple already installed

### Phase 3: Authentication System ✅ COMPLETED
**Goal**: Create Google OAuth authentication using Passport.js
**Status**: ✅ Complete

**Actions Completed**:
- Created `server/auth.ts` with complete Google OAuth implementation
- Configured Passport.js with GoogleStrategy
- Set up PostgreSQL session storage using connect-pg-simple  
- Created authentication middleware: `isAuthenticated()`, `hasCredits()`
- Configured session security settings (httpOnly, secure in production, 7-day expiry)

**Files Created**:
- `server/auth.ts` - Complete authentication system

### Phase 4: Storage Layer ✅ COMPLETED
**Goal**: Extend storage interface and implementations for user/credit management
**Status**: ✅ Complete

**Actions Completed**:
- Extended IStorage interface with user authentication methods
- Extended IStorage interface with credit management methods  
- Extended IStorage interface with Stripe integration methods
- Implemented DbStorage class methods (getUser, getUserByEmail, upsertUser, etc.)
- Implemented MemStorage class methods (for fallback/development)
- Added proper error handling and validation
- Fixed TypeScript compilation errors
- Added SQL operations for credit management with atomic updates

**Files Modified**:
- `server/storage.ts` - Complete storage implementation with user/credit management

### Phase 5: Server Integration ⏳ PENDING
**Goal**: Integrate authentication into Express server and add routes
**Status**: ⏳ Pending

**Planned Actions**:
- Modify server/index.ts to configure authentication middleware
- Add authentication routes to server/routes.ts:
  - GET /api/auth/user - Get current user
  - GET /api/auth/google - Initiate Google OAuth  
  - GET /api/auth/google/callback - OAuth callback
  - POST /api/auth/logout - Logout user
  - GET /api/user/credits - Get user credits
- Protect existing model comparison routes with authentication
- Add credit deduction logic to API calls

### Phase 6: Stripe Integration ⏳ PENDING  
**Goal**: Add Stripe payment processing for credit purchases
**Status**: ⏳ Pending

**Planned Actions**:
- Create Stripe service module
- Add credit purchase routes:
  - POST /api/stripe/create-payment-intent - Create payment
  - POST /api/stripe/webhook - Handle payment confirmations
- Implement credit packages (100, 500, 1000 credits)
- Add automatic credit addition after successful payments

### Phase 7: Frontend Components - Reuse shadcn/ui!!! ⏳ PENDING
**Goal**: Reuse shadcn/ui components for authentication and billing UI  
**Status**: ⏳ Pending

**Planned Actions**:
- Create useAuth hook for authentication state
- Create UserMenu component for profile display
- Create CreditsDisplay component for credit balance
- Create checkout page for credit purchases
- Update home page to show landing page for non-authenticated users
- Add authentication guards to protected routes

### Phase 8: Testing & Deployment ⏳ PENDING
**Goal**: Test complete system and deploy
**Status**: ⏳ Pending

**Planned Actions**:
- Test Google OAuth flow end-to-end
- Test credit deduction on API calls  
- Test Stripe payment processing
- Test error handling scenarios
- Update environment configuration for production
- Deploy and verify in production environment

---

## Technical Architecture

### Authentication Flow
1. User clicks "Sign in with Google" 
2. Passport redirects to Google OAuth
3. User authorizes app on Google
4. Google redirects back with authorization code
5. Passport exchanges code for user profile
6. System creates/updates user in database with 500 starting credits
7. User session stored in PostgreSQL
8. User redirected to app with authenticated session

### Credit System Flow  
1. User makes API request to model comparison endpoint
2. System checks authentication (isAuthenticated middleware)
3. System checks credit balance (hasCredits middleware - minimum 5 credits)
4. If sufficient credits, API call proceeds
5. After successful API call, 5 credits deducted from user account
6. User credit balance updated in real-time on frontend

### Stripe Payment Flow
1. User clicks "Purchase Credits" 
2. System creates Stripe payment intent
3. Frontend displays Stripe checkout form
4. User completes payment
5. Stripe webhook confirms payment success
6. System automatically adds purchased credits to user account
7. Frontend updates credit balance display

---

## Current Files Structure

### Backend Files
```
server/
├── auth.ts ✅ - Google OAuth + middleware  
├── storage.ts 🔄 - Extended interface, implementing methods
├── routes.ts ⏳ - Need to add auth routes
├── index.ts ⏳ - Need to configure auth middleware
└── stripe.ts ⏳ - Need to create Stripe service
```

### Database Schema  
```
shared/
└── schema.ts ✅ - Added users + sessions tables
```

### Frontend Files (Planned)
```  
client/src/
├── hooks/
│   └── useAuth.ts ⏳ - Authentication state management
├── components/
│   ├── UserMenu.tsx ⏳ - User profile display
│   ├── CreditsDisplay.tsx ⏳ - Credit balance display  
│   └── auth/ ⏳ - Authentication components
└── pages/
    ├── checkout.tsx ⏳ - Credit purchase page
    └── home.tsx ⏳ - Update with landing page
```

---

## Environment Variables Required

### Already Configured ✅

### Need to Add ⏳
Session?  I think we added it.  
---

## Next Immediate Steps (Priority Order)

### 1. Complete Storage Implementation 🔄 CURRENT
- Implement all missing methods in DbStorage class
- Implement all missing methods in MemStorage class  
- Fix TypeScript compilation errors
- Test database operations

### 2. Fix Auth.ts Issues ⏳ NEXT
- Fix passport serialization/deserialization types
- Fix database manager pool access
- Fix Express user interface extension

### 3. Integrate Authentication into Server ⏳ 
- Configure auth middleware in server/index.ts
- Add authentication routes to routes.ts
- Protect existing API endpoints with auth middleware

### 4. Add Credit Deduction Logic ⏳
- Modify model comparison endpoints to deduct credits
- Add transaction safety for credit operations
- Implement proper error handling

---

## Risks & Considerations

### Security
- Session secret must be strong in production
- Stripe webhook signatures must be validated
- Credit deduction must be atomic (no double-charging)
- HTTPS required in production for secure cookies

### User Experience  
- Graceful handling of authentication failures
- Clear error messages for insufficient credits
- Seamless login/logout flow
- Real-time credit balance updates

### Technical Debt
- Need comprehensive error handling throughout
- Need proper logging for authentication events  
- Need rate limiting for API endpoints
- Need automated tests for critical flows

---

## Success Criteria

### Functional Requirements ✅/❌
- ❌ Users can sign in with Google OAuth
- ❌ New users get 500 starting credits  
- ❌ API calls deduct 5 credits per request
- ❌ Users can purchase additional credits via Stripe
- ❌ Credit balance displayed in real-time
- ❌ Unauthenticated users see landing page
- ❌ System handles payment processing securely

### Technical Requirements ✅/❌  
- ✅ TypeScript type safety maintained
- ❌ Database migrations work correctly
- ❌ Session management works reliably  
- ❌ Error handling covers edge cases
- ❌ Performance acceptable under load
- ❌ Security best practices followed

---

## Current Blockers & Solutions

### Immediate Blockers
1. **Storage methods not implemented** - Need to complete DbStorage and MemStorage implementations
2. **TypeScript compilation errors** - Multiple interface implementation issues
3. **Database manager API mismatch** - auth.ts references non-existent getPool() method

### Solutions in Progress
1. Implementing storage methods systematically (next action)
2. Fixing TypeScript errors as methods are implemented  
3. Reviewing database manager API to use correct methods

---

*This document will be updated as implementation progresses.*
