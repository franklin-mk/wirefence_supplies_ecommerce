"use client";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export type LatLng = { lat: number; lng: number };

// Divs instead of image icons: no asset bundling issues.
const dot = (color: string, emoji = "") =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:14px">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const tileUrl = token
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution = token ? "© Mapbox © OpenStreetMap" : "© OpenStreetMap contributors";

function Follow({ point }: { point?: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 13));
  }, [point, map]);
  return null;
}

function Picker({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

type Props = {
  center?: LatLng;
  pin?: LatLng | null; // destination / chosen drop pin
  truck?: LatLng | null; // live driver position
  onPick?: (p: LatLng) => void; // makes the map click-to-drop-pin
  height?: number;
};

const KENYA_CENTER: LatLng = { lat: -0.4, lng: 37.0 };

export default function LeafletMap({ center, pin, truck, onPick, height = 320 }: Props) {
  const start = center ?? pin ?? truck ?? KENYA_CENTER;
  return (
    <MapContainer
      center={[start.lat, start.lng]}
      zoom={center || pin || truck ? 13 : 6}
      style={{ height, width: "100%", borderRadius: 12, zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer url={tileUrl} attribution={attribution} tileSize={token ? 512 : 256} zoomOffset={token ? -1 : 0} />
      {onPick && <Picker onPick={onPick} />}
      {pin && <Marker position={[pin.lat, pin.lng]} icon={dot("#dc2626", "📍")} />}
      {truck && <Marker position={[truck.lat, truck.lng]} icon={dot("#14532d", "🚚")} />}
      <Follow point={truck ?? pin} />
    </MapContainer>
  );
}
