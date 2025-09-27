/**
 * Stripe Type Definitions
 * 
 * Author: Buffy (Claude Sonnet)
 * Date: January 14, 2025
 * PURPOSE: Centralized TypeScript types for Stripe integration
 * 
 * This file defines all Stripe-related types used across the application:
 * - Credit package definitions
 * - Payment intent responses
 * - Payment result interfaces
 * - Error handling types
 * 
 * SRP Compliance: Single responsibility for Stripe type definitions
 */

// Credit package interface matching server-side definition
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // Price in cents (USD)
  description: string;
  popular?: boolean;
}

// Payment intent creation response from /api/stripe/create-payment-intent
export interface PaymentIntentResponse {
  clientSecret: string;
  packageInfo: CreditPackage;
}

// Payment success result
export interface PaymentSuccessResult {
  credits: number;
  transactionId: string;
}

// Payment status types
export type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

// Stripe payment intent object (simplified)
export interface StripePaymentIntent {
  id: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  amount: number;
  currency: string;
  client_secret: string;
  metadata?: Record<string, string>;
}

// Stripe error object
export interface StripeError {
  type: string;
  code?: string;
  message: string;
  decline_code?: string;
  charge?: string;
  doc_url?: string;
  param?: string;
  payment_intent?: StripePaymentIntent;
  payment_method?: any;
  setup_intent?: any;
  source?: any;
}

// Payment form validation state
export interface PaymentFormState {
  cardComplete: boolean;
  cardError: string | null;
  isProcessing: boolean;
  paymentError: string | null;
}

// Stripe Elements styling options
export interface StripeElementsOptions {
  clientSecret: string;
  appearance?: {
    theme?: 'stripe' | 'night' | 'flat';
    variables?: {
      colorPrimary?: string;
      colorBackground?: string;
      colorText?: string;
      colorDanger?: string;
      fontFamily?: string;
      borderRadius?: string;
    };
  };
}

// Card Element styling options
export interface CardElementOptions {
  style: {
    base: {
      fontSize: string;
      color: string;
      fontFamily: string;
      fontSmoothing: string;
      '::placeholder': {
        color: string;
      };
    };
    invalid: {
      color: string;
      iconColor: string;
    };
  };
  hidePostalCode: boolean;
}

// Environment configuration
export interface StripeConfig {
  publishableKey: string;
  isTestMode: boolean;
}

// Webhook event types (for reference)
export type StripeWebhookEventType = 
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.created'
  | 'payment_intent.requires_action'
  | 'payment_intent.processing'
  | 'payment_intent.canceled';

// API error response format
export interface ApiErrorResponse {
  error: string;
  details?: string[];
  code?: string;
}

// Credit packages response from /api/stripe/packages
export interface CreditPackagesResponse {
  packages: CreditPackage[];
}

// User credits response from /api/user/credits
export interface UserCreditsResponse {
  credits: number;
}

// Payment confirmation data for analytics/tracking
export interface PaymentConfirmationData {
  packageId: string;
  packageName: string;
  credits: number;
  amount: number; // in cents
  currency: string;
  transactionId: string;
  timestamp: string;
  userId?: string;
}

// Component prop interfaces
export interface StripeCheckoutProps {
  packageId: string;
  onSuccess?: (result: PaymentSuccessResult) => void;
  onCancel?: () => void;
  className?: string;
}

export interface PaymentFormProps {
  clientSecret: string;
  packageInfo: CreditPackage;
  onPaymentSuccess: (paymentIntent: StripePaymentIntent) => void;
  onPaymentError: (error: string) => void;
}

// Utility type for payment method types
export type PaymentMethodType = 
  | 'card'
  | 'apple_pay'
  | 'google_pay'
  | 'link'
  | 'paypal'
  | 'bank_transfer';

// Security and compliance related types
export interface PaymentSecurityInfo {
  encrypted: boolean;
  pciCompliant: boolean;
  provider: 'stripe';
  secureConnection: boolean;
}

// Payment analytics data
export interface PaymentAnalytics {
  paymentStartTime: number;
  paymentEndTime?: number;
  paymentDuration?: number;
  paymentMethod?: PaymentMethodType;
  errors?: string[];
  retryCount: number;
}

export default {
  CreditPackage,
  PaymentIntentResponse,
  PaymentSuccessResult,
  PaymentStatus,
  StripePaymentIntent,
  StripeError,
  PaymentFormState,
  StripeElementsOptions,
  CardElementOptions,
  StripeConfig,
  ApiErrorResponse,
  CreditPackagesResponse,
  UserCreditsResponse,
  PaymentConfirmationData,
  StripeCheckoutProps,
  PaymentFormProps,
  PaymentMethodType,
  PaymentSecurityInfo,
  PaymentAnalytics
};