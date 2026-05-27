"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  Mountain,
  Globe2,
  Map,
  ZoomIn,
  ZoomOut,
  Locate,
  Layers,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic imports to prevent SSR issues
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

// Leaflet Map component
const LeafletMap = dynamic(
  () => import("./leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    ),
  }
);

interface GpsMapProps {
  lat: number;
  lng: number;
  altitude: number;
}

export function GpsMap({ lat, lng, altitude }: GpsMapProps) {
  const globeRef = useRef<unknown>(null);
  const [locationName, setLocationName] = useState<string>("Loading...");
  const [isClient, setIsClient] = useState(false);
  const [viewMode, setViewMode] = useState<"globe" | "map">("map");
  const [globeZoom, setGlobeZoom] = useState(1.5);
  const [mapZoom, setMapZoom] = useState(14);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch location name from coordinates
  useEffect(() => {
    const fetchLocationName = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`
        );
        const data = await response.json();
        if (data.display_name) {
          const parts = data.display_name.split(", ");
          setLocationName(parts.slice(0, 3).join(", "));
        } else {
          setLocationName("Unknown Location");
        }
      } catch {
        setLocationName("Location unavailable");
      }
    };

    fetchLocationName();
  }, [lat, lng]);

  // Point of view animation for globe
  useEffect(() => {
    if (globeRef.current && isClient && viewMode === "globe") {
      const globe = globeRef.current as {
        pointOfView: (
          coords: { lat: number; lng: number; altitude: number },
          ms: number
        ) => void;
      };
      globe.pointOfView({ lat, lng, altitude: globeZoom }, 1000);
    }
  }, [lat, lng, isClient, globeZoom, viewMode]);

  // Globe zoom handlers
  const handleGlobeZoomIn = useCallback(() => {
    setGlobeZoom((prev) => Math.max(0.3, prev - 0.3));
  }, []);

  const handleGlobeZoomOut = useCallback(() => {
    setGlobeZoom((prev) => Math.min(3, prev + 0.3));
  }, []);

  const handleGlobeReset = useCallback(() => {
    setGlobeZoom(1.5);
    if (globeRef.current) {
      const globe = globeRef.current as {
        pointOfView: (
          coords: { lat: number; lng: number; altitude: number },
          ms: number
        ) => void;
      };
      globe.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
    }
  }, [lat, lng]);

  // Map zoom handlers
  const handleMapZoomIn = useCallback(() => {
    setMapZoom((prev) => Math.min(18, prev + 1));
  }, []);

  const handleMapZoomOut = useCallback(() => {
    setMapZoom((prev) => Math.max(3, prev - 1));
  }, []);

  const handleMapReset = useCallback(() => {
    setMapZoom(14);
  }, []);

  // Using hex colors for THREE.js compatibility
  const primaryColor = "#2dd4bf";
  const infoColor = "#38bdf8";

  const markerData = [
    {
      lat,
      lng,
      size: 20,
      color: primaryColor,
    },
  ];

  const ringData = [
    {
      lat,
      lng,
      maxR: 3,
      propagationSpeed: 2,
      repeatPeriod: 1000,
    },
  ];

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            GPS Location
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("map")}
            >
              <Map className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Detail</span>
            </Button>
            <Button
              variant={viewMode === "globe" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("globe")}
            >
              <Globe2 className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Globe</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map/Globe visualization */}
        <div className="relative rounded-lg overflow-hidden bg-background/50 border border-border">
          {isClient && viewMode === "globe" && (
            <Globe
              ref={globeRef}
              width={350}
              height={350}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              pointsData={markerData}
              pointAltitude={0.01}
              pointColor="color"
              pointRadius="size"
              pointsMerge={true}
              ringsData={ringData}
              ringColor={() => primaryColor}
              ringMaxRadius="maxR"
              ringPropagationSpeed="propagationSpeed"
              ringRepeatPeriod="repeatPeriod"
              atmosphereColor={infoColor}
              atmosphereAltitude={0.15}
            />
          )}

          {isClient && viewMode === "map" && (
            <LeafletMap
              lat={lat}
              lng={lng}
              zoom={mapZoom}
              locationName={locationName}
            />
          )}

          {/* Zoom controls overlay */}
          <div className="absolute right-3 top-3 flex flex-col gap-1 z-[1000]">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
              onClick={viewMode === "globe" ? handleGlobeZoomIn : handleMapZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
              onClick={viewMode === "globe" ? handleGlobeZoomOut : handleMapZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
              onClick={viewMode === "globe" ? handleGlobeReset : handleMapReset}
              title="Reset View"
            >
              <Locate className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom level indicator */}
          <div className="absolute left-3 bottom-3 z-[1000]">
            <div className="px-2 py-1 bg-background/90 backdrop-blur-sm rounded-md border border-border text-xs font-mono text-foreground flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-muted-foreground" />
              Zoom: {viewMode === "globe" ? (3 - globeZoom + 0.5).toFixed(1) : mapZoom}x
            </div>
          </div>
        </div>

        {/* Location info */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium text-foreground leading-tight">
                {locationName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-secondary/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="text-sm font-mono font-medium text-foreground">
                {lat.toFixed(4)}°
              </p>
            </div>
            <div className="p-2 bg-secondary/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="text-sm font-mono font-medium text-foreground">
                {lng.toFixed(4)}°
              </p>
            </div>
            <div className="p-2 bg-secondary/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Mountain className="h-3 w-3" />
                Alt
              </p>
              <p className="text-sm font-mono font-medium text-foreground">
                {altitude.toFixed(0)}m
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
