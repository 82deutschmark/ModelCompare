/**
 * Author: Buffy
 * Date: 2025-01-27
 * PURPOSE: Demo page for the PaymentHistory component.
 * Shows how to integrate the component with different states and configurations.
 * SRP/DRY check: Pass - Single responsibility (demo page), showcases component usage
 * shadcn/ui: Pass - Uses consistent layout patterns
 */

import { useState } from "react";
import PaymentHistory from "@/components/PaymentHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Receipt,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentHistoryDemo() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    setRefreshKey(prev => prev + 1);
    
    toast({
      title: "Payment History Refreshed",
      description: "Successfully loaded latest transaction data",
    });
  };

  const handleSimulateLoad = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Receipt className="w-8 h-8" />
            Payment History Demo
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive billing history and transaction management component
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">Demo Mode</Badge>
          <Badge variant="outline">v1.0</Badge>
        </div>
      </div>

      <Separator />

      {/* Component Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Component Features
          </CardTitle>
          <CardDescription>
            This PaymentHistory component includes all the requested features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Invoice-style Layout</h4>
                <p className="text-sm text-muted-foreground">Professional table with detailed transaction information</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Status Indicators</h4>
                <p className="text-sm text-muted-foreground">Color-coded badges for transaction status</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Export Functionality</h4>
                <p className="text-sm text-muted-foreground">CSV and JSON export with filtering</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Filtering & Search</h4>
                <p className="text-sm text-muted-foreground">Filter by status, type, and other criteria</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Summary Statistics</h4>
                <p className="text-sm text-muted-foreground">Total amounts, monthly summaries, pending counts</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Loading States</h4>
                <p className="text-sm text-muted-foreground">Skeleton loading and empty state handling</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
          <CardDescription>
            Test different component states and behaviors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              {isLoading ? "Refreshing..." : "Refresh Data"}
            </Button>
            
            <Button 
              onClick={handleSimulateLoad} 
              disabled={isLoading}
              variant="outline"
            >
              <Loader2 className="w-4 h-4 mr-2" />
              Simulate Loading
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Component will show placeholder data since backend is not connected yet
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Tabs */}
      <Tabs defaultValue="normal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="normal">Normal State</TabsTrigger>
          <TabsTrigger value="loading">Loading State</TabsTrigger>
          <TabsTrigger value="empty">Empty State</TabsTrigger>
        </TabsList>
        
        <TabsContent value="normal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History Component</CardTitle>
              <CardDescription>
                Full-featured payment history with placeholder data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentHistory 
                key={refreshKey}
                isLoading={false}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="loading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loading State</CardTitle>
              <CardDescription>
                Shows skeleton loading while fetching data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentHistory 
                isLoading={true}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="empty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empty State</CardTitle>
              <CardDescription>
                Shows when no transactions are found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentHistory 
                transactions={[]}
                isLoading={false}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Implementation Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Backend Integration</h4>
            <p className="text-sm text-muted-foreground mb-3">
              This component is ready for backend integration. Simply replace the placeholder data with your API calls.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <code className="text-sm">
                {`// Replace placeholder data with API call
const { data: transactions, isLoading } = useQuery('paymentHistory', fetchPaymentHistory);

<PaymentHistory 
  transactions={transactions}
  isLoading={isLoading}
  onRefresh={() => refetch()}
/>`}
              </code>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">TypeScript Interfaces</h4>
            <p className="text-sm text-muted-foreground">
              The component includes comprehensive TypeScript interfaces for PaymentTransaction and related types,
              making it easy to integrate with your existing backend types.
            </p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">Customization</h4>
            <p className="text-sm text-muted-foreground">
              All styles use shadcn/ui components and Tailwind CSS classes, making it easy to customize
              colors, spacing, and layout to match your design system.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}