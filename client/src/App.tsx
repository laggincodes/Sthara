/** Cadastral Blueprint application shell: dark, authoritative, and spatially precise. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PropertyVolumes from "./pages/PropertyVolumes";
import SpatialWorkspace from "./pages/SpatialWorkspace";
import SyntheticGcpDemo from "./pages/SyntheticGcpDemo";
import UlpInRegistry from "./pages/UlpInRegistry";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workspace" component={SpatialWorkspace} />
      <Route path="/property-volumes" component={PropertyVolumes} />
      <Route path="/ulpin-registry" component={UlpInRegistry} />
      <Route path="/synthetic-gcp-demo" component={SyntheticGcpDemo} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
<<<<<<< HEAD
      <ThemeProvider defaultTheme="dark" switchable>
=======
      <ThemeProvider defaultTheme="dark">
>>>>>>> dfe3bdc5c7e1f1a7a2e2f9d7c8a8e64de4760af3
        <TooltipProvider>
          <Toaster richColors theme="dark" position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
