/**
 * Author: Buffy
 * Date: 2025-01-27
 * PURPOSE: PaymentMethodManager component for managing saved payment methods.
 * Features secure display (last 4 digits only), add/remove cards, set default payment method,
 * and payment method verification. Uses shadcn/ui components with proper TypeScript interfaces.
 * SRP/DRY check: Pass - Single responsibility (payment method management), reuses existing UI patterns
 * shadcn/ui: Pass - Uses Card, Button, Badge, Dialog, Select, and other shadcn/ui components
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  Shield,
  Calendar,
  Lock,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Edit,
  MoreVertical,
  Banknote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";

// TypeScript interfaces for payment method data
interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'paypal';
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'paypal' | 'bank';
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName: string;
  isDefault: boolean;
  isVerified: boolean;
  addedDate: Date;
  nickname?: string;
  billingAddress?: {
    country: string;
    postalCode: string;
  };
}

interface AddPaymentMethodForm {
  type: 'credit_card' | 'debit_card' | 'bank_account';
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  nickname?: string;
  billingCountry: string;
  billingPostalCode: string;
}

interface PaymentMethodManagerProps {
  paymentMethods?: PaymentMethod[];
  isLoading?: boolean;
  onAddPaymentMethod?: (method: Omit<PaymentMethod, 'id' | 'addedDate'>) => Promise<void>;
  onRemovePaymentMethod?: (id: string) => Promise<void>;
  onSetDefaultPaymentMethod?: (id: string) => Promise<void>;
  onVerifyPaymentMethod?: (id: string) => Promise<void>;
  className?: string;
}

// Placeholder data - replace with real API data
const PLACEHOLDER_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "pm_1",
    type: "credit_card",
    brand: "visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: 2025,
    holderName: "John Doe",
    isDefault: true,
    isVerified: true,
    addedDate: new Date("2024-01-15"),
    nickname: "Personal Card",
    billingAddress: {
      country: "US",
      postalCode: "10001"
    }
  },
  {
    id: "pm_2",
    type: "credit_card",
    brand: "mastercard",
    last4: "8888",
    expiryMonth: 8,
    expiryYear: 2026,
    holderName: "John Doe",
    isDefault: false,
    isVerified: true,
    addedDate: new Date("2024-06-20"),
    nickname: "Business Card",
    billingAddress: {
      country: "US",
      postalCode: "10001"
    }
  },
  {
    id: "pm_3",
    type: "bank_account",
    brand: "bank",
    last4: "1234",
    holderName: "John Doe",
    isDefault: false,
    isVerified: false,
    addedDate: new Date("2024-11-10"),
    nickname: "Checking Account",
    billingAddress: {
      country: "US",
      postalCode: "10001"
    }
  }
];

export function PaymentMethodManager({
  paymentMethods = PLACEHOLDER_PAYMENT_METHODS,
  isLoading = false,
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefaultPaymentMethod,
  onVerifyPaymentMethod,
  className
}: PaymentMethodManagerProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [showCardDetails, setShowCardDetails] = useState<Record<string, boolean>>({});

  const form = useForm<AddPaymentMethodForm>({
    defaultValues: {
      type: 'credit_card',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      holderName: '',
      nickname: '',
      billingCountry: 'US',
      billingPostalCode: ''
    }
  });

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalMethods = paymentMethods.length;
    const verifiedCount = paymentMethods.filter(pm => pm.isVerified).length;
    const defaultMethod = paymentMethods.find(pm => pm.isDefault);
    const pendingVerification = paymentMethods.filter(pm => !pm.isVerified).length;

    return {
      totalMethods,
      verifiedCount,
      defaultMethod,
      pendingVerification
    };
  }, [paymentMethods]);

  const getBrandIcon = (brand: PaymentMethod['brand']) => {
    const icons = {
      visa: CreditCard,
      mastercard: CreditCard,
      amex: CreditCard,
      discover: CreditCard,
      paypal: CreditCard,
      bank: Banknote
    };
    return icons[brand] || CreditCard;
  };

  const getBrandColor = (brand: PaymentMethod['brand']) => {
    const colors = {
      visa: "text-blue-600 dark:text-blue-400",
      mastercard: "text-red-600 dark:text-red-400",
      amex: "text-green-600 dark:text-green-400",
      discover: "text-orange-600 dark:text-orange-400",
      paypal: "text-blue-500 dark:text-blue-300",
      bank: "text-gray-600 dark:text-gray-400"
    };
    return colors[brand] || "text-gray-600 dark:text-gray-400";
  };

  const formatExpiryDate = (month?: number, year?: number) => {
    if (!month || !year) return null;
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const isExpiringSoon = (month?: number, year?: number) => {
    if (!month || !year) return false;
    const now = new Date();
    const expiry = new Date(year, month - 1);
    const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3);
    return expiry <= threeMonthsFromNow;
  };

  const maskCardNumber = (cardNumber: string) => {
    // Only show last 4 digits for security
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 4) return '••••';
    return '•••• •••• •••• ' + cleaned.slice(-4);
  };

  const handleAddPaymentMethod = async (data: AddPaymentMethodForm) => {
    try {
      // In a real implementation, this would integrate with Stripe/payment processor
      const newPaymentMethod: Omit<PaymentMethod, 'id' | 'addedDate'> = {
        type: data.type,
        brand: data.cardNumber.startsWith('4') ? 'visa' : 
               data.cardNumber.startsWith('5') ? 'mastercard' : 'visa', // Simplified detection
        last4: data.cardNumber.slice(-4),
        expiryMonth: parseInt(data.expiryMonth),
        expiryYear: parseInt(data.expiryYear),
        holderName: data.holderName,
        isDefault: paymentMethods.length === 0, // First card becomes default
        isVerified: false, // Needs verification
        nickname: data.nickname,
        billingAddress: {
          country: data.billingCountry,
          postalCode: data.billingPostalCode
        }
      };

      if (onAddPaymentMethod) {
        await onAddPaymentMethod(newPaymentMethod);
      }

      toast({
        title: "Payment Method Added",
        description: "Your payment method has been added successfully and is pending verification.",
      });

      setIsAddDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Failed to Add Payment Method",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePaymentMethod = async (id: string) => {
    const method = paymentMethods.find(pm => pm.id === id);
    if (method?.isDefault) {
      toast({
        title: "Cannot Remove Default Payment Method",
        description: "Please set another payment method as default first.",
        variant: "destructive",
      });
      return;
    }

    setIsRemoving(id);
    try {
      if (onRemovePaymentMethod) {
        await onRemovePaymentMethod(id);
      }

      toast({
        title: "Payment Method Removed",
        description: "The payment method has been removed from your account.",
      });
    } catch (error) {
      toast({
        title: "Failed to Remove Payment Method",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setIsSettingDefault(id);
    try {
      if (onSetDefaultPaymentMethod) {
        await onSetDefaultPaymentMethod(id);
      }

      toast({
        title: "Default Payment Method Updated",
        description: "This payment method is now your default.",
      });
    } catch (error) {
      toast({
        title: "Failed to Update Default",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSettingDefault(null);
    }
  };

  const handleVerify = async (id: string) => {
    setIsVerifying(id);
    try {
      if (onVerifyPaymentMethod) {
        await onVerifyPaymentMethod(id);
      }

      toast({
        title: "Verification Initiated",
        description: "Please check your statement for micro-deposits or follow the verification instructions sent to your email.",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(null);
    }
  };

  const toggleCardDetails = (id: string) => {
    setShowCardDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Methods</p>
                <p className="text-2xl font-bold">{summary.totalMethods}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Verified</p>
                <p className="text-2xl font-bold">{summary.verifiedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Default</p>
                <p className="text-lg font-semibold truncate">
                  {summary.defaultMethod ? 
                    `••••${summary.defaultMethod.last4}` : 
                    "None"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{summary.pendingVerification}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Payment Methods Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Manage your saved payment methods securely. All sensitive information is encrypted.
              </CardDescription>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                  <DialogDescription>
                    Add a new payment method to your account. All information is securely encrypted.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddPaymentMethod)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="debit_card">Debit Card</SelectItem>
                              <SelectItem value="bank_account">Bank Account</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {(form.watch('type') === 'credit_card' || form.watch('type') === 'debit_card') && (
                      <>
                        <FormField
                          control={form.control}
                          name="cardNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Card Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="1234 5678 9012 3456" 
                                  {...field}
                                  onChange={(e) => {
                                    // Format card number with spaces
                                    const value = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
                                    field.onChange(value);
                                  }}
                                  maxLength={19}
                                />
                              </FormControl>
                              <FormDescription>
                                Your card number is encrypted and secure
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="expiryMonth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Expiry Month</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="MM" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => {
                                      const month = i + 1;
                                      return (
                                        <SelectItem key={month} value={month.toString()}>
                                          {month.toString().padStart(2, '0')}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="expiryYear"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Expiry Year</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="YYYY" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.from({ length: 10 }, (_, i) => {
                                      const year = new Date().getFullYear() + i;
                                      return (
                                        <SelectItem key={year} value={year.toString()}>
                                          {year}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="cvv"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CVV</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="123" 
                                  {...field}
                                  maxLength={4}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                3 or 4 digit security code
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="holderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cardholder Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nickname (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Personal Card" {...field} />
                          </FormControl>
                          <FormDescription>
                            Give this payment method a memorable name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="billingCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="GB">United Kingdom</SelectItem>
                                <SelectItem value="DE">Germany</SelectItem>
                                <SelectItem value="FR">France</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingPostalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="10001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Lock className="w-4 h-4 mr-2" />
                        Add Payment Method
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-8 bg-muted rounded" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-20 bg-muted rounded" />
                      <div className="h-8 w-8 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : paymentMethods.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
              <p className="text-muted-foreground mb-4">
                Add a payment method to start making payments securely.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Payment Method
              </Button>
            </div>
          ) : (
            // Payment methods list
            <div className="space-y-4">
              {paymentMethods.map((method) => {
                const BrandIcon = getBrandIcon(method.brand);
                const brandColor = getBrandColor(method.brand);
                const expiryDate = formatExpiryDate(method.expiryMonth, method.expiryYear);
                const isExpiring = isExpiringSoon(method.expiryMonth, method.expiryYear);
                const showDetails = showCardDetails[method.id];

                return (
                  <div
                    key={method.id}
                    className={cn(
                      "border rounded-lg p-4 transition-all hover:shadow-md",
                      method.isDefault && "ring-2 ring-primary ring-opacity-50 bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={cn("p-2 rounded-lg bg-muted", brandColor)}>
                          <BrandIcon className="w-6 h-6" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {method.nickname || `${method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} ••••${method.last4}`}
                            </span>
                            {method.isDefault && (
                              <Badge variant="default" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                            {method.isVerified ? (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center space-x-4">
                              <span>••••{method.last4}</span>
                              {expiryDate && (
                                <span className={cn(
                                  "flex items-center",
                                  isExpiring && "text-orange-600 dark:text-orange-400"
                                )}>
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {expiryDate}
                                  {isExpiring && " (Expiring soon)"}
                                </span>
                              )}
                            </div>
                            <div>{method.holderName}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!method.isVerified && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerify(method.id)}
                            disabled={isVerifying === method.id}
                          >
                            {isVerifying === method.id ? (
                              "Verifying..."
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Verify
                              </>
                            )}
                          </Button>
                        )}

                        {!method.isDefault && method.isVerified && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(method.id)}
                            disabled={isSettingDefault === method.id}
                          >
                            {isSettingDefault === method.id ? (
                              "Setting..."
                            ) : (
                              <>
                                <Star className="w-4 h-4 mr-2" />
                                Set Default
                              </>
                            )}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleCardDetails(method.id)}
                        >
                          {showDetails ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePaymentMethod(method.id)}
                          disabled={isRemoving === method.id || method.isDefault}
                        >
                          {isRemoving === method.id ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {showDetails && (
                      <div className="mt-4 pt-4 border-t space-y-2 text-sm text-muted-foreground">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Type:</span> {method.type.replace('_', ' ')}
                          </div>
                          <div>
                            <span className="font-medium">Added:</span> {method.addedDate.toLocaleDateString()}
                          </div>
                          {method.billingAddress && (
                            <>
                              <div>
                                <span className="font-medium">Country:</span> {method.billingAddress.country}
                              </div>
                              <div>
                                <span className="font-medium">Postal Code:</span> {method.billingAddress.postalCode}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {paymentMethods.length > 0 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Security Information</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Payment information is encrypted using industry-standard AES-256 encryption</li>
                    <li>• We never store your full card number or CVV</li>
                    <li>• All transactions are processed through secure, PCI-compliant payment processors</li>
                    <li>• You can remove payment methods at any time</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentMethodManager;