import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceCalendarView from "@/components/attendance/AttendanceCalendarView";
import AttendanceCheckInForm from "@/components/attendance/AttendanceCheckInForm";
import AttendanceCheckOutForm from "@/components/attendance/AttendanceCheckOutForm";
import LeaveRequestForm from "@/components/attendance/LeaveRequestForm";
import { useAttendance } from "@/hooks/useAttendance";
import { TbClock, TbCalendarTime, TbCalendarPlus, TbFileReport } from "react-icons/tb";

export default function AttendanceCalendarPage() {
  const [activeTab, setActiveTab] = useState("calendar");
  const { getTodayAttendance, loading } = useAttendance();
  const [attendanceState, setAttendanceState] = useState<string | null>(null);

  // Check current attendance status
  const checkAttendanceState = async () => {
    const todayAttendance = await getTodayAttendance();
    if (!todayAttendance) {
      setAttendanceState("not-checked-in");
    } else if (todayAttendance.status === "checked_in") {
      setAttendanceState("checked-in");
    } else if (todayAttendance.status === "checked_out") {
      setAttendanceState("checked-out");
    }
  };

  // Update tabs and check attendance state when changing tabs
  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    if (value === "check-in" || value === "check-out") {
      await checkAttendanceState();
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Attendance Manager</h1>
        <p className="text-muted-foreground">
          Track your attendance, request leaves, and view your attendance history
        </p>
      </div>

      <Tabs defaultValue="calendar" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl mb-6">
          <TabsTrigger value="calendar" className="flex items-center">
            <TbCalendarTime className="mr-2" /> Calendar View
          </TabsTrigger>
          <TabsTrigger value="check-in" className="flex items-center">
            <TbClock className="mr-2" /> Check In
          </TabsTrigger>
          <TabsTrigger value="check-out" className="flex items-center">
            <TbClock className="mr-2" /> Check Out
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center">
            <TbCalendarPlus className="mr-2" /> Request Leave
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <AttendanceCalendarView />
        </TabsContent>

        <TabsContent value="check-in">
          {attendanceState === "checked-in" || attendanceState === "checked-out" ? (
            <div className="bg-white dark:bg-gray-900 border rounded-lg shadow-sm p-6 max-w-md mx-auto text-center">
              <div className="mb-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                  <TbClock className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Already Checked In Today</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You have already checked in for today. You can view your attendance details in the calendar view.
              </p>
              <Button onClick={() => setActiveTab("calendar")}>View Calendar</Button>
            </div>
          ) : (
            <AttendanceCheckInForm />
          )}
        </TabsContent>

        <TabsContent value="check-out">
          {attendanceState === "not-checked-in" ? (
            <div className="bg-white dark:bg-gray-900 border rounded-lg shadow-sm p-6 max-w-md mx-auto text-center">
              <div className="mb-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300">
                  <TbClock className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Not Checked In Yet</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You need to check in before you can check out for the day.
              </p>
              <Button onClick={() => setActiveTab("check-in")}>Go to Check In</Button>
            </div>
          ) : attendanceState === "checked-out" ? (
            <div className="bg-white dark:bg-gray-900 border rounded-lg shadow-sm p-6 max-w-md mx-auto text-center">
              <div className="mb-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                  <TbClock className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Already Checked Out</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You have already checked out for today. Your attendance has been recorded.
              </p>
              <Button onClick={() => setActiveTab("calendar")}>View Calendar</Button>
            </div>
          ) : (
            <AttendanceCheckOutForm />
          )}
        </TabsContent>

        <TabsContent value="leave">
          <LeaveRequestForm />
        </TabsContent>
      </Tabs>

      <div className="mt-8 bg-muted/30 rounded-lg p-6">
        <div className="flex items-start">
          <div className="shrink-0 mt-1">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TbFileReport className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium mb-2">Attendance Reports</h3>
            <p className="text-muted-foreground mb-4">
              Generate attendance reports for any period. Reports include daily records, overtime, leaves, and overall statistics.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">Daily Report</Button>
              <Button variant="outline">Weekly Report</Button>
              <Button variant="outline">Monthly Report</Button>
              <Button variant="outline">Overtime Report</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}