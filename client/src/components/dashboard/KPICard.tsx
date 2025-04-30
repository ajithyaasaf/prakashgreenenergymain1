import { KPIData } from "@/types";

interface KPICardProps {
  data: KPIData;
}

export default function KPICard({ data }: KPICardProps) {
  const { label, value, change, changeType, icon, color, subtitle } = data;
  
  // Define color classes based on the color prop and change type
  const getIconBgColor = () => {
    if (color === "primary") return "bg-primary-50 dark:bg-primary-900/20 text-primary-500";
    if (color === "secondary") return "bg-secondary-50 dark:bg-secondary-900/20 text-secondary-500";
    if (color === "success") return "bg-success-50 dark:bg-success-900/20 text-success-500";
    if (color === "danger") return "bg-danger-50 dark:bg-danger-900/20 text-danger-500";
    if (color === "warning") return "bg-warning-50 dark:bg-warning-900/20 text-warning-500";
    return "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400";
  };
  
  const getChangeColor = () => {
    if (changeType === "positive") return "text-success-500";
    if (changeType === "negative") return "text-danger-500";
    return "text-slate-500";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</h3>
        <span className={`p-1.5 rounded-lg ${getIconBgColor()}`}>
          <i className={`ri-${icon}`}></i>
        </span>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-slate-800 dark:text-white">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${getChangeColor()}`}>{change}</span>
        )}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}
