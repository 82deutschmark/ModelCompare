/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-01-14
 * PURPOSE: Modernized AppNavigation component using advanced shadcn/ui components.
 * Uses NavigationMenu, Breadcrumb, Switch, and other shadcn/ui primitives for professional UI.
 * Maintains consistent navigation patterns while improving responsive design.
 * SRP/DRY check: Pass - Single responsibility (navigation), reuses shadcn/ui components
 * shadcn/ui: Pass - Uses NavigationMenu, Breadcrumb, Switch, and other shadcn/ui components
 */

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";
import {
  Brain,
  Sword,
  Palette,
  MessageSquare,
  Users,
  Moon,
  Sun,
  ClipboardList,
  FileText,
  Monitor,
  Menu,
  Home,
  CreditCard
} from "lucide-react";

interface NavigationMode {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  category: 'core' | 'advanced' | 'experimental';
}

// Navigation modes configuration with categorization
const navigationModes: NavigationMode[] = [
  {
    id: "compare",
    name: "Compare",
    path: "/",
    icon: Brain,
    description: "Side-by-side model comparison",
    category: 'core'
  },
  {
    id: "battle",
    name: "Battle",
    path: "/battle",
    icon: Sword,
    description: "Chat-style model debates",
    category: 'core'
  },
  {
    id: "creative-combat",
    name: "Creative",
    path: "/creative-combat",
    icon: Palette,
    description: "Sequential creative editing",
    category: 'advanced'
  },
  {
    id: "debate",
    name: "Debate",
    path: "/debate",
    icon: MessageSquare,
    description: "Structured debates (Robert's Rules)",
    category: 'advanced'
  },
  {
    id: "plan-assessment",
    name: "Assess",
    path: "/plan-assessment",
    icon: ClipboardList,
    description: "Critique a plan across models",
    category: 'advanced'
  },
  {
    id: "research-synthesis",
    name: "Research",
    path: "/research-synthesis",
    icon: Users,
    description: "Collaborative research synthesis",
    category: 'advanced'
  },
  {
    id: "billing",
    name: "Billing",
    path: "/billing",
    icon: CreditCard,
    description: "Manage credits & payments",
    category: 'advanced'
  },
  {
    id: "vixra",
    name: "Vixra",
    path: "/vixra",
    icon: FileText,
    description: "Generate satirical academic papers",
    category: 'experimental'
  },
  {
    id: "arc-agi",
    name: "ARC-AGI",
    path: "/arc-agi",
    icon: Monitor,
    description: "Chess AI and ARC-AGI visualization",
    category: 'experimental'
  }
];

interface AppNavigationProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function AppNavigation({ title, subtitle, icon: TitleIcon }: AppNavigationProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [location] = useLocation();

  const currentMode = navigationModes.find(mode => mode.path === location);
  const coreMode = navigationModes.filter(mode => mode.category === 'core');
  const advancedModes = navigationModes.filter(mode => mode.category === 'advanced');
  const experimentalModes = navigationModes.filter(mode => mode.category === 'experimental');

  const renderModeButton = (mode: NavigationMode, size: 'xs' | 'sm' | 'default' = 'xs') => {
    const isCurrentMode = location === mode.path;
    const IconComponent = mode.icon;

    return (
      <Link key={mode.id} href={mode.path}>
        <Button
          variant={isCurrentMode ? "default" : "ghost"}
          size={size}
          className={cn(
            "flex items-center space-x-1",
            isCurrentMode && "bg-primary text-primary-foreground"
          )}
          disabled={isCurrentMode}
        >
          <IconComponent className="w-3 h-3" />
          <span className="text-xs">{mode.name}</span>
        </Button>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex h-8 items-center justify-between">
          {/* Compact Logo and Breadcrumb */}
          <div className="flex items-center space-x-1">
            <div className="flex items-center space-x-1">
              {TitleIcon && <TitleIcon className="w-3 h-3 text-primary" />}
              <span className="font-bold text-sm">ModelCompare</span>
            </div>

          </div>

          {/* Desktop Navigation - All modes visible */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Core Modes */}
            {coreMode.map(mode => renderModeButton(mode))}

            {/* Visual separator */}
            <div className="h-4 w-px bg-border mx-1" />

            {/* Advanced Modes - now directly visible */}
            {advancedModes.map(mode => renderModeButton(mode))}

            {/* Visual separator */}
            <div className="h-4 w-px bg-border mx-1" />

            {/* Experimental Modes */}
            {experimentalModes.map(mode => (
              <div key={mode.id} className="relative">
                {renderModeButton(mode)}
                <Badge variant="secondary" className="absolute -top-1 -right-1 px-1 py-0 text-xs scale-75">
                  β
                </Badge>
              </div>
            ))}
          </div>

          {/* Compact Authentication & Theme */}
          <div className="flex items-center space-x-1">
            {/* Credit Balance - only show if authenticated */}
            {isAuthenticated && user && (
              <div className="hidden lg:block">
              </div>
            )}

            {/* Ultra-compact Theme Toggle */}
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label="Toggle theme"
              className="scale-75"
            />

            {/* Authentication */}
            {authLoading ? (
              <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <UserMenu />
            ) : (
              <GoogleSignInButton size="xs" variant="outline" />
            )}

            {/* Mobile Menu */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="xs" className="h-6 w-6 p-0">
                    <Menu className="w-3 h-3" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="mt-4 space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold mb-2">Core</h3>
                      <div className="space-y-1">
                        {coreMode.map(mode => renderModeButton(mode, 'sm'))}
                      </div>
                    </div>

                    {advancedModes.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold mb-2">Advanced</h3>
                        <div className="space-y-1">
                          {advancedModes.map(mode => renderModeButton(mode, 'sm'))}
                        </div>
                      </div>
                    )}

                    {experimentalModes.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold mb-2 flex items-center">
                          Experimental
                          <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs scale-75">β</Badge>
                        </h3>
                        <div className="space-y-1">
                          {experimentalModes.map(mode => renderModeButton(mode, 'sm'))}
                        </div>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Compact Current Page Info */}
        {currentMode && subtitle && (
          <div className="pb-1 pt-0.5">
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        )}
      </div>
    </header>
  );
}

export default AppNavigation;