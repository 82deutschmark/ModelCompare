/*
 * Author: gpt-5-codex
 * Date: 2025-11-06T04:07:30Z
 * PURPOSE: Root React application wiring QueryClient, theming, routing, and linking the ARC agent workspace route.
 * SRP/DRY check: Pass - component orchestrates providers and route declarations without embedding feature logic.
 */

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useSimpleDynamicFavicon } from "@/hooks/useDynamicFavicon";
import { setDeviceId } from "@/lib/deviceId";
import { useEffect } from "react";
import Compare from "@/pages/compare";
import Home from "@/pages/home";
import Battle from "@/pages/battle-chat";
import CreativeCombat from "./pages/creative-combat";
import Debate from "@/pages/debate";
import AgentWorkspacePage from "@/pages/agent-workspace";
import PlanAssessmentPage from "@/pages/plan-assessment";
import NotFound from "@/pages/not-found";
import BillingPage from "@/pages/billing";
import VixraPage from "./pages/vixra";
import ArcAgiPage from "./pages/ARC";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Compare} />
      <Route path="/home" component={Home} />
      <Route path="/battle" component={Battle} />
      <Route path="/creative-combat" component={CreativeCombat} />
      <Route path="/debate" component={Debate} />
      <Route path="/vixra" component={VixraPage} />
      <Route path="/arc-agi" component={ArcAgiPage} />
      <Route path="/agent-workspace" component={AgentWorkspacePage} />
      <Route path="/plan-assessment" component={PlanAssessmentPage} />
      <Route path="/billing" component={BillingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Generate unique favicon for this tab/session
  useSimpleDynamicFavicon();

  // Handle device ID update after Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newDeviceId = params.get('update_device_id');

    if (newDeviceId) {
      // Update localStorage with new OAuth-based device ID
      setDeviceId(newDeviceId);
      console.log('Updated device ID after OAuth:', newDeviceId);

      // Invalidate auth query to refetch with new device ID
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });

      // Clean up URL by removing the query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
