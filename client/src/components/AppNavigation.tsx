/**
 * Centralized App Navigation Component
 * 
 * This component provides a consistent navigation header across all pages in the ModelCompare app.
 * It eliminates the need for hardcoded navigation in each page component and ensures consistency
 * when new modes are added to the application.
 * 
 * Features:
 * - Dynamic mode highlighting based on current route
 * - Consistent styling and layout across all pages
 * - Easy addition of new modes without touching existing page components
 * - Theme toggle integration
 * 
 * Author: Cascade
 * Date: August 11, 2025
 */

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Brain, Sword, Palette, MessageSquare, Users, Moon, Sun, ClipboardList, FileText, Monitor } from "lucide-react";

interface NavigationMode {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

// Navigation modes configuration - add new modes here
const navigationModes: NavigationMode[] = [
  {
    id: "compare",
    name: "Compare",
    path: "/",
    icon: Brain,
    description: "Side-by-side model comparison"
  },
  {
    id: "battle",
    name: "Battle",
    path: "/battle",
    icon: Sword,
    description: "Chat-style model debates"
  },
  {
    id: "creative-combat",
    name: "Creative",
    path: "/creative-combat",
    icon: Palette,
    description: "Sequential creative editing"
  },
  {
    id: "debate",
    name: "Debate",
    path: "/debate",
    icon: MessageSquare,
    description: "Structured debates (Robert's Rules)"
  },
  {
    id: "plan-assessment",
    name: "Assess",
    path: "/plan-assessment",
    icon: ClipboardList,
    description: "Critique a plan across models"
  },
  {
    id: "research-synthesis",
    name: "Research",
    path: "/research-synthesis",
    icon: Users,
    description: "Collaborative research synthesis"
  },
  {
    id: "vixra",
    name: "Vixra",
    path: "/vixra",
    icon: FileText,
    description: "Generate satirical academic papers"
  },
  {
    id: "dashboard",
    name: "Dashboard",
    path: "/dashboard",
    icon: Monitor,
    description: "Chess AI and ARC-AGI visualization"
  }
];

interface AppNavigationProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function AppNavigation({ title, subtitle, icon: TitleIcon }: AppNavigationProps) {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Title Section */}
          <div className="flex items-center space-x-3">
            {TitleIcon && <TitleIcon className="w-8 h-8 text-blue-600" />}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Navigation and Controls */}
          <div className="flex items-center space-x-2">
            {/* Mode Navigation */}
            {navigationModes.map((mode) => {
              const isCurrentMode = location === mode.path;
              const IconComponent = mode.icon;
              
              return (
                <Link key={mode.id} href={mode.path}>
                  <Button 
                    variant={isCurrentMode ? "default" : "outline"} 
                    size="sm" 
                    className="flex items-center space-x-1 px-2 py-1"
                    disabled={isCurrentMode}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span className="text-xs">{mode.name}</span>
                  </Button>
                </Link>
              );
            })}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-1 ml-2"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppNavigation;
