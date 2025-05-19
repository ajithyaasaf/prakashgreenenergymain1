import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { collection, addDoc, doc, updateDoc, query, where, getDocs, Timestamp, serverTimestamp, getDoc } from "firebase/firestore";
import { Attendance, Leave, Department, LeaveType, WorkLocation } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { FirestoreDepartmentPolicy, getDateFromTimestamp } from "@/types/firebase-types";

interface CheckInParams {
  workLocation: "office" | "off-site";
  locationDetails?: string;
  offSiteReason?: string;
  customerDetails?: string;
  lateReason?: string;
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
  const getUserDepartment = async (): Promise<Department | null> => {
    if (!currentUser) return null;

    try {
      const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
      if (userDoc.exists()) {
        const department = userDoc.data().department;
        return department as Department || null;
      }
      return null;
    } catch (error) {
      console.error("Error getting user department:", error);
      return null;
    }
  };

  // Get department policy based on the user's department
  const getDepartmentPolicy = async (): Promise<FirestoreDepartmentPolicy | null> => {
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
      } as FirestoreDepartmentPolicy;
    } catch (error) {
      console.error("Error fetching department policy:", error);
      return null;
    }
  };
  
  // Calculate remaining casual leave balance for the current month
  const getRemainingCasualLeaveBalance = async (): Promise<number | null> => {
    if (!currentUser) return null;
    
    try {
      // Get department policy to determine max allowed casual leaves
      const policy = await getDepartmentPolicy();
      if (!policy) return null;
      
      const maxCasualLeaves = policy.maxMonthlyCasualLeaves || 1; // Default to 1 if not specified
      
      // Get current month's casual leave count
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const leavesQuery = query(
        collection(firestore, "leaves"),
        where("userId", "==", currentUser.uid),
        where("leaveType", "==", "casual")
      );
      
      const querySnapshot = await getDocs(leavesQuery);
      let usedLeaves = 0;
      
      querySnapshot.docs.forEach(doc => {
        const leaveData = doc.data();
        
        // Only count approved or pending leaves (not rejected)
        if (leaveData.status === 'rejected') return;
        
        const startDate = getDateFromTimestamp(leaveData.startDate);
        const endDate = getDateFromTimestamp(leaveData.endDate);
        
        if (!startDate || !endDate) return;
        
        // Check if the leave overlaps with current month
        const leaveStartsInThisMonth = startDate >= startOfMonth && startDate <= endOfMonth;
        const leaveEndsInThisMonth = endDate >= startOfMonth && endDate <= endOfMonth;
        const leaveSpansThisMonth = startDate <= startOfMonth && endDate >= endOfMonth;
        
        if (leaveStartsInThisMonth || leaveEndsInThisMonth || leaveSpansThisMonth) {
          // Calculate business days between start and end dates (excluding weekends)
          let currentDate = new Date(Math.max(startDate.getTime(), startOfMonth.getTime()));
          const lastDate = new Date(Math.min(endDate.getTime(), endOfMonth.getTime()));
          
          while (currentDate <= lastDate) {
            // Skip weekends (0 = Sunday, 6 = Saturday)
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              usedLeaves++;
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
      
      return Math.max(0, maxCasualLeaves - usedLeaves);
    } catch (error) {
      console.error("Error calculating remaining casual leave balance:", error);
      return null;
    }
  };
  
  // Calculate remaining permission hours for the current month
  const getRemainingPermissionHours = async (): Promise<number | null> => {
    if (!currentUser) return null;
    
    try {
      // Get department policy to determine max allowed permission hours
      const policy = await getDepartmentPolicy();
      if (!policy) return null;
      
      const maxPermissionHours = policy.maxMonthlyPermissionHours || 2; // Default to 2 if not specified
      
      // Get current month's permission leaves
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const leavesQuery = query(
        collection(firestore, "leaves"),
        where("userId", "==", currentUser.uid),
        where("leaveType", "==", "permission")
      );
      
      const querySnapshot = await getDocs(leavesQuery);
      let usedHours = 0;
      
      querySnapshot.docs.forEach(doc => {
        const leaveData = doc.data();
        
        // Only count approved or pending leaves (not rejected)
        if (leaveData.status === 'rejected') return;
        
        const startDate = getDateFromTimestamp(leaveData.startDate);
        
        if (!startDate) return;
        
        // Check if permission falls within current month
        if (startDate >= startOfMonth && startDate <= endOfMonth) {
          // For permission leaves, we assume each permission is for hours specified
          usedHours += leaveData.durationHours || 1; // Default to 1 hour if not specified
        }
      });
      
      return Math.max(0, maxPermissionHours - usedHours);
    } catch (error) {
      console.error("Error calculating remaining permission hours:", error);
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
    
    // Ensure params is defined with default values if necessary
    if (!params) {
      toast({
        title: "Error",
        description: "Check-in parameters are missing",
        variant: "destructive",
      });
      return;
    }
    
    // Default to office if workLocation is not provided
    const workLocation = params.workLocation || "office";

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
      if (workLocation === "off-site" && 
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
      if (workLocation === "off-site" && 
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
        
        // Validate late check-in reason if required
        if (isLate && !params.lateReason) {
          toast({
            title: "Reason Required",
            description: "You must provide a reason for checking in late",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      
      await addDoc(collection(firestore, "attendance"), {
        userId: currentUser.uid,
        date: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        checkInTime: serverTimestamp(),
        workLocation: workLocation, // Use our safe variable
        locationDetails: params.locationDetails || null,
        offSiteReason: params.offSiteReason || null,
        customerDetails: params.customerDetails || null,
        isLate: isLate,
        lateReason: isLate ? params.lateReason : null,
        department: department,
        status: "checked_in",
        requiredCheckInTime: policy ? policy.requiredCheckInTime : "09:00",
        requiredCheckOutTime: policy ? policy.requiredCheckOutTime : "18:00",
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
      let overtimeHours = 0;
      let overtimeMinutes = 0;
      
      if (policy) {
        const [requiredHour, requiredMinute] = policy.requiredCheckOutTime.split(":").map(Number);
        const requiredTime = new Date();
        requiredTime.setHours(requiredHour, requiredMinute, 0, 0);
        
        isLateCheckout = now > requiredTime;
        
        // Calculate overtime duration if applicable
        if (isLateCheckout) {
          // Calculate overtime in hours and minutes
          const diffMs = now.getTime() - requiredTime.getTime();
          overtimeHours = Math.floor(diffMs / (1000 * 60 * 60));
          overtimeMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          // Check if department allows overtime
          if (policy.overtimeAllowed) {
            isOvertime = true;
            
            // Check if user is from Technical department
            if (department === "Technical") {
              // Technical team overtime requires reason
              if (!params?.overtimeReason) {
                toast({
                  title: "Reason Required",
                  description: "Technical team must provide a reason for overtime",
                  variant: "destructive",
                });
                setLoading(false);
                return;
              }
            } else {
              // For other departments that allow overtime
              if (!params?.overtimeReason) {
                toast({
                  title: "Reason Required",
                  description: "You must provide a reason for overtime work",
                  variant: "destructive",
                });
                setLoading(false);
                return;
              }
            }
          } else {
            // Department doesn't allow overtime, but still checking out late
            if (!params?.lateReason) {
              toast({
                title: "Reason Required",
                description: "You must provide a reason for checking out after your scheduled end time",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }
          }
        }
      }
      
      // Validate CRE, Accounts, HR off-site checkout
      if (["CRE", "Accounts", "HR"].includes(department || "") && 
          existingAttendance.workLocation === "off-site") {
        toast({
          title: "Office Check-out Required",
          description: "Your department requires you to be in the office for check-out",
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
        overtimeHours: isOvertime ? overtimeHours : 0,
        overtimeMinutes: isOvertime ? overtimeMinutes : 0,
        totalOvertimeMinutes: isOvertime ? (overtimeHours * 60 + overtimeMinutes) : 0,
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
  const checkLeaveEligibility = async (leaveType: LeaveType): Promise<{eligible: boolean, reason?: string}> => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const department = await getUserDepartment();
      const policy = await getDepartmentPolicy();
      
      if (!policy) return { eligible: true };
      
      const leaveHistory = await getLeaveHistory();
      
      // Filter leaves by current month and approved status
      const monthlyLeaves = leaveHistory.filter(leave => {
        const leaveDate = getDateFromTimestamp(leave.startDate);
        if (!leaveDate) return false;
        
        return leaveDate.getMonth() === currentMonth && 
               leaveDate.getFullYear() === currentYear && 
               leave.status === "approved" &&
               leave.leaveType === leaveType;
      });
      
      if (leaveType === "permission") {
        // Calculate total permission hours used this month
        let hoursUsed = 0;
        monthlyLeaves.forEach(leave => {
          const startDate = getDateFromTimestamp(leave.startDate);
          const endDate = getDateFromTimestamp(leave.endDate);
          
          if (startDate && endDate) {
            const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
            hoursUsed += diffHours;
          }
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
      
      if (!records || records.length === 0) {
        return {
          totalDays: new Date(targetYear, targetMonth + 1, 0).getDate(),
          presentDays: 0,
          lateCheckIns: 0,
          overtime: 0,
          leaves: 0,
          month: format(new Date(targetYear, targetMonth, 1), 'MMMM yyyy')
        };
      }
      
      // Filter for the target month
      const monthlyRecords = records.filter(record => {
        const recordDate = getDateFromTimestamp(record.date);
        return recordDate && 
               recordDate.getMonth() === targetMonth && 
               recordDate.getFullYear() === targetYear;
      });
      
      // Calculate statistics
      const totalDays = new Date(targetYear, targetMonth + 1, 0).getDate(); // Days in month
      const presentDays = monthlyRecords.length;
      const lateCheckIns = monthlyRecords.filter(record => record.isLate).length;
      const overtime = monthlyRecords.filter(record => record.isOvertime).length;
      
      // Get leaves for the month
      const leaves = await getLeaveHistory();
      const monthlyLeaves = leaves.filter(leave => {
        const leaveDate = getDateFromTimestamp(leave.startDate);
        return leaveDate && 
               leaveDate.getMonth() === targetMonth && 
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
    checkLeaveEligibility,
    refetchAttendance
  };
}
