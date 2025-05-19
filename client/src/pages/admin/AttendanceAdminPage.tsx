import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy, limit } from "firebase/firestore";
import { formatDate, formatTime } from "@/utils/formatting";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Attendance, Leave } from "@/types";

interface EmployeeAttendance {
  id: string;
  name: string;
  email: string;
  department: string;
  checkedIn: boolean;
  checkInTime?: string;
  status: 'present' | 'absent' | 'leave' | 'unrecorded';
}

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function AttendanceAdminPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("today");
  const [department, setDepartment] = useState<string>("all");
  const [leaveType, setLeaveType] = useState<string>("all");
  
  const [employeeAttendance, setEmployeeAttendance] = useState<EmployeeAttendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  
  useEffect(() => {
    if (currentUser) {
      if (tab === "today") {
        fetchTodayAttendance();
      } else {
        fetchLeaveRequests();
      }
    }
  }, [currentUser, tab, department, leaveType]);
  
  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      
      // Get today's date (start and end of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get all users first
      const usersQuery = query(collection(firestore, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const users: Record<string, {name: string, email: string, department: string}> = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        users[doc.id] = {
          name: userData.displayName || "Unknown",
          email: userData.email || "Unknown",
          department: userData.department || "Unknown"
        };
      });
      
      // Get today's attendance records
      const attendanceQuery = query(
        collection(firestore, "attendance"),
        where("date", ">=", Timestamp.fromDate(today)),
        where("date", "<", Timestamp.fromDate(tomorrow))
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceMap: Record<string, {checkedIn: boolean, checkInTime?: Date, status: 'present' | 'absent' | 'leave' | 'unrecorded'}> = {};
      
      attendanceSnapshot.forEach(doc => {
        const data = doc.data();
        attendanceMap[data.userId] = {
          checkedIn: true,
          checkInTime: data.checkInTime?.toDate(),
          status: data.status === "checked_out" ? "present" : "present"
        };
      });
      
      // Get leave requests for today - simplified query to avoid composite index requirement
      const leaveQuery = query(
        collection(firestore, "leaves"),
        where("status", "==", "approved")
      );
      
      const leaveSnapshot = await getDocs(leaveQuery);
      leaveSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Get date ranges and check if the leave is for today
        const startDate = data.startDate?.toDate();
        const endDate = data.endDate?.toDate();
        
        // If leave dates overlap with today
        if (startDate && endDate && 
            startDate <= tomorrow && endDate >= today) {
          attendanceMap[data.userId] = {
            checkedIn: false,
            status: "leave"
          };
        }
      });
      
      // Combine user and attendance data
      const employeeAttendanceData: EmployeeAttendance[] = Object.keys(users).map(userId => {
        const user = users[userId];
        const attendance = attendanceMap[userId];
        
        return {
          id: userId,
          name: user.name,
          email: user.email,
          department: user.department,
          checkedIn: attendance?.checkedIn || false,
          checkInTime: attendance?.checkInTime ? format(attendance.checkInTime, "HH:mm") : undefined,
          status: attendance?.status || "unrecorded"
        };
      });
      
      // Filter by department if needed
      if (department !== "all") {
        const filtered = employeeAttendanceData.filter(emp => 
          emp.department.toLowerCase() === department.toLowerCase()
        );
        setEmployeeAttendance(filtered);
      } else {
        setEmployeeAttendance(employeeAttendanceData);
      }
      
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      
      // Get all users for name lookup
      const usersQuery = query(collection(firestore, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const users: Record<string, {name: string, department: string}> = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        users[doc.id] = {
          name: userData.displayName || "Unknown",
          department: userData.department || "Unknown"
        };
      });
      
      // Create basic leave query
      let leaveQuery: any = query(
        collection(firestore, "leaves"),
        orderBy("createdAt", "desc")
      );
      
      // Apply type filter if needed
      if (leaveType !== "all") {
        leaveQuery = query(
          collection(firestore, "leaves"),
          where("leaveType", "==", leaveType),
          orderBy("createdAt", "desc")
        );
      }
      
      // Fetch leave requests
      const leaveSnapshot = await getDocs(leaveQuery);
      const leaveList: LeaveRequest[] = [];
      
      for (const docSnapshot of leaveSnapshot.docs) {
        const data = docSnapshot.data() as {
          userId: string;
          leaveType: string;
          startDate: Timestamp;
          endDate: Timestamp;
          reason: string;
          status: 'pending' | 'approved' | 'rejected';
          createdAt: Timestamp;
        };
        
        const userId = data.userId;
        const user = users[userId] || { name: "Unknown", department: "Unknown" };
        
        leaveList.push({
          id: docSnapshot.id,
          userId: userId,
          userName: user.name,
          startDate: data.startDate ? format(data.startDate.toDate(), "yyyy-MM-dd") : "",
          endDate: data.endDate ? format(data.endDate.toDate(), "yyyy-MM-dd") : "",
          reason: data.reason || "",
          type: data.type || "permission", // Using the field name from your Firebase document
          status: data.status,
          createdAt: data.createdAt ? format(data.createdAt.toDate(), "yyyy-MM-dd") : "",
        });
      }
      
      setLeaveRequests(leaveList);
      
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      toast({
        title: "Error",
        description: "Failed to load leave requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Present</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Absent</Badge>;
      case "leave":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">On Leave</Badge>;
      case "unrecorded":
        return <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300">Not Recorded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "sick":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Sick Leave</Badge>;
      case "casual":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Casual Leave</Badge>;
      case "permission":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Permission</Badge>;
      case "vacation":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Vacation</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  const openLeaveRequestDialog = (leaveRequest: LeaveRequest) => {
    setSelectedLeaveRequest(leaveRequest);
    setNotes("");
    setIsLeaveDialogOpen(true);
  };
  
  const handleLeaveAction = async (action: 'approve' | 'reject') => {
    if (!selectedLeaveRequest) return;
    
    try {
      // Update the leave request in Firestore
      const leaveRef = doc(firestore, "leaves", selectedLeaveRequest.id);
      await updateDoc(leaveRef, {
        status: action === 'approve' ? 'approved' : 'rejected',
        [action === 'approve' ? 'approvedBy' : 'rejectedBy']: currentUser?.uid,
        [action === 'approve' ? 'approvedByName' : 'rejectedByName']: currentUser?.displayName,
        approvalNotes: notes,
        updatedAt: Timestamp.now(),
      });
      
      // Update the local state for immediate UI feedback
      const updatedRequests: LeaveRequest[] = leaveRequests.map(request => {
        if (request.id === selectedLeaveRequest.id) {
          return {
            ...request,
            status: (action === 'approve' ? 'approved' : 'rejected') as 'pending' | 'approved' | 'rejected',
          };
        }
        return request;
      });
      
      setLeaveRequests(updatedRequests);
      
      toast({
        title: `Leave ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The leave request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
      
      setIsLeaveDialogOpen(false);
    } catch (error) {
      console.error(`Error ${action}ing leave request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} leave request`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance Administration</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage employee attendance and leave requests
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {tab === "today" ? (
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="casual">Casual Leave</SelectItem>
                <SelectItem value="personal">Personal Leave</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{tab === "today" ? "Today's Attendance" : "Leave Requests"}</CardTitle>
              <CardDescription>
                {tab === "today" 
                  ? "Employee attendance status for today" 
                  : "Manage employee leave requests"}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={tab === "today" ? "default" : "outline"} 
                onClick={() => setTab("today")}
              >
                Today's Attendance
              </Button>
              <Button 
                variant={tab === "leave" ? "default" : "outline"} 
                onClick={() => setTab("leave")}
              >
                Leave Requests
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Skeleton loading state
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              ))}
            </div>
          ) : tab === "today" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeAttendance.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell>{employee.checkInTime || '-'}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" disabled={employee.status === 'leave'}>
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell onClick={() => openLeaveRequestDialog(request)}>
                        <div className="font-medium">{request.userName}</div>
                        <div className="text-sm text-muted-foreground">Requested on {formatDate(request.createdAt)}</div>
                      </TableCell>
                      <TableCell onClick={() => openLeaveRequestDialog(request)}>
                        <div>{formatDate(request.startDate)}</div>
                        {request.startDate !== request.endDate && (
                          <div className="text-sm text-muted-foreground">to {formatDate(request.endDate)}</div>
                        )}
                      </TableCell>
                      <TableCell onClick={() => openLeaveRequestDialog(request)}>
                        {getLeaveTypeBadge(request.type)}
                      </TableCell>
                      <TableCell onClick={() => openLeaveRequestDialog(request)}>
                        {getLeaveStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="default" 
                              onClick={(e) => {
                                e.stopPropagation();
                                openLeaveRequestDialog(request);
                              }}
                            >
                              Review
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {leaveRequests.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                    <i className="ri-calendar-event-line text-2xl text-slate-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No leave requests</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    There are no leave requests matching your filters
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Leave Request Review Dialog */}
      {selectedLeaveRequest && (
        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Leave Request Details</DialogTitle>
              <DialogDescription>
                Review the leave request details below
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Employee</h4>
                <p className="text-base">{selectedLeaveRequest.userName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Start Date</h4>
                  <p className="text-base">{formatDate(selectedLeaveRequest.startDate)}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">End Date</h4>
                  <p className="text-base">{formatDate(selectedLeaveRequest.endDate)}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Leave Type</h4>
                <p className="text-base">{getLeaveTypeBadge(selectedLeaveRequest.type)}</p>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Reason</h4>
                <p className="text-base">{selectedLeaveRequest.reason}</p>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</h4>
                <p className="text-base">{getLeaveStatusBadge(selectedLeaveRequest.status)}</p>
              </div>
              
              {selectedLeaveRequest.status === 'pending' && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Notes (Optional)</h4>
                  <Textarea
                    placeholder="Add approval/rejection notes here"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              {selectedLeaveRequest.status === 'pending' ? (
                <div className="flex w-full space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleLeaveAction('reject')}
                  >
                    Reject
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => handleLeaveAction('approve')}
                  >
                    Approve
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsLeaveDialogOpen(false)}>Close</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Attendance Statistics</CardTitle>
          <CardDescription>Quick overview of today's attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Employees</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">7</div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Present</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">4</div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Absent</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">1</div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">On Leave</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}