/**
 * Stripe Payment Processing Service
 * 
 * This module handles all Stripe-related operations for credit purchases in the
 * AI Model Comparison application. It provides:
 * 
 * - Payment intent creation for credit packages
 * - Webhook event processing for payment confirmations
 * - Credit package definitions and pricing
 * - Automatic credit addition after successful payments
 * - Secure webhook signature verification
 * 
 * The service integrates with the storage layer to update user credits
 * automatically upon successful payments, ensuring atomic credit operations.
 * 
 * Author: Cascade (Claude 4 Sonnet)
 * Date: September 27, 2025
 * PURPOSE: Secure payment processing with automatic credit fulfillment
 * SRP and DRY check: Pass - Single responsibility for payment processing, 
 * no duplication of Stripe logic elsewhere in the codebase.
 */

import Stripe from 'stripe';
import { getStorage } from './storage.js';
import { contextLog, contextError } from './request-context.js';

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // Latest stable API version
});

// Credit package definitions - these define what users can purchase
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // Price in cents (USD)
  description: string;
  popular?: boolean; // Flag for highlighting popular packages
}

// Available credit packages for purchase
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'credits_100',
    name: 'Starter Pack',
    credits: 100,
    price: 499, // $4.99
    description: '100 credits - Perfect for trying out different models',
  },
  {
    id: 'credits_500',
    name: 'Popular Pack',
    credits: 500,
    price: 1999, // $19.99
    description: '500 credits - Best value for regular users',
    popular: true,
  },
  {
    id: 'credits_1000',
    name: 'Power Pack',
    credits: 1000,
    price: 3499, // $34.99
    description: '1000 credits - For heavy users and teams',
  },
  {
    id: 'credits_2500',
    name: 'Enterprise Pack',
    credits: 2500,
    price: 7999, // $79.99
    description: '2500 credits - Maximum value for enterprises',
  },
];

/**
 * Create a Stripe payment intent for purchasing credits
 * This generates a client secret that the frontend can use to complete payment
 */
export async function createPaymentIntent(
  userId: string,
  packageId: string,
  userEmail: string
): Promise<{ clientSecret: string; packageInfo: CreditPackage }> {
  try {
    // Find the requested credit package
    const packageInfo = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!packageInfo) {
      throw new Error(`Invalid credit package ID: ${packageId}`);
    }

    // Create the payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: packageInfo.price,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        packageId,
        credits: packageInfo.credits.toString(),
        userEmail,
      },
      description: `${packageInfo.name} - ${packageInfo.credits} credits`,
    });

    contextLog(`Created payment intent for user ${userEmail}: ${packageInfo.name} (${packageInfo.credits} credits)`);

    return {
      clientSecret: paymentIntent.client_secret!,
      packageInfo,
    };
  } catch (error) {
    contextError('Failed to create payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Handle Stripe webhook events
 * This processes payment confirmations and automatically adds credits to user accounts
 */
export async function handleStripeWebhook(
  body: Buffer,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify webhook signature for security
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    contextLog(`Received Stripe webhook: ${event.type}`);

    // Handle successful payment confirmation
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      const { userId, credits } = paymentIntent.metadata;
      const creditsToAdd = parseInt(credits);

      if (!userId || !credits) {
        throw new Error('Missing required metadata in payment intent');
      }

      // Add credits to user account
      const storage = await getStorage();
      const updatedUser = await storage.addCredits(userId, creditsToAdd);
      
      contextLog(`Successfully added ${creditsToAdd} credits to user ${userId}. New balance: ${updatedUser.credits}`);

      return {
        success: true,
        message: `Added ${creditsToAdd} credits to user account`,
      };
    }

    // Handle payment failures
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { userId, userEmail } = paymentIntent.metadata;
      
      contextError(`Payment failed for user ${userEmail} (${userId})`);
      
      return {
        success: true,
        message: 'Payment failure logged',
      };
    }

    // For other event types, just acknowledge receipt
    return {
      success: true,
      message: `Webhook processed: ${event.type}`,
    };

  } catch (error) {
    contextError('Webhook processing failed:', error);
    return {
      success: false,
      message: 'Webhook processing failed',
    };
  }
}

/**
 * Get available credit packages for frontend display
 */
export function getCreditPackages(): CreditPackage[] {
  return CREDIT_PACKAGES;
}

/**
 * Validate that Stripe is properly configured
 */
export function validateStripeConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY environment variable is not set');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  // Validate secret key format
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY does not appear to be a valid Stripe secret key');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
