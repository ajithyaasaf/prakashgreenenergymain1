import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import AttendanceCalendarView from "@/components/attendance/AttendanceCalendarView";
import { Attendance, Leave } from "@/shared/schema";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { TbCalendar, TbChevronLeft, TbChevronRight, TbArrowsExchange } from "react-icons/tb";

export default function AttendanceCalendarPage() {
  const { currentUser, isAdmin, isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"personal" | "department" | "company">(
    isAdmin || isMasterAdmin ? "department" : "personal"
  );

  // Query for attendance records
  const { isLoading: isLoadingAttendance, data: attendanceRecords } = useQuery({
    queryKey: ["attendance", selectedUserId || currentUser?.uid, format(month, "yyyy-MM")],
    queryFn: async () => {
      const userId = selectedUserId || currentUser?.uid;
      if (!userId) return [];

      const startDate = startOfMonth(month);
      const endDate = startOfMonth(addMonths(month, 1));

      let attendanceQuery;
      
      if (viewType === "personal" || selectedUserId) {
        // Query for a specific user
        attendanceQuery = query(
          collection(firestore, "attendance"),
          where("userId", "==", userId),
          where("date", ">=", startDate),
          where("date", "<", endDate),
          orderBy("date", "asc")
        );
      } else if (viewType === "department" && currentUser?.department) {
        // Query for a department
        attendanceQuery = query(
          collection(firestore, "attendance"),
          where("department", "==", currentUser.department),
          where("date", ">=", startDate),
          where("date", "<", endDate),
          orderBy("date", "asc")
        );
      } else {
        // Fallback to company-wide view for admins
        attendanceQuery = query(
          collection(firestore, "attendance"),
          where("date", ">=", startDate),
          where("date", "<", endDate),
          orderBy("date", "asc")
        );
      }

      const snapshot = await getDocs(attendanceQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendance[];
    },
    enabled: !!currentUser
  });

  // Query for leave records
  const { isLoading: isLoadingLeaves, data: leaveRecords } = useQuery({
    queryKey: ["leaves", selectedUserId || currentUser?.uid, format(month, "yyyy-MM")],
    queryFn: async () => {
      const userId = selectedUserId || currentUser?.uid;
      if (!userId) return [];

      const startDate = startOfMonth(month);
      const endDate = startOfMonth(addMonths(month, 1));

      let leavesQuery;
      
      if (viewType === "personal" || selectedUserId) {
        // Query for a specific user
        leavesQuery = query(
          collection(firestore, "leaves"),
          where("userId", "==", userId),
          where("status", "==", "approved"),
          where("startDate", "<=", endDate),
          where("endDate", ">=", startDate)
        );
      } else if (viewType === "department" && currentUser?.department) {
        // Query for a department
        leavesQuery = query(
          collection(firestore, "leaves"),
          where("department", "==", currentUser.department),
          where("status", "==", "approved"),
          where("startDate", "<=", endDate),
          where("endDate", ">=", startDate)
        );
      } else {
        // Fallback to company-wide view for admins
        leavesQuery = query(
          collection(firestore, "leaves"),
          where("status", "==", "approved"),
          where("startDate", "<=", endDate),
          where("endDate", ">=", startDate)
        );
      }

      const snapshot = await getDocs(leavesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Leave[];
    },
    enabled: !!currentUser
  });

  const handlePreviousMonth = () => {
    setMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setMonth(prev => addMonths(prev, 1));
  };

  const toggleViewType = () => {
    if (viewType === "personal") {
      setViewType("department");
    } else if (viewType === "department") {
      setViewType(isMasterAdmin ? "company" : "personal");
    } else {
      setViewType("personal");
    }
    setSelectedUserId(null);
  };

  const isLoading = isLoadingAttendance || isLoadingLeaves;
  
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View and track attendance records across time
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {(isAdmin || isMasterAdmin) && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleViewType}
              className="flex items-center"
            >
              <TbArrowsExchange className="mr-2" />
              {viewType === "personal" ? "Personal View" : 
               viewType === "department" ? "Department View" : "Company View"}
            </Button>
          )}
          
          <div className="flex items-center rounded-md border border-input">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousMonth}
              className="px-3"
            >
              <TbChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1 font-medium">
              {format(month, "MMMM yyyy")}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="px-3"
            >
              <TbChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl">
            <TbCalendar className="mr-2" /> Attendance Calendar
          </CardTitle>
          <CardDescription>
            {viewType === "personal" 
              ? "Your personal attendance and leave records" 
              : viewType === "department" 
                ? `${currentUser?.department || 'Department'} attendance overview`
                : "Company-wide attendance overview"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-72 w-full" />
            </div>
          ) : (
            <AttendanceCalendarView 
              month={month} 
              onMonthChange={setMonth} 
              attendanceRecords={attendanceRecords || []}
              leaveRecords={leaveRecords || []}
            />
          )}
          
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm">Present</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-orange-400 mr-2"></div>
              <span className="text-sm">On Leave</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-amber-600 mr-2"></div>
              <span className="text-sm">Late Arrival</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 border-b-2 border-indigo-500 mr-2"></div>
              <span className="text-sm">Overtime</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-blue-200 dark:bg-blue-900/40 mr-2"></div>
              <span className="text-sm">Weekend</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}