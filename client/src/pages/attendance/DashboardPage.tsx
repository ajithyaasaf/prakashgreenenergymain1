import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, isSunday, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { firestore } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from "firebase/firestore";
import { getDateFromTimestamp } from "@/types/firebase-types";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckInForm } from "@/components/attendance/CheckInForm";
import { CheckOutForm } from "@/components/attendance/CheckOutForm";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAttendance } from "@/hooks/useAttendance";
import { Link } from "wouter";

import {
  TbLogin,
  TbLogout,
  TbCalendarTime,
  TbCalendarOff,
  TbReportAnalytics,
  TbClock,
  TbListCheck,
  TbCalendarStats,
  TbLocationFilled,
  TbCheck,
  TbX,
  TbInfoCircle,
  TbBellRinging,
  TbArrowRight,
} from "react-icons/tb";

export default function DashboardPage() {
  const { currentUser, isAdmin, isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const { getTodayAttendance } = useAttendance();
  
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    totalWorkDays: 0,
    daysPresent: 0,
    leaveDays: 0,
    overtimeHours: 0,
    lateArrivals: 0,
  });
  
  useEffect(() => {
    if (currentUser) {
      checkHolidayStatus();
      fetchTodayAttendance();
      fetchRecentLeaves();
      fetchMonthlyStats();
      
      if (isAdmin || isMasterAdmin) {
        fetchPendingApprovals();
      }
    }
  }, [currentUser]);
  
  const fetchTodayAttendance = async () => {
    try {
      const attendance = await getTodayAttendance();
      setTodayAttendance(attendance);
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const checkHolidayStatus = () => {
    // Simple check for Sunday
    const today = new Date();
    const isTodaySunday = isSunday(today);
    
    // In a real app, you would also check the holidays collection
    setIsHoliday(isTodaySunday);
  };
  
  const fetchRecentLeaves = async () => {
    try {
      const leaveQuery = query(
        collection(firestore, "leaves"),
        where("userId", "==", currentUser?.uid),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      
      const querySnapshot = await getDocs(leaveQuery);
      const leavesList: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leavesList.push({
          id: doc.id,
          startDate: getDateFromTimestamp(data.startDate),
          endDate: getDateFromTimestamp(data.endDate),
          leaveType: data.leaveType,
          status: data.status,
          reason: data.reason,
        });
      });
      
      setRecentLeaves(leavesList);
    } catch (error) {
      console.error("Error fetching recent leaves:", error);
    }
  };
  
  const fetchPendingApprovals = async () => {
    try {
      const approvalQuery = query(
        collection(firestore, "leaves"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      
      const querySnapshot = await getDocs(approvalQuery);
      const approvalsList: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        approvalsList.push({
          id: doc.id,
          userName: data.userName || "Employee",
          department: data.department || "Unknown",
          startDate: getDateFromTimestamp(data.startDate),
          endDate: getDateFromTimestamp(data.endDate),
          leaveType: data.leaveType,
        });
      });
      
      setPendingApprovals(approvalsList);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
    }
  };
  
  const fetchMonthlyStats = async () => {
    try {
      const today = new Date();
      const firstDayOfMonth = startOfMonth(today);
      const lastDayOfMonth = endOfMonth(today);
      
      // Calculate working days in month (excluding Sundays)
      let totalWorkDays = 0;
      let currentDay = new Date(firstDayOfMonth);
      
      while (currentDay <= today && currentDay <= lastDayOfMonth) {
        if (!isSunday(currentDay)) {
          totalWorkDays++;
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }
      
      // Fetch attendance records for the month
      const attendanceQuery = query(
        collection(firestore, "attendance"),
        where("userId", "==", currentUser?.uid),
        where("date", ">=", Timestamp.fromDate(firstDayOfMonth)),
        where("date", "<=", Timestamp.fromDate(lastDayOfMonth))
      );
      
      const querySnapshot = await getDocs(attendanceQuery);
      let daysPresent = 0;
      let overtimeMinutes = 0;
      let lateArrivals = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        daysPresent++;
        
        if (data.isLate) {
          lateArrivals++;
        }
        
        if (data.isOvertime) {
          overtimeMinutes += data.totalOvertimeMinutes || 0;
        }
      });
      
      // Fetch leave records for the month
      const leaveQuery = query(
        collection(firestore, "leaves"),
        where("userId", "==", currentUser?.uid),
        where("status", "==", "approved"),
        where("startDate", ">=", Timestamp.fromDate(firstDayOfMonth)),
        where("startDate", "<=", Timestamp.fromDate(lastDayOfMonth))
      );
      
      const leaveSnapshot = await getDocs(leaveQuery);
      let leaveDays = 0;
      
      leaveSnapshot.forEach((doc) => {
        const data = doc.data();
        const start = getDateFromTimestamp(data.startDate);
        const end = getDateFromTimestamp(data.endDate);
        
        if (start && end) {
          const days = differenceInDays(end, start) + 1;
          leaveDays += days;
        }
      });
      
      setMonthlyStats({
        totalWorkDays,
        daysPresent,
        leaveDays,
        overtimeHours: Math.floor(overtimeMinutes / 60),
        lateArrivals,
      });
      
    } catch (error) {
      console.error("Error fetching monthly statistics:", error);
    }
  };
  
  const handleCheckInSuccess = () => {
    setIsCheckInDialogOpen(false);
    fetchTodayAttendance();
    toast({
      title: "Check-in Successful",
      description: "Your attendance has been recorded.",
      variant: "primary",
    });
  };
  
  const handleCheckOutSuccess = () => {
    setIsCheckOutDialogOpen(false);
    fetchTodayAttendance();
    toast({
      title: "Check-out Successful",
      description: "Your attendance has been updated.",
      variant: "primary",
    });
  };
  
  const getStatusDisplay = () => {
    if (loading) {
      return (
        <div className="flex items-center">
          <Spinner className="mr-2" />
          <span>Loading...</span>
        </div>
      );
    }
    
    if (isHoliday) {
      return (
        <div className="flex items-center text-orange-600 dark:text-orange-400">
          <TbCalendarOff className="mr-2" />
          <span>Holiday today</span>
        </div>
      );
    }
    
    if (!todayAttendance) {
      return (
        <div className="flex items-center text-red-600 dark:text-red-400">
          <TbX className="mr-2" />
          <span>Not checked in</span>
        </div>
      );
    }
    
    if (todayAttendance.status === "checked_in") {
      return (
        <div className="flex items-center text-green-600 dark:text-green-400">
          <TbLogin className="mr-2" />
          <span>Checked in at {todayAttendance.checkInTime ? format(new Date(todayAttendance.checkInTime.seconds * 1000), "hh:mm a") : "N/A"}</span>
        </div>
      );
    }
    
    if (todayAttendance.status === "checked_out") {
      return (
        <div className="flex items-center text-blue-600 dark:text-blue-400">
          <TbCheck className="mr-2" />
          <span>Completed for today</span>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your attendance, leaves, and view reports
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="mr-4">
            <span className="text-sm font-medium block">{format(new Date(), "EEEE, MMMM dd, yyyy")}</span>
            <div className="text-sm">{getStatusDisplay()}</div>
          </div>
          
          {!isHoliday && !todayAttendance && (
            <Button onClick={() => setIsCheckInDialogOpen(true)}>
              <TbLogin className="mr-2" /> Check In
            </Button>
          )}
          
          {!isHoliday && todayAttendance && todayAttendance.status === "checked_in" && (
            <Button variant="outline" onClick={() => setIsCheckOutDialogOpen(true)}>
              <TbLogout className="mr-2" /> Check Out
            </Button>
          )}
        </div>
      </div>
      
      {/* Main dashboard content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Attendance status card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isHoliday ? (
              <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-md border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-center space-x-2">
                  <TbCalendarOff className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  <div>
                    <h3 className="font-medium text-orange-800 dark:text-orange-300">Today is a Holiday</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                      Enjoy your day off!
                    </p>
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : !todayAttendance ? (
              <div className="text-center py-4">
                <TbClock className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-2 font-medium text-slate-900 dark:text-slate-100">Not Checked In</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Don't forget to check in for today
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => setIsCheckInDialogOpen(true)}
                  size="sm"
                >
                  <TbLogin className="mr-2" /> Check In Now
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check-In</div>
                    <div className="font-medium flex items-center">
                      <TbLogin className="mr-1 text-green-600 dark:text-green-400" />
                      {todayAttendance.checkInTime ? 
                        format(new Date(todayAttendance.checkInTime.seconds * 1000), "hh:mm a") : 
                        "N/A"}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check-Out</div>
                    <div className="font-medium flex items-center">
                      {todayAttendance.status === "checked_out" ? (
                        <>
                          <TbLogout className="mr-1 text-blue-600 dark:text-blue-400" />
                          {todayAttendance.checkOutTime ? 
                            format(new Date(todayAttendance.checkOutTime.seconds * 1000), "hh:mm a") : 
                            "N/A"}
                        </>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">Not checked out</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Location</div>
                  <div className="font-medium flex items-center">
                    <TbLocationFilled className="mr-1 text-slate-600 dark:text-slate-400" />
                    <span className="capitalize">{todayAttendance.workLocation || "N/A"}</span>
                    {todayAttendance.workLocation === "off-site" && todayAttendance.locationDetails && (
                      <span className="text-xs ml-2 text-slate-500">({todayAttendance.locationDetails})</span>
                    )}
                  </div>
                </div>
                
                {todayAttendance.status === "checked_in" && (
                  <Button 
                    onClick={() => setIsCheckOutDialogOpen(true)}
                    className="w-full" 
                    variant="outline" 
                    size="sm"
                  >
                    <TbLogout className="mr-2" /> Check Out
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Monthly statistics card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Present Days</div>
                  <div className="text-lg font-medium text-blue-800 dark:text-blue-300">
                    {monthlyStats.daysPresent}/{monthlyStats.totalWorkDays}
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Leave Days</div>
                  <div className="text-lg font-medium text-purple-800 dark:text-purple-300">
                    {monthlyStats.leaveDays}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Late Arrivals</div>
                  <div className="text-lg font-medium text-amber-800 dark:text-amber-300">
                    {monthlyStats.lateArrivals}
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                  <div className="text-xs text-green-600 dark:text-green-400 mb-1">Overtime Hours</div>
                  <div className="text-lg font-medium text-green-800 dark:text-green-300">
                    {monthlyStats.overtimeHours}
                  </div>
                </div>
              </div>
              
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/attendance/reports">
                  <TbReportAnalytics className="mr-2" /> View Full Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent leaves or pending approvals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {isAdmin || isMasterAdmin ? "Pending Approvals" : "Recent Leave Requests"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAdmin || isMasterAdmin ? (
              pendingApprovals.length === 0 ? (
                <div className="text-center py-4">
                  <TbCheck className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="mt-2 font-medium text-slate-900 dark:text-slate-100">No Pending Approvals</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    All leave requests have been processed
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map((approval, index) => (
                    <div key={index} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">{approval.userName}</div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-800">
                          {approval.leaveType}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        {approval.department} • {format(approval.startDate, "MMM dd")}
                        {differenceInDays(approval.endDate, approval.startDate) > 0 
                          ? ` - ${format(approval.endDate, "MMM dd")}` 
                          : ""}
                      </div>
                    </div>
                  ))}
                  
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/attendance/leaves">
                      <TbBellRinging className="mr-2" /> View All Requests
                    </Link>
                  </Button>
                </div>
              )
            ) : (
              recentLeaves.length === 0 ? (
                <div className="text-center py-4">
                  <TbCalendarOff className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="mt-2 font-medium text-slate-900 dark:text-slate-100">No Recent Leaves</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    You haven't requested any leaves recently
                  </p>
                  <Button asChild className="mt-4" size="sm" variant="outline">
                    <Link href="/attendance/leaves">
                      <TbCalendarPlus className="mr-2" /> Request Leave
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLeaves.map((leave, index) => (
                    <div key={index} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge>
                          {leave.leaveType}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={
                            leave.status === "approved" 
                              ? "bg-green-50 text-green-800" 
                              : leave.status === "rejected"
                              ? "bg-red-50 text-red-800"
                              : leave.status === "escalated"
                              ? "bg-purple-50 text-purple-800"
                              : "bg-yellow-50 text-yellow-800"
                          }
                        >
                          {leave.status}
                        </Badge>
                      </div>
                      <div className="font-medium text-sm mb-1">
                        {format(leave.startDate, "MMM dd")}
                        {differenceInDays(leave.endDate, leave.startDate) > 0 
                          ? ` - ${format(leave.endDate, "MMM dd")}` 
                          : ""}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {leave.reason}
                      </div>
                    </div>
                  ))}
                  
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/attendance/leaves">
                      <TbArrowRight className="mr-2" /> Manage Leaves
                    </Link>
                  </Button>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Quick actions and features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Attendance Features</CardTitle>
            <CardDescription>Quick access to attendance tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-auto py-6 flex flex-col">
                <Link href="/attendance/main">
                  <TbCalendarTime className="h-8 w-8 mb-2" />
                  <span>Daily Attendance</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto py-6 flex flex-col">
                <Link href="/attendance/reports">
                  <TbReportAnalytics className="h-8 w-8 mb-2" />
                  <span>Generate Reports</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto py-6 flex flex-col">
                <Link href="/attendance/leaves">
                  <TbCalendarOff className="h-8 w-8 mb-2" />
                  <span>Leave Management</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto py-6 flex flex-col">
                <Link href="/attendance/overtime">
                  <TbClock className="h-8 w-8 mb-2" />
                  <span>Overtime Tracking</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Policy Information</CardTitle>
            <CardDescription>Department attendance policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <TbInfoCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-300">Working Hours</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Check-in: 9:30 AM for all departments
                      <br />
                      Check-out: 6:30 PM (CRE, Accounts, HR), 7:30 PM (Sales, Marketing, Technical)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-md border border-green-200 dark:border-green-800">
                <div className="flex items-start space-x-3">
                  <TbInfoCircle className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-green-800 dark:text-green-300">Leave Policy</h3>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Monthly allowances:
                      <br />
                      • 2 hours of permission
                      <br />
                      • 1 casual leave
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-md border border-amber-200 dark:border-amber-800">
                <div className="flex items-start space-x-3">
                  <TbInfoCircle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-amber-800 dark:text-amber-300">Holidays & Off-site</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      • All Sundays are holidays
                      <br />
                      • Off-site work available for Sales & Marketing
                      <br />
                      • Technical team can report overtime
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Check-in Dialog */}
      <Dialog open={isCheckInDialogOpen} onOpenChange={setIsCheckInDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In</DialogTitle>
          </DialogHeader>
          <CheckInForm 
            onSuccess={handleCheckInSuccess}
            onCancel={() => setIsCheckInDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Check-out Dialog */}
      <Dialog open={isCheckOutDialogOpen} onOpenChange={setIsCheckOutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out</DialogTitle>
          </DialogHeader>
          <CheckOutForm 
            onSuccess={handleCheckOutSuccess}
            onCancel={() => setIsCheckOutDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}