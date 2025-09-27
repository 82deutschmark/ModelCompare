/**
 * Author: Codebuff
 * Date: 2025-09-27
 * PURPOSE: Billing/Payment management page that integrates BillingDashboard component.
 * SRP/DRY check: Pass - Single responsibility (orchestration of billing dashboard)
 * shadcn/ui: Pass - Uses AppNavigation, BillingDashboard composed of shadcn/ui components
 */

import { CreditCard } from "lucide-react";
import { AppNavigation } from "@/components/AppNavigation";
import { BillingDashboard } from "@/components/BillingDashboard";

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation
        title="Billing"
        subtitle="Manage your credits, payments, and subscriptions"
        icon={CreditCard}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BillingDashboard />
      </div>
    </div>
  );
}
