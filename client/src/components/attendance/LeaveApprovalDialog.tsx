import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { LeaveType } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

// Leave approval roles
type ApprovalRole = "TL" | "HR" | "GM" | "MD";

// Leave status types
type LeaveStatus = "pending" | "approved" | "rejected" | "escalated";

interface Leave {
  id: string;
  userId: string;
  userName: string;
  department: string;
  leaveType: LeaveType;
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  rejectedBy?: string;
  escalatedTo?: ApprovalRole;
  approvalNotes?: string;
  createdAt: Date | string;
}

interface LeaveApprovalDialogProps {
  leave: Leave | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (leaveId: string, notes: string) => Promise<void>;
  onReject: (leaveId: string, notes: string) => Promise<void>;
  onEscalate: (leaveId: string, escalateTo: ApprovalRole, notes: string) => Promise<void>;
  loading?: boolean;
}

export function LeaveApprovalDialog({
  leave,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onEscalate,
  loading = false,
}: LeaveApprovalDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState("");
  const [escalateTo, setEscalateTo] = useState<ApprovalRole>("HR");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [casualLeavesRemaining, setCasualLeavesRemaining] = useState<number | null>(null);
  const [permissionHoursRemaining, setPermissionHoursRemaining] = useState<number | null>(null);
  
  // Reset form when leave changes
  useEffect(() => {
    if (leave) {
      setNotes("");
      setEscalateTo("HR");
      
      // Fetch leave balances for the employee
      fetchLeaveBalances(leave.userId);
    }
  }, [leave]);
  
  useEffect(() => {
    if (currentUser) {
      setUserRole(currentUser.role);
    }
  }, [currentUser]);
  
  const fetchLeaveBalances = async (userId: string) => {
    try {
      // Mock for now - this would be replaced with actual API call
      setCasualLeavesRemaining(1); // Max 1 per month as per requirement
      setPermissionHoursRemaining(2); // Max 2 per month as per requirement
    } catch (error) {
      console.error("Error fetching leave balances:", error);
    }
  };
  
  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    return typeof date === 'string' ? date : format(date, "MMM dd, yyyy");
  };
  
  const getLeaveTypeBadge = (type: LeaveType) => {
    const styles = {
      casual: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      permission: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      sick: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      vacation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    };
    
    return <Badge className={styles[type] || ""} variant="outline">{type}</Badge>;
  };
  
  const getStatusBadge = (status: LeaveStatus) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      escalated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    };
    
    return <Badge className={styles[status] || ""} variant="outline">{status}</Badge>;
  };
  
  const handleApprove = async () => {
    if (!leave) return;
    
    try {
      await onApprove(leave.id, notes);
      toast({
        title: "Leave Approved",
        description: "The leave request has been approved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve leave request. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReject = async () => {
    if (!leave) return;
    
    try {
      await onReject(leave.id, notes);
      toast({
        title: "Leave Rejected",
        description: "The leave request has been rejected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject leave request. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleEscalate = async () => {
    if (!leave) return;
    
    try {
      await onEscalate(leave.id, escalateTo, notes);
      toast({
        title: "Leave Escalated",
        description: `The leave request has been escalated to ${escalateTo}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to escalate leave request. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (!leave) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave Request Details</DialogTitle>
          <DialogDescription>
            Review the leave request and take appropriate action
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Employee</h4>
            <p className="text-base">{leave.userName}</p>
            <p className="text-sm text-muted-foreground">{leave.department}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Start Date</h4>
              <p className="text-base">{formatDate(leave.startDate)}</p>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">End Date</h4>
              <p className="text-base">{formatDate(leave.endDate)}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Leave Type</h4>
            <div>{getLeaveTypeBadge(leave.leaveType)}</div>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Reason</h4>
            <p className="text-base">{leave.reason}</p>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</h4>
            <div>{getStatusBadge(leave.status)}</div>
          </div>
          
          {/* Display leave balances */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-blue-700 dark:text-blue-400">Casual Leaves Remaining</div>
              <div className="font-medium text-blue-800 dark:text-blue-300">{casualLeavesRemaining}</div>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
              <div className="text-xs text-amber-700 dark:text-amber-400">Permission Hours Remaining</div>
              <div className="font-medium text-amber-800 dark:text-amber-300">{permissionHoursRemaining}</div>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Your Notes</h4>
            <Textarea
              placeholder="Add your approval/rejection notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          {leave.status === "pending" && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Escalate To (if needed)</h4>
              <Select value={escalateTo} onValueChange={(value) => setEscalateTo(value as ApprovalRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role to escalate to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TL">Team Lead</SelectItem>
                  <SelectItem value="HR">HR Manager</SelectItem>
                  <SelectItem value="GM">General Manager</SelectItem>
                  <SelectItem value="MD">Managing Director</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {leave.status === "pending" && (
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <div className="order-2 sm:order-1 space-x-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading}
              >
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Reject
              </Button>
              <Button
                variant="outline"
                onClick={handleEscalate}
                disabled={loading}
              >
                Escalate
              </Button>
            </div>
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={loading}
              className="order-1 sm:order-2"
            >
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Approve
            </Button>
          </DialogFooter>
        )}
        
        {leave.status !== "pending" && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}