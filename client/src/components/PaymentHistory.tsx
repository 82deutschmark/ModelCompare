/**
 * PaymentHistory Component
 * 
 * Author: Cascade (Claude Sonnet 4)
 * Date: July 2, 2025
 * PURPOSE: Display billing history and transaction records with invoice-style layout,
 *          status indicators, filtering, and export functionality. Fetches real
 *          transaction data from /api/stripe/transactions endpoint.
 * SRP/DRY check: Pass - Single responsibility for payment history display.
 *                Uses existing shadcn/ui components and follows project patterns.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  CreditCard,
  Receipt,
  DollarSign,
  Download,
  MoreHorizontal,
  FileText,
  Copy,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Transaction type matching the backend schema
interface PaymentTransaction {
  id: string;
  userId: string;
  stripePaymentIntentId: string | null;
  invoiceNumber: string;
  description: string;
  amount: number;
  currency: string;
  credits: number | null;
  status: string;
  type: string;
  paymentMethod: string | null;
  cardLast4: string | null;
  receiptUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded' | 'disputed';
type TransactionType = 'credit_purchase' | 'refund' | 'adjustment' | 'subscription' | 'usage';

interface PaymentHistoryProps {
  className?: string;
}

// Fetch transactions from API
async function fetchTransactions(): Promise<PaymentTransaction[]> {
  const response = await fetch('/api/stripe/transactions', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Please sign in to view payment history');
    }
    throw new Error('Failed to fetch payment history');
  }
  
  const data = await response.json();
  return data.transactions || [];
}

// Status badge configuration
function getStatusBadge(status: string) {
  const config: Record<string, { icon: typeof CheckCircle; variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className: string }> = {
    completed: { icon: CheckCircle, variant: 'default', label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    pending: { icon: Clock, variant: 'secondary', label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    failed: { icon: XCircle, variant: 'destructive', label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    refunded: { icon: RefreshCw, variant: 'outline', label: 'Refunded', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    disputed: { icon: AlertCircle, variant: 'outline', label: 'Disputed', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  };
  
  const statusConfig = config[status] || config.pending;
  const Icon = statusConfig.icon;
  
  return (
    <Badge variant={statusConfig.variant} className={statusConfig.className}>
      <Icon className="w-3 h-3 mr-1" />
      {statusConfig.label}
    </Badge>
  );
}

// Payment method icon
function getPaymentMethodIcon(method: string | null) {
  switch (method) {
    case 'card':
    case 'stripe':
      return <CreditCard className="w-4 h-4" />;
    case 'bank_transfer':
      return <Receipt className="w-4 h-4" />;
    case 'paypal':
      return <DollarSign className="w-4 h-4" />;
    default:
      return <CreditCard className="w-4 h-4" />;
  }
}

// Format currency
function formatCurrency(amount: number, currency: string = 'USD'): string {
  const dollars = amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(dollars);
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PaymentHistory({ className }: PaymentHistoryProps) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: fetchTransactions,
    retry: 1,
    staleTime: 30000,
  });

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      return true;
    });
  }, [transactions, statusFilter, typeFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'completed');
    const totalAmount = completed.reduce((sum, t) => sum + t.amount, 0);
    const thisMonth = completed.filter(t => {
      const date = new Date(t.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const monthlyAmount = thisMonth.reduce((sum, t) => sum + t.amount, 0);
    const pending = transactions.filter(t => t.status === 'pending').length;
    
    return {
      total: transactions.length,
      totalAmount,
      monthlyAmount,
      pending,
    };
  }, [transactions]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Invoice', 'Date', 'Description', 'Amount', 'Status', 'Type', 'Payment Method'];
    const rows = filteredTransactions.map(t => [
      t.invoiceNumber,
      formatDate(t.createdAt),
      t.description,
      formatCurrency(t.amount, t.currency),
      t.status,
      t.type,
      t.paymentMethod || 'N/A',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exported', description: 'Payment history exported to CSV' });
  };

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(filteredTransactions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exported', description: 'Payment history exported to JSON' });
  };

  const copyTransactionDetails = (transaction: PaymentTransaction) => {
    const details = `Invoice: ${transaction.invoiceNumber}\nDate: ${formatDate(transaction.createdAt)}\nAmount: ${formatCurrency(transaction.amount, transaction.currency)}\nStatus: ${transaction.status}\nDescription: ${transaction.description}`;
    navigator.clipboard.writeText(details);
    toast({ title: 'Copied', description: 'Transaction details copied to clipboard' });
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Loading your billing history...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your billing and transaction records</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
          <p className="text-muted-foreground">
            Your payment history will appear here after you make a purchase.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Payment History
            </CardTitle>
            <CardDescription>Your billing and transaction records</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileText className="w-4 h-4 mr-2" />
                  CSV Spreadsheet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON}>
                  <FileText className="w-4 h-4 mr-2" />
                  JSON Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.monthlyAmount)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>
        </div>

        <Separator />

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="credit_purchase">Credit Purchase</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="font-medium">{transaction.invoiceNumber}</div>
                      {transaction.credits && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {transaction.credits.toLocaleString()} credits
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{transaction.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      {transaction.type === 'refund' ? '-' : ''}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(transaction.paymentMethod)}
                        <span className="text-sm">
                          {transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : transaction.paymentMethod || 'Card'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {transaction.receiptUrl && (
                            <DropdownMenuItem onClick={() => window.open(transaction.receiptUrl!, '_blank')}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Receipt
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => copyTransactionDetails(transaction)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default PaymentHistory;
