import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Home from "@/pages/home";
import Battle from "@/pages/battle-chat";
import CreativeCombat from "./pages/creative-combat";
import Debate from "@/pages/debate";
import ResearchSynthesis from "@/pages/research-synthesis";
import PlanAssessmentPage from "@/pages/plan-assessment";
import NotFound from "@/pages/not-found";
import VixraPage from "./pages/vixra";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/battle" component={Battle} />
      <Route path="/creative-combat" component={CreativeCombat} />
      <Route path="/debate" component={Debate} />
      <Route path="/vixra" component={VixraPage} />
      <Route path="/research-synthesis" component={ResearchSynthesis} />
      <Route path="/plan-assessment" component={PlanAssessmentPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
