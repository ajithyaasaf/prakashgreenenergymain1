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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
        <div className="p-6 border-b dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-white">Today's Attendance</h3>
            <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
              <div>
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
                <div className="w-32 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="w-24 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-100 dark:bg-slate-700/30 rounded-lg p-3">
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700/30 rounded-lg p-3">
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="w-full h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
      <div className="p-6 border-b dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-white">Today's Attendance</h3>
          <a href="/attendance" className="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
            Details
          </a>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-500">
              <i className="ri-time-line text-xl"></i>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-white">Your Status</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(today)}</div>
            </div>
          </div>
          
          <div className="h-10">
            {isCheckedIn && !isCheckedOut && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300">
                <i className="ri-checkbox-circle-line mr-1"></i> Checked In
              </span>
            )}
            {isCheckedOut && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                <i className="ri-checkbox-circle-line mr-1"></i> Checked Out
              </span>
            )}
            {!attendance && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
                <i className="ri-error-warning-line mr-1"></i> Not Checked In
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check-in</div>
            <div className="font-medium text-slate-800 dark:text-white">
              {attendance?.checkInTime ? formatTime(attendance.checkInTime) : '-'}
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Expected out</div>
            <div className="font-medium text-slate-800 dark:text-white">6:00 PM</div>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Team Attendance</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {teamAttendance.present}/{teamAttendance.total} present
            </span>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div 
              className="bg-success-500 h-2.5 rounded-full" 
              style={{ width: `${teamAttendance.percentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mt-6">
          {!attendance && (
            <button
              onClick={handleCheckIn}
              disabled={attendanceLoading}
              className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full py-2 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg flex items-center justify-center space-x-2 cursor-not-allowed"
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
