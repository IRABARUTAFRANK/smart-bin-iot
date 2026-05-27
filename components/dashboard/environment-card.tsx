"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Thermometer, Droplets } from "lucide-react";

interface EnvironmentCardProps {
  temperature: number;
  humidity: number;
  moisture: number;
}

export function EnvironmentCard({
  temperature,
  humidity,
  moisture,
}: EnvironmentCardProps) {
  const getTempStatus = () => {
    if (temperature >= 50) return { text: "CRITICAL", color: "text-destructive" };
    if (temperature >= 40) return { text: "HIGH", color: "text-warning" };
    if (temperature >= 30) return { text: "WARM", color: "text-chart-3" };
    return { text: "NORMAL", color: "text-primary" };
  };

  const tempStatus = getTempStatus();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Thermometer className="h-4 w-4" />
          Environment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperature */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground">
              {temperature.toFixed(1)}°C
            </p>
            <p className={cn("text-xs font-medium", tempStatus.color)}>
              {tempStatus.text}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-chart-4/20 flex items-center justify-center">
            <Thermometer className={cn("h-6 w-6", tempStatus.color)} />
          </div>
        </div>

        {/* Humidity */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-chart-2" />
              <span className="text-sm text-muted-foreground">Humidity</span>
            </div>
            <p className="text-xl font-semibold text-foreground">
              {humidity.toFixed(0)}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-chart-1" />
                <span className="text-sm text-muted-foreground">Moisture</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {moisture.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
