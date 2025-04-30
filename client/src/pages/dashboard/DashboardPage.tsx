import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/hooks/useFirestore";
import { formatDateFull, formatCurrency } from "@/utils/formatting";
import { KPIData, RecentActivity, ChartData } from "@/types";
import KPICard from "@/components/dashboard/KPICard";
import QuickAction from "@/components/dashboard/QuickAction";
import RecentActivities from "@/components/dashboard/RecentActivities";
import SalesChart from "@/components/dashboard/SalesChart";
import AttendanceWidget from "@/components/dashboard/AttendanceWidget";
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { firestore } from "@/firebase/config";

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [salesData, setSalesData] = useState<ChartData[]>([]);
  
  useEffect(() => {
    // Function to fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // KPI Data
        const customerCount = 156;
        const activeQuotations = 32;
        const monthlyRevenue = 4280000;
        const teamAttendance = 92;
        
        setKpiData([
          {
            label: "Total Customers",
            value: customerCount.toString(),
            change: "+12.4%",
            changeType: "positive",
            icon: "user-line",
            color: "primary",
            subtitle: `+18 this month`,
          },
          {
            label: "Active Quotations",
            value: activeQuotations.toString(),
            change: "-2.3%",
            changeType: "negative",
            icon: "file-list-3-line",
            color: "secondary",
            subtitle: "8 pending approval",
          },
          {
            label: "Monthly Revenue",
            value: formatCurrency(monthlyRevenue),
            change: "+8.1%",
            changeType: "positive",
            icon: "money-rupee-circle-line",
            color: "success",
            subtitle: `vs ${formatCurrency(3960000)} last month`,
          },
          {
            label: "Team Attendance",
            value: `${teamAttendance}%`,
            change: "+3.5%",
            changeType: "positive",
            icon: "team-line",
            color: "default",
            subtitle: "3 on leave today",
          },
        ]);
        
        // Sales Chart Data
        const weeklySalesData: ChartData[] = [
          { name: "May 1", value: 850000 },
          { name: "May 8", value: 650000 },
          { name: "May 15", value: 1250000 },
          { name: "May 22", value: 950000 },
          { name: "May 29", value: 1100000 },
          { name: "Jun 5", value: 1450000 },
        ];
        setSalesData(weeklySalesData);
        
        // Fetch recent activities
        const activitiesCollection = collection(firestore, "activities");
        const activitiesQuery = query(
          activitiesCollection,
          orderBy("timestamp", "desc"),
          limit(4)
        );
        
        // Mock recent activities - in a real app, this would come from Firestore
        const mockActivities: RecentActivity[] = [
          {
            id: "1",
            type: "quotation",
            title: 'Quotation #QT-2023-0042 created for Sunlight Enterprises',
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            user: "Priya Patel",
            status: "Pending",
            statusType: "warning",
            icon: "file-list-3-line",
            iconBg: "bg-primary-100 dark:bg-primary-900/20 text-primary-500",
          },
          {
            id: "2",
            type: "invoice",
            title: 'Invoice #INV-2023-0039 paid by Green Valley Resorts',
            time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
            status: "Completed",
            statusType: "success",
            icon: "bill-line",
            iconBg: "bg-success-100 dark:bg-success-900/20 text-success-500",
          },
          {
            id: "3",
            type: "customer",
            title: 'New customer Rahul Mehta registered',
            time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            user: "Self Registration",
            status: "New",
            statusType: "primary",
            icon: "user-line",
            iconBg: "bg-danger-100 dark:bg-danger-900/20 text-danger-500",
          },
          {
            id: "4",
            type: "leave",
            title: 'Amit Kumar requested leave for 2 days',
            time: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), // Yesterday, earlier
            status: "Pending",
            statusType: "warning",
            icon: "time-line",
            iconBg: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
          },
        ];
        
        setRecentActivities(mockActivities);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Good afternoon, {currentUser?.displayName?.split(' ')[0] || 'User'}!
          </h2>
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              <i className="ri-calendar-line mr-1"></i> 
              {formatDateFull(new Date())}
            </span>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          Here's what's happening with your solar business today.
        </p>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickAction 
          icon="user-add-line" 
          label="New Customer" 
          color="primary" 
          onClick={() => window.location.href = "/customers?new=true"} 
        />
        <QuickAction 
          icon="file-list-3-line" 
          label="New Quotation" 
          color="secondary" 
          onClick={() => window.location.href = "/quotations?new=true"} 
        />
        <QuickAction 
          icon="bill-line" 
          label="New Invoice" 
          color="success" 
          onClick={() => window.location.href = "/invoices?new=true"} 
        />
        <QuickAction 
          icon="time-line" 
          label="Check-in" 
          color="default" 
          onClick={() => window.location.href = "/attendance"} 
        />
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiData.map((kpi, index) => (
          <KPICard key={index} data={kpi} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <RecentActivities activities={recentActivities} loading={loading} />
        </div>
        
        <div className="lg:col-span-1 grid grid-cols-1 gap-8">
          {/* Sales Chart */}
          <SalesChart 
            data={salesData} 
            totalSales={4280000} 
            avgOrder={420000} 
            salesGrowth={8.1} 
            avgOrderGrowth={-2.3} 
            loading={loading} 
          />
          
          {/* Attendance Widget */}
          <AttendanceWidget loading={loading} />
        </div>
      </div>
    </div>
  );
}
