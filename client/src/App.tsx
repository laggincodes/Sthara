/** Cadastral Blueprint application shell: dark, authoritative, and spatially precise. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PropertyVolumes from "./pages/PropertyVolumes";
import ProfileSettings from "./pages/ProfileSettings";
import RoleConsole, { AccessPortal } from "./pages/RoleConsole";
import SpatialWorkspace from "./pages/SpatialWorkspace";
import SyntheticGcpDemo from "./pages/SyntheticGcpDemo";
import UlpInRegistry from "./pages/UlpInRegistry";

// Admin & Staff Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuthorities from "./pages/admin/AdminAuthorities";
import AdminDepartments from "./pages/admin/AdminDepartments";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import AuthorityDashboard from "./pages/authority/AuthorityDashboard";
import GovernmentDashboard from "./pages/government/GovernmentDashboard";
import SurveyorDashboard from "./pages/surveyor/SurveyorDashboard";
import StaffLogin from "./pages/auth/StaffLogin";
import AdminLogin from "./pages/auth/AdminLogin";
import AcceptInvitation from "./pages/auth/AcceptInvitation";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

function Router() {
  return (
    <Switch>
      {/* Public & Access Portals */}
      <Route path="/" component={AccessPortal} />
      <Route path="/overview" component={Home} />
      <Route path="/access" component={AccessPortal} />
      <Route path="/login" component={AccessPortal} />
      <Route path="/signup" component={AccessPortal} />
      <Route path="/staff/login" component={StaffLogin} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/accept-invitation" component={AcceptInvitation} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* 3D GIS & Registry */}
      <Route path="/workspace" component={SpatialWorkspace} />
      <Route path="/property-volumes" component={PropertyVolumes} />
      <Route path="/ulpin-registry" component={UlpInRegistry} />
      <Route path="/synthetic-gcp-demo" component={SyntheticGcpDemo} />

      {/* Role Dashboards & Management */}
      <Route path="/dashboard" component={RoleConsole} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/authorities" component={AdminAuthorities} />
      <Route path="/admin/departments" component={AdminDepartments} />
      <Route path="/admin/roles" component={AdminRoles} />
      <Route path="/admin/audit-logs" component={AdminAuditLogs} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/authority/dashboard" component={AuthorityDashboard} />
      <Route path="/government/dashboard" component={GovernmentDashboard} />
      <Route path="/surveyor/dashboard" component={SurveyorDashboard} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
