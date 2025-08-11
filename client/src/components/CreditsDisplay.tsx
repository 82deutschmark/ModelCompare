/**
 * Credits Display Component
 * 
 * Shows user's current credit balance with purchase option.
 * Displays credit count and provides access to credit purchasing.
 * 
 * Author: Replit Agent
 * Date: August 11, 2025
 */

import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface CreditsDisplayProps {
  onPurchaseClick?: () => void;
}

export function CreditsDisplay({ onPurchaseClick }: CreditsDisplayProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm border rounded-lg px-3 py-2">
      <Coins className="h-4 w-4 text-yellow-500" />
      <span className="font-medium">{user.credits}</span>
      <span className="text-sm text-muted-foreground">credits</span>
      {onPurchaseClick && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPurchaseClick}
          className="ml-2 h-7"
        >
          <Plus className="h-3 w-3 mr-1" />
          Buy More
        </Button>
      )}
    </div>
  );
}