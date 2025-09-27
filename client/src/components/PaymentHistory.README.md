# PaymentHistory Component

A comprehensive React component for displaying billing history and transaction records with an invoice-style layout, status indicators, filtering, and export functionality.

## Features

- ✅ **Invoice-style Layout**: Professional table design with detailed transaction information
- ✅ **Status Indicators**: Color-coded badges for transaction status (completed, pending, failed, refunded, disputed)
- ✅ **Export Functionality**: Export to CSV and JSON formats with current filters applied
- ✅ **Filtering & Search**: Filter by transaction status and type
- ✅ **Summary Statistics**: Total transactions, amounts, monthly summaries, pending counts
- ✅ **Loading States**: Skeleton loading animation and empty state handling
- ✅ **Responsive Design**: Mobile-friendly table layout
- ✅ **TypeScript Support**: Comprehensive interfaces for type safety
- ✅ **shadcn/ui Integration**: Uses consistent design system components

## Installation

The component is built using shadcn/ui components. Ensure you have the following components installed:

```bash
npx shadcn-ui@latest add table card button badge select dropdown-menu separator
```

## Basic Usage

```tsx
import PaymentHistory from '@/components/PaymentHistory';

function BillingPage() {
  return (
    <div className="container mx-auto py-8">
      <PaymentHistory />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `transactions` | `PaymentTransaction[]` | `PLACEHOLDER_TRANSACTIONS` | Array of payment transactions |
| `isLoading` | `boolean` | `false` | Shows loading skeleton when true |
| `onRefresh` | `() => void` | `undefined` | Callback for refresh button click |
| `className` | `string` | `undefined` | Additional CSS classes |

## TypeScript Interface

```typescript
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
```

## Advanced Usage

### With API Integration

```tsx
import { useQuery } from '@tanstack/react-query';
import PaymentHistory from '@/components/PaymentHistory';

function BillingPage() {
  const { 
    data: transactions, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: fetchPaymentHistory
  });

  return (
    <PaymentHistory 
      transactions={transactions}
      isLoading={isLoading}
      onRefresh={() => refetch()}
    />
  );
}
```

### Custom Styling

```tsx
<PaymentHistory 
  className="max-w-6xl mx-auto"
  transactions={customTransactions}
/>
```

### Loading State Only

```tsx
<PaymentHistory 
  isLoading={true}
  transactions={[]}
/>
```

## Component Features

### Summary Cards

The component displays four summary cards at the top:
- **Total Transactions**: Count of all transactions
- **Total Amount**: Sum of all completed transactions
- **This Month**: Amount for current month
- **Pending**: Count of pending transactions

### Transaction Table

The main table includes:
- **Invoice Number**: Unique identifier with subscription period if applicable
- **Date**: Formatted transaction date
- **Description**: Transaction description with token usage if applicable
- **Amount**: Formatted currency amount (negative for refunds)
- **Status**: Color-coded status badge
- **Payment Method**: Icon and method with card last 4 digits
- **Actions**: Dropdown menu with receipt view, copy details, and retry options

### Filtering

Two filter dropdowns allow filtering by:
- **Status**: All, Completed, Pending, Failed, Refunded, Disputed
- **Type**: All, Subscription, Usage, Credit, Refund, Adjustment

### Export Options

Export dropdown provides:
- **CSV Spreadsheet**: Tabular format for Excel/Google Sheets
- **JSON Data**: Structured data with metadata

## Status Indicators

| Status | Badge Color | Icon |
|--------|-------------|------|
| Completed | Green | CheckCircle |
| Pending | Yellow | Clock |
| Failed | Red | XCircle |
| Refunded | Blue | RefreshCw |
| Disputed | Orange | AlertCircle |

## Payment Method Icons

| Method | Icon |
|--------|------|
| card | CreditCard |
| bank_transfer | Receipt |
| paypal | DollarSign |
| stripe | CreditCard |

## Backend Integration

### API Endpoint Example

```typescript
// api/payment-history.ts
export async function fetchPaymentHistory(): Promise<PaymentTransaction[]> {
  const response = await fetch('/api/billing/transactions', {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch payment history');
  }
  
  const data = await response.json();
  return data.transactions.map(transformTransaction);
}

function transformTransaction(apiTransaction: any): PaymentTransaction {
  return {
    id: apiTransaction.id,
    invoiceNumber: apiTransaction.invoice_number,
    date: new Date(apiTransaction.created_at),
    description: apiTransaction.description,
    amount: apiTransaction.amount / 100, // Convert from cents
    currency: apiTransaction.currency.toUpperCase(),
    status: apiTransaction.status,
    paymentMethod: apiTransaction.payment_method.type,
    type: apiTransaction.type,
    metadata: {
      subscriptionPeriod: apiTransaction.metadata?.subscription_period,
      tokensUsed: apiTransaction.metadata?.tokens_used,
      planName: apiTransaction.metadata?.plan_name,
      cardLast4: apiTransaction.payment_method?.card?.last4,
      receiptUrl: apiTransaction.receipt_url
    }
  };
}
```

### Error Handling

```tsx
function BillingPage() {
  const { 
    data: transactions, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: fetchPaymentHistory,
    retry: 3,
    retryDelay: 1000
  });

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-destructive" />
          <p>Failed to load payment history</p>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <PaymentHistory 
      transactions={transactions || []}
      isLoading={isLoading}
      onRefresh={() => refetch()}
    />
  );
}
```

## Customization

### Custom Transaction Actions

To add custom actions to the dropdown menu, you can extend the component:

```tsx
// Extended component with custom actions
const CustomPaymentHistory = ({ onDownloadReceipt, ...props }) => {
  // Extend the handleActionClick function
  const handleCustomAction = (transaction, action) => {
    switch (action) {
      case 'download-receipt':
        onDownloadReceipt(transaction.metadata.receiptUrl);
        break;
      case 'dispute':
        // Handle dispute logic
        break;
    }
  };
  
  // Rest of component...
};
```

### Custom Status Colors

Override status badge colors by extending the `getStatusBadge` function:

```tsx
const statusConfig = {
  completed: { 
    icon: CheckCircle, 
    variant: "default", 
    label: "Paid", 
    className: "bg-emerald-100 text-emerald-800" 
  },
  // ... other statuses
};
```

## Demo Page

A complete demo page is available at `/payment-history-demo` showing:
- All component states (normal, loading, empty)
- Feature showcase
- Implementation examples
- Integration notes

## Dependencies

- React 18+
- TypeScript 4.5+
- shadcn/ui components
- Tailwind CSS
- Lucide React (icons)
- date-fns or similar for date formatting (optional)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Uses React.useMemo for filtered data computation
- Lazy loading for large transaction lists (can be added)
- Virtual scrolling support (can be added for 1000+ transactions)
- Optimized re-renders with proper key props

## Accessibility

- Full keyboard navigation support
- Screen reader friendly with proper ARIA labels
- High contrast mode support
- Focus management for modals and dropdowns

## License

This component follows the same license as your project.