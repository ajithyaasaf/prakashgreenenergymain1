import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/utils/formatting";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/logo.png";
import { 
  TbGridDots, 
  TbUser, 
  TbPackage, 
  TbFileText, 
  TbReceipt, 
  TbClock, 
  TbCalendarTime, 
  TbChartBar, 
  TbChartPie,
  TbUserCog,
  TbSettings,
  TbLogout,
  TbArrowLeft
} from "react-icons/tb";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { currentUser, isAdmin, isMasterAdmin, logout } = useAuth();
  const { toast } = useToast();
  
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
        <div className="flex items-center justify-between h-20 px-4 border-b border-primary/20 dark:border-secondary/20">
          <div className="flex items-center">
            <img src={logoImage} alt="Prakash Green Energy Logo" className="h-12 w-auto" />
          </div>
          <button 
            onClick={closeSidebar}
            className="lg:hidden text-secondary hover:text-primary dark:text-primary/70 dark:hover:text-primary"
          >
            <TbArrowLeft className="text-xl" />
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
            <TbGridDots className="mr-3 text-lg" />
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
            <TbUser className="mr-3 text-lg" />
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
              <TbPackage className="mr-3 text-lg" />
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
            <TbFileText className="mr-3 text-lg" />
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
            <TbReceipt className="mr-3 text-lg" />
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
            <TbClock className="mr-3 text-lg" />
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
              <TbCalendarTime className="mr-3 text-lg" />
              <span>Attendance Admin</span>
            </Link>
          )}
          
          {/* Analytics Section */}
          <div className="pt-2 pb-1">
            <p className="px-3 text-xs font-medium text-secondary/80 uppercase dark:text-primary/80">Analytics</p>
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
              <TbChartBar className="mr-3 text-lg" />
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
            <TbChartPie className="mr-3 text-lg" />
            <span>Personal Analytics</span>
          </Link>
          
          {/* Master Admin Section */}
          {isMasterAdmin && (
            <>
              <div className="pt-2 pb-1">
                <p className="px-3 text-xs font-medium text-secondary/80 uppercase dark:text-primary/80">Administration</p>
              </div>
              
              {/* User Management - Master Admin only */}
              <Link 
                href="/user-management"
                className={`flex items-center px-3 py-2.5 rounded-lg ${
                  isActive("/user-management")
                    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                    : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
                }`}
              >
                <TbUserCog className="mr-3 text-lg" />
                <span>User Management</span>
              </Link>
              
              {/* Attendance Settings - Master Admin only */}
              <Link 
                href="/attendance-settings"
                className={`flex items-center px-3 py-2.5 rounded-lg ${
                  isActive("/attendance-settings")
                    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                    : "text-secondary hover:bg-primary/5 dark:text-primary/70 dark:hover:bg-secondary/10"
                }`}
              >
                <TbSettings className="mr-3 text-lg" />
                <span>Attendance Settings</span>
              </Link>
            </>
          )}
        </nav>
        
        {/* User Profile Section */}
        <div className="border-t border-primary/20 dark:border-secondary/20 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary font-medium">
              <span>{getInitials(currentUser.displayName || "User")}</span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary dark:text-primary truncate">
                {currentUser.displayName || currentUser.email}
              </p>
              <p className="text-xs text-secondary/70 dark:text-primary/70 truncate">
                {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).replace('_', ' ')}
              </p>
            </div>
            <Link 
              href="/settings"
              className="text-secondary hover:text-primary dark:text-primary/70 dark:hover:text-primary"
            >
              <TbSettings className="text-lg" />
            </Link>
          </div>
          
          {/* Logout Button */}
          <button 
            onClick={async () => {
              try {
                await logout();
                toast({
                  title: "Successfully logged out",
                  description: "You have been logged out of your account"
                });
              } catch (error) {
                toast({
                  title: "Error logging out",
                  description: "There was a problem logging out",
                  variant: "destructive"
                });
              }
            }}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors"
          >
            <TbLogout className="text-lg" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
