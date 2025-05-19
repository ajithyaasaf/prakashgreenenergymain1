import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/formatting";
import { getDateFromTimestamp } from "@/types/firebase-types";
import { Leave, LeaveType } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { firestore } from "@/firebase/config";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";

// Map user roles to escalation levels
const escalationLevels = {
  'team_lead': 'hr_manager',
  'hr_manager': 'general_manager',
  'general_manager': 'managing_director',
  'managing_director': null
};

interface LeaveApprovalFormProps {
  leave: Leave;
  onActionComplete: () => void;
}

export default function LeaveApprovalForm({ leave, onActionComplete }: LeaveApprovalFormProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Helper to get the display title based on leave type
  const getLeaveTypeTitle = (type: LeaveType) => {
    switch (type) {
      case "casual": return "Casual Leave";
      case "sick": return "Sick Leave";
      case "permission": return "Permission";
      case "vacation": return "Vacation Leave";
      default: return type;
    }
  };

  // Helper to get the badge for leave status
  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "escalated":
        return <Badge variant="warning">Escalated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate business days (excluding weekends) between two dates
  const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  };

  const getLeaveDuration = () => {
    // For permission leave, show hours
    if (leave.type === "permission") {
      return `${leave.durationHours || 1} hour(s)`;
    }
    
    // For other leave types, calculate business days
    const startDate = getDateFromTimestamp(leave.startDate);
    const endDate = getDateFromTimestamp(leave.endDate);
    
    if (!startDate || !endDate) return "Invalid dates";
    
    const businessDays = calculateBusinessDays(startDate, endDate);
    return `${businessDays} day(s)`;
  };

  const handleApprove = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      await updateDoc(doc(firestore, "leaves", leave.id), {
        status: "approved",
        approvedBy: currentUser.uid,
        approverNotes: notes || null,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Leave Approved",
        description: "The leave request has been approved successfully.",
      });
      
      onActionComplete();
    } catch (error) {
      console.error("Error approving leave:", error);
      toast({
        title: "Error",
        description: "Failed to approve leave request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!currentUser || !notes) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      await updateDoc(doc(firestore, "leaves", leave.id), {
        status: "rejected",
        approvedBy: null,
        approverNotes: notes,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Leave Rejected",
        description: "The leave request has been rejected.",
      });
      
      onActionComplete();
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast({
        title: "Error",
        description: "Failed to reject leave request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get user details to determine who to escalate to
      const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      
      const userRole = userDoc.data().role;
      const nextLevel = escalationLevels[userRole as keyof typeof escalationLevels];
      
      if (!nextLevel) {
        toast({
          title: "Escalation Error",
          description: "You cannot escalate this request further.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Find the user with the next level role
      // In a real system, you'd have a more sophisticated way to determine the exact person
      const nextApproverQuery = await getDoc(doc(firestore, "escalation_paths", nextLevel));
      let nextApproverId = null;
      
      if (nextApproverQuery.exists()) {
        nextApproverId = nextApproverQuery.data().userId;
      }
      
      if (!nextApproverId) {
        throw new Error("Next approver not found");
      }
      
      await updateDoc(doc(firestore, "leaves", leave.id), {
        status: "escalated",
        escalatedFrom: currentUser.uid,
        escalatedTo: nextApproverId,
        approverNotes: notes || null,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Leave Escalated",
        description: "The leave request has been escalated to the next level.",
      });
      
      onActionComplete();
    } catch (error) {
      console.error("Error escalating leave:", error);
      toast({
        title: "Error",
        description: "Failed to escalate leave request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          <span>{getLeaveTypeTitle(leave.type)}</span>
          {getLeaveStatusBadge(leave.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Employee</p>
            <p className="font-medium">{leave.userName || "Employee Name"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{leave.departmentName || "Department"}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">From</p>
            <p className="font-medium">{formatDate(leave.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">To</p>
            <p className="font-medium">{formatDate(leave.endDate)}</p>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Duration</p>
          <p className="font-medium">{getLeaveDuration()}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Reason</p>
          <p className="p-3 bg-muted/50 rounded">{leave.reason || "No reason provided"}</p>
        </div>
        
        {leave.status === "pending" && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your Notes (required for rejection)</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or comments about this leave request"
              className="min-h-[80px]"
            />
          </div>
        )}
        
        {leave.approverNotes && (
          <div>
            <p className="text-sm text-muted-foreground">Approver Notes</p>
            <p className="p-3 bg-muted/50 rounded">{leave.approverNotes}</p>
          </div>
        )}
      </CardContent>
      
      {leave.status === "pending" && (
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleEscalate}
            disabled={loading}
          >
            Escalate
          </Button>
          <div className="space-x-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !notes}
            >
              Reject
            </Button>
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={loading}
            >
              Approve
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}