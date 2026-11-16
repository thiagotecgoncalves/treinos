interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  accentClass?: string;
  trackClass?: string;
  labelClass?: string;
}

export function ProgressRing({
  percentage,
  size = 64,
  strokeWidth = 6,
  accentClass = 'text-[#EA580C]',
  trackClass = 'text-stone-200 dark:text-zinc-800',
  labelClass = 'text-stone-900 dark:text-zinc-100',
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label={`${Math.round(clamped)}% concluído`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${accentClass} transition-[stroke-dashoffset] duration-300 ease-out`}
        />
      </svg>
      <span className={`absolute text-sm font-semibold font-mono-tabular ${labelClass}`}>
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
