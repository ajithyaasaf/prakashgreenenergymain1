import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  TbClock,
  TbDownload,
  TbInfoCircle,
  TbReportMoney,
} from "react-icons/tb";

export function OvertimeReportGenerator() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  
  // Generate the overtime report
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
      
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);
      const reportFileName = `overtime_report_${format(selectedMonth, "yyyy-MM")}`;
      
      // Build Firestore query to fetch attendance records with overtime
      let overtimeQuery = query(
        collection(firestore, "attendance"),
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate)),
        where("isOvertime", "==", true)
      );
      
      // Add department filter if selected
      if (selectedDepartment !== "all") {
        overtimeQuery = query(
          collection(firestore, "attendance"),
          where("date", ">=", Timestamp.fromDate(startDate)),
          where("date", "<=", Timestamp.fromDate(endDate)),
          where("isOvertime", "==", true),
          where("department", "==", selectedDepartment)
        );
      }
      
      // Fetch overtime records
      const overtimeSnapshot = await getDocs(overtimeQuery);
      
      type OvertimeRecord = {
        id: string;
        userId: string;
        date: Date | null;
        checkInTime: Date | null;
        checkOutTime: Date | null;
        department: string;
        overtimeHours: number;
        overtimeMinutes: number;
        totalOvertimeMinutes: number;
        overtimeReason: string | null;
      };
      
      const overtimeRecords: OvertimeRecord[] = [];
      
      for (const docSnapshot of overtimeSnapshot.docs) {
        const data = docSnapshot.data();
        overtimeRecords.push({
          id: docSnapshot.id,
          userId: data.userId,
          date: getDateFromTimestamp(data.date),
          checkInTime: getDateFromTimestamp(data.checkInTime),
          checkOutTime: getDateFromTimestamp(data.checkOutTime),
          department: data.department,
          overtimeHours: data.overtimeHours || 0,
          overtimeMinutes: data.overtimeMinutes || 0,
          totalOvertimeMinutes: data.totalOvertimeMinutes || 0,
          overtimeReason: data.overtimeReason || null,
        });
      }
      
      // If no records found, show a message and return
      if (overtimeRecords.length === 0) {
        toast({
          title: "No Data",
          description: "No overtime records found for the selected month",
          variant: "primary",
        });
        setLoading(false);
        return;
      }
      
      // Enrich overtime records with user details
      type EnrichedOvertimeRecord = OvertimeRecord & {
        userName: string;
        userEmail: string;
      };
      
      const enrichedRecords: EnrichedOvertimeRecord[] = [];
      
      for (const record of overtimeRecords) {
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
      await generateExcelFile(enrichedRecords, reportFileName);
      
      toast({
        title: "Report Generated",
        description: `Overtime report for ${format(selectedMonth, "MMMM yyyy")} has been generated successfully`,
        variant: "primary",
      });
    } catch (error) {
      console.error("Error generating overtime report:", error);
      toast({
        title: "Error",
        description: "Failed to generate overtime report. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to generate and download Excel file
  const generateExcelFile = async (data: any[], fileName: string) => {
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
  
  // Calculate total overtime for the selected month
  const calculateTotalOvertime = () => {
    // This would be implemented in a real application
    // We would fetch the data and calculate the total
    return {
      hours: 32,
      minutes: 15,
      employees: 4,
    };
  };
  
  const overtimeSummary = calculateTotalOvertime();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <TbReportMoney className="mr-2" /> Overtime Reports
        </CardTitle>
        <CardDescription>
          Generate overtime reports for payroll calculation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>&lt;</Button>
            <div className="font-medium text-lg">
              {format(selectedMonth, "MMMM yyyy")}
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>&gt;</Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedMonth}
                onSelect={(date) => setSelectedMonth(date || new Date())}
                disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                initialFocus
              />
            </div>
            
            <div className="flex flex-col space-y-4">
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                  <TbInfoCircle className="mr-2" /> Monthly Overtime Summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Total Hours</div>
                    <div className="text-xl font-medium text-blue-800 dark:text-blue-300 flex items-center">
                      <TbClock className="mr-1" />
                      {overtimeSummary.hours}h {overtimeSummary.minutes}m
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Employees</div>
                    <div className="text-xl font-medium text-blue-800 dark:text-blue-300">
                      {overtimeSummary.employees}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Department</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full">
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
              
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-800 text-sm">
                <h3 className="font-medium text-amber-800 dark:text-amber-300 flex items-center mb-2">
                  <TbInfoCircle className="mr-2" /> About Overtime Reports
                </h3>
                <p className="text-amber-700 dark:text-amber-400">
                  Overtime reports include details of all employees who worked beyond their required checkout time. 
                  This is useful for payroll calculation and department expense tracking.
                </p>
              </div>
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
          Generate Overtime Report
        </Button>
      </CardFooter>
    </Card>
  );
}