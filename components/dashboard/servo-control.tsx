"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Gauge, RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";

interface ServoControlProps {
  currentAngle: number;
  onAngleChange: (angle: number) => Promise<void>;
  disabled?: boolean;
}

export function ServoControl({
  currentAngle,
  onAngleChange,
  disabled = false,
}: ServoControlProps) {
  const [targetAngle, setTargetAngle] = useState(currentAngle);
  const [isLoading, setIsLoading] = useState(false);

  const handleAngleChange = async (angle: number) => {
    setIsLoading(true);
    try {
      await onAngleChange(angle);
      setTargetAngle(angle);
    } catch (error) {
      console.error("[v0] Servo command failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const presets = [
    { label: "WET", angle: 180, icon: ArrowLeft, color: "bg-chart-2 hover:bg-chart-2/80" },
    { label: "CENTER", angle: 90, icon: RotateCcw, color: "bg-muted hover:bg-muted/80" },
    { label: "DRY", angle: 0, icon: ArrowRight, color: "bg-chart-3 hover:bg-chart-3/80" },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Manual Servo Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current angle display */}
        <div className="text-center">
          <span className="text-4xl font-bold text-foreground">
            {currentAngle}°
          </span>
          <p className="text-xs text-muted-foreground mt-1">Current Angle</p>
        </div>

        {/* Preset buttons */}
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              disabled={disabled || isLoading}
              className={cn(
                "flex flex-col gap-1 h-auto py-3",
                currentAngle === preset.angle && preset.color,
                currentAngle === preset.angle && "text-foreground border-transparent"
              )}
              onClick={() => handleAngleChange(preset.angle)}
            >
              <preset.icon className="h-4 w-4" />
              <span className="text-xs">{preset.label}</span>
              <span className="text-xs opacity-70">{preset.angle}°</span>
            </Button>
          ))}
        </div>

        {/* Slider control */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0° (DRY)</span>
            <span>180° (WET)</span>
          </div>
          <Slider
            value={[targetAngle]}
            min={0}
            max={180}
            step={1}
            disabled={disabled || isLoading}
            onValueChange={([value]) => setTargetAngle(value)}
            onValueCommit={([value]) => handleAngleChange(value)}
            className="w-full"
          />
        </div>

        {/* Apply button */}
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={disabled || isLoading || targetAngle === currentAngle}
          onClick={() => handleAngleChange(targetAngle)}
        >
          {isLoading ? "Sending..." : `Move to ${targetAngle}°`}
        </Button>
      </CardContent>
    </Card>
  );
}
