"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import api from "../../utils/api";
import { getLandImage } from "../../utils/images";
import { koboToNaira } from "../../utils/currency";
import { useDebounce } from "../../utils/useDebounce";
import { MapPin, Maximize2, Flame, X } from "lucide-react";

const MapWithNoSSR = dynamic(() => import("./_LandMap"), { ssr: false });

/* ── Price helper — latestPrice relation or direct field ── */
function getLandPrice(land) {
  return (
    land.latest_price?.price_per_unit_kobo   
    ?? land.latestPrice?.price_per_unit_kobo 
    ?? land.price_per_unit_kobo              
    ?? 0
  );
}

function getPriceTag(priceKobo) {
  const n = koboToNaira(priceKobo);
  if (n < 2000) return { label: "Budget",    color: "#22c55e" };
  if (n < 5000) return { label: "Mid-Range", color: "#f59e0b" };
  return            { label: "Premium",    color: "#ef4444" };
}

export default function LandList() {
  const [lands, setLands]               = useState([]);
  const [visibleLands, setVisibleLands] = useState([]);
  const [activeLandId, setActiveLandId] = useState(null);
  const [hoverLandId, setHoverLandId]   = useState(null);
  const [flyTarget, setFlyTarget]       = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showHeatmap, setShowHeatmap]   = useState(false);
  const [currentZoom, setCurrentZoom]   = useState(8);
  const [mapRef, setMapRef]             = useState(null);

  const mapSectionRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/lands");
        const list = res.data?.data ?? [];
        setLands(list);
        setVisibleLands(list);
      } catch {
        setError("Failed to load lands");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const landsWithPoints   = useMemo(() => lands.filter((l) => l.lat && l.lng && !l.has_polygon), [lands]);
  const landsWithPolygons = useMemo(() => lands.filter((l) => l.has_polygon && l.polygon), [lands]);
  const allLandsWithCoords = useMemo(() => [...landsWithPoints, ...landsWithPolygons], [landsWithPoints, landsWithPolygons]);

  const filterByBounds = useCallback((bounds) => {
    setVisibleLands(
      lands.filter((l) => {
        if (l.lat && l.lng && !l.has_polygon) return bounds.contains([+l.lat, +l.lng]);
        if (l.has_polygon && l.polygon) return l.polygon.some((p) => bounds.contains([p.lat, p.lng]));
        return false;
      })
    );
  }, [lands]);
  const handleMapMoveEnd = useDebounce(filterByBounds, 300);

  useEffect(() => {
    document.body.style.overflow = isFullScreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullScreen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1F1A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm tracking-widest uppercase">Loading properties</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1F1A]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-amber-500 hover:text-amber-400 text-sm">← Go Home</Link>
        </div>
      </div>
    );
  }

  const defaultCenter = allLandsWithCoords.length
    ? [+allLandsWithCoords[0].lat, +allLandsWithCoords[0].lng]
    : [9.082, 8.6753];

  const allMapPoints = [
    ...landsWithPoints.map((l) => [+l.lat, +l.lng]),
    ...landsWithPolygons.flatMap((l) => l.polygon.map((p) => [p.lat, p.lng])),
  ];

  const mapProps = {
    defaultCenter, allMapPoints, landsWithPoints, landsWithPolygons,
    allLandsWithCoords, activeLandId, hoverLandId, flyTarget,
    showHeatmap, currentZoom,
    onZoomChange: setCurrentZoom,
    onMoveEnd: handleMapMoveEnd,
    onMapReady: setMapRef,
  };

  return (
    <div className="min-h-screen bg-[#0D1F1A]" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {isFullScreen && (
        <div className="fixed inset-0 z-99999 bg-[#0D1F1A]">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-100000 flex items-center gap-2 px-3 py-2 rounded-2xl"
            style={{ background: "rgba(8,20,15,0.92)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
              <MapPin size={12} className="text-amber-500" />
              <span className="text-white/60 text-xs font-semibold tabular-nums">{visibleLands.length} visible</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <button
              onClick={() => setShowHeatmap((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${showHeatmap ? "text-white shadow-lg shadow-red-500/30" : "text-white/70 hover:text-white hover:bg-white/10"}`}
              style={showHeatmap ? { background: "linear-gradient(135deg, #f97316, #ef4444)" } : {}}
            >
              <Flame size={13} />
              {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button onClick={() => setIsFullScreen(false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all">
              <X size={13} /> Exit Fullscreen
            </button>
          </div>
          <MapWithNoSSR {...mapProps} className="h-full w-full" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-2">Property Marketplace</p>
          <h1 className="text-5xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Available Lands</h1>
          <p className="text-white/40 mt-2 text-sm">{visibleLands.length} properties in current view</p>
        </div>

        {!isFullScreen && (
          <div ref={mapSectionRef} className="relative rounded-2xl overflow-hidden border border-white/10 mb-10 shadow-2xl shadow-black/50">
            <div className="absolute top-3 right-3 z-2000 flex gap-2">
              <button
                onClick={() => setShowHeatmap((v) => !v)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${showHeatmap ? "text-white shadow-lg shadow-red-500/30" : "bg-black/60 backdrop-blur text-white/70 hover:bg-black/80 border border-white/10"}`}
                style={showHeatmap ? { background: "linear-gradient(to right, #f97316, #ef4444)" } : {}}
              >
                <Flame size={13} />
                {showHeatmap ? "Hide" : "Heatmap"}
              </button>
              <button onClick={() => setIsFullScreen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur text-white/70 hover:bg-black/80 text-xs font-bold border border-white/10 transition-all">
                <Maximize2 size={13} /> Fullscreen
              </button>
            </div>
            <MapWithNoSSR {...mapProps} className="h-120 w-full" />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleLands.map((land) => {
            const priceKobo = getLandPrice(land);
            const priceTag  = getPriceTag(priceKobo);
            const isHovered = hoverLandId === land.id;

            return (
              <div key={land.id}
                onMouseEnter={() => setHoverLandId(land.id)}
                onMouseLeave={() => setHoverLandId(null)}
                className={`group rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isHovered
                    ? "border-amber-500/40 bg-white/8 shadow-xl shadow-amber-500/10 -translate-y-0.5"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="relative h-48 overflow-hidden">
                  <img src={getLandImage(land)} alt={land.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(13,31,26,0.8), transparent)" }} />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm"
                    style={{ background: `${priceTag.color}33`, border: `1px solid ${priceTag.color}55`, color: priceTag.color }}>
                    {priceTag.label}
                  </div>
                  {land.is_available && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 backdrop-blur-sm">
                      Available
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-white text-lg leading-snug mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{land.title}</h3>
                  <div className="flex items-center gap-1.5 text-white/40 text-xs mb-4">
                    <MapPin size={11} /> {land.location}
                  </div>

                  <div className="flex items-end justify-between mb-5">
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Per Unit</p>
                      <p className="text-xl font-bold text-amber-400">
                        {priceKobo > 0 ? `₦${koboToNaira(priceKobo).toLocaleString()}` : <span className="text-white/20 text-sm font-normal">—</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Available</p>
                      <p className="text-lg font-bold text-white">
                        {land.available_units?.toLocaleString() ?? "—"}
                        <span className="text-xs text-white/30 font-normal"> units</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/lands/${land.id}`}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center text-[#0D1F1A] transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
                      View Details
                    </Link>
                    <button
                      onClick={() => {
                        if (showHeatmap) setShowHeatmap(false);
                        if (isFullScreen) setIsFullScreen(false);
                        setTimeout(() => {
                          mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          setTimeout(() => {
                            setActiveLandId(land.id);
                            setFlyTarget({ lat: +land.lat, lng: +land.lng });
                            setTimeout(() => setActiveLandId(null), 3000);
                          }, 400);
                        }, 100);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                      title="View on map"
                    >
                      <MapPin size={15} className="text-white/50" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {visibleLands.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/20 text-lg">No properties in current view</p>
            <p className="text-white/10 text-sm mt-1">Pan or zoom the map to explore more</p>
          </div>
        )}
      </div>
    </div>
  );
}