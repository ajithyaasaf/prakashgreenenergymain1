import { KPIData } from "@/types";

interface KPICardProps {
  data: KPIData;
}

export default function KPICard({ data }: KPICardProps) {
  const { label, value, change, changeType, icon, color, subtitle } = data;
  
  // Define color classes based on the color prop and change type - using only brand colors
  const getIconBgColor = () => {
    if (color === "primary") return "bg-primary/10 dark:bg-primary/20 text-primary";
    if (color === "secondary") return "bg-secondary/10 dark:bg-secondary/20 text-secondary";
    if (color === "success") return "bg-primary/10 dark:bg-primary/20 text-primary";
    if (color === "danger") return "bg-secondary/10 dark:bg-secondary/20 text-secondary";
    if (color === "warning") return "bg-primary/10 dark:bg-primary/20 text-primary";
    return "bg-primary/5 dark:bg-secondary/10 text-primary dark:text-secondary";
  };
  
  const getChangeColor = () => {
    if (changeType === "positive") return "text-primary";
    if (changeType === "negative") return "text-secondary";
    return "text-primary/70 dark:text-secondary/70";
  };

  return (
    <div className="bg-white dark:bg-black/20 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-secondary/80 dark:text-primary/80">{label}</h3>
        <span className={`p-1.5 rounded-lg ${getIconBgColor()}`}>
          <i className={`ri-${icon}`}></i>
        </span>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-secondary dark:text-primary">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${getChangeColor()}`}>{change}</span>
        )}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-secondary/60 dark:text-primary/60">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}
