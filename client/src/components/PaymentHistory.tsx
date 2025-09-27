/**
 * Author: Buffy
 * Date: 2025-01-27
 * PURPOSE: PaymentHistory component for displaying billing history and transactions.
 * Features invoice-style layout, status indicators, filtering, and export functionality.
 * Uses shadcn/ui Table components with proper TypeScript interfaces and placeholder data.
 * SRP/DRY check: Pass - Single responsibility (payment history display), reuses existing UI patterns
 * shadcn/ui: Pass - Uses Table, Card, Badge, Button, Select, and other shadcn/ui components
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  Receipt,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  Filter,
  RefreshCw,
  DollarSign,
  Calendar,
  FileJson,
  Copy,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// TypeScript interfaces for payment data
interface PaymentTransaction {
  id: string;
  invoiceNumber: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'disputed';
  paymentMethod: 'card' | 'bank_transfer' | 'paypal' | 'stripe';
  type: 'subscription' | 'usage' | 'credit' | 'refund' | 'adjustment';
  metadata?: {
    subscriptionPeriod?: string;
    tokensUsed?: number;
    planName?: string;
    cardLast4?: string;
    receiptUrl?: string;
  };
}

interface PaymentHistoryProps {
  transactions?: PaymentTransaction[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

// Placeholder data - replace with real API data
const PLACEHOLDER_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: "inv_2025_001",
    invoiceNumber: "INV-2025-001",
    date: new Date("2025-01-15"),
    description: "Pro Plan - Monthly Subscription",
    amount: 29.99,
    currency: "USD",
    status: "completed",
    paymentMethod: "card",
    type: "subscription",
    metadata: {
      subscriptionPeriod: "2025-01-15 to 2025-02-15",
      planName: "Pro Plan",
      cardLast4: "4242",
      receiptUrl: "#"
    }
  },
  {
    id: "inv_2024_312",
    invoiceNumber: "INV-2024-312",
    date: new Date("2024-12-28"),
    description: "API Usage - December 2024",
    amount: 45.67,
    currency: "USD",
    status: "completed",
    paymentMethod: "card",
    type: "usage",
    metadata: {
      tokensUsed: 2834500,
      cardLast4: "4242",
      receiptUrl: "#"
    }
  },
  {
    id: "inv_2024_311",
    invoiceNumber: "INV-2024-311",
    date: new Date("2024-12-15"),
    description: "Pro Plan - Monthly Subscription",
    amount: 29.99,
    currency: "USD",
    status: "completed",
    paymentMethod: "card",
    type: "subscription",
    metadata: {
      subscriptionPeriod: "2024-12-15 to 2025-01-15",
      planName: "Pro Plan",
      cardLast4: "4242",
      receiptUrl: "#"
    }
  },
  {
    id: "ref_2024_045",
    invoiceNumber: "REF-2024-045",
    date: new Date("2024-12-10"),
    description: "Refund - Duplicate charge",
    amount: -29.99,
    currency: "USD",
    status: "refunded",
    paymentMethod: "card",
    type: "refund",
    metadata: {
      cardLast4: "4242",
      receiptUrl: "#"
    }
  },
  {
    id: "inv_2024_310",
    invoiceNumber: "INV-2024-310",
    date: new Date("2024-11-28"),
    description: "API Usage - November 2024",
    amount: 78.23,
    currency: "USD",
    status: "pending",
    paymentMethod: "bank_transfer",
    type: "usage",
    metadata: {
      tokensUsed: 4892340,
      receiptUrl: "#"
    }
  },
  {
    id: "inv_2024_309",
    invoiceNumber: "INV-2024-309",
    date: new Date("2024-11-15"),
    description: "Pro Plan - Monthly Subscription",
    amount: 29.99,
    currency: "USD",
    status: "failed",
    paymentMethod: "card",
    type: "subscription",
    metadata: {
      subscriptionPeriod: "2024-11-15 to 2024-12-15",
      planName: "Pro Plan",
      cardLast4: "4242"
    }
  }
];

export function PaymentHistory({
  transactions = PLACEHOLDER_TRANSACTIONS,
  isLoading = false,
  onRefresh,
  className
}: PaymentHistoryProps) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const statusMatch = statusFilter === "all" || transaction.status === statusFilter;
      const typeMatch = typeFilter === "all" || transaction.type === typeFilter;
      return statusMatch && typeMatch;
    });
  }, [transactions, statusFilter, typeFilter]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const completed = filteredTransactions.filter(t => t.status === 'completed');
    const totalAmount = completed.reduce((sum, t) => sum + t.amount, 0);
    const thisMonth = completed.filter(t => {
      const transactionMonth = t.date.getMonth();
      const currentMonth = new Date().getMonth();
      return transactionMonth === currentMonth;
    });
    const thisMonthAmount = thisMonth.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalTransactions: filteredTransactions.length,
      totalAmount,
      thisMonthAmount,
      pendingCount: filteredTransactions.filter(t => t.status === 'pending').length
    };
  }, [filteredTransactions]);

  const getStatusBadge = (status: PaymentTransaction['status']) => {
    const statusConfig = {
      completed: { icon: CheckCircle, variant: "default" as const, label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      pending: { icon: Clock, variant: "secondary" as const, label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      failed: { icon: XCircle, variant: "destructive" as const, label: "Failed", className: "" },
      refunded: { icon: RefreshCw, variant: "outline" as const, label: "Refunded", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      disputed: { icon: AlertCircle, variant: "destructive" as const, label: "Disputed", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={cn("flex items-center gap-1", config.className)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: PaymentTransaction['paymentMethod']) => {
    const icons = {
      card: CreditCard,
      bank_transfer: Receipt,
      paypal: DollarSign,
      stripe: CreditCard
    };
    return icons[method] || CreditCard;
  };

  const formatAmount = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    });
    return formatter.format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const headers = ['Invoice', 'Date', 'Description', 'Amount', 'Status', 'Payment Method', 'Type'];
        const rows = filteredTransactions.map(t => [
          t.invoiceNumber,
          formatDate(t.date),
          t.description,
          formatAmount(t.amount, t.currency),
          t.status,
          t.paymentMethod,
          t.type
        ]);
        content = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify({
          exportDate: new Date().toISOString(),
          totalTransactions: summary.totalTransactions,
          totalAmount: summary.totalAmount,
          transactions: filteredTransactions
        }, null, 2);
        filename = `payment-history-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to export ${format.toUpperCase()} file`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyTransaction = async (transaction: PaymentTransaction) => {
    const text = `Invoice: ${transaction.invoiceNumber}\nDate: ${formatDate(transaction.date)}\nDescription: ${transaction.description}\nAmount: ${formatAmount(transaction.amount, transaction.currency)}\nStatus: ${transaction.status}`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Transaction details copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy transaction details",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Transactions</p>
                <p className="text-2xl font-bold">{summary.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">{formatAmount(summary.totalAmount, 'USD')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">This Month</p>
                <p className="text-2xl font-bold">{formatAmount(summary.thisMonthAmount, 'USD')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{summary.pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Payment History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                View and manage your billing history and transaction records
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                  Refresh
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="w-4 h-4 mr-2" />
                    CSV Spreadsheet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON Data
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 pt-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="usage">Usage</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter !== "all" || typeFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton rows
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-48 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-6 w-20 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-muted animate-pulse rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Receipt className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No transactions found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters or check back later</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const PaymentIcon = getPaymentMethodIcon(transaction.paymentMethod);
                    
                    return (
                      <TableRow key={transaction.id} className="group">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">{transaction.invoiceNumber}</span>
                            {transaction.metadata?.subscriptionPeriod && (
                              <span className="text-xs text-muted-foreground">
                                {transaction.metadata.subscriptionPeriod}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{transaction.description}</span>
                            {transaction.metadata?.tokensUsed && (
                              <span className="text-xs text-muted-foreground">
                                {transaction.metadata.tokensUsed.toLocaleString()} tokens
                              </span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className={cn(
                          "font-medium",
                          transaction.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                        )}>
                          {formatAmount(transaction.amount, transaction.currency)}
                        </TableCell>
                        
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <PaymentIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="capitalize">{transaction.paymentMethod.replace('_', ' ')}</span>
                            {transaction.metadata?.cardLast4 && (
                              <span className="text-xs text-muted-foreground">••••{transaction.metadata.cardLast4}</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {transaction.metadata?.receiptUrl && (
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Receipt
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleCopyTransaction(transaction)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Details
                              </DropdownMenuItem>
                              {transaction.status === 'failed' && (
                                <DropdownMenuItem>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Retry Payment
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </p>
              
              {/* Pagination would go here in a real implementation */}
              <div className="text-sm text-muted-foreground">
                Total: {formatAmount(summary.totalAmount, 'USD')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentHistory;