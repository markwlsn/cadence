import React from 'react';

interface ProgressRingProps {
  /** 0–100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function ProgressRing({
  percent,
  size = 56,
  strokeWidth = 4,
  color = 'var(--color-text)',
  trackColor = 'var(--color-border)',
  label,
  showPercent = false,
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clampedPercent / 100);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clampedPercent}% mastery`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s var(--ease-standard)' }}
        />
      </svg>
      {showPercent && (
        <span
          className="absolute text-[var(--color-text)] font-semibold"
          style={{ fontSize: size * 0.22 }}
          aria-hidden="true"
        >
          {Math.round(clampedPercent)}
        </span>
      )}
    </div>
  );
}
