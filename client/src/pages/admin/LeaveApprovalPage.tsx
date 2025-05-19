import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/formatting";
import { getDateFromTimestamp } from "@/types/firebase-types";
import { Leave } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LeaveApprovalForm } from "@/components/attendance/LeaveApprovalForm";
import { firestore } from "@/firebase/config";
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from "firebase/firestore";

export default function LeaveApprovalPage() {
  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
  const [escalatedLeaves, setEscalatedLeaves] = useState<Leave[]>([]);
  const [processedLeaves, setProcessedLeaves] = useState<Leave[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (currentUser) {
      fetchLeaveRequests();
    }
  }, [currentUser, filter]);
  
  const fetchLeaveRequests = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get pending leave requests that this user needs to approve
      const pendingQuery = query(
        collection(firestore, "leaves"),
        where("status", "==", "pending"),
        // If filter is not 'all', filter by department
        ...(filter !== "all" ? [where("department", "==", filter)] : []),
        orderBy("createdAt", "desc")
      );
      
      // Get escalated leave requests to this user
      const escalatedQuery = query(
        collection(firestore, "leaves"),
        where("status", "==", "escalated"),
        where("escalatedTo", "==", currentUser.uid),
        orderBy("updatedAt", "desc")
      );
      
      // Get leave requests processed by this user
      const processedQuery = query(
        collection(firestore, "leaves"),
        where("approvedBy", "==", currentUser.uid),
        where("status", "in", ["approved", "rejected"]),
        orderBy("updatedAt", "desc"),
        limit(20)
      );
      
      const [pendingSnapshot, escalatedSnapshot, processedSnapshot] = await Promise.all([
        getDocs(pendingQuery),
        getDocs(escalatedQuery),
        getDocs(processedQuery)
      ]);
      
      // Map leave documents to Leave objects with user information
      const pendingLeaves = await Promise.all(
        pendingSnapshot.docs.map(async (doc) => {
          const leaveData = { id: doc.id, ...doc.data() } as Leave;
          const userInfo = await getUserInfo(leaveData.userId);
          return { ...leaveData, userName: userInfo?.name, departmentName: userInfo?.department };
        })
      );
      
      const escalatedLeaves = await Promise.all(
        escalatedSnapshot.docs.map(async (doc) => {
          const leaveData = { id: doc.id, ...doc.data() } as Leave;
          const userInfo = await getUserInfo(leaveData.userId);
          return { ...leaveData, userName: userInfo?.name, departmentName: userInfo?.department };
        })
      );
      
      const processedLeaves = await Promise.all(
        processedSnapshot.docs.map(async (doc) => {
          const leaveData = { id: doc.id, ...doc.data() } as Leave;
          const userInfo = await getUserInfo(leaveData.userId);
          return { ...leaveData, userName: userInfo?.name, departmentName: userInfo?.department };
        })
      );
      
      setPendingLeaves(pendingLeaves);
      setEscalatedLeaves(escalatedLeaves);
      setProcessedLeaves(processedLeaves);
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
  
  // Helper function to get user information
  const getUserInfo = async (userId: string) => {
    try {
      const userDoc = await firestore.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          name: userData.displayName || userData.email,
          department: userData.department
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  };
  
  const handleActionComplete = () => {
    setSelectedLeave(null);
    fetchLeaveRequests();
  };
  
  const renderLeaveList = (leaves: Leave[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
          ))}
        </div>
      );
    }
    
    if (leaves.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
            <i className="ri-calendar-event-line text-2xl text-slate-400"></i>
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No leave requests</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {emptyMessage}
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {leaves.map((leave) => (
          <div 
            key={leave.id} 
            className="p-4 border rounded-lg space-y-2 hover:border-primary cursor-pointer transition-colors"
            onClick={() => setSelectedLeave(leave)}
          >
            <div className="flex justify-between">
              <div className="flex flex-col">
                <span className="font-medium">{leave.userName || "Employee"}</span>
                <span className="text-sm text-muted-foreground">{leave.departmentName || "Department"}</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground">
                  {formatDate(leave.startDate)}
                  {getDateFromTimestamp(leave.startDate)?.toDateString() !== 
                   getDateFromTimestamp(leave.endDate)?.toDateString() && 
                   ` - ${formatDate(leave.endDate)}`}
                </span>
                <div className="mt-1">
                  {getLeaveTypeBadge(leave.type)}
                </div>
              </div>
            </div>
            <p className="text-sm line-clamp-2 text-muted-foreground">
              {leave.reason}
            </p>
          </div>
        ))}
      </div>
    );
  };
  
  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "casual":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">Casual</span>;
      case "sick":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">Sick</span>;
      case "permission":
        return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">Permission</span>;
      case "vacation":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">Vacation</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{type}</span>;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Leave Approvals</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage leave requests and approvals</p>
        </div>
        
        <div className="w-full md:w-64">
          <Label htmlFor="filter">Filter by Department</Label>
          <Select 
            value={filter} 
            onValueChange={setFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by department" />
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
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pending">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="escalated">Escalated to Me</TabsTrigger>
              <TabsTrigger value="processed">Processed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Leave Requests</CardTitle>
                  <CardDescription>
                    Requests waiting for your approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderLeaveList(pendingLeaves, "No pending leave requests")}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="escalated" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Escalated Leave Requests</CardTitle>
                  <CardDescription>
                    Requests escalated to you for approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderLeaveList(escalatedLeaves, "No escalated leave requests")}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="processed" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Processed Leave Requests</CardTitle>
                  <CardDescription>
                    Requests you have approved or rejected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderLeaveList(processedLeaves, "No processed leave requests")}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Detail panel */}
        <div>
          {selectedLeave ? (
            <LeaveApprovalForm 
              leave={selectedLeave} 
              onActionComplete={handleActionComplete} 
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Leave Request Details</CardTitle>
                <CardDescription>
                  Select a leave request to see details
                </CardDescription>
              </CardHeader>
              <CardContent className="py-12 text-center text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                  <i className="ri-file-list-line text-2xl text-slate-400"></i>
                </div>
                <p>No leave request selected</p>
                <p className="text-sm mt-2">Click on a leave request to view details and take action</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}