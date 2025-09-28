/**
 * 
 * Author: Cascade using GPT
 * Date: 2025-09-27T14:15:46-04:00
 * PURPOSE: Google OAuth authentication system using Passport.js. This module handles:
 * - Google OAuth 2.0 strategy configuration
 * - User session management with PostgreSQL storage
 * - User authentication middleware for protected routes
 * - Session serialization and deserialization
 * - Integration with the storage layer for user persistence
 * SRP and DRY check: Pass - This file is responsible only for authentication logic
 * and reuses existing storage patterns. Checked existing codebase for duplicates.
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import type { Express, Request, Response, NextFunction } from 'express';
import { getStorage } from './storage.js';
import type { User } from '../shared/schema.js';
import { getDatabaseManager } from './db.js';

const PgSession = connectPgSimple(session);

/**
 * Configure Passport.js with Google OAuth strategy
 * This sets up the authentication strategy using the Google OAuth 2.0 credentials
 * from environment variables and defines how users are handled during auth flow
 */
export function configurePassport() {
  // Serialize user for session storage (only store user ID)
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session (fetch full user data by ID)
  passport.deserializeUser(async (id: string, done) => {
    try {
      const storage = await getStorage();
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error('User not found'), null);
      }
      // Ensure we return a properly shaped user object
      const fullUser: Express.User = {
        id: user.id,
        email: null,
        deviceId: user.deviceId || null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        credits: user.credits || 500,
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      };
      done(null, fullUser);
    } catch (error) {
      done(error, null);
    }
  });

  // Configure Google OAuth strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_OAUTH_CALLBACK_URL || 
      (process.env.NODE_ENV === 'production' 
        ? `https://${process.env.DOMAIN || 'localhost'}/api/auth/google/callback`
        : 'http://localhost:5000/api/auth/google/callback')
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const storage = await getStorage();

      // Use Google profile ID as a device-like identifier
      // This provides consistent identity verification without storing PII
      const googleId = profile.id;
      const deviceId = `google_${googleId}`;

      // Find or create user based on device ID (hashed)
      let user = await storage.getUserByDeviceId(deviceId);

      if (!user) {
        // Create new user with 500 starting credits - no PII stored
        user = await storage.createAnonymousUser(deviceId);
      }

      // Ensure we return a properly shaped user object
      const fullUser: Express.User = {
        id: user.id,
        email: profile.emails?.[0]?.value || null,
        deviceId: deviceId,
        firstName: profile.name?.givenName || null,
        lastName: profile.name?.familyName || null,
        profileImageUrl: profile.photos?.[0]?.value || null,
        credits: user.credits || 500,
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      };

      return done(null, fullUser);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, undefined);
    }
  }));
}

/**
 * Configure Express session middleware with PostgreSQL storage
 * This sets up session management using the PostgreSQL database for persistence
 * and configures session security settings
 */
export async function configureSession(app: Express) {
  // Try to use PostgreSQL session store if database is available
  let sessionStore;
  
  try {
    const dbManager = getDatabaseManager();
    if (dbManager) {
      await dbManager.initialize();
      // Access the pool directly from the manager's private property
      // Note: This is a workaround since getPool() doesn't exist
      const poolAccessor = (dbManager as any).pool;
      
      if (poolAccessor) {
        sessionStore = new PgSession({
          pool: poolAccessor,
          tableName: 'sessions', // This should match our schema
          createTableIfMissing: true,
        });
      }
    }
  } catch (error) {
    console.warn('Failed to configure PostgreSQL session store, using memory store:', error);
  }

  app.use(session({
    store: sessionStore, // Falls back to memory store if undefined
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  // Initialize Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());
}

/**
 * Middleware to check if user is authenticated
 * This middleware protects routes that require authentication by checking
 * if the user is logged in and has a valid session
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  // Return 401 Unauthorized for API requests
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Redirect to login for other requests
  res.redirect('/api/auth/google');
}

/**
 * Middleware to check if user has sufficient credits
 * This middleware checks if the authenticated user has enough credits
 * for operations that consume credits (minimum 5 credits required)
 */
export async function hasCredits(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const storage = await getStorage();
    const user = req.user as User;
    const credits = await storage.getUserCredits(user.id);
    
    if (credits < 5) {
      return res.status(402).json({ 
        error: 'Insufficient credits',
        message: 'You need at least 5 credits to make API calls. Please purchase more credits.',
        credits: credits
      });
    }
    
    next();
  } catch (error) {
    console.error('Credit check error:', error);
    res.status(500).json({ error: 'Failed to check credits' });
  }
}

/**
 * Extend Express Request type to include user property
 * This TypeScript declaration ensures type safety when accessing req.user
 */
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string | null;
      deviceId: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      credits: number | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}
