"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Thermometer, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertsPanelProps {
  temperature: number;
  wetFillPercent: number;
  dryFillPercent: number;
  buzzerActive: boolean;
}

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  icon: React.ReactNode;
}

export function AlertsPanel({
  temperature,
  wetFillPercent,
  dryFillPercent,
  buzzerActive,
}: AlertsPanelProps) {
  const alerts: Alert[] = [];

  // Temperature alerts
  if (temperature >= 50) {
    alerts.push({
      id: "temp-critical",
      type: "critical",
      message: `Critical temperature: ${temperature.toFixed(1)}°C`,
      icon: <Thermometer className="h-4 w-4" />,
    });
  } else if (temperature >= 40) {
    alerts.push({
      id: "temp-warning",
      type: "warning",
      message: `High temperature: ${temperature.toFixed(1)}°C`,
      icon: <Thermometer className="h-4 w-4" />,
    });
  }

  // Bin fill alerts
  if (wetFillPercent >= 85) {
    alerts.push({
      id: "wet-critical",
      type: "critical",
      message: `Wet bin critical: ${wetFillPercent.toFixed(0)}% full`,
      icon: <Trash2 className="h-4 w-4" />,
    });
  } else if (wetFillPercent >= 70) {
    alerts.push({
      id: "wet-warning",
      type: "warning",
      message: `Wet bin high: ${wetFillPercent.toFixed(0)}% full`,
      icon: <Trash2 className="h-4 w-4" />,
    });
  }

  if (dryFillPercent >= 85) {
    alerts.push({
      id: "dry-critical",
      type: "critical",
      message: `Dry bin critical: ${dryFillPercent.toFixed(0)}% full`,
      icon: <Trash2 className="h-4 w-4" />,
    });
  } else if (dryFillPercent >= 70) {
    alerts.push({
      id: "dry-warning",
      type: "warning",
      message: `Dry bin high: ${dryFillPercent.toFixed(0)}% full`,
      icon: <Trash2 className="h-4 w-4" />,
    });
  }

  const getAlertStyle = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "bg-destructive/20 border-destructive text-destructive";
      case "warning":
        return "bg-warning/20 border-warning text-warning";
      default:
        return "bg-info/20 border-info text-info";
    }
  };

  return (
    <Card className={cn(
      "bg-card border-border",
      buzzerActive && "border-destructive animate-pulse"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className={cn(
            "h-4 w-4",
            alerts.length > 0 && "text-warning"
          )} />
          System Alerts
          {alerts.length > 0 && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-4">
            <div className="h-10 w-10 rounded-full bg-primary/20 mx-auto flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-primary font-medium">All Systems Normal</p>
            <p className="text-xs text-muted-foreground">No active alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                getAlertStyle(alert.type)
              )}
            >
              {alert.icon}
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
