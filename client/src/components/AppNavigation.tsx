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

  const renderModeButton = (mode: NavigationMode, size: 'sm' | 'default' = 'sm') => {
    const isCurrentMode = location === mode.path;
    const IconComponent = mode.icon;

    return (
      <Link key={mode.id} href={mode.path}>
        <Button
          variant={isCurrentMode ? "default" : "ghost"}
          size={size}
          className={cn(
            "flex items-center space-x-2",
            isCurrentMode && "bg-primary text-primary-foreground"
          )}
          disabled={isCurrentMode}
        >
          <IconComponent className="w-4 h-4" />
          <span className="text-sm">{mode.name}</span>
        </Button>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Breadcrumb */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {TitleIcon && <TitleIcon className="w-6 h-6 text-primary" />}
              <span className="font-bold text-lg">ModelCompare</span>
            </div>

            <div className="hidden sm:flex">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/home">
                      <Home className="w-4 h-4" />
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {currentMode && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <span className="font-medium">{currentMode.name}</span>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Core Modes - Always Visible */}
                {coreMode.map(mode => (
                  <NavigationMenuItem key={mode.id}>
                    {renderModeButton(mode)}
                  </NavigationMenuItem>
                ))}

                {/* Advanced Modes Dropdown */}
                {advancedModes.length > 0 && (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9">
                      Advanced
                      <Badge variant="outline" className="ml-1 px-1 py-0 text-xs">
                        {advancedModes.length}
                      </Badge>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid w-[300px] gap-2 p-4">
                        {advancedModes.map(mode => {
                          const IconComponent = mode.icon;
                          const isCurrentMode = location === mode.path;

                          return (
                            <Link key={mode.id} href={mode.path}>
                              <NavigationMenuLink
                                className={cn(
                                  "flex items-start space-x-3 rounded-md p-3 hover:bg-accent hover:text-accent-foreground",
                                  isCurrentMode && "bg-accent text-accent-foreground"
                                )}
                              >
                                <IconComponent className="w-5 h-5 mt-0.5 text-muted-foreground" />
                                <div>
                                  <div className="text-sm font-medium">{mode.name}</div>
                                  <div className="text-xs text-muted-foreground">{mode.description}</div>
                                </div>
                              </NavigationMenuLink>
                            </Link>
                          );
                        })}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}

                {/* Experimental Modes Dropdown */}
                {experimentalModes.length > 0 && (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9">
                      Experimental
                      <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                        β
                      </Badge>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid w-[300px] gap-2 p-4">
                        {experimentalModes.map(mode => {
                          const IconComponent = mode.icon;
                          const isCurrentMode = location === mode.path;

                          return (
                            <Link key={mode.id} href={mode.path}>
                              <NavigationMenuLink
                                className={cn(
                                  "flex items-start space-x-3 rounded-md p-3 hover:bg-accent hover:text-accent-foreground",
                                  isCurrentMode && "bg-accent text-accent-foreground"
                                )}
                              >
                                <IconComponent className="w-5 h-5 mt-0.5 text-muted-foreground" />
                                <div>
                                  <div className="text-sm font-medium">{mode.name}</div>
                                  <div className="text-xs text-muted-foreground">{mode.description}</div>
                                </div>
                              </NavigationMenuLink>
                            </Link>
                          );
                        })}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Authentication & Theme */}
          <div className="flex items-center space-x-4">
            {/* Credit Balance - only show if authenticated */}
            {isAuthenticated && user && (
              <div className="hidden md:block">
              </div>
            )}

            {/* Theme Toggle */}
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4" />
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                aria-label="Toggle theme"
              />
              <Moon className="h-4 w-4" />
            </div>

            {/* Authentication */}
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <UserMenu />
            ) : (
              <GoogleSignInButton size="sm" variant="outline" />
            )}

            {/* Mobile Menu */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Core Features</h3>
                      <div className="space-y-2">
                        {coreMode.map(mode => renderModeButton(mode, 'default'))}
                      </div>
                    </div>

                    {advancedModes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Advanced Features</h3>
                        <div className="space-y-2">
                          {advancedModes.map(mode => renderModeButton(mode, 'default'))}
                        </div>
                      </div>
                    )}

                    {experimentalModes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center">
                          Experimental
                          <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">β</Badge>
                        </h3>
                        <div className="space-y-2">
                          {experimentalModes.map(mode => renderModeButton(mode, 'default'))}
                        </div>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Current Page Info */}
        {currentMode && subtitle && (
          <div className="pb-3 pt-1">
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        )}
      </div>
    </header>
  );
}

export default AppNavigation;