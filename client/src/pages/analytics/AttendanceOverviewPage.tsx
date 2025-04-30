import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDateFull } from "@/utils/formatting";

interface AttendanceData {
  userId: string;
  date: any;
  checkInTime: any;
  checkOutTime?: any;
  status: string;
}

interface EmployeeAttendance {
  id: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  leaveCount: number;
}

interface DailyAttendanceStats {
  date: string;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  total: number;
}

export default function AttendanceOverviewPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("30"); // Last 30 days by default
  const [department, setDepartment] = useState<string>("all");
  
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeAttendance[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyAttendanceStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    presentPercentage: 0,
    absentPercentage: 0,
    leavePercentage: 0,
    latePercentage: 0,
  });
  
  useEffect(() => {
    if (currentUser) {
      fetchAttendanceData();
    }
  }, [currentUser, dateRange, department]);
  
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Get date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      
      // Fetch attendance data
      const attendanceCollection = collection(firestore, "attendance");
      const attendanceQuery = query(
        attendanceCollection,
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate))
      );
      
      // Mock data for demonstration
      // In a real app, this would be replaced with actual data from the database
      const mockAttendanceData: AttendanceData[] = generateMockAttendanceData(startDate, endDate);
      setAttendanceData(mockAttendanceData);
      
      // Process data for employee stats
      const employeeAttendanceStats = generateMockEmployeeStats();
      setEmployeeStats(employeeAttendanceStats);
      
      // Process data for daily stats
      const dailyAttendanceStats = generateMockDailyStats(startDate, endDate);
      setDailyStats(dailyAttendanceStats);
      
      // Calculate overall stats
      const totalDays = parseInt(dateRange);
      const totalEmployees = 20; // Mock number of employees
      const totalEntries = totalDays * totalEmployees;
      
      const present = Math.floor(totalEntries * 0.82); // 82% present
      const absent = Math.floor(totalEntries * 0.08); // 8% absent
      const leave = Math.floor(totalEntries * 0.06); // 6% on leave
      const late = Math.floor(totalEntries * 0.04); // 4% late
      
      setOverallStats({
        presentPercentage: Math.round((present / totalEntries) * 100),
        absentPercentage: Math.round((absent / totalEntries) * 100),
        leavePercentage: Math.round((leave / totalEntries) * 100),
        latePercentage: Math.round((late / totalEntries) * 100),
      });
      
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const generateMockAttendanceData = (startDate: Date, endDate: Date): AttendanceData[] => {
    const data: AttendanceData[] = [];
    const employees = ["user1", "user2", "user3", "user4", "user5"];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      employees.forEach(userId => {
        const status = Math.random() > 0.1 ? "checked_in" : "absent";
        
        if (status === "checked_in") {
          const checkInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
          const checkInMinute = Math.floor(Math.random() * 60);
          const checkInTime = new Date(currentDate);
          checkInTime.setHours(checkInHour, checkInMinute);
          
          const checkOutHour = 17 + Math.floor(Math.random() * 2); // 5-6 PM
          const checkOutMinute = Math.floor(Math.random() * 60);
          const checkOutTime = new Date(currentDate);
          checkOutTime.setHours(checkOutHour, checkOutMinute);
          
          data.push({
            userId,
            date: Timestamp.fromDate(new Date(currentDate)),
            checkInTime: Timestamp.fromDate(checkInTime),
            checkOutTime: Timestamp.fromDate(checkOutTime),
            status: "checked_out",
          });
        }
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  };
  
  const generateMockEmployeeStats = (): EmployeeAttendance[] => {
    return [
      { id: "emp1", name: "Amit Sharma", present: 28, absent: 1, late: 1, leaveCount: 0 },
      { id: "emp2", name: "Priya Patel", present: 26, absent: 0, late: 2, leaveCount: 2 },
      { id: "emp3", name: "Rahul Mehta", present: 22, absent: 3, late: 0, leaveCount: 5 },
      { id: "emp4", name: "Divya Singh", present: 27, absent: 2, late: 1, leaveCount: 0 },
      { id: "emp5", name: "Sanjay Kumar", present: 20, absent: 4, late: 3, leaveCount: 3 },
    ];
  };
  
  const generateMockDailyStats = (startDate: Date, endDate: Date): DailyAttendanceStats[] => {
    const data: DailyAttendanceStats[] = [];
    const totalEmployees = 20;
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const presentCount = totalEmployees - Math.floor(Math.random() * 5); // 15-20 present
        const leaveCount = Math.floor(Math.random() * 3); // 0-2 on leave
        const absentCount = totalEmployees - presentCount - leaveCount;
        
        data.push({
          date: dateStr,
          presentCount,
          absentCount,
          leaveCount,
          total: totalEmployees,
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  };
  
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };
  
  const handleDepartmentChange = (value: string) => {
    setDepartment(value);
  };
  
  const COLORS = ['#0ea5e9', '#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance Overview</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Attendance analytics and statistics for the organization
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={department} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.presentPercentage}%</div>
            <div className="text-xs text-muted-foreground">
              {overallStats.presentPercentage > 80 ? "Good attendance rate" : "Needs improvement"}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.absentPercentage}%</div>
            <div className="text-xs text-muted-foreground">
              {overallStats.absentPercentage < 10 ? "Low absenteeism" : "High absenteeism"}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leave Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.leavePercentage}%</div>
            <div className="text-xs text-muted-foreground">
              {overallStats.leavePercentage < 10 ? "Normal leave usage" : "High leave usage"}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Late Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.latePercentage}%</div>
            <div className="text-xs text-muted-foreground">
              {overallStats.latePercentage < 5 ? "Good punctuality" : "Punctuality issues"}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance</CardTitle>
            <CardDescription>Attendance trends over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="h-full w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyStats}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="presentCount" name="Present" stroke="#0ea5e9" />
                    <Line type="monotone" dataKey="absentCount" name="Absent" stroke="#ef4444" />
                    <Line type="monotone" dataKey="leaveCount" name="Leave" stroke="#f59e0b" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
            <CardDescription>Overall attendance status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="h-full w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: overallStats.presentPercentage },
                        { name: 'Absent', value: overallStats.absentPercentage },
                        { name: 'Leave', value: overallStats.leavePercentage },
                        { name: 'Late', value: overallStats.latePercentage },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Present', value: overallStats.presentPercentage },
                        { name: 'Absent', value: overallStats.absentPercentage },
                        { name: 'Leave', value: overallStats.leavePercentage },
                        { name: 'Late', value: overallStats.latePercentage },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Employee Attendance</CardTitle>
          <CardDescription>Individual employee attendance statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {loading ? (
              <div className="h-full w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employeeStats}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="Present" stackId="a" fill="#a7ce3b" />
                  <Bar dataKey="absent" name="Absent" stackId="a" fill="#157fbe" />
                  <Bar dataKey="late" name="Late" stackId="a" fill="#a7ce3b" opacity={0.7} />
                  <Bar dataKey="leaveCount" name="Leave" stackId="a" fill="#157fbe" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="text-sm text-secondary/70 dark:text-primary/70 text-center mt-4">
        Data shown is for the period: {formatDateFull(new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000))} to {formatDateFull(new Date())}
      </div>
    </div>
  );
}
