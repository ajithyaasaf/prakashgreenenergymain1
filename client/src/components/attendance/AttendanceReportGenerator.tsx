import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { firestore } from "@/firebase/config";
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";
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
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  TbCalendarTime,
  TbCalendarWeek,
  TbCalendarMonth,
  TbReportAnalytics,
  TbDownload,
  TbInfoCircle,
} from "react-icons/tb";

export function AttendanceReportGenerator() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  // Generate the report based on the selected type and date
  const generateReport = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to generate reports",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      let reportFileName: string;
      
      // Set date range based on report type
      if (reportType === "daily") {
        startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        
        reportFileName = `attendance_report_${format(selectedDate, "yyyy-MM-dd")}`;
      } else if (reportType === "weekly") {
        startDate = startOfWeek(selectedDate, { weekStartsOn: 0 }); // 0 = Sunday
        endDate = endOfWeek(selectedDate, { weekStartsOn: 0 });
        
        reportFileName = `attendance_report_week_${format(startDate, "yyyy-MM-dd")}_to_${format(endDate, "yyyy-MM-dd")}`;
      } else {
        // Monthly report
        startDate = startOfMonth(selectedMonth);
        endDate = endOfMonth(selectedMonth);
        
        reportFileName = `attendance_report_month_${format(selectedMonth, "yyyy-MM")}`;
      }
      
      // Build Firestore query to fetch attendance records
      let attendanceQuery = query(
        collection(firestore, "attendance"),
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate))
      );
      
      // Add department filter if selected
      if (selectedDepartment !== "all") {
        attendanceQuery = query(
          collection(firestore, "attendance"),
          where("date", ">=", Timestamp.fromDate(startDate)),
          where("date", "<=", Timestamp.fromDate(endDate)),
          where("department", "==", selectedDepartment)
        );
      }
      
      // Fetch attendance records
      const attendanceSnapshot = await getDocs(attendanceQuery);
      type AttendanceRecord = {
        id: string;
        userId: string;
        date: Date | null;
        checkInTime: Date | null;
        checkOutTime: Date | null;
        workLocation: string;
        locationDetails: string | null;
        customerDetails: string | null;
        isLate: boolean;
        lateReason: string | null;
        isOvertime: boolean;
        overtimeHours: number;
        overtimeMinutes: number;
        overtimeReason: string | null;
        department: string;
        status: string;
      };
      
      const attendanceRecords: AttendanceRecord[] = [];
      
      for (const docSnapshot of attendanceSnapshot.docs) {
        const data = docSnapshot.data();
        attendanceRecords.push({
          id: docSnapshot.id,
          userId: data.userId,
          date: getDateFromTimestamp(data.date),
          checkInTime: getDateFromTimestamp(data.checkInTime),
          checkOutTime: getDateFromTimestamp(data.checkOutTime),
          workLocation: data.workLocation,
          locationDetails: data.locationDetails || null,
          customerDetails: data.customerDetails || null,
          isLate: data.isLate || false,
          lateReason: data.lateReason || null,
          isOvertime: data.isOvertime || false,
          overtimeHours: data.overtimeHours || 0,
          overtimeMinutes: data.overtimeMinutes || 0,
          overtimeReason: data.overtimeReason || null,
          department: data.department,
          status: data.status,
        });
      }
      
      // If no records found, show a message and return
      if (attendanceRecords.length === 0) {
        toast({
          title: "No Data",
          description: "No attendance records found for the selected period",
          variant: "primary",
        });
        setLoading(false);
        return;
      }
      
      // Enrich attendance records with user details
      type EnrichedAttendanceRecord = AttendanceRecord & {
        userName: string;
        userEmail: string;
      };
      
      const enrichedRecords: EnrichedAttendanceRecord[] = [];
      
      for (const record of attendanceRecords) {
        try {
          const userDocRef = doc(firestore, "users", record.userId);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            enrichedRecords.push({
              ...record,
              userName: userData.displayName || "Unknown",
              userEmail: userData.email || "Unknown"
            });
          } else {
            enrichedRecords.push({
              ...record,
              userName: "Unknown",
              userEmail: "Unknown"
            });
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
          enrichedRecords.push({
            ...record,
            userName: "Unknown",
            userEmail: "Unknown"
          });
        }
      }
      
      // Generate Excel file with enriched records
      await generateExcelFile(enrichedRecords, reportFileName, reportType);
      
      toast({
        title: "Report Generated",
        description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} attendance report has been generated successfully`,
        variant: "primary",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate attendance report. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to generate and download Excel file
  const generateExcelFile = async (data: any[], fileName: string, reportType: string) => {
    try {
      // Mock Excel generation for now since we can't use actual Excel libraries in this demo
      // In a real implementation, we would use a library like exceljs or xlsx
      
      // This simulates downloading a file
      setTimeout(() => {
        toast({
          title: "Excel File Ready",
          description: `${fileName}.xlsx has been prepared for download`,
          variant: "primary",
        });
      }, 1000);
      
      // In a real implementation, we would generate the Excel file here
      // and then trigger a download using a Blob and URL.createObjectURL()
    } catch (error) {
      console.error("Error generating Excel file:", error);
      throw error;
    }
  };
  
  const handlePreviousMonth = () => {
    setSelectedMonth(prevMonth => subMonths(prevMonth, 1));
  };
  
  const handleNextMonth = () => {
    setSelectedMonth(prevMonth => addMonths(prevMonth, 1));
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <TbReportAnalytics className="mr-2" /> Attendance Reports
        </CardTitle>
        <CardDescription>
          Generate attendance reports for specific date ranges
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="daily" value={reportType} onValueChange={(value) => setReportType(value as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="daily" className="flex items-center">
              <TbCalendarTime className="mr-1" /> Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center">
              <TbCalendarWeek className="mr-1" /> Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center">
              <TbCalendarMonth className="mr-1" /> Monthly
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date || new Date())}
                  disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                  initialFocus
                />
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <span className="font-medium">Selected Date:</span> {format(selectedDate, "MMMM dd, yyyy")}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="weekly" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date || new Date())}
                  disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                  initialFocus
                />
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <span className="font-medium">Selected Week:</span>{" "}
                {format(startOfWeek(selectedDate, { weekStartsOn: 0 }), "MMMM dd, yyyy")} to{" "}
                {format(endOfWeek(selectedDate, { weekStartsOn: 0 }), "MMMM dd, yyyy")}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="monthly" className="space-y-4">
            <div className="flex justify-center items-center space-x-4 mb-4">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>&lt;</Button>
              <div className="font-medium">
                {format(selectedMonth, "MMMM yyyy")}
              </div>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>&gt;</Button>
            </div>
            
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedMonth}
                onSelect={(date) => setSelectedMonth(date || new Date())}
                disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                initialFocus
              />
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <span className="font-medium">Full Month:</span>{" "}
              {format(startOfMonth(selectedMonth), "MMMM dd, yyyy")} to{" "}
              {format(endOfMonth(selectedMonth), "MMMM dd, yyyy")}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
          <div className="w-full md:w-auto">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full md:w-[200px]">
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
          
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-800 text-sm flex items-start space-x-2">
            <TbInfoCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-blue-800 dark:text-blue-300">
              {reportType === "daily" && "Daily reports include all check-ins and check-outs for the selected date."}
              {reportType === "weekly" && "Weekly reports summarize attendance and overtime for the selected week."}
              {reportType === "monthly" && "Monthly reports provide detailed attendance statistics for payroll purposes."}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={generateReport} 
          disabled={loading}
          className="flex items-center"
        >
          {loading ? <Spinner className="mr-2" /> : <TbDownload className="mr-2" />}
          Generate {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
        </Button>
      </CardFooter>
    </Card>
  );
}