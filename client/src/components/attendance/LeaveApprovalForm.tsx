import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Leave, LeaveStatus, UserRole } from "@/types";
import { getDateFromTimestamp } from "@/types/firebase-types";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { TbCalendarCheck, TbUserCircle, TbCalendarStats, TbInfoCircle, TbArrowUp, TbCheck, TbX } from "react-icons/tb";

// Schema for leave approval form
const leaveApprovalSchema = z.object({
  action: z.enum(["approve", "reject", "escalate"]),
  approverNotes: z.string().optional(),
  escalateTo: z.string().optional(),
});

type LeaveApprovalFormValues = z.infer<typeof leaveApprovalSchema>;

interface LeaveApprovalFormProps {
  leaveId: string;
  onApproved: () => void;
}

export default function LeaveApprovalForm({ leaveId, onApproved }: LeaveApprovalFormProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState<Leave | null>(null);
  const [requesterName, setRequesterName] = useState<string | null>(null);
  const [requesterRole, setRequesterRole] = useState<UserRole | null>(null);
  const [availableManagers, setAvailableManagers] = useState<{id: string; name: string}[]>([]);
  const [needsEscalation, setNeedsEscalation] = useState<boolean>(false);

  // Define form with zod validation
  const form = useForm<LeaveApprovalFormValues>({
    resolver: zodResolver(leaveApprovalSchema),
    defaultValues: {
      action: "approve",
      approverNotes: "",
      escalateTo: "",
    },
  });

  // Watch form fields
  const watchAction = form.watch("action");

  useEffect(() => {
    if (!leaveId || !currentUser) return;

    // Fetch leave request details
    const fetchLeaveDetails = async () => {
      setLoading(true);
      try {
        // Get leave request
        const leaveDoc = await getDoc(doc(firestore, "leaves", leaveId));
        if (!leaveDoc.exists()) {
          toast({
            title: "Error",
            description: "Leave request not found",
            variant: "destructive",
          });
          return;
        }

        const leaveData = {
          id: leaveDoc.id,
          ...leaveDoc.data()
        } as Leave;
        setLeaveRequest(leaveData);
        
        // Get requester details
        if (leaveData.userId) {
          const userDoc = await getDoc(doc(firestore, "users", leaveData.userId));
          if (userDoc.exists()) {
            setRequesterName(userDoc.data().displayName || "Unknown");
            setRequesterRole(userDoc.data().role as UserRole || "employee");
          }
        }
        
        // Check if current approver can handle this request or needs escalation
        const currentUserRole = currentUser.role;
        const userRole = userDoc.data().role as UserRole || "employee";
        
        // Need escalation if requester role is equal or higher than approver's role
        if (
          (userRole === "admin" && currentUserRole === "admin") ||
          (userRole === "master_admin")
        ) {
          setNeedsEscalation(true);
          
          // Fetch available managers for escalation
          const managersQuery = query(
            collection(firestore, "users"),
            where("role", "==", "master_admin")
          );
          
          const managersSnapshot = await getDocs(managersQuery);
          const managers = managersSnapshot.docs
            .map(doc => ({
              id: doc.id,
              name: doc.data().displayName || doc.data().email
            }))
            .filter(manager => manager.id !== currentUser.uid); // Exclude self
          
          setAvailableManagers(managers);
        }
      } catch (error) {
        console.error("Error fetching leave details:", error);
        toast({
          title: "Error",
          description: "Failed to load leave request details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveDetails();
  }, [leaveId, currentUser, toast]);

  // Format date range for display
  const getFormattedDateRange = () => {
    if (!leaveRequest) return "";
    
    const startDate = getDateFromTimestamp(leaveRequest.startDate);
    const endDate = getDateFromTimestamp(leaveRequest.endDate);
    
    if (!startDate || !endDate) return "";
    
    if (leaveRequest.leaveType === "permission") {
      // For permission, show hours
      const hours = differenceInHours(endDate, startDate);
      return `${format(startDate, "PPP")} (${hours} hour${hours !== 1 ? 's' : ''})`;
    } else {
      // For other leave types, show day range
      const days = differenceInDays(endDate, startDate) + 1;
      return `${format(startDate, "PPP")} to ${format(endDate, "PPP")} (${days} day${days !== 1 ? 's' : ''})`;
    }
  };

  // Handle form submission
  const onSubmit = async (data: LeaveApprovalFormValues) => {
    if (!leaveRequest || !currentUser) return;
    
    setLoading(true);
    try {
      const leaveRef = doc(firestore, "leaves", leaveRequest.id);
      
      if (data.action === "approve") {
        await updateDoc(leaveRef, {
          status: "approved",
          approvedBy: currentUser.uid,
          approverNotes: data.approverNotes || null,
          updatedAt: new Date()
        });
        
        toast({
          title: "Leave Approved",
          description: "The leave request has been approved successfully",
          variant: "default",
        });
      } 
      else if (data.action === "reject") {
        await updateDoc(leaveRef, {
          status: "rejected",
          approvedBy: currentUser.uid,
          approverNotes: data.approverNotes || null,
          updatedAt: new Date()
        });
        
        toast({
          title: "Leave Rejected",
          description: "The leave request has been rejected",
          variant: "default",
        });
      }
      else if (data.action === "escalate") {
        if (!data.escalateTo) {
          toast({
            title: "Error",
            description: "Please select a manager to escalate this request to",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        await updateDoc(leaveRef, {
          status: "escalated",
          escalatedTo: data.escalateTo,
          approverNotes: data.approverNotes || null,
          updatedAt: new Date()
        });
        
        toast({
          title: "Leave Escalated",
          description: "The leave request has been escalated to a higher authority",
          variant: "default",
        });
      }
      
      onApproved();
    } catch (error) {
      console.error("Error updating leave request:", error);
      toast({
        title: "Error",
        description: "Failed to update leave request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!leaveRequest) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-32">
            <p className="text-muted-foreground">Loading leave request...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <TbCalendarCheck className="mr-2" /> Leave Request Approval
        </CardTitle>
        <div className="text-sm flex items-center">
          <TbUserCircle className="mr-1" />
          <span className="font-medium">Requested by:</span> {requesterName || "Unknown"}
        </div>
        <div className="text-sm flex items-center">
          <TbCalendarStats className="mr-1" />
          <span className="font-medium">Leave period:</span> {getFormattedDateRange()}
        </div>
        <div className="mt-2 p-3 bg-muted/30 rounded-md">
          <div className="text-sm mb-1">
            <span className="font-medium">Type:</span> {leaveRequest.leaveType.charAt(0).toUpperCase() + leaveRequest.leaveType.slice(1)}
          </div>
          <div className="text-sm mb-2">
            <span className="font-medium">Reason:</span>
          </div>
          <div className="text-sm p-2 bg-background rounded-sm border">
            {leaveRequest.reason || "No reason provided"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Action</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      {!needsEscalation && (
                        <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/30">
                          <RadioGroupItem value="approve" id="approve" />
                          <Label htmlFor="approve" className="flex items-center">
                            <TbCheck className="mr-1 text-green-600" /> Approve
                          </Label>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/30">
                        <RadioGroupItem value="reject" id="reject" />
                        <Label htmlFor="reject" className="flex items-center">
                          <TbX className="mr-1 text-red-600" /> Reject
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/30">
                        <RadioGroupItem value="escalate" id="escalate" />
                        <Label htmlFor="escalate" className="flex items-center">
                          <TbArrowUp className="mr-1 text-blue-600" /> Escalate
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchAction === "escalate" && (
              <FormField
                control={form.control}
                name="escalateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escalate to</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Select a manager</option>
                        {availableManagers.map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="approverNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes or comments" 
                      className="resize-none" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Processing..." : 
                  watchAction === "approve" ? "Approve Leave" :
                  watchAction === "reject" ? "Reject Leave" : "Escalate Request"
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground border-t pt-4">
        {needsEscalation && (
          <div className="text-amber-600 text-xs flex items-center">
            <TbInfoCircle className="mr-1" /> 
            This request requires escalation to higher management due to requester's role
          </div>
        )}
      </CardFooter>
    </Card>
  );
}