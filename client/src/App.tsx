/** Cadastral Blueprint application shell: dark, authoritative, and spatially precise. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PropertyVolumes from "./pages/PropertyVolumes";
import RoleConsole, { AccessPortal } from "./pages/RoleConsole";
import SpatialWorkspace from "./pages/SpatialWorkspace";
import SyntheticGcpDemo from "./pages/SyntheticGcpDemo";
import UlpInRegistry from "./pages/UlpInRegistry";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={AccessPortal} />
      <Route path="/overview" component={Home} />
      <Route path="/workspace" component={SpatialWorkspace} />
      <Route path="/property-volumes" component={PropertyVolumes} />
      <Route path="/ulpin-registry" component={UlpInRegistry} />
      <Route path="/synthetic-gcp-demo" component={SyntheticGcpDemo} />
      <Route path="/access" component={AccessPortal} />
      <Route path="/dashboard" component={RoleConsole} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster richColors theme="dark" position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
