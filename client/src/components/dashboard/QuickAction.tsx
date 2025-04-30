interface QuickActionProps {
  icon: string;
  label: string;
  color: "primary" | "secondary" | "success" | "danger" | "warning" | "default";
  onClick: () => void;
}

export default function QuickAction({ icon, label, color, onClick }: QuickActionProps) {
  // Define color classes based on the color prop
  const getIconBgColor = () => {
    if (color === "primary") return "bg-primary-50 dark:bg-primary-900/30 text-primary-500";
    if (color === "secondary") return "bg-secondary-50 dark:bg-secondary-900/30 text-secondary-500";
    if (color === "success") return "bg-success-50 dark:bg-success-900/30 text-success-500";
    if (color === "danger") return "bg-danger-50 dark:bg-danger-900/30 text-danger-500";
    if (color === "warning") return "bg-warning-50 dark:bg-warning-900/30 text-warning-500";
    return "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300";
  };

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-800 shadow-sm hover:shadow rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center"
    >
      <div className={`h-12 w-12 rounded-full ${getIconBgColor()} flex items-center justify-center mb-3`}>
        <i className={`ri-${icon} text-xl`}></i>
      </div>
      <span className="text-sm font-medium text-slate-800 dark:text-white">{label}</span>
    </button>
  );
}
