/**
 * StripeCheckout Component
 * 
 * Author: Buffy (Claude Sonnet)
 * Date: January 14, 2025
 * PURPOSE: Handles Stripe payment flow for credit purchases with Elements integration
 * 
 * This component provides a complete payment interface using Stripe Elements:
 * - Creates payment intent via API
 * - Renders Stripe payment form with proper styling
 * - Handles loading states, errors, and success confirmation
 * - Follows security best practices for payment processing
 * - Integrates with existing shadcn/ui component patterns
 * 
 * SRP Compliance: Single responsibility for payment processing UI
 * Dependencies: @stripe/stripe-js, @stripe/react-stripe-js (need to be installed)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  CreditCard,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Stripe configuration
const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

// Credit package interface matching server-side definition
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // Price in cents
  description: string;
  popular?: boolean;
}

// Component props interface
interface StripeCheckoutProps {
  packageId: string;
  onSuccess?: (result: { credits: number; transactionId: string }) => void;
  onCancel?: () => void;
  className?: string;
}

// Payment form component (would use Stripe Elements when installed)
function PaymentForm({ 
  clientSecret, 
  packageInfo, 
  onPaymentSuccess, 
  onPaymentError 
}: {
  clientSecret: string;
  packageInfo: CreditPackage;
  onPaymentSuccess: (paymentIntent: any) => void;
  onPaymentError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (error) {
        onPaymentError(error.message || 'Payment failed');
      } else {
        onPaymentSuccess(paymentIntent);
      }
    } catch (error) {
      onPaymentError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Package Summary */}
      <div className="p-4 bg-muted/50 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium">{packageInfo.name}</h4>
            <p className="text-sm text-muted-foreground">{packageInfo.description}</p>
          </div>
          <div className="text-right">
            <div className="font-semibold">${(packageInfo.price / 100).toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">{packageInfo.credits} credits</div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-4 h-4" />
          <span className="font-medium">Payment Method</span>
        </div>
        
        <div className="p-4 border rounded-lg bg-background">
          <div className="space-y-3">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
            <div className="text-xs text-muted-foreground flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>Secured by Stripe. Your payment information is encrypted and secure.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {paymentError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isProcessing}
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${(packageInfo.price / 100).toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

// Main StripeCheckout component
export function StripeCheckout({ packageId, onSuccess, onCancel, className }: StripeCheckoutProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [packageInfo, setPackageInfo] = useState<CreditPackage | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Initialize payment intent
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ packageId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
        setPackageInfo(data.packageInfo);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        toast({
          title: 'Payment Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (packageId) {
      createPaymentIntent();
    }
  }, [packageId, toast]);

  const handlePaymentSuccess = (paymentIntent: any) => {
    setPaymentStatus('success');
    setPaymentResult(paymentIntent);
    
    toast({
      title: 'Payment Successful!',
      description: `${packageInfo?.credits} credits have been added to your account.`,
    });

    // Call success callback
    if (onSuccess && packageInfo) {
      onSuccess({
        credits: packageInfo.credits,
        transactionId: paymentIntent.id,
      });
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setPaymentStatus('error');
    setError(errorMessage);
    
    toast({
      title: 'Payment Failed',
      description: errorMessage,
      variant: 'destructive',
    });
  };

  const handleRetry = () => {
    setPaymentStatus('idle');
    setError(null);
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('w-full max-w-md mx-auto', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !clientSecret) {
    return (
      <Card className={cn('w-full max-w-md mx-auto', className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span>Payment Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex space-x-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => window.location.reload()} className="flex-1">
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <Card className={cn('w-full max-w-md mx-auto', className)}>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-green-600 dark:text-green-400">Payment Successful!</CardTitle>
          <CardDescription>
            Your credits have been added to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {packageInfo && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="font-semibold text-green-800 dark:text-green-200">
                +{packageInfo.credits} Credits Added
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                Transaction ID: {paymentResult?.id}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">
            Continue
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Payment form
  return (
    <Card className={cn('w-full max-w-md mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Complete Payment</span>
        </CardTitle>
        <CardDescription>
          Secure payment powered by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clientSecret && packageInfo ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              packageInfo={packageInfo}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          </Elements>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Initializing payment...</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={onCancel} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}

export default StripeCheckout;