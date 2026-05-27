export interface TelemetryData {
  wetFillPercent: number;
  dryFillPercent: number;
  temperatureC: number;
  humidity: number;
  moisture: number;
  metalDetected: boolean;
  buzzerActive: boolean;
  sortingStatus: "idle" | "detecting" | "sorted_dry" | "sorted_wet";
  detectionDist: number;
  servoAngle: number;
  gps: {
    lat: number;
    lng: number;
    altitude: number;
  };
}

export interface CommandPayload {
  servoAngle: number;
}

export interface CommandResponse {
  ok: boolean;
  servoAngle: number;
}
