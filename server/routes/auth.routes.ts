/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles all authentication-related endpoints, including OAuth login with Google, device-based authentication, logout, and credit balance retrieval. It integrates with Passport for OAuth, device-auth for anonymous users, and touches user management and storage for persistent sessions.
 * SRP/DRY check: Pass - Focused solely on authentication logic. Auth patterns were repeated across the monolithic routes.ts; this extracts them. Reviewed existing auth code to ensure no duplication.
 */
import { Router } from "express";
import passport from 'passport';
import { getStorage } from "../storage.js";
import { contextError } from "../request-context.js";
import { getUserCredits } from "../device-auth.js";

const router = Router();

// Get current user - supports both OAuth and device-based authentication
router.get("/user", async (req, res) => {
  // First, check for Passport OAuth authentication
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
    return res.json(req.user);
  }

  // Fall back to device-based authentication
  const deviceId = req.headers['x-device-id'] as string;
  if (deviceId) {
    try {
      const storage = await getStorage();
      const user = await storage.ensureDeviceUser(deviceId);
      return res.json(user);
    } catch (error) {
      contextError('Failed to get device user:', error);
      return res.status(500).json({ error: 'Failed to retrieve user' });
    }
  }

  // No auth method available - return 401
  res.status(401).json({ error: 'Not authenticated' });
});

// Initiate Google OAuth login
router.get("/google",
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get("/google/callback",
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    res.redirect('/');
  }
);

// Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Get user's current credit balance
router.get("/credits", async (req, res) => {
  try {
    const credits = await getUserCredits(req);
    res.json({ credits });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

export { router as authRoutes };
