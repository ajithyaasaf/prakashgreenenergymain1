import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy, limit } from "firebase/firestore";
import { formatDate, formatTime } from "@/utils/formatting";
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
      
      // Mock data for demonstration
      const mockData: EmployeeAttendance[] = [
        {
          id: "emp1",
          name: "Amit Sharma",
          email: "amit.sharma@prakashenergy.com",
          department: "Sales",
          checkedIn: true,
          checkInTime: "08:45",
          status: "present",
        },
        {
          id: "emp2",
          name: "Priya Patel",
          email: "priya.patel@prakashenergy.com",
          department: "Engineering",
          checkedIn: true,
          checkInTime: "09:10",
          status: "present",
        },
        {
          id: "emp3",
          name: "Rahul Mehta",
          email: "rahul.mehta@prakashenergy.com",
          department: "Support",
          checkedIn: false,
          status: "leave",
        },
        {
          id: "emp4",
          name: "Sanjay Kumar",
          email: "sanjay.kumar@prakashenergy.com",
          department: "Engineering",
          checkedIn: false,
          status: "absent",
        },
        {
          id: "emp5",
          name: "Divya Singh",
          email: "divya.singh@prakashenergy.com",
          department: "Sales",
          checkedIn: true,
          checkInTime: "08:30",
          status: "present",
        },
        {
          id: "emp6",
          name: "Vijay Reddy",
          email: "vijay.reddy@prakashenergy.com",
          department: "Support",
          checkedIn: true,
          checkInTime: "10:15",
          status: "present",
        },
        {
          id: "emp7",
          name: "Neha Gupta",
          email: "neha.gupta@prakashenergy.com",
          department: "Engineering",
          checkedIn: false,
          status: "unrecorded",
        },
      ];
      
      if (department !== "all") {
        const filtered = mockData.filter(emp => emp.department.toLowerCase() === department.toLowerCase());
        setEmployeeAttendance(filtered);
      } else {
        setEmployeeAttendance(mockData);
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
      
      // Mock data for demonstration
      const mockData: LeaveRequest[] = [
        {
          id: "leave1",
          userId: "emp3",
          userName: "Rahul Mehta",
          startDate: "2023-05-15",
          endDate: "2023-05-20",
          reason: "Annual vacation with family",
          type: "casual",
          status: "approved",
          createdAt: "2023-05-01",
        },
        {
          id: "leave2",
          userId: "emp2",
          userName: "Priya Patel",
          startDate: "2023-05-25",
          endDate: "2023-05-26",
          reason: "Medical appointment",
          type: "sick",
          status: "approved",
          createdAt: "2023-05-10",
        },
        {
          id: "leave3",
          userId: "emp6",
          userName: "Vijay Reddy",
          startDate: "2023-06-05",
          endDate: "2023-06-07",
          reason: "Family function",
          type: "personal",
          status: "pending",
          createdAt: "2023-05-18",
        },
        {
          id: "leave4",
          userId: "emp5",
          userName: "Divya Singh",
          startDate: "2023-06-01",
          endDate: "2023-06-03",
          reason: "Attending a workshop",
          type: "personal",
          status: "pending",
          createdAt: "2023-05-20",
        },
        {
          id: "leave5",
          userId: "emp1",
          userName: "Amit Sharma",
          startDate: "2023-05-22",
          endDate: "2023-05-22",
          reason: "Not feeling well",
          type: "sick",
          status: "pending",
          createdAt: "2023-05-21",
        },
      ];
      
      let filtered = [...mockData];
      
      if (leaveType !== "all") {
        filtered = filtered.filter(leave => leave.type === leaveType);
      }
      
      // Sort by created date (newest first)
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Ensure each item has the correct status type
      const typedFiltered: LeaveRequest[] = filtered.map(item => ({
        ...item,
        status: item.status as 'pending' | 'approved' | 'rejected'
      }));
      
      setLeaveRequests(typedFiltered);
      
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
        return <Badge variant="success">Present</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "leave":
        return <Badge variant="secondary">On Leave</Badge>;
      case "unrecorded":
        return <Badge variant="outline">Not Recorded</Badge>;
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
  
  const openLeaveRequestDialog = (leaveRequest: LeaveRequest) => {
    setSelectedLeaveRequest(leaveRequest);
    setNotes("");
    setIsLeaveDialogOpen(true);
  };
  
  const handleLeaveAction = async (action: 'approve' | 'reject') => {
    if (!selectedLeaveRequest) return;
    
    try {
      // In a real app, update in Firestore
      // const leaveRef = doc(firestore, "leaves", selectedLeaveRequest.id);
      // await updateDoc(leaveRef, {
      //   status: action,
      //   approvedBy: currentUser?.uid,
      //   approvalNotes: notes,
      //   updatedAt: serverTimestamp(),
      // });
      
      // For demo, update locally
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