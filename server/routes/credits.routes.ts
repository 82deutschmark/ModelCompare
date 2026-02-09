/*
 * Author: Cascade
 * Date: October 14, 2025 and 7:23pm UTC-04:00
 * PURPOSE: This routes file handles credit management and Stripe payment processing, including retrieving credit packages, creating payment intents for purchases, handling Stripe webhooks for credit fulfillment, and fetching payment transaction history. It integrates with auth middleware for protected routes and touches Stripe service for payment handling.
 * SRP/DRY check: Pass - Focused solely on payment and credit logic. Payment patterns were repeated in the monolithic routes.ts; this extracts them. Reviewed existing payment code to ensure no duplication.
 */
import { Router } from "express";
import { isAuthenticated } from "../auth.js";
import { createPaymentIntent, handleStripeWebhook, getCreditPackages } from "../stripe.js";
import { getStorage } from "../storage.js";

const router = Router();

// Get available credit packages
router.get("/packages", (req, res) => {
  try {
    const packages = getCreditPackages();
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching credit packages:', error);
    res.status(500).json({ error: 'Failed to fetch credit packages' });
  }
});

// Create payment intent for credit purchase
router.post("/create-payment-intent", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const { packageId } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!packageId) {
      return res.status(400).json({ error: 'Package ID is required' });
    }

    const result = await createPaymentIntent(user.id, packageId);

    res.json({
      clientSecret: result.clientSecret,
      packageInfo: result.packageInfo,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Stripe webhook handler
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const rawBody = (req as any).rawBody as Buffer | undefined;
    const bodyBuffer = rawBody ?? Buffer.from(JSON.stringify(req.body));
    const result = await handleStripeWebhook(bodyBuffer, signature);

    if (result.success) {
      res.json({ received: true, message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Get payment transaction history for the authenticated user
router.get("/transactions", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const storage = await getStorage();
    const transactions = await storage.getPaymentTransactionsByUserId(user.id);

    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching payment transactions:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

export { router as creditsRoutes };
