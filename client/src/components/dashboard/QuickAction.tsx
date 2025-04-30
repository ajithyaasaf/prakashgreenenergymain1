interface QuickActionProps {
  icon: string;
  label: string;
  color: "primary" | "secondary" | "success" | "danger" | "warning" | "default";
  onClick: () => void;
}

export default function QuickAction({ icon, label, color, onClick }: QuickActionProps) {
  // Define color classes based on the color prop - using only primary (#a7ce3b) and secondary (#157fbe) colors
  const getIconBgColor = () => {
    if (color === "primary") return "bg-primary/10 dark:bg-primary/20 text-primary";
    if (color === "secondary") return "bg-secondary/10 dark:bg-secondary/20 text-secondary";
    if (color === "success") return "bg-primary/10 dark:bg-primary/20 text-primary";
    if (color === "danger") return "bg-secondary/10 dark:bg-secondary/20 text-secondary";
    if (color === "warning") return "bg-primary/10 dark:bg-secondary/20 text-primary";
    return "bg-primary/5 dark:bg-secondary/10 text-primary dark:text-secondary";
  };

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-black/20 shadow-sm hover:shadow-primary/10 dark:hover:shadow-secondary/10 rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center"
    >
      <div className={`h-12 w-12 rounded-full ${getIconBgColor()} flex items-center justify-center mb-3`}>
        <i className={`ri-${icon} text-xl`}></i>
      </div>
      <span className="text-sm font-medium text-secondary dark:text-primary">{label}</span>
    </button>
  );
}
