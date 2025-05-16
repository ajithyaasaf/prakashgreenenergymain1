import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAttendance } from "@/hooks/useAttendance";
import { useToast } from "@/hooks/use-toast";
import { Attendance, Leave } from "@/types";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getDate, addMonths, subMonths } from "date-fns";
import { getDateFromTimestamp } from "@/types/firebase-types";
import { TbArrowLeft, TbArrowRight, TbCheckCircle, TbAlarm, TbClock, TbClockOff, TbMapPin, TbCalendarOff } from "react-icons/tb";

// Custom rendering for attendance calendar
interface AttendanceCalendarProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  attendanceRecords: Attendance[];
  leaveRecords: Leave[];
}

const AttendanceCalendarView = () => {
  const { attendanceRecords, getLeaveHistory, loading } = useAttendance();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dayDetails, setDayDetails] = useState<{
    attendance: Attendance | null;
    leave: Leave | null;
  }>({ attendance: null, leave: null });

  // Fetch leave history
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const leaveHistory = await getLeaveHistory();
        setLeaves(leaveHistory);
      } catch (error) {
        console.error("Error fetching leave history:", error);
        toast({
          title: "Error",
          description: "Failed to load leave records",
          variant: "destructive",
        });
      }
    };

    fetchLeaves();
  }, [getLeaveHistory, toast]);

  // Update day details when selected date changes
  useEffect(() => {
    if (!selectedDate) return;

    // Find attendance record for selected date
    const attendanceRecord = attendanceRecords?.find(record => {
      const recordDate = getDateFromTimestamp(record.date);
      return recordDate && isSameDay(recordDate, selectedDate);
    }) || null;

    // Find leave record for selected date
    const leaveRecord = leaves?.find(leave => {
      const startDate = getDateFromTimestamp(leave.startDate);
      const endDate = getDateFromTimestamp(leave.endDate);
      return startDate && endDate && selectedDate >= startDate && selectedDate <= endDate;
    }) || null;

    setDayDetails({ attendance: attendanceRecord, leave: leaveRecord });
  }, [selectedDate, attendanceRecords, leaves]);

  // Navigate to previous month
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  // Calendar day rendering
  const renderDay = (day: Date) => {
    // Check for attendance on this day
    const hasAttendance = attendanceRecords?.some(record => {
      const recordDate = getDateFromTimestamp(record.date);
      return recordDate && isSameDay(recordDate, day);
    });

    // Check for leave on this day
    const hasLeave = leaves?.some(leave => {
      const startDate = getDateFromTimestamp(leave.startDate);
      const endDate = getDateFromTimestamp(leave.endDate);
      return startDate && endDate && day >= startDate && day <= endDate;
    });

    // Check overtime
    const hasOvertime = attendanceRecords?.some(record => {
      const recordDate = getDateFromTimestamp(record.date);
      return recordDate && isSameDay(recordDate, day) && record.isOvertime;
    });

    // Check late arrival
    const isLate = attendanceRecords?.some(record => {
      const recordDate = getDateFromTimestamp(record.date);
      return recordDate && isSameDay(recordDate, day) && record.isLate;
    });

    // Check if it's a weekend
    const isWeekendDay = isWeekend(day);

    // Style based on status
    let className = "relative h-9 w-9 p-0 font-normal aria-selected:opacity-100";
    
    if (isWeekendDay) {
      className += " bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300";
    }
    
    if (hasLeave) {
      className += " border-2 border-orange-400";
    }
    
    if (hasAttendance) {
      className += " font-medium";
      if (hasOvertime) {
        className += " border-b-2 border-indigo-500";
      }
      if (isLate) {
        className += " text-amber-600";
      }
    }

    return (
      <div className={className}>
        <time dateTime={format(day, 'yyyy-MM-dd')} className="mb-1">
          {getDate(day)}
        </time>
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
          {hasAttendance && (
            <div className="h-1 w-1 rounded-full bg-green-500" />
          )}
          {hasLeave && (
            <div className="h-1 w-1 rounded-full bg-orange-400" />
          )}
        </div>
      </div>
    );
  };

  // Get days for current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Attendance Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'calendar' | 'list')}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="View Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="list">List View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'calendar' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePreviousMonth}
                className="flex items-center"
              >
                <TbArrowLeft className="mr-1" /> Previous Month
              </Button>
              <h3 className="text-lg font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleNextMonth}
                className="flex items-center"
              >
                Next Month <TbArrowRight className="ml-1" />
              </Button>
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              components={{
                Day: ({ day, ...props }) => (
                  <button {...props}>
                    {renderDay(day)}
                  </button>
                )
              }}
            />

            {selectedDate && (
              <div className="mt-4 space-y-4">
                <h3 className="font-medium text-lg">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>

                {dayDetails.attendance ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
                    <h4 className="font-medium flex items-center text-green-700 dark:text-green-400 mb-2">
                      <TbCheckCircle className="mr-2" /> Attendance Record
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <TbClock className="mr-2 text-muted-foreground" />
                        <span className="font-medium">Check-in:</span>{" "}
                        <span className="ml-1">
                          {getDateFromTimestamp(dayDetails.attendance.checkInTime) 
                            ? format(getDateFromTimestamp(dayDetails.attendance.checkInTime)!, 'h:mm a')
                            : 'N/A'}
                        </span>
                        {dayDetails.attendance.isLate && (
                          <span className="ml-2 text-amber-600 text-xs">
                            <TbAlarm className="inline mr-1" /> Late
                          </span>
                        )}
                      </div>

                      {dayDetails.attendance.checkOutTime && (
                        <div className="flex items-center">
                          <TbClockOff className="mr-2 text-muted-foreground" />
                          <span className="font-medium">Check-out:</span>{" "}
                          <span className="ml-1">
                            {getDateFromTimestamp(dayDetails.attendance.checkOutTime)
                              ? format(getDateFromTimestamp(dayDetails.attendance.checkOutTime)!, 'h:mm a')
                              : 'N/A'}
                          </span>
                          {dayDetails.attendance.isOvertime && (
                            <span className="ml-2 text-indigo-600 text-xs">
                              <TbAlarm className="inline mr-1" /> Overtime
                            </span>
                          )}
                        </div>
                      )}

                      {dayDetails.attendance.workLocation && (
                        <div className="flex items-center">
                          <TbMapPin className="mr-2 text-muted-foreground" />
                          <span className="font-medium">Location:</span>{" "}
                          <span className="ml-1 capitalize">{dayDetails.attendance.workLocation}</span>
                        </div>
                      )}

                      {dayDetails.attendance.locationDetails && (
                        <div className="mt-2 text-xs bg-white dark:bg-black/20 p-2 rounded">
                          <span className="font-medium">Location Details:</span>{" "}
                          <span>{dayDetails.attendance.locationDetails}</span>
                        </div>
                      )}

                      {dayDetails.attendance.lateReason && (
                        <div className="mt-2 text-xs bg-white dark:bg-black/20 p-2 rounded">
                          <span className="font-medium">Late Reason:</span>{" "}
                          <span>{dayDetails.attendance.lateReason}</span>
                        </div>
                      )}
                      
                      {dayDetails.attendance.overtimeReason && (
                        <div className="mt-2 text-xs bg-white dark:bg-black/20 p-2 rounded">
                          <span className="font-medium">Overtime Reason:</span>{" "}
                          <span>{dayDetails.attendance.overtimeReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isWeekend(selectedDate) ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                    <h4 className="font-medium text-blue-700 dark:text-blue-400">
                      Weekend / Holiday
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      No attendance required on weekends and holidays.
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted/30 p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      No attendance record for this day.
                    </p>
                  </div>
                )}

                {dayDetails.leave && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md">
                    <h4 className="font-medium flex items-center text-amber-700 dark:text-amber-400 mb-2">
                      <TbCalendarOff className="mr-2" /> Leave Record
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex">
                        <span className="font-medium w-24">Type:</span>
                        <span className="capitalize">{dayDetails.leave.leaveType}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-24">Status:</span>
                        <span className="capitalize">{dayDetails.leave.status}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-24">Period:</span>
                        <span>
                          {getDateFromTimestamp(dayDetails.leave.startDate) && getDateFromTimestamp(dayDetails.leave.endDate) 
                            ? `${format(getDateFromTimestamp(dayDetails.leave.startDate)!, 'MMM d')} - ${format(getDateFromTimestamp(dayDetails.leave.endDate)!, 'MMM d')}`
                            : 'N/A'}
                        </span>
                      </div>
                      {dayDetails.leave.reason && (
                        <div className="mt-2 text-xs bg-white dark:bg-black/20 p-2 rounded">
                          <span className="font-medium">Reason:</span>{" "}
                          <span>{dayDetails.leave.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-lg">
                {format(currentMonth, 'MMMM yyyy')} Records
              </h3>
            </div>

            <div className="space-y-2">
              {daysInMonth.map((day) => {
                // Find attendance for this day
                const attendanceRecord = attendanceRecords?.find(record => {
                  const recordDate = getDateFromTimestamp(record.date);
                  return recordDate && isSameDay(recordDate, day);
                });

                // Find leave for this day
                const leaveRecord = leaves?.find(leave => {
                  const startDate = getDateFromTimestamp(leave.startDate);
                  const endDate = getDateFromTimestamp(leave.endDate);
                  return startDate && endDate && day >= startDate && day <= endDate;
                });

                // Skip empty days in list view
                if (!attendanceRecord && !leaveRecord && !isWeekend(day)) {
                  return null;
                }

                return (
                  <div 
                    key={day.toString()} 
                    className="border rounded-md p-3 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{format(day, 'EEEE, MMMM d')}</span>
                      {isWeekend(day) && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                          Weekend
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attendanceRecord && (
                        <div className="text-xs flex items-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                          <TbCheckCircle className="mr-1" />
                          <span>
                            Present
                            {attendanceRecord.workLocation === 'off-site' && ' (Off-site)'}
                            {attendanceRecord.isLate && ' (Late)'}
                            {attendanceRecord.isOvertime && ' (OT)'}
                          </span>
                        </div>
                      )}
                      
                      {leaveRecord && (
                        <div className="text-xs flex items-center bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                          <TbCalendarOff className="mr-1" />
                          <span>
                            {leaveRecord.leaveType.charAt(0).toUpperCase() + leaveRecord.leaveType.slice(1)} Leave
                            ({leaveRecord.status})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceCalendarView;