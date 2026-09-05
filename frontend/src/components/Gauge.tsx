/**
 * Circular Gauge Component
 */
import React from 'react';

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
  valueClassName?: string;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  max,
  label,
  unit = '',
  color = '#00D656',
  size = 120,
  valueClassName = 'text-3xl',
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const radius = (size / 2) - 10;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = (circumference * 0.75); // 270 degrees
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  return (
    <div className="relative flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A3A"
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.3s ease',
          }}
        />
      </svg>
      <div
        className="absolute left-0 top-0 flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className={`${valueClassName} font-bold text-white`}>{Math.round(value)}</div>
        {unit && <div className="text-xs text-gray-400 mt-0 leading-none">{unit}</div>}
      </div>
      <div className="text-sm text-gray-400 mt-2">{label}</div>
    </div>
  );
};
