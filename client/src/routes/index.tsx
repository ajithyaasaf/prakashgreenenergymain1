import { Route, Switch, useLocation, useRoute } from "wouter";
import { Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

// Lazy loaded pages
const HomePage = lazy(() => import("@/pages/home/HomePage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const CustomersPage = lazy(() => import("@/pages/customers/CustomersPage"));
const ProductsPage = lazy(() => import("@/pages/products/ProductsPage"));
const QuotationsPage = lazy(() => import("@/pages/quotations/QuotationsPage"));
const InvoicesPage = lazy(() => import("@/pages/invoices/InvoicesPage"));
const AttendancePage = lazy(() => import("@/pages/attendance/AttendancePage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const AttendanceOverviewPage = lazy(() => import("@/pages/analytics/AttendanceOverviewPage"));
const PersonalAttendancePage = lazy(() => import("@/pages/analytics/PersonalAttendancePage"));
const AttendanceAdminPage = lazy(() => import("@/pages/admin/AttendanceAdminPage"));
const AttendanceSettingsPage = lazy(() => import("@/pages/admin/AttendanceSettingsPage"));
const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));

// Loading component
const Loading = () => (
  <div className="flex justify-center items-center h-full w-full min-h-[70vh]">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Public route component
const PublicRoute = ({ component: Component }: { component: React.ComponentType<any> }) => {
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
};

// Private route component
const PrivateRoute = ({ component: Component, roles = [] }: { component: React.ComponentType<any>, roles?: string[] }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [_, navigate] = useLocation();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate("/auth/login");
    return null;
  }
  
  // If roles are specified and user's role is not included, redirect to dashboard
  if (roles.length && currentUser && !roles.includes(currentUser.role)) {
    navigate("/dashboard");
    return null;
  }
  
  return (
    <Suspense fallback={<Loading />}>
      <Layout>
        <Component />
      </Layout>
    </Suspense>
  );
};

// Auth route component (redirects to dashboard if already authenticated)
const AuthRoute = ({ component: Component }: { component: React.ComponentType<any> }) => {
  const { isAuthenticated } = useAuth();
  const [_, navigate] = useLocation();
  
  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }
  
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
};

export default function AppRoutes() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={() => <PublicRoute component={HomePage} />} />
      
      {/* Auth Routes */}
      <Route path="/auth/login" component={() => <AuthRoute component={LoginPage} />} />
      <Route path="/auth/register" component={() => <AuthRoute component={RegisterPage} />} />
      <Route path="/auth/forgot-password" component={() => <AuthRoute component={ForgotPasswordPage} />} />
      
      {/* Protected Routes - All Roles */}
      <Route path="/dashboard" component={() => <PrivateRoute component={DashboardPage} />} />
      <Route path="/customers" component={() => <PrivateRoute component={CustomersPage} />} />
      <Route path="/quotations" component={() => <PrivateRoute component={QuotationsPage} />} />
      <Route path="/invoices" component={() => <PrivateRoute component={InvoicesPage} />} />
      <Route path="/attendance" component={() => <PrivateRoute component={AttendancePage} />} />
      <Route path="/settings" component={() => <PrivateRoute component={SettingsPage} />} />
      <Route path="/analytics/personal-attendance" component={() => <PrivateRoute component={PersonalAttendancePage} />} />
      
      {/* Admin Routes */}
      <Route path="/products" component={() => <PrivateRoute component={ProductsPage} roles={['admin', 'master_admin']} />} />
      <Route path="/attendance-admin" component={() => <PrivateRoute component={AttendanceAdminPage} roles={['admin', 'master_admin']} />} />
      <Route path="/analytics/attendance-overview" component={() => <PrivateRoute component={AttendanceOverviewPage} roles={['admin', 'master_admin']} />} />
      
      {/* Master Admin Routes */}
      <Route path="/attendance-settings" component={() => <PrivateRoute component={AttendanceSettingsPage} roles={['master_admin']} />} />
      <Route path="/user-management" component={() => <PrivateRoute component={UserManagementPage} roles={['master_admin']} />} />
      
      {/* 404 Not Found */}
      <Route component={NotFound} />
    </Switch>
  );
}
