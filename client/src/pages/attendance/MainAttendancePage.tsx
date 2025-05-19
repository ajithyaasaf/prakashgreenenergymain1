import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { isSunday } from "date-fns";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckInForm } from "@/components/attendance/CheckInForm";
import { CheckOutForm } from "@/components/attendance/CheckOutForm";
import { AttendanceReportGenerator } from "@/components/attendance/AttendanceReportGenerator";
import { OvertimeReportGenerator } from "@/components/attendance/OvertimeReportGenerator";
import { HolidaySettings } from "@/components/attendance/HolidaySettings";
import { useAttendance } from "@/hooks/useAttendance";
import { Spinner } from "@/components/ui/spinner";

import { 
  TbClock, 
  TbCalendar, 
  TbReportAnalytics, 
  TbCalendarOff, 
  TbClockHour4, 
  TbCalendarEvent, 
  TbUsers, 
  TbListDetails, 
  TbCheck, 
  TbX, 
  TbInfoCircle, 
  TbLogin, 
  TbLogout 
} from "react-icons/tb";

// Use renamed icons for clarity
const TbClockIn = TbLogin;
const TbClockOut = TbLogout;
const TbCalendarTime = TbCalendar;

export default function MainAttendancePage() {
  const { currentUser, isAdmin, isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const { getTodayAttendance } = useAttendance();
  
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  
  useEffect(() => {
    if (currentUser) {
      checkHolidayStatus();
      fetchTodayAttendance();
    }
  }, [currentUser]);
  
  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const attendance = await getTodayAttendance();
      setTodayAttendance(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast({
        title: "Error",
        description: "Failed to load today's attendance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const checkHolidayStatus = () => {
    const today = new Date();
    
    // Check if today is Sunday (0 represents Sunday in JavaScript)
    const isTodaySunday = isSunday(today);
    
    // Additional holiday checks would go here
    // We would fetch holidays from Firestore and check if today matches
    
    setIsHoliday(isTodaySunday);
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
  
  const statusDisplay = () => {
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
          <span>Today is a holiday</span>
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
          <TbClockIn className="mr-2" />
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
          <h1 className="text-2xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground">
            Track attendance, manage leaves, and generate reports
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="mr-4">
            <span className="text-sm font-medium block">{format(new Date(), "EEEE, MMMM dd, yyyy")}</span>
            <div className="text-sm">{statusDisplay()}</div>
          </div>
          
          {!isHoliday && !todayAttendance && (
            <Button onClick={() => setIsCheckInDialogOpen(true)}>
              <TbClockIn className="mr-2" /> Check In
            </Button>
          )}
          
          {!isHoliday && todayAttendance && todayAttendance.status === "checked_in" && (
            <Button variant="outline" onClick={() => setIsCheckOutDialogOpen(true)}>
              <TbClockOut className="mr-2" /> Check Out
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
          <TabsTrigger value="today" className="flex items-center">
            <TbCalendarTime className="mr-2" /> Today's Attendance
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <TbReportAnalytics className="mr-2" /> Reports
          </TabsTrigger>
          <TabsTrigger value="overtime" className="flex items-center">
            <TbClockHour4 className="mr-2" /> Overtime
          </TabsTrigger>
          {(isAdmin || isMasterAdmin) && (
            <TabsTrigger value="settings" className="flex items-center">
              <TbCalendarEvent className="mr-2" /> Holidays
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="today" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TbCalendarTime className="mr-2" /> Today's Attendance Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : isHoliday ? (
                <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-md border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start space-x-3">
                    <TbInfoCircle className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-orange-800 dark:text-orange-300">Today is a Holiday</h3>
                      <p className="text-orange-700 dark:text-orange-400 mt-1">
                        Attendance is not required today. Enjoy your day off!
                      </p>
                    </div>
                  </div>
                </div>
              ) : !todayAttendance ? (
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <TbClockIn className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    You haven't checked in yet
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Click the Check In button to record your attendance for today.
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsCheckInDialogOpen(true)}
                  >
                    <TbClockIn className="mr-2" /> Check In Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Check-in Time</div>
                      <div className="text-lg font-semibold flex items-center">
                        <TbClockIn className="mr-2 text-green-600 dark:text-green-400" />
                        {todayAttendance.checkInTime ? 
                          format(new Date(todayAttendance.checkInTime.seconds * 1000), "hh:mm a") : 
                          "N/A"}
                      </div>
                      {todayAttendance.isLate && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Late arrival
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Check-out Time</div>
                      <div className="text-lg font-semibold flex items-center">
                        <TbClockOut className="mr-2 text-blue-600 dark:text-blue-400" />
                        {todayAttendance.checkOutTime ? 
                          format(new Date(todayAttendance.checkOutTime.seconds * 1000), "hh:mm a") : 
                          "Not checked out"}
                      </div>
                      {todayAttendance.isOvertime && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Overtime: {todayAttendance.overtimeHours}h {todayAttendance.overtimeMinutes}m
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Location</div>
                      <div className="text-lg font-semibold capitalize">
                        {todayAttendance.workLocation || "N/A"}
                      </div>
                      {todayAttendance.workLocation === "off-site" && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {todayAttendance.locationDetails || "No details provided"}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {(todayAttendance.lateReason || todayAttendance.offSiteReason || todayAttendance.overtimeReason) && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Additional Information</div>
                      
                      {todayAttendance.lateReason && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-orange-600 dark:text-orange-400">Late Reason:</div>
                          <div className="text-sm mt-1">{todayAttendance.lateReason}</div>
                        </div>
                      )}
                      
                      {todayAttendance.offSiteReason && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Off-site Work Reason:</div>
                          <div className="text-sm mt-1">{todayAttendance.offSiteReason}</div>
                        </div>
                      )}
                      
                      {todayAttendance.customerDetails && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-green-600 dark:text-green-400">Customer Details:</div>
                          <div className="text-sm mt-1">{todayAttendance.customerDetails}</div>
                        </div>
                      )}
                      
                      {todayAttendance.overtimeReason && (
                        <div>
                          <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Overtime Reason:</div>
                          <div className="text-sm mt-1">{todayAttendance.overtimeReason}</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {todayAttendance.status === "checked_in" && (
                    <div className="flex justify-center">
                      <Button onClick={() => setIsCheckOutDialogOpen(true)}>
                        <TbClockOut className="mr-2" /> Check Out
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports">
          <AttendanceReportGenerator />
        </TabsContent>
        
        <TabsContent value="overtime">
          <OvertimeReportGenerator />
        </TabsContent>
        
        {(isAdmin || isMasterAdmin) && (
          <TabsContent value="settings">
            <HolidaySettings />
          </TabsContent>
        )}
      </Tabs>
      
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