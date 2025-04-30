import { formatDate, formatTime } from "@/utils/formatting";
import { useAttendance } from "@/hooks/useAttendance";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Attendance } from "@/types";

interface AttendanceWidgetProps {
  loading?: boolean;
}

export default function AttendanceWidget({ loading = false }: AttendanceWidgetProps) {
  const { currentUser } = useAuth();
  const { getTodayAttendance, checkIn, checkOut, loading: attendanceLoading } = useAttendance();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [teamAttendance, setTeamAttendance] = useState({
    present: 23,
    total: 25,
    percentage: 92
  });
  
  useEffect(() => {
    const fetchAttendance = async () => {
      if (currentUser) {
        const data = await getTodayAttendance();
        setAttendance(data);
      }
    };
    
    fetchAttendance();
  }, [currentUser]);
  
  const handleCheckIn = async () => {
    await checkIn();
    const data = await getTodayAttendance();
    setAttendance(data);
  };
  
  const handleCheckOut = async () => {
    await checkOut();
    const data = await getTodayAttendance();
    setAttendance(data);
  };
  
  const today = new Date();
  const isCheckedIn = attendance?.status === "checked_in";
  const isCheckedOut = attendance?.status === "checked_out";
  
  if (loading || attendanceLoading) {
    return (
      <div className="bg-white dark:bg-black/20 rounded-xl shadow-sm">
        <div className="p-6 border-b border-primary/10 dark:border-secondary/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-secondary dark:text-primary">Today's Attendance</h3>
            <div className="w-16 h-4 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-secondary/20 animate-pulse"></div>
              <div>
                <div className="w-24 h-4 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse mb-2"></div>
                <div className="w-32 h-3 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="w-24 h-8 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-primary/5 dark:bg-secondary/10 rounded-lg p-3">
              <div className="w-16 h-3 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse mb-2"></div>
              <div className="w-20 h-5 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse"></div>
            </div>
            <div className="bg-primary/5 dark:bg-secondary/10 rounded-lg p-3">
              <div className="w-16 h-3 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse mb-2"></div>
              <div className="w-20 h-5 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse"></div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="w-full h-10 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black/20 rounded-xl shadow-sm">
      <div className="p-6 border-b border-primary/10 dark:border-secondary/20">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-secondary dark:text-primary">Today's Attendance</h3>
          <a href="/attendance" className="text-sm text-primary hover:text-primary/80 dark:hover:text-primary/90">
            Details
          </a>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
              <i className="ri-time-line text-xl"></i>
            </div>
            <div>
              <div className="text-sm font-medium text-secondary dark:text-primary">Your Status</div>
              <div className="text-xs text-secondary/70 dark:text-primary/70">{formatDate(today)}</div>
            </div>
          </div>
          
          <div className="h-10">
            {isCheckedIn && !isCheckedOut && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
                <i className="ri-checkbox-circle-line mr-1"></i> Checked In
              </span>
            )}
            {isCheckedOut && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary">
                <i className="ri-checkbox-circle-line mr-1"></i> Checked Out
              </span>
            )}
            {!attendance && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary">
                <i className="ri-error-warning-line mr-1"></i> Not Checked In
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-primary/5 dark:bg-secondary/10 rounded-lg p-3">
            <div className="text-xs text-secondary/70 dark:text-primary/70 mb-1">Check-in</div>
            <div className="font-medium text-secondary dark:text-primary">
              {attendance?.checkInTime ? formatTime(attendance.checkInTime) : '-'}
            </div>
          </div>
          
          <div className="bg-primary/5 dark:bg-secondary/10 rounded-lg p-3">
            <div className="text-xs text-secondary/70 dark:text-primary/70 mb-1">Expected out</div>
            <div className="font-medium text-secondary dark:text-primary">6:00 PM</div>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-secondary dark:text-primary">Team Attendance</span>
            <span className="text-xs text-secondary/70 dark:text-primary/70">
              {teamAttendance.present}/{teamAttendance.total} present
            </span>
          </div>
          
          <div className="w-full bg-primary/10 dark:bg-secondary/20 rounded-full h-2.5">
            <div 
              className="bg-primary dark:bg-secondary h-2.5 rounded-full" 
              style={{ width: `${teamAttendance.percentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mt-6">
          {!attendance && (
            <button
              onClick={handleCheckIn}
              disabled={attendanceLoading}
              className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {attendanceLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <i className="ri-login-box-line"></i>
                  <span>Check In</span>
                </>
              )}
            </button>
          )}
          
          {isCheckedIn && !isCheckedOut && (
            <button
              onClick={handleCheckOut}
              disabled={attendanceLoading}
              className="w-full py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {attendanceLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <i className="ri-logout-box-line"></i>
                  <span>Check Out</span>
                </>
              )}
            </button>
          )}
          
          {isCheckedOut && (
            <button
              disabled
              className="w-full py-2 bg-primary/10 dark:bg-secondary/20 text-primary dark:text-secondary rounded-lg flex items-center justify-center space-x-2 cursor-not-allowed"
            >
              <i className="ri-check-double-line"></i>
              <span>Completed for Today</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
