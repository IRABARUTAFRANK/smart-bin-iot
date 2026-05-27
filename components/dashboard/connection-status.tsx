"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdated: Date | null;
  refreshInterval: number;
}

export function ConnectionStatus({
  isConnected,
  lastUpdated,
  refreshInterval,
}: ConnectionStatusProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return "--:--:--";
    return date.toLocaleTimeString();
  };

  return (
    <Card className={cn(
      "bg-card border-border",
      !isConnected && "border-destructive"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Connected</p>
                  <p className="text-xs text-muted-foreground">ESP8266 Online</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <WifiOff className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium text-destructive">Disconnected</p>
                  <p className="text-xs text-muted-foreground">Check ESP8266</p>
                </div>
              </>
            )}
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Last Update</span>
            </div>
            <p className="text-sm font-mono text-foreground">
              {formatTime(lastUpdated)}
            </p>
            <p className="text-xs text-muted-foreground">
              Refresh: {refreshInterval / 1000}s
            </p>
          </div>
        </div>
        
        {/* Connection indicator */}
        <div className="mt-3 flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-primary animate-pulse" : "bg-destructive"
          )} />
          <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                isConnected ? "bg-primary" : "bg-destructive"
              )}
              style={{ width: isConnected ? "100%" : "0%" }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
