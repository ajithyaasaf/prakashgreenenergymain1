import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  // Get page title based on current location
  const getPageTitle = () => {
    const path = location.split("/")[1];
    if (!path) return "Home";
    
    // Handle special cases
    if (path.startsWith("analytics")) {
      const subPath = location.split("/")[2];
      if (subPath === "attendance-overview") return "Attendance Overview";
      if (subPath === "leave-analytics") return "Leave Analytics";
      if (subPath === "permission-analytics") return "Permission Analytics";
      if (subPath === "department-metrics") return "Department Metrics";
      if (subPath === "personal-attendance") return "Personal Attendance";
      return "Analytics";
    }
    
    // Convert kebab-case to title case
    return path
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Sidebar Toggle Button - Mobile Only */}
        <button 
          onClick={toggleSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
        >
          <i className="ri-menu-line text-2xl"></i>
        </button>
        
        {/* Page Title - Desktop Only */}
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white hidden lg:block">
          {getPageTitle()}
        </h1>
        
        {/* Search, Dark Mode, and Profile Actions */}
        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <div className="hidden md:block">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <i className="ri-search-line text-slate-400"></i>
              </span>
              <input 
                type="text" 
                placeholder="Search..." 
                className="form-input pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-600"
              />
            </div>
          </div>
          
          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {theme === "dark" ? (
              <i className="ri-sun-line text-xl text-slate-300"></i>
            ) : (
              <i className="ri-moon-line text-xl text-slate-600"></i>
            )}
          </button>
          
          {/* Notifications */}
          <button className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 relative">
            <i className="ri-notification-3-line text-xl text-slate-600 dark:text-slate-300"></i>
            <span className="absolute top-1 right-1.5 w-2 h-2 bg-danger-500 rounded-full"></span>
          </button>
          
          {/* Help */}
          <button className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700">
            <i className="ri-question-line text-xl text-slate-600 dark:text-slate-300"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
