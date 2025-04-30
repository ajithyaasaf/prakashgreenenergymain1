import { RecentActivity } from "@/types";
import { formatRelativeTime } from "@/utils/formatting";

interface RecentActivitiesProps {
  activities: RecentActivity[];
  loading?: boolean;
}

export default function RecentActivities({ activities, loading = false }: RecentActivitiesProps) {
  // Helper function to get status badge color - using only brand colors
  const getStatusBadgeClass = (statusType?: string) => {
    if (statusType === "success") return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";
    if (statusType === "warning") return "bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary";
    if (statusType === "danger") return "bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary";
    if (statusType === "primary") return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";
    if (statusType === "secondary") return "bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary";
    return "bg-primary/5 text-primary dark:bg-secondary/10 dark:text-secondary";
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-black/20 rounded-xl shadow-sm">
        <div className="p-6 border-b border-primary/10 dark:border-secondary/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-secondary dark:text-primary">Recent Activities</h3>
            <div className="flex space-x-2">
              <div className="h-4 w-16 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-start space-x-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-secondary/20 animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-primary/10 dark:bg-secondary/20 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-primary/10 dark:bg-secondary/20 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="w-16 h-5 bg-primary/10 dark:bg-secondary/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-black/20 rounded-xl shadow-sm">
        <div className="p-6 border-b border-primary/10 dark:border-secondary/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-secondary dark:text-primary">Recent Activities</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="py-6">
            <i className="ri-calendar-event-line text-4xl text-primary/30 dark:text-secondary/30 mb-2"></i>
            <p className="text-secondary/70 dark:text-primary/70">No recent activities found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black/20 rounded-xl shadow-sm">
      <div className="p-6 border-b border-primary/10 dark:border-secondary/20">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-secondary dark:text-primary">Recent Activities</h3>
          <div className="flex space-x-2">
            <button className="text-sm text-primary hover:text-primary/80 dark:hover:text-primary/90">
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
                <p className="text-sm text-secondary dark:text-primary font-medium">
                  {activity.title}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-secondary/70 dark:text-primary/70">
                    <i className="ri-time-line mr-1"></i> {formatRelativeTime(activity.time)}
                  </span>
                  {activity.user && (
                    <>
                      <span className="mx-2 text-primary/20 dark:text-secondary/20">•</span>
                      <span className="text-xs text-secondary/70 dark:text-primary/70">
                        by <span className="font-medium text-secondary dark:text-primary">{activity.user}</span>
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
