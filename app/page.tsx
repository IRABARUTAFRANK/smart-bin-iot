"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import type { TelemetryData, CommandResponse } from "@/lib/types";
import { FillGauge } from "@/components/dashboard/fill-gauge";
import { EnvironmentCard } from "@/components/dashboard/environment-card";
import { SortingStatus } from "@/components/dashboard/sorting-status";
import { ServoControl } from "@/components/dashboard/servo-control";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { GpsMap } from "@/components/dashboard/gps-map";
import { ConnectionStatus } from "@/components/dashboard/connection-status";
import { VoiceSettings } from "@/components/dashboard/voice-settings";
import { TelemetryChart } from "@/components/dashboard/telemetry-chart";
import { voiceSystem } from "@/lib/voice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Cpu,
  Zap,
} from "lucide-react";

// Default ESP8266 IP - user can change this
const DEFAULT_ESP_IP = "192.168.1.100";
const REFRESH_INTERVAL = 2000; // 2 seconds
const MAX_HISTORY_POINTS = 30; // 1 minute of data at 2s intervals

interface HistoryEntry {
  time: string;
  dry: number;
  wet: number;
  temp: number;
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<TelemetryData> => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch telemetry");
  }
  return response.json();
};

export default function Dashboard() {
  const [espIp, setEspIp] = useState(DEFAULT_ESP_IP);
  const [inputIp, setInputIp] = useState(DEFAULT_ESP_IP);
  const [showSettings, setShowSettings] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Track wet fill based on sorting events
  const [trackedWetFill, setTrackedWetFill] = useState(0);
  const [lastSortingStatus, setLastSortingStatus] = useState<string>("idle");

  // Voice notification state tracking
  const wasConnected = useRef(false);
  const lastVoiceAlerts = useRef({
    binWarning: false,
    binCritical: false,
    tempWarning: false,
    tempCritical: false,
  });

  // SWR for auto-refreshing telemetry data
  const { data, error, isLoading, mutate } = useSWR<TelemetryData>(
    `http://${espIp}/api/telemetry`,
    fetcher,
    {
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: true,
      onSuccess: () => {
        setLastUpdated(new Date());
      },
    }
  );

  const isConnected = !error && !isLoading && !!data;

  // Handle connection status voice notifications
  useEffect(() => {
    if (isConnected && !wasConnected.current) {
      voiceSystem.speak("connected");
      wasConnected.current = true;
    } else if (!isConnected && wasConnected.current) {
      voiceSystem.speak("disconnected");
      wasConnected.current = false;
    }
  }, [isConnected]);

  // Track wet fill when waste is sorted to wet bin + voice notifications
  useEffect(() => {
    if (data) {
      // Handle sorting status voice
      if (data.sortingStatus === "detecting" && lastSortingStatus !== "detecting") {
        voiceSystem.speak("waste_detected");
      } else if (data.sortingStatus === "sorted_wet" && lastSortingStatus !== "sorted_wet") {
        setTrackedWetFill((prev) => Math.min(prev + 1, 100));
        voiceSystem.speak("sorted_wet");
      } else if (data.sortingStatus === "sorted_dry" && lastSortingStatus !== "sorted_dry") {
        voiceSystem.speak("sorted_dry");
      }
      setLastSortingStatus(data.sortingStatus);

      // Use the actual wet fill from ultrasonic if available, otherwise use tracked
      if (data.wetFillPercent > 0) {
        setTrackedWetFill(data.wetFillPercent);
      }

      // Update history for chart
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setHistory((prev) => {
        const newHistory = [
          ...prev,
          {
            time: timeStr,
            dry: data.dryFillPercent,
            wet: trackedWetFill || data.wetFillPercent,
            temp: data.temperatureC,
          },
        ];
        // Keep only the last N points
        return newHistory.slice(-MAX_HISTORY_POINTS);
      });

      // Handle alert voice notifications
      const wetFill = trackedWetFill || data.wetFillPercent;
      const dryFill = data.dryFillPercent;
      const temp = data.temperatureC;

      // Bin fill alerts
      if ((wetFill >= 85 || dryFill >= 85) && !lastVoiceAlerts.current.binCritical) {
        voiceSystem.speak(
          "bin_critical",
          `Alert. ${wetFill >= 85 ? "Wet" : "Dry"} bin is at ${Math.round(
            wetFill >= 85 ? wetFill : dryFill
          )} percent capacity. Immediate attention required.`
        );
        lastVoiceAlerts.current.binCritical = true;
        lastVoiceAlerts.current.binWarning = true;
      } else if (
        (wetFill >= 70 || dryFill >= 70) &&
        !lastVoiceAlerts.current.binWarning
      ) {
        voiceSystem.speak(
          "bin_warning",
          `Warning. ${wetFill >= 70 ? "Wet" : "Dry"} bin is at ${Math.round(
            wetFill >= 70 ? wetFill : dryFill
          )} percent. Consider emptying soon.`
        );
        lastVoiceAlerts.current.binWarning = true;
      }

      // Reset alerts when levels drop
      if (wetFill < 70 && dryFill < 70) {
        lastVoiceAlerts.current.binWarning = false;
        lastVoiceAlerts.current.binCritical = false;
      }

      // Temperature alerts
      if (temp >= 50 && !lastVoiceAlerts.current.tempCritical) {
        voiceSystem.speak(
          "temp_critical",
          `Temperature alert. Critical temperature of ${Math.round(
            temp
          )} degrees celsius detected.`
        );
        lastVoiceAlerts.current.tempCritical = true;
        lastVoiceAlerts.current.tempWarning = true;
      } else if (temp >= 40 && !lastVoiceAlerts.current.tempWarning) {
        voiceSystem.speak(
          "temp_warning",
          `Temperature warning. Ambient temperature is ${Math.round(temp)} degrees celsius.`
        );
        lastVoiceAlerts.current.tempWarning = true;
      }

      // Reset temp alerts
      if (temp < 40) {
        lastVoiceAlerts.current.tempWarning = false;
        lastVoiceAlerts.current.tempCritical = false;
      }
    }
  }, [data, lastSortingStatus, trackedWetFill]);

  // Send servo command
  const sendServoCommand = useCallback(
    async (angle: number): Promise<void> => {
      try {
        const response = await fetch(`http://${espIp}/api/command`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ servoAngle: angle }),
        });

        if (!response.ok) {
          throw new Error("Failed to send command");
        }

        const result: CommandResponse = await response.json();
        console.log("[v0] Servo command response:", result);

        // Voice feedback for servo command
        voiceSystem.speak(
          "servo_command",
          `Servo moved to ${angle} degrees.`
        );

        // Refresh telemetry after command
        mutate();
      } catch (err) {
        console.error("[v0] Servo command error:", err);
        throw err;
      }
    },
    [espIp, mutate]
  );

  const handleIpChange = () => {
    setEspIp(inputIp);
    setShowSettings(false);
    wasConnected.current = false; // Reset so we announce connection
    mutate();
  };

  // Default values when not connected
  const telemetry: TelemetryData = data || {
    wetFillPercent: trackedWetFill,
    dryFillPercent: 0,
    temperatureC: 0,
    humidity: 0,
    moisture: 0,
    metalDetected: false,
    buzzerActive: false,
    sortingStatus: "idle",
    detectionDist: 999,
    servoAngle: 90,
    gps: {
      lat: -1.9403,
      lng: 29.8739,
      altitude: 1500,
    },
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-info/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 backdrop-blur-sm">
                  <Trash2 className="h-7 w-7 text-primary" />
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${
                    isConnected ? "bg-primary animate-pulse" : "bg-destructive"
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                    SmartBin IoT
                  </h1>
                  <Badge
                    variant={isConnected ? "default" : "destructive"}
                    className="hidden sm:flex"
                  >
                    {isConnected ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1" />
                        Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 mr-1" />
                        Offline
                      </>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Real-time Waste Management Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutate()}
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className={`border-border/50 backdrop-blur-sm ${
                  showSettings
                    ? "bg-primary/20 text-primary"
                    : "bg-card/50 hover:bg-card"
                }`}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Settings Panel */}
          {showSettings && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  ESP8266 Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="ESP8266 IP Address (e.g., 192.168.1.100)"
                  value={inputIp}
                  onChange={(e) => setInputIp(e.target.value)}
                  className="flex-1 bg-background/50 border-border/50"
                />
                <Button
                  onClick={handleIpChange}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Bin Fill Levels */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-primary" />
                  Bin Fill Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <FillGauge
                    value={telemetry.dryFillPercent}
                    label="Dry Bin"
                    type="dry"
                  />
                  <FillGauge
                    value={trackedWetFill || telemetry.wetFillPercent}
                    label="Wet Bin"
                    type="wet"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Environment Card */}
            <EnvironmentCard
              temperature={telemetry.temperatureC}
              humidity={telemetry.humidity}
              moisture={telemetry.moisture}
            />

            {/* Sorting Status */}
            <SortingStatus
              status={telemetry.sortingStatus}
              detectionDist={telemetry.detectionDist}
              servoAngle={telemetry.servoAngle}
            />

            {/* Telemetry Chart */}
            <TelemetryChart history={history} />

            {/* Alerts Panel */}
            <AlertsPanel
              temperature={telemetry.temperatureC}
              wetFillPercent={trackedWetFill || telemetry.wetFillPercent}
              dryFillPercent={telemetry.dryFillPercent}
              buzzerActive={telemetry.buzzerActive}
            />

            {/* Servo Control */}
            <ServoControl
              currentAngle={telemetry.servoAngle}
              onAngleChange={sendServoCommand}
              disabled={!isConnected}
            />

            {/* Voice Settings */}
            <VoiceSettings />

            {/* Connection Status */}
            <ConnectionStatus
              isConnected={isConnected}
              lastUpdated={lastUpdated}
              refreshInterval={REFRESH_INTERVAL}
            />
          </div>

          {/* GPS Map - Full Width */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <GpsMap
              lat={telemetry.gps.lat}
              lng={telemetry.gps.lng}
              altitude={telemetry.gps.altitude}
            />

            {/* System Info */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Firmware", value: "SmartBin IoT v1.0" },
                    { label: "MCU", value: "ESP8266 NodeMCU" },
                    { label: "Dry Threshold", value: "630 (analog)" },
                    { label: "Detection Range", value: "< 16 cm" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-3 bg-background/50 rounded-lg border border-border/30"
                    >
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-3">
                    Sensor Status
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { name: "DHT22", status: true },
                      { name: "Ultrasonic (Dry)", status: true },
                      { name: "Ultrasonic (Detect)", status: true },
                      { name: "Moisture v1.2", status: true },
                      { name: "GPS Neo 6M", status: telemetry.gps.lat !== 0 },
                      { name: "Servo SG90", status: true },
                      { name: "LCD I2C 16x2", status: true },
                    ].map((sensor) => (
                      <div
                        key={sensor.name}
                        className="flex items-center gap-2 text-xs p-2 bg-background/30 rounded-md"
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${
                            sensor.status
                              ? "bg-primary shadow-sm shadow-primary/50"
                              : "bg-destructive shadow-sm shadow-destructive/50"
                          }`}
                        />
                        <span className="text-muted-foreground truncate">
                          {sensor.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">
                    Bin Configuration
                  </p>
                  <div className="text-xs text-muted-foreground/80 space-y-1.5 p-3 bg-background/30 rounded-lg">
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Dry Bin: Ultrasonic sensor measurement
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Wet Bin: Counter-based (increments on wet sort)
                    </p>
                    <p className="text-muted-foreground/60 mt-2">
                      Empty: 35cm | Full: 5cm
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <footer className="text-center text-xs text-muted-foreground/60 pt-6 pb-4 border-t border-border/30">
            <p className="font-medium text-muted-foreground">
              SmartBin IoT Dashboard
            </p>
            <p className="mt-1">
              ESP8266 NodeMCU • Real-time Waste Management • Auto-refresh every{" "}
              {REFRESH_INTERVAL / 1000}s
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
