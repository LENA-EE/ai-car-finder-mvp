const statusConfig = {
  ok: {
    bg: "bg-green-500/20",
    border: "border-green-500",
    text: "text-green-400",
    label: "OK",
  },
  warning: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500",
    text: "text-yellow-400",
    label: "Внимание",
  },
  danger: {
    bg: "bg-red-500/20",
    border: "border-red-500",
    text: "text-red-400",
    label: "Проблемы",
  },
};

export function StatusBadge({ status, size = "md" }) {
  const config = statusConfig[status] || statusConfig.ok;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${config.bg} ${config.border} ${config.text}
        ${sizeClasses[size]}
      `}
    >
      {config.label}
    </span>
  );
}
