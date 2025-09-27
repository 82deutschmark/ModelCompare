/**
 * Credit Purchase Modal Example
 * 
 * Author: Buffy (Claude Sonnet)
 * Date: January 14, 2025
 * PURPOSE: Example implementation of StripeCheckout in a modal interface
 * 
 * This component demonstrates how to:
 * - Display available credit packages
 * - Integrate StripeCheckout in a modal
 * - Handle payment success/failure
 * - Update user credits after purchase
 * - Follow shadcn/ui patterns
 * 
 * SRP Compliance: Single responsibility for credit purchase UI flow
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Star,
  Zap,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Import the Stripe checkout component
// Note: Use the full Stripe Elements version in production
import { StripeCheckout } from './StripeCheckoutWithElements';
// For testing without Stripe Elements: import { StripeCheckout } from './StripeCheckout';

// Import types
import type { CreditPackage, PaymentSuccessResult } from '@/types/stripe';

interface CreditPurchaseModalProps {
  children: React.ReactNode;
  onCreditsUpdated?: (newBalance: number) => void;
}

export function CreditPurchaseModal({ children, onCreditsUpdated }: CreditPurchaseModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);

  // Fetch available credit packages and user's current balance
  useEffect(() => {
    if (open) {
      fetchPackagesAndCredits();
    }
  }, [open]);

  const fetchPackagesAndCredits = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch credit packages
      const packagesResponse = await fetch('/api/stripe/packages');
      if (!packagesResponse.ok) {
        throw new Error('Failed to fetch credit packages');
      }
      const packagesData = await packagesResponse.json();
      setPackages(packagesData.packages || []);

      // Fetch user's current credits
      const creditsResponse = await fetch('/api/user/credits', {
        credentials: 'include',
      });
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json();
        setUserCredits(creditsData.credits);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load credit packages';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (result: PaymentSuccessResult) => {
    // Update local state
    if (userCredits !== null) {
      const newBalance = userCredits + result.credits;
      setUserCredits(newBalance);
      onCreditsUpdated?.(newBalance);
    }

    // Show success message
    toast({
      title: 'Purchase Successful!',
      description: `${result.credits} credits added to your account.`,
    });

    // Reset and close modal
    setSelectedPackage(null);
    setOpen(false);
  };

  const handleCancel = () => {
    setSelectedPackage(null);
  };

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2);
  };

  const getPackageIcon = (packageId: string) => {
    if (packageId.includes('1000') || packageId.includes('2500')) {
      return <Zap className="w-5 h-5" />;
    }
    return <CreditCard className="w-5 h-5" />;
  };

  // If a package is selected, show the checkout form
  if (selectedPackage) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-md">
          <StripeCheckout
            packageId={selectedPackage}
            onSuccess={handlePaymentSuccess}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Package selection interface
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Purchase Credits</span>
          </DialogTitle>
          <DialogDescription>
            Choose a credit package to continue using our AI models
            {userCredits !== null && (
              <span className="block mt-2 font-medium">
                Current balance: <span className="text-primary">{userCredits} credits</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Package grid */}
        {!loading && !error && packages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {packages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={cn(
                  "relative transition-all duration-200 hover:shadow-lg cursor-pointer border-2",
                  pkg.popular 
                    ? "border-primary shadow-md" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {/* Popular badge */}
                {pkg.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    {getPackageIcon(pkg.id)}
                  </div>
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {pkg.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="text-center pb-4">
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      ${formatPrice(pkg.price)}
                    </div>
                    <div className="text-lg font-medium">
                      {pkg.credits.toLocaleString()} Credits
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${(pkg.price / 100 / pkg.credits).toFixed(4)} per credit
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button className="w-full" size="lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Purchase Package
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && packages.length === 0 && (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No credit packages available at this time.</p>
          </div>
        )}

        {/* Additional info */}
        {!loading && packages.length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Secure payment powered by Stripe</p>
                <p>Your payment information is encrypted and secure. Credits are added instantly after successful payment.</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreditPurchaseModal;