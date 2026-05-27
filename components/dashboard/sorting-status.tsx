"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Activity, ArrowDownToLine, Loader2 } from "lucide-react";
import type { TelemetryData } from "@/lib/types";

interface SortingStatusProps {
  status: TelemetryData["sortingStatus"];
  detectionDist: number;
  servoAngle: number;
}

export function SortingStatus({
  status,
  detectionDist,
  servoAngle,
}: SortingStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "detecting":
        return {
          label: "Detecting Object",
          color: "text-chart-3",
          bgColor: "bg-chart-3/20",
          icon: Loader2,
          animate: true,
        };
      case "sorted_dry":
        return {
          label: "Sorted: DRY Waste",
          color: "text-chart-3",
          bgColor: "bg-chart-3/20",
          icon: ArrowDownToLine,
          animate: false,
        };
      case "sorted_wet":
        return {
          label: "Sorted: WET Waste",
          color: "text-chart-2",
          bgColor: "bg-chart-2/20",
          icon: ArrowDownToLine,
          animate: false,
        };
      default:
        return {
          label: "Idle - Awaiting Waste",
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          icon: Activity,
          animate: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Sorting Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className={cn("rounded-lg p-4", config.bgColor)}>
          <div className="flex items-center gap-3">
            <Icon
              className={cn(
                "h-6 w-6",
                config.color,
                config.animate && "animate-spin"
              )}
            />
            <span className={cn("font-semibold text-lg", config.color)}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Detection Distance</p>
            <p className="text-xl font-bold text-foreground">
              {detectionDist < 999 ? `${detectionDist} cm` : "--"}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Servo Angle</p>
            <p className="text-xl font-bold text-foreground">{servoAngle}°</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
