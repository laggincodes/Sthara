/** Cadastral Blueprint application shell: dark, authoritative, and spatially precise. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import StharaOverview from "./pages/StharaOverview";
import StharaProjects from "./pages/StharaProjects";
import SpatialWorkspace from "./pages/SpatialWorkspace";
import FloorExplorer from "./pages/FloorExplorer";
import DrawingIntelligence from "./pages/DrawingIntelligence";
import SpatialAnalysis from "./pages/SpatialAnalysis";
import StharaMeasurements from "./pages/StharaMeasurements";
import StharaSources from "./pages/StharaSources";
import StharaSpatialIds from "./pages/StharaSpatialIds";
import StharaExports from "./pages/StharaExports";
import ProfileSettings from "./pages/ProfileSettings";

import { StharaAppShell } from "./components/StharaAppShell";

function Router() {
  return (
    <Switch>
      {/* Primary STHARA Spatial Intelligence Workspace */}
      <Route path="/" component={StharaOverview} />
      <Route path="/overview" component={StharaOverview} />
      <Route path="/projects" component={StharaProjects} />
      <Route path="/workspace" component={SpatialWorkspace} />
      <Route path="/floor-explorer" component={FloorExplorer} />
      <Route path="/drawing-intelligence" component={DrawingIntelligence} />
      <Route path="/spatial-analysis" component={SpatialAnalysis} />
      <Route path="/measurements" component={StharaMeasurements} />
      <Route path="/sources" component={StharaSources} />
      <Route path="/spatial-ids" component={StharaSpatialIds} />
      <Route path="/ulpin-registry" component={StharaSpatialIds} />
      <Route path="/exports" component={StharaExports} />
      <Route path="/dashboard" component={StharaOverview} />
      <Route path="/profile-settings" component={ProfileSettings} />

      {/* 404 Wildcard */}
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
          <StharaAppShell>
            <Router />
          </StharaAppShell>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
