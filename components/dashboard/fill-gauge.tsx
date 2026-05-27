"use client";

import { cn } from "@/lib/utils";

interface FillGaugeProps {
  value: number;
  maxValue?: number;
  label: string;
  type: "dry" | "wet";
  size?: "sm" | "md" | "lg";
}

export function FillGauge({
  value,
  maxValue = 100,
  label,
  type,
  size = "md",
}: FillGaugeProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const radius = size === "sm" ? 50 : size === "md" ? 70 : 90;
  const strokeWidth = size === "sm" ? 8 : size === "md" ? 10 : 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 85) return "stroke-destructive";
    if (percentage >= 70) return "stroke-warning";
    return type === "dry" ? "stroke-chart-3" : "stroke-chart-2";
  };

  const getBgColor = () => {
    return type === "dry" ? "bg-chart-3/10" : "bg-chart-2/10";
  };

  const getStatusText = () => {
    if (percentage >= 85) return "CRITICAL";
    if (percentage >= 70) return "HIGH";
    if (percentage >= 50) return "MEDIUM";
    return "LOW";
  };

  return (
    <div className={cn("flex flex-col items-center", getBgColor(), "rounded-xl p-4")}>
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            stroke="currentColor"
            className="text-muted/30"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            className={cn(getColor(), "transition-all duration-500 ease-out")}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">
            {Math.round(percentage)}%
          </span>
          <span className={cn(
            "text-xs font-medium",
            percentage >= 85 ? "text-destructive" : 
            percentage >= 70 ? "text-warning" : "text-muted-foreground"
          )}>
            {getStatusText()}
          </span>
        </div>
      </div>
      <span className="mt-3 text-sm font-medium text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {type} waste
      </span>
    </div>
  );
}
