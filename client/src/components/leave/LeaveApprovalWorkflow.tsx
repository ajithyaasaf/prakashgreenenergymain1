import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  TbCalendar, 
  TbCalendarCheck, 
  TbClock, 
  TbCheck, 
  TbX, 
  TbArrowUp, 
  TbUser, 
  TbFileDescription,
  TbCalendarTime
} from "react-icons/tb";

type LeaveStatus = "pending" | "approved" | "rejected" | "escalated";
type LeaveType = "casual" | "permission" | "sick" | "vacation";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  currentApprover: string;
  approvalHistory: {
    approver: string;
    status: LeaveStatus;
    comment: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  supportingDocumentUrl?: string;
}

interface LeaveApprovalWorkflowProps {
  leaveRequest: LeaveRequest;
  onApprove: (id: string, comment: string) => Promise<void>;
  onReject: (id: string, comment: string) => Promise<void>;
  onEscalate: (id: string, comment: string) => Promise<void>;
  isProcessing?: boolean;
}

export function LeaveApprovalWorkflow({
  leaveRequest,
  onApprove,
  onReject,
  onEscalate,
  isProcessing = false,
}: LeaveApprovalWorkflowProps) {
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isEscalateDialogOpen, setIsEscalateDialogOpen] = useState(false);
  
  // Calculate leave duration in days
  const leaveDuration = Math.floor((leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "escalated": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };
  
  const getLeaveTypeLabel = (type: LeaveType) => {
    switch (type) {
      case "casual": return "Casual Leave";
      case "permission": return "Permission";
      case "sick": return "Sick Leave";
      case "vacation": return "Vacation";
    }
  };
  
  const handleApprove = async () => {
    try {
      await onApprove(leaveRequest.id, comment);
      setIsApproveDialogOpen(false);
      setComment("");
      toast({
        title: "Leave request approved",
        description: "The leave request has been approved successfully.",
      });
    } catch (error) {
      console.error("Error approving leave request:", error);
      toast({
        title: "Approval failed",
        description: "There was an error approving this leave request. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReject = async () => {
    try {
      await onReject(leaveRequest.id, comment);
      setIsRejectDialogOpen(false);
      setComment("");
      toast({
        title: "Leave request rejected",
        description: "The leave request has been rejected.",
      });
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      toast({
        title: "Rejection failed",
        description: "There was an error rejecting this leave request. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleEscalate = async () => {
    try {
      await onEscalate(leaveRequest.id, comment);
      setIsEscalateDialogOpen(false);
      setComment("");
      toast({
        title: "Leave request escalated",
        description: "The leave request has been escalated to the next approver.",
      });
    } catch (error) {
      console.error("Error escalating leave request:", error);
      toast({
        title: "Escalation failed",
        description: "There was an error escalating this leave request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Leave Request</CardTitle>
          <Badge className={getStatusColor(leaveRequest.status)}>
            {leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <div className="flex items-center text-sm">
            <TbUser className="mr-2 text-muted-foreground" />
            <span className="font-medium mr-1">Employee:</span> 
            {leaveRequest.userName}
          </div>
          
          <div className="flex items-center text-sm">
            <TbCalendar className="mr-2 text-muted-foreground" />
            <span className="font-medium mr-1">Department:</span>
            {leaveRequest.userDepartment}
          </div>
          
          <div className="flex items-center text-sm">
            <TbCalendarCheck className="mr-2 text-muted-foreground" />
            <span className="font-medium mr-1">Leave Type:</span>
            {getLeaveTypeLabel(leaveRequest.leaveType)}
          </div>
          
          <div className="flex items-center text-sm">
            <TbCalendarTime className="mr-2 text-muted-foreground" />
            <span className="font-medium mr-1">Duration:</span>
            {leaveDuration} day{leaveDuration !== 1 ? 's' : ''}
          </div>
          
          <div className="flex items-center text-sm">
            <TbCalendar className="mr-2 text-muted-foreground" />
            <span className="font-medium mr-1">From:</span>
            {format(leaveRequest.startDate, "dd MMM yyyy")}
          </div>
          
          <div className="flex items-center text-sm">
            <TbCalendar className="mr-2 text-muted-foreground" />
            <span className="font-medium mr-1">To:</span>
            {format(leaveRequest.endDate, "dd MMM yyyy")}
          </div>
          
          <div className="flex items-center text-sm">
            <TbClock className="mr-2 text-muted-foreground" />
            <span className="font-medium mr-1">Requested:</span>
            {format(leaveRequest.createdAt, "dd MMM yyyy, hh:mm a")}
          </div>
          
          <div className="flex items-center text-sm">
            <TbUser className="mr-2 text-muted-foreground" />
            <span className="font-medium mr-1">Current Approver:</span>
            {leaveRequest.currentApprover}
          </div>
        </div>
        
        <div className="border-t pt-3 mt-2">
          <div className="flex items-start mb-1 text-sm">
            <TbFileDescription className="mr-2 mt-0.5 text-muted-foreground" />
            <div>
              <div className="font-medium mb-1">Reason:</div>
              <p className="text-muted-foreground">{leaveRequest.reason}</p>
            </div>
          </div>
        </div>
        
        {leaveRequest.approvalHistory.length > 0 && (
          <div className="border-t pt-3 mt-2">
            <h4 className="font-medium mb-2">Approval History</h4>
            <div className="space-y-2">
              {leaveRequest.approvalHistory.map((history, index) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{history.approver}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(history.timestamp, "dd MMM yyyy, hh:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center mt-1">
                    <Badge className={`mr-2 ${getStatusColor(history.status)}`}>
                      {history.status.charAt(0).toUpperCase() + history.status.slice(1)}
                    </Badge>
                    {history.comment && <span className="text-muted-foreground">{history.comment}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      {leaveRequest.status === "pending" && (
        <CardFooter className="border-t pt-4 flex justify-end space-x-2">
          <Button 
            variant="outline" 
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/50" 
            onClick={() => setIsRejectDialogOpen(true)}
            disabled={isProcessing}
          >
            <TbX className="mr-1" /> Reject
          </Button>
          
          <Button 
            variant="outline" 
            className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 dark:border-orange-900 dark:text-orange-400 dark:hover:bg-orange-900/50"
            onClick={() => setIsEscalateDialogOpen(true)}
            disabled={isProcessing}
          >
            <TbArrowUp className="mr-1" /> Escalate
          </Button>
          
          <Button 
            variant="outline" 
            className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-900/50"
            onClick={() => setIsApproveDialogOpen(true)}
            disabled={isProcessing}
          >
            <TbCheck className="mr-1" /> Approve
          </Button>
        </CardFooter>
      )}
      
      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              You are about to approve a {leaveRequest.leaveType} leave request for {leaveRequest.userName}.
            </p>
            <Textarea
              placeholder="Add an optional comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? <Spinner className="mr-2" /> : null}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              You are about to reject a {leaveRequest.leaveType} leave request for {leaveRequest.userName}.
              Please provide a reason for the rejection.
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={isProcessing || !comment.trim()}
            >
              {isProcessing ? <Spinner className="mr-2" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Escalate Dialog */}
      <Dialog open={isEscalateDialogOpen} onOpenChange={setIsEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Leave Request</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              You are about to escalate this {leaveRequest.leaveType} leave request to the next approver level.
              Please provide a reason for the escalation.
            </p>
            <Textarea
              placeholder="Reason for escalation..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsEscalateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEscalate} 
              disabled={isProcessing}
            >
              {isProcessing ? <Spinner className="mr-2" /> : null}
              Confirm Escalation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}