/**
 * Checkout Page - Credit Purchase
 * 
 * Handles credit purchases using Stripe payment processing.
 * Provides credit packages and secure payment processing.
 * 
 * Author: Replit Agent
 * Date: August 11, 2025
 */

import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Coins } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ amount, credits }: { amount: number; credits: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: `${credits} credits added to your account!`,
      });
      setLocation('/');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isLoading}
        className="w-full"
      >
        {isLoading ? 'Processing...' : `Purchase ${credits} Credits - $${amount}`}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Credit packages
  const packages = [
    { credits: 100, amount: 5, popular: false },
    { credits: 500, amount: 20, popular: true },
    { credits: 1000, amount: 35, popular: false },
  ];

  const [selectedPackage, setSelectedPackage] = useState(packages[1]); // Default to popular

  useEffect(() => {
    if (selectedPackage) {
      // Create PaymentIntent when package is selected
      apiRequest("POST", "/api/create-payment-intent", { 
        amount: selectedPackage.amount, 
        credits: selectedPackage.credits 
      })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive",
          });
          console.error('Payment intent creation failed:', error);
        });
    }
  }, [selectedPackage]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold">Purchase Credits</h1>
        <p className="text-muted-foreground mt-2">
          Each AI model call costs 5 credits. Choose a package below.
        </p>
      </div>

      {/* Package Selection */}
      <div className="grid gap-4 mb-8">
        {packages.map((pkg) => (
          <Card 
            key={pkg.credits}
            className={`cursor-pointer transition-all ${
              selectedPackage.credits === pkg.credits 
                ? 'ring-2 ring-primary' 
                : 'hover:shadow-md'
            } ${pkg.popular ? 'border-primary' : ''}`}
            onClick={() => setSelectedPackage(pkg)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  {pkg.credits} Credits
                </CardTitle>
                {pkg.popular && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
              </div>
              <CardDescription>
                ${pkg.amount} ({(pkg.amount / pkg.credits * 100).toFixed(1)}¢ per credit)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enough for {Math.floor(pkg.credits / 5)} AI model calls
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Form */}
      {clientSecret ? (
        <Card>
          <CardHeader>
            <CardTitle>Complete Purchase</CardTitle>
            <CardDescription>
              Secure payment processing powered by Stripe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                amount={selectedPackage.amount} 
                credits={selectedPackage.credits} 
              />
            </Elements>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}