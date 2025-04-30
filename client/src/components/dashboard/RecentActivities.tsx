import { RecentActivity } from "@/types";
import { formatRelativeTime } from "@/utils/formatting";

interface RecentActivitiesProps {
  activities: RecentActivity[];
  loading?: boolean;
}

export default function RecentActivities({ activities, loading = false }: RecentActivitiesProps) {
  // Helper function to get status badge color
  const getStatusBadgeClass = (statusType?: string) => {
    if (statusType === "success") return "bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300";
    if (statusType === "warning") return "bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300";
    if (statusType === "danger") return "bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-300";
    if (statusType === "primary") return "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300";
    if (statusType === "secondary") return "bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-300";
    return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300";
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
        <div className="p-6 border-b dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-white">Recent Activities</h3>
            <div className="flex space-x-2">
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-start space-x-4">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
        <div className="p-6 border-b dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-white">Recent Activities</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="py-6">
            <i className="ri-calendar-event-line text-4xl text-slate-300 dark:text-slate-600 mb-2"></i>
            <p className="text-slate-500 dark:text-slate-400">No recent activities found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
      <div className="p-6 border-b dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-white">Recent Activities</h3>
          <div className="flex space-x-2">
            <button className="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
              View All
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className={`w-9 h-9 rounded-full ${activity.iconBg} flex items-center justify-center flex-shrink-0`}>
                <i className={`ri-${activity.icon}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                  {activity.title}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    <i className="ri-time-line mr-1"></i> {formatRelativeTime(activity.time)}
                  </span>
                  {activity.user && (
                    <>
                      <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        by <span className="font-medium">{activity.user}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              {activity.status && (
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(activity.statusType)}`}>
                    {activity.status}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
