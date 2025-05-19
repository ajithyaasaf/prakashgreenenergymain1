import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, isWeekend, getDate, addMonths, subMonths } from "date-fns";
import { getDateFromTimestamp } from "@/types/firebase-types";
import { TbArrowLeft, TbArrowRight, TbCircleCheck, TbAlarm, TbClock, TbClockOff, TbMapPin, TbCalendarOff } from "react-icons/tb";

// Import types 
import { Attendance, Leave } from "@/types";

// Interface for the component props
interface AttendanceCalendarProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  attendanceRecords: Attendance[];
  leaveRecords: Leave[];
}

export default function AttendanceCalendarView({ 
  month, 
  onMonthChange, 
  attendanceRecords, 
  leaveRecords 
}: AttendanceCalendarProps) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState<Date>(month);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dayDetails, setDayDetails] = useState<{
    attendance: Attendance | null;
    leave: Leave | null;
  }>({ attendance: null, leave: null });

  // Update parent component when month changes
  useEffect(() => {
    if (currentMonth.getTime() !== month.getTime()) {
      onMonthChange(currentMonth);
    }
  }, [currentMonth, month, onMonthChange]);

  // Update day details when selected date changes
  useEffect(() => {
    if (!selectedDate) return;

    // Find attendance record for selected date
    const attendanceRecord = attendanceRecords?.find(record => {
      const recordDate = getDateFromTimestamp(record.date);
      return recordDate && isSameDay(recordDate, selectedDate);
    }) || null;

    // Find leave record for selected date
    const leaveRecord = leaveRecords?.find(leave => {
      const startDate = getDateFromTimestamp(leave.startDate);
      const endDate = getDateFromTimestamp(leave.endDate);
      return startDate && endDate && selectedDate >= startDate && selectedDate <= endDate;
    }) || null;

    setDayDetails({ attendance: attendanceRecord, leave: leaveRecord });
  }, [selectedDate, attendanceRecords, leaveRecords]);

  // Navigate to previous month
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  // Helper function to check status of a particular date
  const getDayStatus = (day: Date) => {
    // Check for attendance on this day
    const hasAttendance = attendanceRecords?.some(record => {
      const recordDate = getDateFromTimestamp(record.date);
      return recordDate && isSameDay(recordDate, day);
    });

    // Check for leave on this day
    const hasLeave = leaveRecords?.some(leave => {
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
    
    return { hasAttendance, hasLeave, hasOvertime, isLate, isWeekendDay };
  };

  // Custom day renderer for the calendar
  const renderDay = (props: any) => {
    const day = props.date;
    // Validate the day parameter is a valid date
    if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
      // Return a simple fallback for invalid dates
      return (
        <div className="relative h-9 w-9 p-0 font-normal aria-selected:opacity-100">
          <span className="mb-1">-</span>
        </div>
      );
    }
    
    const { hasAttendance, hasLeave, hasOvertime, isLate, isWeekendDay } = getDayStatus(day);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handlePreviousMonth}
          className="flex items-center"
        >
          <TbArrowLeft className="mr-1" /> Previous
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
          Next <TbArrowRight className="ml-1" />
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
          Day: renderDay
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
                <TbCircleCheck className="mr-2" /> Attendance Record
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <TbClock className="mr-2 text-muted-foreground" />
                  <span className="font-medium">Check-in:</span>{" "}
                  <span className="ml-1">
                    {dayDetails.attendance.checkInTime
                      ? format(getDateFromTimestamp(dayDetails.attendance.checkInTime) || new Date(), 'h:mm a')
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
                      {dayDetails.attendance.checkOutTime
                        ? format(getDateFromTimestamp(dayDetails.attendance.checkOutTime) || new Date(), 'h:mm a')
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
                    {dayDetails.leave.startDate && dayDetails.leave.endDate 
                      ? `${format(new Date(dayDetails.leave.startDate), 'MMM d')} - ${format(new Date(dayDetails.leave.endDate), 'MMM d')}`
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
  );
}