"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import api from "../../utils/api";
import { getLandImage } from "../../utils/images";
import { koboToNaira } from "../../utils/currency";
import { useDebounce } from "../../utils/useDebounce";
import { MapPin, Maximize2, Flame, X, Lock, ShieldCheck } from "lucide-react";

const MapWithNoSSR = dynamic(
  () => import("./_LandMap").then((m) => m.default),
  { ssr: false }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLandPrice(land) {
  return (
    land.latest_price?.price_per_unit_kobo ??
    land.latestPrice?.price_per_unit_kobo ??
    land.current_price_per_unit_kobo ??
    land.price_per_unit_kobo ??
    0
  );
}

function hasPolygon(land) {
  // PostGIS EWKB hex in coordinates field (primary format from API)
  if (land.coordinates && typeof land.coordinates === "string" && land.coordinates.length > 10) return true;
  const p = land.polygon;
  if (!p) return false;
  if (typeof p === "string") return p.toUpperCase().includes("POLYGON");
  if (p?.type === "Polygon") return true;
  return Array.isArray(p) && p.length >= 3;
}

function getPriceTag(priceKobo) {
  const n = koboToNaira(priceKobo);
  if (n < 200000) return { label: "Budget",    color: "#22c55e" };
  if (n < 500000) return { label: "Mid-Range", color: "#f59e0b" };
  return                  { label: "Premium",  color: "#ef4444" };
}

// ── PIN / KYC banners ─────────────────────────────────────────────────────────

function AccountBanner({ pinIsSet, kycStatus }) {
  const needsPin = !pinIsSet;
  const needsKyc = kycStatus !== "approved";
  if (!needsPin && !needsKyc) return null;

  const kycMessage = {
    none:     "KYC not submitted. Verify your identity before you can transact.",
    pending:  "KYC is under review. You'll be able to transact once approved.",
    rejected: "KYC was rejected. Please resubmit your documents.",
    resubmit: "KYC resubmission required before you can transact.",
  }[kycStatus] ?? "Identity verification required.";

  return (
    <div className="mb-8 space-y-3">
      {needsPin && (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Lock size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-400">Transaction PIN not set</p>
            <p className="text-xs text-white/40 mt-0.5">Set a PIN in settings before purchasing units.</p>
          </div>
          <Link href="/settings?tab=pin"
            className="shrink-0 text-xs font-bold text-[#0D1F1A] px-3 py-2 rounded-lg hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg, #C8873A, #E8A850)" }}>
            Set PIN
          </Link>
        </div>
      )}
      {needsKyc && (
        <div className="flex items-center gap-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-purple-400">Identity Verification Required</p>
            <p className="text-xs text-white/40 mt-0.5">{kycMessage}</p>
          </div>
          {["none", "rejected", "resubmit"].includes(kycStatus) && (
            <Link href="/settings?tab=kyc"
              className="shrink-0 text-xs font-bold text-white px-3 py-2 rounded-lg border border-purple-500/40 hover:bg-purple-500/20 transition-all">
              {kycStatus === "none" ? "Submit KYC" : "Resubmit"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

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

  const [pinIsSet, setPinIsSet]         = useState(true);
  const [kycStatus, setKycStatus]       = useState("approved");
  const [statusLoaded, setStatusLoaded] = useState(false);

  const mapSectionRef = useRef(null);

  useEffect(() => {
    api.get("/lands")
      .then((res) => {
        const list = res.data?.data ?? [];
        setLands(list);
        setVisibleLands(list);
      })
      .catch(() => setError("Failed to load lands"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get("/user/account-status")
      .then((res) => {
        const d = res.data?.data ?? {};
        setPinIsSet(!!d.pin_is_set);
        setKycStatus(d.kyc_status ?? "none");
      })
      .catch(() => {
        api.get("/me")
          .then((res) => {
            const u = res.data?.data ?? {};
            setPinIsSet(u.pin_is_set ?? !!u.transaction_pin);
            setKycStatus(u.kyc_status ?? (u.is_kyc_verified ? "approved" : "none"));
          })
          .catch(() => {});
      })
      .finally(() => setStatusLoaded(true));
  }, []);

  const landsWithPolygons  = useMemo(() => lands.filter((l) => hasPolygon(l)), [lands]);
  const landsWithPoints    = useMemo(() => lands.filter((l) => l.lat && l.lng && !hasPolygon(l)), [lands]);
  const allLandsWithCoords = useMemo(() => [...landsWithPoints, ...landsWithPolygons], [landsWithPoints, landsWithPolygons]);

  const filterByBounds = useCallback((bounds) => {
    setVisibleLands(
      lands.filter((l) => {
        // All lands have lat/lng — use it as the visibility check
        if (l.lat && l.lng) return bounds.contains([+l.lat, +l.lng]);
        // Fallback: old {lat,lng} polygon arrays
        if (hasPolygon(l) && Array.isArray(l.polygon))
          return l.polygon.some((p) => bounds.contains([p.lat, p.lng]));
        return false;
      })
    );
  }, [lands]);

  const handleMapMoveEnd = useDebounce(filterByBounds, 300);

  useEffect(() => {
    document.body.style.overflow = isFullScreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullScreen]);

  // Focus a land on the map: scroll → fly → open popup
  const focusLandOnMap = useCallback((land) => {
    if (showHeatmap) setShowHeatmap(false);
    if (isFullScreen) setIsFullScreen(false);

    // Reset first so re-clicking the same land re-triggers the effect
    setFlyTarget(null);
    setActiveLandId(null);

    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      setTimeout(() => {
        const lat = land.lat ?? land.polygon?.[0]?.lat;
        const lng = land.lng ?? land.polygon?.[0]?.lng;

        setActiveLandId(land.id);
        if (lat && lng) setFlyTarget({ lat: +lat, lng: +lng });

        setTimeout(() => setActiveLandId(null), 6000);
      }, 450);
    }, 100);
  }, [showHeatmap, isFullScreen]);

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
    ...landsWithPolygons.filter((l) => l.lat && l.lng).map((l) => [+l.lat, +l.lng]),
  ];

  const mapProps = {
    defaultCenter, allMapPoints, landsWithPoints, landsWithPolygons,
    allLandsWithCoords, activeLandId, hoverLandId, flyTarget,
    showHeatmap, currentZoom, isFullScreen,
    onZoomChange: setCurrentZoom,
    onMoveEnd: handleMapMoveEnd,
  };

  const canTransact = pinIsSet && kycStatus === "approved";

  return (
    <div className="min-h-screen bg-[#0D1F1A]" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* Fullscreen map overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-99999 bg-[#0D1F1A]">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-100000 flex items-center gap-2 px-3 py-2 rounded-2xl"
            style={{ background: "rgba(8,20,15,0.92)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
              <MapPin size={12} className="text-amber-500" />
              <span className="text-white/60 text-xs font-semibold tabular-nums">{visibleLands.length} visible</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <button onClick={() => setShowHeatmap((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${showHeatmap ? "text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
              style={showHeatmap ? { background: "linear-gradient(135deg, #f97316, #ef4444)" } : {}}>
              <Flame size={13} />{showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
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

        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-2">Property Marketplace</p>
          <h1 className="text-5xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Available Lands
          </h1>
          <p className="text-white/40 mt-2 text-sm">{visibleLands.length} properties in current view</p>
        </div>

        {statusLoaded && <AccountBanner pinIsSet={pinIsSet} kycStatus={kycStatus} />}

        {/* Map */}
        {!isFullScreen && (
          <div ref={mapSectionRef} className="relative rounded-2xl overflow-hidden border border-white/10 mb-10 shadow-2xl shadow-black/50">
            <div className="absolute top-3 right-3 z-2000 flex gap-2">
              <button onClick={() => setShowHeatmap((v) => !v)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${showHeatmap ? "text-white" : "bg-black/60 backdrop-blur text-white/70 hover:bg-black/80 border border-white/10"}`}
                style={showHeatmap ? { background: "linear-gradient(to right, #f97316, #ef4444)" } : {}}>
                <Flame size={13} />{showHeatmap ? "Hide" : "Heatmap"}
              </button>
              <button onClick={() => setIsFullScreen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur text-white/70 hover:bg-black/80 text-xs font-bold border border-white/10 transition-all">
                <Maximize2 size={13} /> Fullscreen
              </button>
            </div>
            <div className="h-150 w-full">
              <MapWithNoSSR {...mapProps} />
            </div>
          </div>
        )}

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleLands.map((land) => {
            const priceKobo = getLandPrice(land);
            const priceTag  = getPriceTag(priceKobo);
            const isHovered = hoverLandId === land.id;
            const imageUrl  = getLandImage(land);

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
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-white/5">
                  <img
                    src={imageUrl}
                    alt={land.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      if (!e.target.dataset.errored) {
                        e.target.dataset.errored = "1";
                        e.target.src = "/no-image.jpeg";
                      }
                    }}
                  />
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

                  {statusLoaded && !canTransact && (
                    <div className="absolute bottom-3 right-3 w-7 h-7 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center border border-white/10"
                      title={!pinIsSet ? "Set transaction PIN to invest" : "Complete KYC to invest"}>
                      <Lock size={12} className="text-amber-400" />
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5">
                  <h3 className="font-bold text-white text-lg leading-snug mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {land.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-white/40 text-xs mb-4">
                    <MapPin size={11} /> {land.location}
                  </div>

                  <div className="flex items-end justify-between mb-5">
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Per Unit</p>
                      <p className="text-xl font-bold text-amber-400">
                        {priceKobo > 0
                          ? `₦${koboToNaira(priceKobo).toLocaleString()}`
                          : <span className="text-white/20 text-sm font-normal">—</span>}
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
                      onClick={() => focusLandOnMap(land)}
                      className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/30 transition-all group/pin"
                      title="Show on map"
                    >
                      <MapPin size={15} className="text-white/50 group-hover/pin:text-amber-400 transition-colors" />
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