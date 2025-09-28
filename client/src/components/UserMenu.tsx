/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-27T19:18:12-04:00
 * PURPOSE: Real user menu component showing authenticated user info and actions.
 *          Displays real user data, credit balance, and sign-out functionality.
 *          NO MOCK DATA - connects to real useAuth hook and user state.
 * SRP/DRY check: Pass - Single responsibility (user menu UI)
 * shadcn/ui: Pass - Uses DropdownMenu, Avatar, Badge components from shadcn/ui
 */

import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  CreditCard,
  LogOut,
  Settings,
  Coins
} from "lucide-react";

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const { user, logout, isLoading } = useAuth();

  if (isLoading || !user) {
    return null;
  }

  const getUserInitials = () => {
    // Generate initials from device ID for consistency
    const deviceId = user.id.slice(-2).toUpperCase();
    return deviceId;
  };

  const getUserDisplayName = () => {
    return `User ${user.id.slice(-4)}`;
  };

  const getStatusColor = (credits: number) => {
    if (credits >= 100) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (credits >= 25) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`relative h-8 w-8 rounded-full ${className}`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={undefined} alt={getUserDisplayName()} />
            <AvatarFallback className="text-sm">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  Device User
                </p>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={undefined} alt={getUserDisplayName()} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </div>

            {/* Credit Balance Display */}
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{(user.credits ?? 0).toLocaleString()} credits</span>
              </div>
              <Badge variant="secondary" className={getStatusColor(user.credits ?? 0)}>
                {(user.credits ?? 0) >= 100 ? 'Healthy' : (user.credits ?? 0) >= 25 ? 'Low' : 'Critical'}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/billing">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing & Credits</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/billing?tab=settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;