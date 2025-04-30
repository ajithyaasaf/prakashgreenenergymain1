import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/utils/formatting";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { currentUser, isAdmin, isMasterAdmin } = useAuth();
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  const closeSidebar = () => {
    setOpen(false);
  };

  if (!currentUser) return null;

  return (
    <aside 
      className={`z-20 fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      } lg:static lg:inset-0`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-md text-white">
              <i className="ri-sun-line text-xl"></i>
            </div>
            <span className="text-lg font-semibold text-slate-800 dark:text-white">Prakash Energy</span>
          </div>
          <button 
            onClick={closeSidebar}
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto hide-scrollbar">
          {/* Dashboard Link */}
          <Link 
            href="/dashboard"
            className={`flex items-center px-3 py-2.5 rounded-lg ${
              isActive("/dashboard")
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
            }`}
          >
            <i className="ri-dashboard-line mr-3 text-lg"></i>
            <span>Dashboard</span>
          </Link>
          
          {/* Customers Link */}
          <Link 
            href="/customers"
            className={`flex items-center px-3 py-2.5 rounded-lg ${
              isActive("/customers")
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
            }`}
          >
            <i className="ri-user-line mr-3 text-lg"></i>
            <span>Customers</span>
          </Link>
          
          {/* Products Link - Visible to Admin and Master Admin */}
          {hasPermission(currentUser.role, PERMISSIONS.VIEW_PRODUCTS) && (
            <Link 
              href="/products"
              className={`flex items-center px-3 py-2.5 rounded-lg ${
                isActive("/products")
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                  : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
              }`}
            >
              <i className="ri-boxes-line mr-3 text-lg"></i>
              <span>Products</span>
            </Link>
          )}
          
          {/* Quotations Link */}
          <Link 
            href="/quotations"
            className={`flex items-center px-3 py-2.5 rounded-lg ${
              isActive("/quotations")
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
            }`}
          >
            <i className="ri-file-list-3-line mr-3 text-lg"></i>
            <span>Quotations</span>
          </Link>
          
          {/* Invoices Link */}
          <Link 
            href="/invoices"
            className={`flex items-center px-3 py-2.5 rounded-lg ${
              isActive("/invoices")
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
            }`}
          >
            <i className="ri-bill-line mr-3 text-lg"></i>
            <span>Invoices</span>
          </Link>
          
          {/* Attendance Link */}
          <Link 
            href="/attendance"
            className={`flex items-center px-3 py-2.5 rounded-lg ${
              isActive("/attendance")
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
            }`}
          >
            <i className="ri-time-line mr-3 text-lg"></i>
            <span>Attendance</span>
          </Link>
          
          {/* Attendance Admin Link - Visible to Admin and Master Admin */}
          {hasPermission(currentUser.role, PERMISSIONS.VIEW_ALL_ATTENDANCE) && (
            <Link 
              href="/attendance-admin"
              className={`flex items-center px-3 py-2.5 rounded-lg ${
                isActive("/attendance-admin")
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                  : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
              }`}
            >
              <i className="ri-calendar-check-line mr-3 text-lg"></i>
              <span>Attendance Admin</span>
            </Link>
          )}
          
          {/* Analytics Section */}
          <div className="pt-2 pb-1">
            <p className="px-3 text-xs font-medium text-slate-500 uppercase dark:text-slate-400">Analytics</p>
          </div>
          
          {/* Attendance Overview - Admin and Master Admin */}
          {hasPermission(currentUser.role, PERMISSIONS.VIEW_ALL_ANALYTICS) && (
            <Link 
              href="/analytics/attendance-overview"
              className={`flex items-center px-3 py-2.5 rounded-lg ${
                isActive("/analytics/attendance-overview")
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                  : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
              }`}
            >
              <i className="ri-line-chart-line mr-3 text-lg"></i>
              <span>Attendance Overview</span>
            </Link>
          )}
          
          {/* Personal Attendance Analytics */}
          <Link 
            href="/analytics/personal-attendance"
            className={`flex items-center px-3 py-2.5 rounded-lg ${
              isActive("/analytics/personal-attendance")
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
            }`}
          >
            <i className="ri-pie-chart-line mr-3 text-lg"></i>
            <span>Personal Analytics</span>
          </Link>
          
          {/* Master Admin Section */}
          {isMasterAdmin && (
            <>
              <div className="pt-2 pb-1">
                <p className="px-3 text-xs font-medium text-slate-500 uppercase dark:text-slate-400">Administration</p>
              </div>
              
              {/* User Management - Master Admin only */}
              <Link href="/user-management">
                <a 
                  className={`flex items-center px-3 py-2.5 rounded-lg ${
                    isActive("/user-management")
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <i className="ri-user-settings-line mr-3 text-lg"></i>
                  <span>User Management</span>
                </a>
              </Link>
              
              {/* Attendance Settings - Master Admin only */}
              <Link href="/attendance-settings">
                <a 
                  className={`flex items-center px-3 py-2.5 rounded-lg ${
                    isActive("/attendance-settings")
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <i className="ri-settings-4-line mr-3 text-lg"></i>
                  <span>Attendance Settings</span>
                </a>
              </Link>
            </>
          )}
        </nav>
        
        {/* User Profile Section */}
        <div className="border-t dark:border-slate-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-medium">
              <span>{getInitials(currentUser.displayName || "User")}</span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {currentUser.displayName || currentUser.email}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).replace('_', ' ')}
              </p>
            </div>
            <Link href="/settings">
              <a className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
                <i className="ri-settings-3-line text-lg"></i>
              </a>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
