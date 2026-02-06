type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  color?: "default" | "green" | "red" | "blue" | "orange";
};

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  color = "default",
}: StatCardProps) {
  const valueColors = {
    default: "text-gray-900",
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    orange: "text-latin-orange",
  };

  const trendUp = trend !== undefined && trend > 0;
  const trendDown = trend !== undefined && trend < 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-600 truncate">{title}</p>
      <p className={`text-2xl font-bold ${valueColors[color]} truncate`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {trendUp && (
            <svg
              className="w-3 h-3 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          )}
          {trendDown && (
            <svg
              className="w-3 h-3 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          )}
          <span
            className={`text-xs ${
              trendUp
                ? "text-green-600"
                : trendDown
                ? "text-red-600"
                : "text-gray-500"
            }`}
          >
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%{trendLabel ? ` ${trendLabel}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
