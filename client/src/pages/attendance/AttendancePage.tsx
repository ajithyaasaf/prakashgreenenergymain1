import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAttendance } from "@/hooks/useAttendance";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, formatDateFull } from "@/utils/formatting";
import { Attendance, Leave } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { firestore } from "@/firebase/config";
import { collection, query, where, orderBy, limit, getDocs, Timestamp, addDoc, serverTimestamp } from "firebase/firestore";

const leaveSchema = z.object({
  startDate: z.date({
    required_error: "Please select a start date",
  }),
  endDate: z.date({
    required_error: "Please select an end date",
  }),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  type: z.enum(["casual", "permission", "sick", "vacation"]),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

export default function AttendancePage() {
  const { currentUser } = useAuth();
  const { getTodayAttendance, checkIn, checkOut, loading: attendanceLoading } = useAttendance();
  const { toast } = useToast();
  
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const today = new Date();
  
  const [remainingCasualLeaves, setRemainingCasualLeaves] = useState<number | null>(null);
  const [remainingPermissionHours, setRemainingPermissionHours] = useState<number | null>(null);
  const [departmentPolicy, setDepartmentPolicy] = useState<any | null>(null);
  
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      startDate: today,
      endDate: today,
      reason: "",
      type: "casual",
    },
  });
  
  useEffect(() => {
    if (currentUser) {
      fetchTodayAttendance();
      fetchRecentAttendance();
      fetchLeaveHistory();
      fetchDepartmentPolicy();
      calculateRemainingLeaveBalances();
    }
  }, [currentUser]);
  
  // Fetch department policy for the current user
  const fetchDepartmentPolicy = async () => {
    if (!currentUser) return;
    
    try {
      const { getDepartmentPolicy, getUserDepartment } = useAttendance();
      const userDept = await getUserDepartment();
      if (userDept) {
        const policy = await getDepartmentPolicy();
        setDepartmentPolicy(policy);
      }
    } catch (error) {
      console.error("Error fetching department policy:", error);
    }
  };
  
  const fetchTodayAttendance = async () => {
    try {
      const attendance = await getTodayAttendance();
      setTodayAttendance(attendance);
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
    }
  };
  
  const fetchRecentAttendance = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const attendanceCollection = collection(firestore, "attendance");
      // Query only by userId without orderBy to avoid needing a composite index
      const attendanceQuery = query(
        attendanceCollection,
        where("userId", "==", currentUser.uid),
        limit(30) // Fetch more to allow for client-side sorting
      );
      
      const attendanceDocs = await getDocs(attendanceQuery);
      const attendanceData = attendanceDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendance[];
      
      // Sort in JavaScript instead of using orderBy in the query
      const sortedData = attendanceData
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10); // Take only the first 10 after sorting
      
      setRecentAttendance(sortedData);
    } catch (error) {
      console.error("Error fetching recent attendance:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLeaveHistory = async () => {
    if (!currentUser) return;
    
    try {
      const leavesCollection = collection(firestore, "leaves");
      // Query only by userId to avoid composite index requirements
      const leavesQuery = query(
        leavesCollection,
        where("userId", "==", currentUser.uid),
        limit(50) // Fetch more to allow for client-side sorting
      );
      
      const leavesDocs = await getDocs(leavesQuery);
      const leavesData = leavesDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Leave[];
      
      // Sort in JavaScript instead of Firestore - using createdAt timestamp
      const sortedData = leavesData.sort((a, b) => {
        // Handle different timestamp formats
        const getTime = (timestamp: any) => {
          if (timestamp && timestamp.toDate) return timestamp.toDate().getTime();
          if (timestamp) return new Date(timestamp).getTime();
          return 0;
        };
        
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
      
      setLeaveHistory(sortedData);
    } catch (error) {
      console.error("Error fetching leave history:", error);
      toast({
        title: "Error",
        description: "Failed to load leave history",
        variant: "destructive",
      });
    }
  };
  
  const handleCheckIn = async () => {
    await checkIn({
      workLocation: "office" // Default to office location
    });
    fetchTodayAttendance();
    fetchRecentAttendance();
  };
  
  const handleCheckOut = async () => {
    await checkOut();
    fetchTodayAttendance();
    fetchRecentAttendance();
  };
  
  const handleRequestLeave = async () => {
    setIsRequestLeaveOpen(true);
  };
  
  const onSubmitLeave = async (data: LeaveFormValues) => {
    if (!currentUser) return;
    
    try {
      await addDoc(collection(firestore, "leaves"), {
        userId: currentUser.uid,
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
        reason: data.reason,
        type: data.type,
        status: "pending",
        approvedBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Leave Request Submitted",
        description: "Your leave request has been submitted for approval",
      });
      
      setIsRequestLeaveOpen(false);
      form.reset();
      fetchLeaveHistory();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive",
      });
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return <Badge variant="success">Checked In</Badge>;
      case "checked_out":
        return <Badge variant="secondary">Checked Out</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "sick":
        return <Badge variant="destructive">Sick Leave</Badge>;
      case "casual":
        return <Badge variant="default">Casual Leave</Badge>;
      case "personal":
        return <Badge variant="outline">Personal Leave</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  const disabledDays = {
    before: new Date(),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your attendance and leave requests</p>
        </div>
        
        <div className="flex gap-2">
          {!todayAttendance && (
            <Button onClick={handleCheckIn} disabled={attendanceLoading}>
              <i className="ri-login-box-line mr-2"></i>
              Check In
            </Button>
          )}
          
          {todayAttendance && todayAttendance.status === "checked_in" && (
            <Button onClick={handleCheckOut} disabled={attendanceLoading}>
              <i className="ri-logout-box-line mr-2"></i>
              Check Out
            </Button>
          )}
          
          <Button variant="outline" onClick={handleRequestLeave}>
            <i className="ri-calendar-event-line mr-2"></i>
            Request Leave
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="today">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Today's Status</span>
                {todayAttendance ? (
                  getStatusBadge(todayAttendance.status)
                ) : (
                  <Badge variant="outline">Not Checked In</Badge>
                )}
              </CardTitle>
              <CardDescription>{formatDateFull(today)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-4">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {todayAttendance ? (
                        <span>
                          {todayAttendance.status === "checked_in" ? "Checked in at " : "Checked out at "}
                          <span className="font-medium">
                            {todayAttendance.status === "checked_in" 
                              ? formatTime(todayAttendance.checkInTime) 
                              : formatTime(todayAttendance.checkOutTime || "")}
                          </span>
                        </span>
                      ) : (
                        "You have not checked in today"
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Working Hours</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium">Check-in Time</div>
                        <div className="text-lg font-medium">
                          {todayAttendance ? formatTime(todayAttendance.checkInTime) : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Check-out Time</div>
                        <div className="text-lg font-medium">
                          {todayAttendance && todayAttendance.checkOutTime 
                            ? formatTime(todayAttendance.checkOutTime) 
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Duration</div>
                        <div className="text-lg font-medium">
                          {todayAttendance && todayAttendance.checkOutTime 
                            ? (() => {
                                const checkIn = new Date(todayAttendance.checkInTime);
                                const checkOut = new Date(todayAttendance.checkOutTime || "");
                                const diffHours = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60));
                                const diffMinutes = Math.floor(((checkOut.getTime() - checkIn.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
                                return `${diffHours}h ${diffMinutes}m`;
                              })()
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Quick Actions</h3>
                    <div className="space-y-2">
                      {!todayAttendance && (
                        <Button 
                          onClick={handleCheckIn} 
                          className="w-full justify-start"
                          disabled={attendanceLoading}
                        >
                          <i className="ri-login-box-line mr-2"></i>
                          Check In
                        </Button>
                      )}
                      
                      {todayAttendance && todayAttendance.status === "checked_in" && (
                        <Button 
                          onClick={handleCheckOut} 
                          className="w-full justify-start"
                          disabled={attendanceLoading}
                        >
                          <i className="ri-logout-box-line mr-2"></i>
                          Check Out
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={handleRequestLeave}
                      >
                        <i className="ri-calendar-event-line mr-2"></i>
                        Request Leave
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your recent attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : recentAttendance.length > 0 ? (
                <div className="space-y-4">
                  {recentAttendance.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{formatDate(record.date)}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {record.checkInTime && `Check-in: ${formatTime(record.checkInTime)}`}
                          {record.checkOutTime && ` • Check-out: ${formatTime(record.checkOutTime)}`}
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(record.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                    <i className="ri-time-line text-2xl text-slate-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No attendance records</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    You don't have any attendance records yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="leaves">
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>Your leave history and pending requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : leaveHistory.length > 0 ? (
                <div className="space-y-4">
                  {leaveHistory.map((leave) => (
                    <div key={leave.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getLeaveTypeBadge(leave.type || "personal")}
                          <span className="font-medium">
                            {formatDate(leave.startDate)} 
                            {leave.startDate !== leave.endDate ? ` to ${formatDate(leave.endDate)}` : ""}
                          </span>
                        </div>
                        <div>
                          {getLeaveStatusBadge(leave.status)}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {leave.reason}
                      </p>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Requested on {formatDate(leave.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                    <i className="ri-calendar-event-line text-2xl text-slate-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No leave requests</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    You haven't made any leave requests yet
                  </p>
                  <Button onClick={handleRequestLeave}>
                    <i className="ri-calendar-event-line mr-2"></i>
                    Request Leave
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-center">
              {leaveHistory.length > 0 && (
                <Button variant="outline" onClick={handleRequestLeave}>
                  <i className="ri-calendar-event-line mr-2"></i>
                  New Leave Request
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Request Leave Dialog */}
      <Dialog open={isRequestLeaveOpen} onOpenChange={setIsRequestLeaveOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Request Leave</DialogTitle>
            <DialogDescription className="text-sm">
              Submit a leave request for approval by your manager.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitLeave)} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="casual">Casual Leave</SelectItem>
                          <SelectItem value="personal">Personal Leave</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={disabledDays}
                          className="rounded-md border mx-auto w-full max-w-[300px]"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={disabledDays}
                          className="rounded-md border mx-auto w-full max-w-[300px]"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Leave</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please provide a reason for your leave request"
                          className="resize-none min-h-[80px] sm:min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsRequestLeaveOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
