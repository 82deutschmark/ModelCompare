/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-28T20:05:12-04:00
 * PURPOSE: Device-based authentication middleware for anonymous user tracking.
 *          Replaces traditional authentication with device ID based user management.
 *          Provides credit checking and deduction for anonymous and authenticated users.
 * SRP/DRY check: Pass - Single responsibility (device-based auth), reuses existing credit logic
 * shadcn/ui: Pass - Backend middleware, no UI components
 */

import { Request, Response, NextFunction } from 'express';
import { getStorage } from './storage.js';
import { contextLog, contextError } from './request-context.js';
import type { User } from '../shared/schema.js';

// Extend Express Request to include deviceUser
declare global {
  namespace Express {
    interface Request {
      deviceUser?: User;
    }
  }
}

/**
 * Middleware to ensure a device-based user exists
 * Extracts device ID from x-device-id header and creates/finds user
 */
export async function ensureDeviceUser(req: Request, res: Response, next: NextFunction) {
  try {
    const deviceId = req.headers['x-device-id'] as string;

    if (!deviceId) {
      return res.status(400).json({
        error: 'Missing device ID',
        message: 'Device identification required. Please refresh the page.'
      });
    }

    const storage = await getStorage();
    const user = await storage.ensureDeviceUser(deviceId);

    // Attach user to request for downstream middleware
    req.deviceUser = user;

    contextLog(`Device user ensured: ${user.id} (device user) - ${user.credits} credits`);
    next();
  } catch (error) {
    contextError('Failed to ensure device user:', error);
    res.status(500).json({ error: 'Failed to initialize user session' });
  }
}

/**
 * Middleware to check if device user has sufficient credits
 * Requires ensureDeviceUser to have run first
 */
export async function checkDeviceCredits(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.deviceUser;

    if (!user) {
      return res.status(500).json({
        error: 'No user session',
        message: 'User session not initialized. Please refresh the page.'
      });
    }

    const storage = await getStorage();
    const credits = await storage.getUserCredits(user.id);

    if (credits < 5) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'You have reached your usage limit. Visit your account page to continue.',
        credits: credits,
        requiresPayment: true
      });
    }

    contextLog(`Credit check passed for user ${user.id}: ${credits} credits available`);
    next();
  } catch (error) {
    contextError('Failed to check device credits:', error);
    res.status(500).json({ error: 'Failed to verify credit balance' });
  }
}

/**
 * Middleware to deduct credits after successful API calls
 * Should be called after the API operation completes successfully
 */
export async function deductDeviceCredits(
  req: Request,
  res: Response,
  next: NextFunction,
  creditsToDeduct: number = 5
) {
  try {
    const user = req.deviceUser;

    if (!user) {
      // Don't fail the request if user is missing - just log warning
      contextError('Warning: No user session for credit deduction');
      return next();
    }

    const storage = await getStorage();
    await storage.deductCredits(user.id, creditsToDeduct);

    contextLog(`Deducted ${creditsToDeduct} credits from user ${user.id} (device user)`);
    next();
  } catch (error) {
    contextError('Failed to deduct device credits:', error);
    // Don't fail the request - credit deduction errors shouldn't break user experience
    next();
  }
}

/**
 * Helper function to deduct credits for successful API calls
 * Use this in route handlers after successful operations
 */
export async function deductCreditsForSuccessfulCalls(
  req: Request,
  successfulCalls: number,
  creditsPerCall: number = 5
) {
  if (successfulCalls === 0 || !req.deviceUser) {
    return;
  }

  const creditsToDeduct = successfulCalls * creditsPerCall;

  try {
    const storage = await getStorage();
    await storage.deductCredits(req.deviceUser.id, creditsToDeduct);

    contextLog(`Deducted ${creditsToDeduct} credits from user ${req.deviceUser.id} for ${successfulCalls} successful API calls`);
  } catch (error) {
    contextError('Failed to deduct credits for successful calls:', error);
  }
}

/**
 * Get current user credits (for API responses)
 */
export async function getUserCredits(req: Request): Promise<number> {
  if (!req.deviceUser) {
    return 0;
  }

  try {
    const storage = await getStorage();
    return await storage.getUserCredits(req.deviceUser.id);
  } catch (error) {
    contextError('Failed to get user credits:', error);
    return 0;
  }
}

/**
 * Check if request has authenticated user (for optional auth features)
 * ZDR: In deviceID-only auth, all deviceUsers are considered "authenticated"
 */
export function hasAuthenticatedUser(req: Request): boolean {
  return req.deviceUser !== null && req.deviceUser !== undefined;
}

/**
 * Legacy compatibility - check if user is "authenticated"
 * ZDR: In deviceID-only auth, all deviceUsers are considered "authenticated"
 * For gradual migration from old auth system
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    // Traditional passport authentication (backward compatibility)
    return next();
  }

  if (req.deviceUser) {
    // Device user exists (ZDR: all deviceUsers are authenticated)
    return next();
  }

  return res.status(401).json({
    error: 'Authentication required',
    message: 'Device identification required. Please refresh the page.'
  });
}