"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom marker icon
const customIcon = new L.DivIcon({
  className: "custom-marker",
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #2dd4bf;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 20px rgba(45, 212, 191, 0.6);
      position: relative;
    ">
      <div style="
        position: absolute;
        width: 8px;
        height: 8px;
        background: #fff;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "></div>
    </div>
    <div style="
      position: absolute;
      width: 40px;
      height: 40px;
      border: 2px solid rgba(45, 212, 191, 0.5);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Component to handle map updates
function MapUpdater({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  const prevZoomRef = useRef(zoom);

  useEffect(() => {
    if (prevZoomRef.current !== zoom) {
      map.setZoom(zoom, { animate: true });
      prevZoomRef.current = zoom;
    }
  }, [map, zoom]);

  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [map, lat, lng]);

  return null;
}

interface LeafletMapProps {
  lat: number;
  lng: number;
  zoom: number;
  locationName: string;
}

export function LeafletMap({ lat, lng, zoom, locationName }: LeafletMapProps) {
  return (
    <>
      <style jsx global>{`
        @keyframes ping {
          75%, 100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
        .leaflet-container {
          background: #0f172a;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(45, 212, 191, 0.3);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        .leaflet-popup-content {
          color: #f8fafc;
          margin: 12px 16px;
          font-size: 13px;
          line-height: 1.5;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(45, 212, 191, 0.3);
        }
        .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .leaflet-popup-close-button:hover {
          color: #2dd4bf !important;
        }
        .leaflet-control-zoom {
          display: none;
        }
        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.8) !important;
          color: #64748b !important;
          font-size: 10px !important;
          padding: 2px 6px !important;
        }
        .leaflet-control-attribution a {
          color: #2dd4bf !important;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: "350px", width: "100%" }}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[lat, lng]} icon={customIcon}>
          <Popup>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#2dd4bf] rounded-full animate-pulse" />
                <span className="font-semibold text-[#2dd4bf]">SmartBin Location</span>
              </div>
              <div className="text-[#e2e8f0] text-sm leading-relaxed">
                {locationName}
              </div>
              <div className="flex gap-4 text-xs text-[#94a3b8] pt-1 border-t border-[#334155]">
                <span>Lat: {lat.toFixed(6)}</span>
                <span>Lng: {lng.toFixed(6)}</span>
              </div>
            </div>
          </Popup>
        </Marker>
        <MapUpdater lat={lat} lng={lng} zoom={zoom} />
      </MapContainer>
    </>
  );
}
