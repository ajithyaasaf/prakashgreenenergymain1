import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, differenceInHours, isBefore, isAfter } from "date-fns";
import { firestore } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  addDoc
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeaveApprovalDialog } from "@/components/attendance/LeaveApprovalDialog";
import { LeaveRequestForm } from "@/components/leave/LeaveRequestForm";
import { LeaveApprovalWorkflow } from "@/components/leave/LeaveApprovalWorkflow";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import {
  TbCalendarOff,
  TbCalendarPlus,
  TbCalendarStats,
  TbFilter,
  TbCheck,
  TbX,
  TbArrowRight,
  TbCalendarTime,
  TbUserCircle,
  TbBuilding,
  TbAlertCircle,
  TbSend,
} from "react-icons/tb";

// Types for leave management
type LeaveStatus = "pending" | "approved" | "rejected" | "escalated";
type LeaveType = "casual" | "permission" | "sick" | "vacation";
type ApprovalRole = "TL" | "HR" | "GM" | "MD";

interface Leave {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  rejectedBy?: string;
  escalatedTo?: ApprovalRole;
  approvalNotes?: string;
  createdAt: Date;
}

export default function LeaveManagementPage() {
  const { currentUser, isAdmin, isMasterAdmin } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [userLeaves, setUserLeaves] = useState<Leave[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [approvalLoading, setApprovalLoading] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      fetchUserLeaves();
      if (isAdmin || isMasterAdmin) {
        fetchAllLeaves();
      }
    }
  }, [currentUser, filterStatus, filterDepartment, filterType]);
  
  // Fetch the current user's leave requests
  const fetchUserLeaves = async () => {
    try {
      setLoading(true);
      
      const leaveQuery = query(
        collection(firestore, "leaves"),
        where("userId", "==", currentUser?.uid),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(leaveQuery);
      const userLeavesList: Leave[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data() as {
          userId: string;
          userName?: string;
          userRole?: string;
          department?: string;
          leaveType: LeaveType;
          startDate: Timestamp;
          endDate: Timestamp;
          reason: string;
          status: LeaveStatus;
          approvedBy?: string;
          rejectedBy?: string;
          escalatedTo?: ApprovalRole;
          approvalNotes?: string;
          createdAt: Timestamp;
        };
        
        userLeavesList.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName || currentUser?.displayName || "User",
          userRole: data.userRole || "employee",
          department: data.department || "Unknown",
          leaveType: data.leaveType,
          startDate: getDateFromTimestamp(data.startDate) || new Date(),
          endDate: getDateFromTimestamp(data.endDate) || new Date(),
          reason: data.reason,
          status: data.status,
          approvedBy: data.approvedBy,
          rejectedBy: data.rejectedBy,
          escalatedTo: data.escalatedTo,
          approvalNotes: data.approvalNotes,
          createdAt: getDateFromTimestamp(data.createdAt) || new Date(),
        });
      }
      
      setUserLeaves(userLeavesList);
    } catch (error) {
      console.error("Error fetching user leaves:", error);
      toast({
        title: "Error",
        description: "Failed to load your leave requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch all leave requests (for admin)
  const fetchAllLeaves = async () => {
    try {
      setLoading(true);
      
      let leaveQuery: any = query(
        collection(firestore, "leaves"),
        orderBy("createdAt", "desc")
      );
      
      // Apply filters
      if (filterStatus !== "all") {
        leaveQuery = query(
          collection(firestore, "leaves"),
          where("status", "==", filterStatus),
          orderBy("createdAt", "desc")
        );
      }
      
      if (filterDepartment !== "all") {
        leaveQuery = query(
          collection(firestore, "leaves"),
          where("department", "==", filterDepartment),
          orderBy("createdAt", "desc")
        );
      }
      
      if (filterType !== "all") {
        leaveQuery = query(
          collection(firestore, "leaves"),
          where("leaveType", "==", filterType),
          orderBy("createdAt", "desc")
        );
      }
      
      // Combine filters if multiple are selected
      if (filterStatus !== "all" && filterDepartment !== "all") {
        leaveQuery = query(
          collection(firestore, "leaves"),
          where("status", "==", filterStatus),
          where("department", "==", filterDepartment),
          orderBy("createdAt", "desc")
        );
      }
      
      const querySnapshot = await getDocs(leaveQuery);
      const leavesList: Leave[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data() as {
          userId: string;
          userName?: string;
          userRole?: string;
          department?: string;
          leaveType: LeaveType;
          startDate: Timestamp;
          endDate: Timestamp;
          reason: string;
          status: LeaveStatus;
          approvedBy?: string;
          rejectedBy?: string;
          escalatedTo?: ApprovalRole;
          approvalNotes?: string;
          createdAt: Timestamp;
        };
        
        leavesList.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName || "User",
          userRole: data.userRole || "employee",
          department: data.department || "Unknown",
          leaveType: data.leaveType,
          startDate: getDateFromTimestamp(data.startDate) || new Date(),
          endDate: getDateFromTimestamp(data.endDate) || new Date(),
          reason: data.reason,
          status: data.status,
          approvedBy: data.approvedBy,
          rejectedBy: data.rejectedBy,
          escalatedTo: data.escalatedTo,
          approvalNotes: data.approvalNotes,
          createdAt: getDateFromTimestamp(data.createdAt) || new Date(),
        });
      }
      
      setLeaves(leavesList);
    } catch (error) {
      console.error("Error fetching all leaves:", error);
      toast({
        title: "Error",
        description: "Failed to load leave requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Approve a leave request
  const handleApproveLeave = async (leaveId: string, notes: string) => {
    if (!selectedLeave) return;
    
    setApprovalLoading(true);
    
    try {
      // Update the leave status in Firestore
      await updateDoc(doc(firestore, "leaves", leaveId), {
        status: "approved",
        approvedBy: currentUser?.uid,
        approvedByName: currentUser?.displayName,
        approvalNotes: notes,
        updatedAt: new Date(),
      });
      
      // Close the dialog and refresh the data
      setIsLeaveDialogOpen(false);
      setSelectedLeave(null);
      setNotes("");
      
      // Show success message
      toast({
        title: "Leave Approved",
        description: "The leave request has been approved successfully",
        variant: "primary",
      });
      
      // Refresh the data
      fetchUserLeaves();
      if (isAdmin || isMasterAdmin) {
        fetchAllLeaves();
      }
    } catch (error) {
      console.error("Error approving leave:", error);
      toast({
        title: "Error",
        description: "Failed to approve leave request",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(false);
    }
  };
  
  // Reject a leave request
  const handleRejectLeave = async (leaveId: string, notes: string) => {
    if (!selectedLeave) return;
    
    setApprovalLoading(true);
    
    try {
      // Update the leave status in Firestore
      await updateDoc(doc(firestore, "leaves", leaveId), {
        status: "rejected",
        rejectedBy: currentUser?.uid,
        rejectedByName: currentUser?.displayName,
        approvalNotes: notes,
        updatedAt: new Date(),
      });
      
      // Close the dialog and refresh the data
      setIsLeaveDialogOpen(false);
      setSelectedLeave(null);
      setNotes("");
      
      // Show success message
      toast({
        title: "Leave Rejected",
        description: "The leave request has been rejected",
        variant: "primary",
      });
      
      // Refresh the data
      fetchUserLeaves();
      if (isAdmin || isMasterAdmin) {
        fetchAllLeaves();
      }
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast({
        title: "Error",
        description: "Failed to reject leave request",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(false);
    }
  };
  
  // Escalate a leave request to a higher authority
  const handleEscalateLeave = async (leaveId: string, escalateTo: ApprovalRole, notes: string) => {
    if (!selectedLeave) return;
    
    setApprovalLoading(true);
    
    try {
      // Update the leave status in Firestore
      await updateDoc(doc(firestore, "leaves", leaveId), {
        status: "escalated",
        escalatedBy: currentUser?.uid,
        escalatedByName: currentUser?.displayName,
        escalatedTo: escalateTo,
        approvalNotes: notes,
        updatedAt: new Date(),
      });
      
      // Close the dialog and refresh the data
      setIsLeaveDialogOpen(false);
      setSelectedLeave(null);
      setNotes("");
      
      // Show success message
      toast({
        title: "Leave Escalated",
        description: `The leave request has been escalated to ${escalateTo}`,
        variant: "primary",
      });
      
      // Refresh the data
      fetchUserLeaves();
      if (isAdmin || isMasterAdmin) {
        fetchAllLeaves();
      }
    } catch (error) {
      console.error("Error escalating leave:", error);
      toast({
        title: "Error",
        description: "Failed to escalate leave request",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(false);
    }
  };
  
  // Get the appropriate badge color based on status
  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Rejected</Badge>;
      case "escalated":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Escalated</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  // Get the appropriate type badge color
  const getTypeBadge = (type: LeaveType) => {
    switch (type) {
      case "casual":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Casual</Badge>;
      case "permission":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Permission</Badge>;
      case "sick":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Sick</Badge>;
      case "vacation":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Vacation</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  // Format the date range for display
  const formatDateRange = (startDate: Date, endDate: Date) => {
    if (isBefore(endDate, startDate)) {
      return format(startDate, "MMM dd, yyyy");
    }
    
    const days = differenceInDays(endDate, startDate);
    const hours = differenceInHours(endDate, startDate) % 24;
    
    if (days === 0) {
      if (hours < 2) {
        return `${format(startDate, "MMM dd, yyyy")} (${hours} hour permission)`;
      } else {
        return `${format(startDate, "MMM dd, yyyy")} (${hours} hours permission)`;
      }
    } else {
      return `${format(startDate, "MMM dd, yyyy")} to ${format(endDate, "MMM dd, yyyy")} (${days + 1} days)`;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            Request and manage employee leave applications
          </p>
        </div>
        
        <Button onClick={() => setIsNewRequestOpen(true)} className="flex items-center">
          <TbCalendarPlus className="mr-2" /> Request Leave
        </Button>
      </div>
      
      <Tabs defaultValue="myLeaves">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="myLeaves" className="flex items-center">
            <TbCalendarOff className="mr-2" /> My Leave Requests
          </TabsTrigger>
          {(isAdmin || isMasterAdmin) && (
            <TabsTrigger value="allLeaves" className="flex items-center">
              <TbCalendarStats className="mr-2" /> All Leave Requests
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="myLeaves">
          <Card>
            <CardHeader>
              <CardTitle>My Leave History</CardTitle>
              <CardDescription>View all your leave requests and their current status</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : userLeaves.length === 0 ? (
                <div className="text-center py-8">
                  <TbCalendarOff className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No leave requests</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    You haven't requested any leaves yet
                  </p>
                  <Button 
                    onClick={() => setIsNewRequestOpen(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    <TbCalendarPlus className="mr-2" /> Request Leave
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userLeaves.map((leave) => (
                    <div 
                      key={leave.id} 
                      className="flex flex-col md:flex-row justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeBadge(leave.leaveType)}
                          {getStatusBadge(leave.status)}
                        </div>
                        <h4 className="font-medium mb-1">{formatDateRange(leave.startDate, leave.endDate)}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{leave.reason}</p>
                        
                        {leave.approvalNotes && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium text-slate-600 dark:text-slate-400">Notes: </span>
                            {leave.approvalNotes}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 md:mt-0 md:ml-4 md:flex md:flex-col md:items-end">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Requested on {format(leave.createdAt, "MMM dd, yyyy")}
                        </div>
                        {leave.status === "escalated" && leave.escalatedTo && (
                          <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                            Escalated to {leave.escalatedTo}
                          </div>
                        )}
                        {leave.status === "pending" && (
                          <Badge variant="outline" className="mt-2">Awaiting Approval</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {(isAdmin || isMasterAdmin) && (
          <TabsContent value="allLeaves">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>Manage Leave Requests</CardTitle>
                    <CardDescription>Review and process employee leave requests</CardDescription>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <TbFilter className="mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <TbBuilding className="mr-2" />
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="CRE">CRE</SelectItem>
                        <SelectItem value="Accounts">Accounts</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <TbCalendarTime className="mr-2" />
                        <SelectValue placeholder="Leave Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="permission">Permission</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                        <SelectItem value="vacation">Vacation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : leaves.length === 0 ? (
                  <div className="text-center py-8">
                    <TbCalendarOff className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No leave requests</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {filterStatus !== "all" || filterDepartment !== "all" || filterType !== "all" 
                        ? "No requests match your current filters" 
                        : "There are no leave requests at this time"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaves.map((leave) => (
                      <div 
                        key={leave.id} 
                        className="flex flex-col md:flex-row justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2 mb-2">
                            {getTypeBadge(leave.leaveType)}
                            {getStatusBadge(leave.status)}
                            {leave.status === "pending" && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">Action Required</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-2">
                            <TbUserCircle className="text-slate-500" />
                            <span className="font-medium">{leave.userName}</span>
                            <span className="text-slate-500 dark:text-slate-400">•</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{leave.department}</span>
                          </div>
                          
                          <h4 className="font-medium mb-1">{formatDateRange(leave.startDate, leave.endDate)}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{leave.reason}</p>
                        </div>
                        
                        <div className="mt-4 md:mt-0 md:ml-4 md:flex md:flex-col md:items-end">
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            Requested on {format(leave.createdAt, "MMM dd, yyyy")}
                          </div>
                          
                          {leave.status === "escalated" && leave.escalatedTo && (
                            <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                              Escalated to {leave.escalatedTo}
                            </div>
                          )}
                          
                          {leave.status === "pending" && (
                            <Button 
                              onClick={() => {
                                setSelectedLeave(leave);
                                setIsLeaveDialogOpen(true);
                              }}
                              className="mt-2"
                              size="sm"
                            >
                              <TbSend className="mr-2" /> Review Request
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Leave Approval Dialog */}
      {selectedLeave && (
        <LeaveApprovalDialog
          leave={selectedLeave}
          open={isLeaveDialogOpen}
          onOpenChange={setIsLeaveDialogOpen}
          onApprove={handleApproveLeave}
          onReject={handleRejectLeave}
          onEscalate={handleEscalateLeave}
          loading={approvalLoading}
        />
      )}
      
      {/* New Leave Request Dialog */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <LeaveRequestForm 
            onSuccess={() => {
              setIsNewRequestOpen(false);
              fetchUserLeaves();
              toast({
                title: "Leave Request Submitted",
                description: "Your leave request has been submitted successfully and is pending approval.",
              });
            }}
            onCancel={() => setIsNewRequestOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}