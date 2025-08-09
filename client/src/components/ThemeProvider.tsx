/**
 * Theme Provider Component - Dark/Light Mode Management
 * 
 * This component provides global theme management for the application using
 * React Context. It handles:
 * 
 * - Theme state management (light/dark modes)
 * - Persistence to localStorage for user preferences
 * - CSS class toggling on document element for Tailwind CSS
 * - Theme context provider for child components
 * - Theme toggle functionality accessible throughout the app
 * 
 * The theme system integrates with Tailwind CSS dark mode classes and
 * provides a consistent theming experience across all components.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
