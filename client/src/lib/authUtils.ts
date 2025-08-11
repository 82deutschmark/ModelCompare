/**
 * Authentication Utilities
 * 
 * Helper functions for handling authentication-related errors
 * and responses throughout the application.
 * 
 * Author: Replit Agent
 * Date: August 11, 2025
 */

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function isInsufficientCreditsError(error: Error): boolean {
  return /^402: .*Insufficient credits/.test(error.message);
}