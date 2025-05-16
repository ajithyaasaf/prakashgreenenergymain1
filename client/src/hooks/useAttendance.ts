import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { collection, addDoc, doc, updateDoc, query, where, getDocs, Timestamp, serverTimestamp, getDoc } from "firebase/firestore";
import { Attendance, Leave } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface CheckInParams {
  workLocation: "office" | "off-site";
  locationDetails?: string;
  offSiteReason?: string;
  customerDetails?: string;
}

interface CheckOutParams {
  lateReason?: string;
  overtimeReason?: string;
}

interface LeaveRequestParams {
  leaveType: "casual" | "permission" | "sick" | "vacation";
  startDate: Date;
  endDate: Date;
  reason: string;
}

export function useAttendance() {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Get user's department
  const getUserDepartment = async (): Promise<string | null> => {
    if (!currentUser) return null;

    try {
      const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data().department || null;
      }
      return null;
    } catch (error) {
      console.error("Error getting user department:", error);
      return null;
    }
  };

  // Get department policy based on the user's department
  const getDepartmentPolicy = async () => {
    const department = await getUserDepartment();
    if (!department) return null;

    try {
      const policiesQuery = query(
        collection(firestore, "departmentPolicies"),
        where("department", "==", department)
      );
      
      const querySnapshot = await getDocs(policiesQuery);
      if (querySnapshot.empty) return null;
      
      return {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      };
    } catch (error) {
      console.error("Error fetching department policy:", error);
      return null;
    }
  };

  const getTodayAttendance = async (): Promise<Attendance | null> => {
    if (!currentUser) return null;

    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Using only userId as the filter to avoid composite index requirement
      const q = query(
        collection(firestore, "attendance"),
        where("userId", "==", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Filter for today's date in memory instead of in the query
      const todayStr = today.toDateString();
      const todayDocs = querySnapshot.docs.filter(doc => {
        const date = doc.data().date?.toDate?.();
        return date && date.toDateString() === todayStr;
      });
      
      if (todayDocs.length === 0) {
        return null;
      }
      
      const attendanceDoc = todayDocs[0];
      return {
        id: attendanceDoc.id,
        ...attendanceDoc.data()
      } as Attendance;
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance data",
        variant: "secondary",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get all attendance records for the current user
  const { data: attendanceRecords, isLoading: isAttendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ["/api/attendance", currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const q = query(
        collection(firestore, "attendance"),
        where("userId", "==", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendance[];
    },
    enabled: !!currentUser,
  });

  // Check in with location information
  const checkIn = async (params: CheckInParams) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Check if already checked in today
      const existingAttendance = await getTodayAttendance();
      if (existingAttendance) {
        toast({
          title: "Already Checked In",
          description: "You have already checked in today",
          variant: "primary",
        });
        return;
      }
      
      const now = new Date();
      const department = await getUserDepartment();
      const policy = await getDepartmentPolicy();
      
      // Validate off-site work for departments that don't allow it
      if (params.workLocation === "off-site" && 
          department && 
          policy && 
          !policy.allowsOffSiteWork &&
          !["Sales", "Marketing"].includes(department)) {
        toast({
          title: "Off-site Work Not Allowed",
          description: "Your department does not allow off-site work",
          variant: "destructive",
        });
        return;
      }
      
      // Validate required fields for Sales and Marketing off-site work
      if (params.workLocation === "off-site" && 
          ["Sales", "Marketing"].includes(department || "") && 
          (!params.locationDetails || !params.offSiteReason || !params.customerDetails)) {
        toast({
          title: "Missing Information",
          description: "You must provide location details, reason, and customer details for off-site work",
          variant: "destructive",
        });
        return;
      }
      
      // Check if late check-in
      let isLate = false;
      if (policy) {
        const [requiredHour, requiredMinute] = policy.requiredCheckInTime.split(":").map(Number);
        const requiredTime = new Date();
        requiredTime.setHours(requiredHour, requiredMinute, 0, 0);
        
        isLate = now > requiredTime;
      }
      
      await addDoc(collection(firestore, "attendance"), {
        userId: currentUser.uid,
        date: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        checkInTime: serverTimestamp(),
        workLocation: params.workLocation,
        locationDetails: params.locationDetails || null,
        offSiteReason: params.offSiteReason || null,
        customerDetails: params.customerDetails || null,
        isLate: isLate,
        status: "checked_in",
      });
      
      toast({
        title: "Checked In",
        description: `Successfully checked in at ${now.toLocaleTimeString()}`,
        variant: "primary",
      });
      
      await refetchAttendance();
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: "Check-in Failed",
        description: "An error occurred while checking in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check out with reason if needed
  const checkOut = async (params?: CheckOutParams) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const existingAttendance = await getTodayAttendance();
      if (!existingAttendance) {
        toast({
          title: "Not Checked In",
          description: "You have not checked in today",
          variant: "secondary",
        });
        return;
      }
      
      if (existingAttendance.status === "checked_out") {
        toast({
          title: "Already Checked Out",
          description: "You have already checked out today",
          variant: "primary",
        });
        return;
      }
      
      const now = new Date();
      const department = await getUserDepartment();
      const policy = await getDepartmentPolicy();
      
      // Check if it's past required check-out time for the department
      let isLateCheckout = false;
      let isOvertime = false;
      
      if (policy) {
        const [requiredHour, requiredMinute] = policy.requiredCheckOutTime.split(":").map(Number);
        const requiredTime = new Date();
        requiredTime.setHours(requiredHour, requiredMinute, 0, 0);
        
        isLateCheckout = now > requiredTime;
        
        // For technical team, after required time is considered overtime
        if (department === "Technical" && isLateCheckout) {
          isOvertime = true;
          
          // Technical team overtime requires reason
          if (isOvertime && !params?.overtimeReason) {
            toast({
              title: "Reason Required",
              description: "Technical team must provide a reason for overtime",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }
      
      // Late check-out for other departments requires reason
      if (isLateCheckout && !isOvertime && !params?.lateReason) {
        toast({
          title: "Reason Required",
          description: "You must provide a reason for checking out after your scheduled end time",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      await updateDoc(doc(firestore, "attendance", existingAttendance.id), {
        checkOutTime: serverTimestamp(),
        lateReason: params?.lateReason || null,
        overtimeReason: params?.overtimeReason || null,
        isLateCheckout: isLateCheckout,
        isOvertime: isOvertime,
        status: "checked_out",
      });
      
      toast({
        title: "Checked Out",
        description: `Successfully checked out at ${now.toLocaleTimeString()}`,
        variant: "primary",
      });
      
      await refetchAttendance();
    } catch (error) {
      console.error("Error checking out:", error);
      toast({
        title: "Check-out Failed",
        description: "An error occurred while checking out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get leave history
  const getLeaveHistory = async (): Promise<Leave[]> => {
    if (!currentUser) return [];

    try {
      const q = query(
        collection(firestore, "leaves"),
        where("userId", "==", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Leave[];
    } catch (error) {
      console.error("Error fetching leave history:", error);
      return [];
    }
  };

  // Check if user has exceeded monthly leave/permission limits
  const checkLeaveEligibility = async (leaveType: string): Promise<{eligible: boolean, reason?: string}> => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const department = await getUserDepartment();
      const policy = await getDepartmentPolicy();
      
      if (!policy) return { eligible: true };
      
      const leaveHistory = await getLeaveHistory();
      
      // Filter leaves by current month and approved status
      const monthlyLeaves = leaveHistory.filter(leave => {
        const leaveDate = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
        return leaveDate.getMonth() === currentMonth && 
               leaveDate.getFullYear() === currentYear && 
               leave.status === "approved" &&
               leave.leaveType === leaveType;
      });
      
      if (leaveType === "permission") {
        // Calculate total permission hours used this month
        let hoursUsed = 0;
        monthlyLeaves.forEach(leave => {
          const startDate = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
          const endDate = leave.endDate.toDate ? leave.endDate.toDate() : new Date(leave.endDate);
          const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
          hoursUsed += diffHours;
        });
        
        if (hoursUsed >= policy.maxMonthlyPermissionHours) {
          return { 
            eligible: false, 
            reason: `You have already used your allowed ${policy.maxMonthlyPermissionHours} hours of permission this month` 
          };
        }
      } else if (leaveType === "casual") {
        // Check if casual leave limit is reached
        if (monthlyLeaves.length >= policy.maxMonthlyCasualLeaves) {
          return { 
            eligible: false, 
            reason: `You have already used your allowed ${policy.maxMonthlyCasualLeaves} casual leave this month` 
          };
        }
      }
      
      return { eligible: true };
    } catch (error) {
      console.error("Error checking leave eligibility:", error);
      return { eligible: true }; // Default to eligible on error
    }
  };

  // Request leave with enhanced validation
  const requestLeave = async (params: LeaveRequestParams) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Check if eligible for this type of leave
      const eligibility = await checkLeaveEligibility(params.leaveType);
      if (!eligibility.eligible) {
        toast({
          title: "Leave Request Failed",
          description: eligibility.reason || "You are not eligible for this leave",
          variant: "destructive",
        });
        return;
      }
      
      // Check if it's a Sunday (0 = Sunday in JavaScript)
      if (params.startDate.getDay() === 0 || params.endDate.getDay() === 0) {
        toast({
          title: "Invalid Leave Request",
          description: "Sundays are holidays, you don't need to apply for leave",
          variant: "secondary",
        });
        return;
      }
      
      await addDoc(collection(firestore, "leaves"), {
        userId: currentUser.uid,
        leaveType: params.leaveType,
        startDate: Timestamp.fromDate(params.startDate),
        endDate: Timestamp.fromDate(params.endDate),
        reason: params.reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: "Leave Requested",
        description: "Your leave request has been submitted for approval",
        variant: "primary",
      });
      
      // Refetch leave data
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
    } catch (error) {
      console.error("Error requesting leave:", error);
      toast({
        title: "Request Failed",
        description: "An error occurred while submitting your leave request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get monthly attendance statistics for the current user
  const getMonthlyAttendanceStats = async (month?: number, year?: number) => {
    if (!currentUser) return null;

    try {
      const currentDate = new Date();
      const targetMonth = month !== undefined ? month : currentDate.getMonth();
      const targetYear = year !== undefined ? year : currentDate.getFullYear();
      
      // Get all attendance records
      const records = attendanceRecords || await refetchAttendance().then(res => res.data || []);
      
      // Filter for the target month
      const monthlyRecords = records.filter(record => {
        const recordDate = record.date.toDate ? record.date.toDate() : new Date(record.date);
        return recordDate.getMonth() === targetMonth && recordDate.getFullYear() === targetYear;
      });
      
      // Calculate statistics
      const totalDays = new Date(targetYear, targetMonth + 1, 0).getDate(); // Days in month
      const presentDays = monthlyRecords.length;
      const lateCheckIns = monthlyRecords.filter(record => record.isLate).length;
      const overtime = monthlyRecords.filter(record => record.isOvertime).length;
      
      // Get leaves for the month
      const leaves = await getLeaveHistory();
      const monthlyLeaves = leaves.filter(leave => {
        const leaveDate = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
        return leaveDate.getMonth() === targetMonth && 
               leaveDate.getFullYear() === targetYear && 
               leave.status === "approved";
      });
      
      return {
        totalDays,
        presentDays,
        lateCheckIns,
        overtime,
        leaves: monthlyLeaves.length,
        month: format(new Date(targetYear, targetMonth, 1), 'MMMM yyyy')
      };
    } catch (error) {
      console.error("Error getting monthly stats:", error);
      return null;
    }
  };

  return {
    loading: loading || isAttendanceLoading,
    getTodayAttendance,
    attendanceRecords,
    checkIn,
    checkOut,
    requestLeave,
    getLeaveHistory,
    getUserDepartment,
    getDepartmentPolicy,
    getMonthlyAttendanceStats,
    refetchAttendance
  };
}
