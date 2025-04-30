import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatDateFull, formatDate } from "@/utils/formatting";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Attendance } from "@/types";

interface AttendanceData {
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  duration: number; // in minutes
  status: string;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  early: number;
  averageHours: number;
}

export default function PersonalAttendancePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("30"); // Last 30 days by default
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceData[]>([]);
  const [calendarAttendance, setCalendarAttendance] = useState<{[key: string]: string}>({});
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    early: 0,
    averageHours: 0,
  });
  
  useEffect(() => {
    if (currentUser) {
      fetchAttendanceData();
    }
  }, [currentUser, dateRange]);
  
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Get date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      
      // Mock data for demonstration purposes
      const mockData: AttendanceData[] = generateMockAttendanceData(startDate, endDate);
      setAttendanceRecords(mockData);
      
      // Create calendar data
      const calendarData: {[key: string]: string} = {};
      mockData.forEach(record => {
        calendarData[record.date] = record.status;
      });
      setCalendarAttendance(calendarData);
      
      // Calculate summary
      const totalDays = parseInt(dateRange);
      const workingDays = totalDays - Math.floor(totalDays * 2/7); // Excluding weekends
      
      const present = mockData.length;
      const absent = workingDays - present;
      const late = mockData.filter(r => {
        const checkInHour = parseInt(r.checkInTime.split(':')[0]);
        return checkInHour >= 10; // Late if checked in after 10:00 AM
      }).length;
      
      const early = mockData.filter(r => {
        if (!r.checkOutTime) return false;
        const checkOutHour = parseInt(r.checkOutTime.split(':')[0]);
        return checkOutHour < 17; // Early if checked out before 5:00 PM
      }).length;
      
      const totalDuration = mockData.reduce((sum, record) => sum + record.duration, 0);
      const averageHours = present > 0 ? (totalDuration / 60) / present : 0;
      
      setSummary({
        total: workingDays,
        present,
        absent,
        late,
        early,
        averageHours,
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
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // 90% chance of attendance
        if (Math.random() > 0.1) {
          // Random check-in time between 8:30 and 10:00
          const checkInHour = 8 + Math.floor(Math.random() * 2);
          const checkInMinute = Math.floor(Math.random() * 60);
          const checkInTime = `${checkInHour.toString().padStart(2, '0')}:${checkInMinute.toString().padStart(2, '0')}`;
          
          // Random check-out time between 17:00 and 19:00
          const checkOutHour = 17 + Math.floor(Math.random() * 2);
          const checkOutMinute = Math.floor(Math.random() * 60);
          const checkOutTime = `${checkOutHour.toString().padStart(2, '0')}:${checkOutMinute.toString().padStart(2, '0')}`;
          
          // Calculate duration in minutes
          const duration = (checkOutHour - checkInHour) * 60 + (checkOutMinute - checkInMinute);
          
          data.push({
            date: currentDate.toISOString().split('T')[0],
            checkInTime,
            checkOutTime,
            duration,
            status: 'present',
          });
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  };
  
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };
  
  const getAttendanceClassForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const status = calendarAttendance[dateStr];
    
    if (!status) {
      // Weekend check
      if (date.getDay() === 0 || date.getDay() === 6) {
        return "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
      }
      return "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400";
    }
    
    return "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400";
  };
  
  const COLORS = ['#0ea5e9', '#ef4444', '#f59e0b', '#10b981'];
  
  // Weekly attendance data for chart
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const week = 8 - i;
    return {
      name: `Week ${week}`,
      hours: 35 + Math.random() * 10,
    };
  });
  
  // Daily check-in times data for chart
  const checkInData = attendanceRecords.slice(-7).map(record => ({
    date: record.date,
    time: record.checkInTime.split(':').map(Number)[0] * 60 + record.checkInTime.split(':').map(Number)[1],
  }));
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Personal Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track your attendance patterns and statistics
          </p>
        </div>
        
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
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">
              {summary.present} / {summary.total} days
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageHours.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground">
              {summary.averageHours >= 8 ? "Meeting target hours" : "Below target hours"}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Late Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.late}</div>
            <div className="text-xs text-muted-foreground">
              {((summary.late / summary.present) * 100).toFixed(1)}% of attendance days
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Early Departures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.early}</div>
            <div className="text-xs text-muted-foreground">
              {((summary.early / summary.present) * 100).toFixed(1)}% of attendance days
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Hours</CardTitle>
            <CardDescription>Your weekly working hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="h-full w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklyData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="hours" name="Working Hours" stroke="#0ea5e9" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Attendance Breakdown</CardTitle>
            <CardDescription>Your attendance distribution</CardDescription>
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
                        { name: 'Present', value: summary.present },
                        { name: 'Absent', value: summary.absent },
                        { name: 'Late', value: summary.late },
                        { name: 'Early Out', value: summary.early },
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
                        { name: 'Present', value: summary.present },
                        { name: 'Absent', value: summary.absent },
                        { name: 'Late', value: summary.late },
                        { name: 'Early Out', value: summary.early },
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Calendar</CardTitle>
            <CardDescription>Your attendance calendar for the month</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              classNames={{
                day_selected: "bg-primary",
                day: (date) => getAttendanceClassForDay(date.date)
              }}
            />
            <div className="flex justify-between mt-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-900/20 mr-2"></div>
                <span className="text-sm">Present</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-100 dark:bg-red-900/20 mr-2"></div>
                <span className="text-sm">Absent</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800 mr-2"></div>
                <span className="text-sm">Weekend/Holiday</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-in Times</CardTitle>
            <CardDescription>Your check-in times for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="h-full w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={checkInData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      domain={[480, 660]} // 8:00 AM to 11:00 AM in minutes
                      tickFormatter={(minutes) => 
                        `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, '0')}`
                      }
                    />
                    <Tooltip 
                      formatter={(value) => 
                        `${Math.floor(Number(value) / 60)}:${(Number(value) % 60).toString().padStart(2, '0')}`
                      }
                    />
                    <Legend />
                    <Bar dataKey="time" name="Check-in Time" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                <span className="mr-4">Before 9:00 AM</span>
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
                <span className="mr-4">9:00-10:00 AM</span>
                <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                <span>After 10:00 AM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Records</CardTitle>
          <CardDescription>Your attendance details for the last {attendanceRecords.length} work days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              ))}
            </div>
          ) : attendanceRecords.length > 0 ? (
            <div className="space-y-4">
              {attendanceRecords.slice(0, 10).map((record, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{formatDate(record.date)}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Check-in: {record.checkInTime} • Check-out: {record.checkOutTime}
                    </div>
                  </div>
                  <div className="space-x-2 flex items-center">
                    <Badge variant="secondary">
                      {Math.floor(record.duration / 60)}h {record.duration % 60}m
                    </Badge>
                    {record.checkInTime.split(':')[0] >= '10' && (
                      <Badge variant="destructive">Late</Badge>
                    )}
                    {record.checkOutTime && record.checkOutTime.split(':')[0] < '17' && (
                      <Badge variant="warning">Early Out</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                <i className="ri-calendar-line text-2xl text-slate-400"></i>
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No attendance records</h3>
              <p className="text-slate-500 dark:text-slate-400">
                No attendance records found for the selected period
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="text-sm text-slate-500 dark:text-slate-400 text-center mt-4">
        Data shown is for the period: {formatDateFull(new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000))} to {formatDateFull(new Date())}
      </div>
    </div>
  );
}