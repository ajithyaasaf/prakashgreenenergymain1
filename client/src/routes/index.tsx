import { Route, Switch, useLocation, useRoute } from "wouter";
import { Suspense, lazy, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import { 
  DelayedSpinner, 
  PageSkeleton, 
  TransitionLoading, 
  CompactLoading 
} from "@/components/ui/loading";
import { useQueryClient } from "@tanstack/react-query";
import { firestoreQueryUtils } from "@/hooks/useFirestoreQuery";
import { orderBy } from "firebase/firestore";

// Lazy loaded pages with prefetch hints for better performance
const HomePage = lazy(() => import("@/pages/home/HomePage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const DashboardPage = lazy(() => {
  const promise = import("@/pages/dashboard/DashboardPage");
  return promise;
});
const CustomersPage = lazy(() => import("@/pages/customers/CustomersPage"));
const ProductsPage = lazy(() => {
  const promise = import("@/pages/products/ProductsPage"); 
  return promise;
});
const QuotationsPage = lazy(() => import("@/pages/quotations/QuotationsPage"));
const InvoicesPage = lazy(() => import("@/pages/invoices/InvoicesPage"));
const AttendancePage = lazy(() => import("@/pages/attendance/AttendancePage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const AttendanceOverviewPage = lazy(() => import("@/pages/analytics/AttendanceOverviewPage"));
const PersonalAttendancePage = lazy(() => import("@/pages/analytics/PersonalAttendancePage"));
const AttendanceAdminPage = lazy(() => import("@/pages/admin/AttendanceAdminPage"));
const AttendanceSettingsPage = lazy(() => import("@/pages/admin/AttendanceSettingsPage"));
const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));
const AttendanceCalendarPage = lazy(() => import("@/pages/attendance/AttendanceCalendarPage"));
const DepartmentPoliciesPage = lazy(() => import("@/pages/admin/DepartmentPoliciesPage"));

// This function conditionally prefetches related data to make navigation feel faster
function usePrefetchOnHover() {
  const queryClient = useQueryClient();
  
  const prefetchDashboard = () => {
    // We could prefetch commonly needed dashboard data here
  };
  
  const prefetchProducts = () => {
    // Prefetch products collection
    firestoreQueryUtils.prefetchCollection(
      queryClient,
      "products",
      [orderBy("name", "asc")]
    );
  };
  
  return {
    prefetchDashboard,
    prefetchProducts
  };
}

// Public route component with transitions
const PublicRoute = ({ component: Component }: { component: React.ComponentType<any> }) => {
  return (
    <Suspense fallback={<TransitionLoading />}>
      <div className="fade-in content-transition">
        <Component />
      </div>
    </Suspense>
  );
};

// Enhanced private route component with better transitions
const PrivateRoute = ({ component: Component, roles = [] }: { component: React.ComponentType<any>, roles?: string[] }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [_, navigate] = useLocation();
  const initialChecked = useRef(false);
  
  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }
    
    // If roles are specified and user's role is not included, redirect to dashboard
    if (roles.length && currentUser && !roles.includes(currentUser.role)) {
      navigate("/dashboard");
    }
    
    initialChecked.current = true;
  }, [isAuthenticated, currentUser, navigate, roles]);
  
  // If not authenticated, show loading until redirect happens
  if (!isAuthenticated) {
    return <TransitionLoading />;
  }
  
  return (
    <Suspense fallback={<TransitionLoading />}>
      <Layout>
        <div className="slide-in content-transition">
          <Component />
        </div>
      </Layout>
    </Suspense>
  );
};

// Auth route component with better transitions
const AuthRoute = ({ component: Component }: { component: React.ComponentType<any> }) => {
  const { isAuthenticated } = useAuth();
  const [_, navigate] = useLocation();
  const initialChecked = useRef(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
    
    initialChecked.current = true;
  }, [isAuthenticated, navigate]);
  
  // If authenticated, show loading until redirect happens
  if (isAuthenticated) {
    return <TransitionLoading />;
  }
  
  return (
    <Suspense fallback={<TransitionLoading />}>
      <div className="fade-in content-transition">
        <Component />
      </div>
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
      <Route path="/attendance/calendar" component={() => <PrivateRoute component={AttendanceCalendarPage} />} />
      
      {/* Master Admin Routes */}
      <Route path="/attendance-settings" component={() => <PrivateRoute component={AttendanceSettingsPage} roles={['master_admin']} />} />
      <Route path="/department-policies" component={() => <PrivateRoute component={DepartmentPoliciesPage} roles={['master_admin']} />} />
      <Route path="/user-management" component={() => <PrivateRoute component={UserManagementPage} roles={['master_admin']} />} />
      
      {/* 404 Not Found */}
      <Route component={NotFound} />
    </Switch>
  );
}
