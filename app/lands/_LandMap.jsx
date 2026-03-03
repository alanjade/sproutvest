"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
  LayersControl,
  AttributionControl,
} from "react-leaflet";
import dynamic from "next/dynamic";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ===================== SAFE DYNAMIC CLUSTER ===================== */
const MarkerClusterGroup = dynamic(
  () => import("react-leaflet-cluster").then((m) => m.default || m),
  { ssr: false }
);

/* ===================== SAFE HEAT LOADER ===================== */
function useLeafletHeat() {
  useEffect(() => {
    import("leaflet.heat");
  }, []);
}

/* ===================== HELPERS ===================== */

const koboToNaira = (kobo) => Number(kobo) / 100;

function getLandPrice(land) {
  return (
    land.latest_price?.price_per_unit_kobo ??
    land.latestPrice?.price_per_unit_kobo ??
    land.price_per_unit_kobo ??
    0
  );
}

function getPriceColor(price) {
  if (price < 2000) return "#22c55e";
  if (price < 5000) return "#f59e0b";
  return "#ef4444";
}

function createMarkerIcon({ priceKobo }) {
  const price = koboToNaira(priceKobo);

  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    html: `
      <div style="
        width:18px;
        height:18px;
        border-radius:50%;
        background:${getPriceColor(price)};
        border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
      "></div>
    `,
  });
}

/* ===================== HEATMAP ===================== */

function HeatmapLayer({ lands }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!lands?.length || typeof L.heatLayer !== "function") return;

    const points = lands
      .filter((l) => l.lat && l.lng)
      .map((l) => [+l.lat, +l.lng, 0.6]);

    if (!points.length) return;

    const heat = L.heatLayer(points, {
      radius: 45,
      blur: 25,
      maxZoom: 17,
    });

    heat.addTo(map);
    layerRef.current = heat;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [lands, map]);

  return null;
}

/* ===================== MAIN MAP ===================== */

export default function LandMap({
  defaultCenter,
  landsWithPoints,
  landsWithPolygons,
  allLandsWithCoords,
  showHeatmap,
}) {
  useLeafletHeat();

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      className="h-full w-full"
      attributionControl={false}
    >
      <AttributionControl prefix={false} />

      <LayersControl position="topleft">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="© Esri"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* MARKERS */}
      {!showHeatmap && (
        <MarkerClusterGroup>
          {landsWithPoints.map((land) => (
            <Marker
              key={land.id}
              position={[+land.lat, +land.lng]}
              icon={createMarkerIcon({
                priceKobo: getLandPrice(land),
              })}
            >
              <Popup>
                <div>
                  <strong>{land.title}</strong>
                  <p>{land.location}</p>
                  <p>
                    ₦
                    {koboToNaira(
                      getLandPrice(land)
                    ).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}

      {/* POLYGONS */}
      {!showHeatmap &&
        landsWithPolygons.map((land) => (
          <Polygon
            key={land.id}
            positions={land.polygon.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: "#f59e0b",
              fillOpacity: 0.3,
            }}
          >
            <Popup>
              <div>
                <strong>{land.title}</strong>
              </div>
            </Popup>
          </Polygon>
        ))}

      {/* HEATMAP */}
      {showHeatmap && (
        <HeatmapLayer lands={allLandsWithCoords} />
      )}
    </MapContainer>
  );
}