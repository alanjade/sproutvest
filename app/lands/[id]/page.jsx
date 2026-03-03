"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../utils/api";
import { purchaseLand, sellLand, getUserUnitsForLand } from "../../../services/landService";
import { getLandImage } from "../../../utils/images";
import { koboToNaira, formatNaira } from "../../../utils/currency";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, MapPin, Layers, TrendingUp, ShieldCheck, Lock, X, AlertCircle, Info } from "lucide-react";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";

/* ── Price helper — latestPrice relation or direct field ── */
function getLandPrice(land) {
  return (
    land.latest_price?.price_per_unit_kobo
    ?? land.latestPrice?.price_per_unit_kobo
    ?? land.price_per_unit_kobo
    ?? 0
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-amber-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

export default function LandDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [land, setLand]           = useState(null);
  const [userUnits, setUserUnits] = useState(0);
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  const [modalType, setModalType]           = useState(null);
  const [unitsInput, setUnitsInput]         = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [modalError, setModalError]         = useState(null);
  const [modalLoading, setModalLoading]     = useState(false);
  const [pinNotSet, setPinNotSet]           = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex]     = useState(0);

  const fetchLand = useCallback(async () => {
    try {
      const res = await api.get(`/lands/${id}`);
      setLand(res.data.data);
    } catch {
      setError("Unable to load land details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchUserUnits = useCallback(async () => {
    try {
      const res = await getUserUnitsForLand(id);
      if (res.units_owned !== undefined) setUserUnits(res.units_owned);
    } catch {}
  }, [id]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get("/me");
      const userData = res.data?.user ?? res.data?.data ?? null;
      setUser(userData);
      if (userData && !userData.transaction_pin) setPinNotSet(true);
    } catch {}
  }, []);

  useEffect(() => {
    fetchLand();
    fetchUserUnits();
    fetchUser();
  }, [fetchLand, fetchUserUnits, fetchUser]);

  const handleAction = async () => {
    const units = Number(unitsInput);
    if (!units || units <= 0) { setModalError("Please enter a valid number of units."); return; }
    if (!/^\d{4}$/.test(transactionPin)) { setModalError("Transaction PIN must be a 4-digit number."); return; }

    setModalLoading(true);
    setModalError(null);

    try {
      let res;
      if (modalType === "purchase") {
        res = await purchaseLand(id, units, transactionPin);
        toast.success(`Purchase successful! Ref: ${res.reference}`);
      } else {
        res = await sellLand(id, units, transactionPin);
        toast.success(`Sold successfully! Ref: ${res.reference}`);
      }
      await fetchLand();
      await fetchUserUnits();
      closeModal();
    } catch (err) {
      const apiMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      if (apiMessage?.toLowerCase().includes("pin not set")) {
        setPinNotSet(true);
        closeModal();
        return;
      }
      setModalError(apiMessage || "Transaction failed. Try again.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setUnitsInput("");
    setTransactionPin("");
    setModalError(null);
  };

  const openModal = (type) => {
    if (!user?.transaction_pin) { setPinNotSet(true); return; }
    setModalType(type);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1F1A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm tracking-widest uppercase">Loading property</p>
        </div>
      </div>
    );
  }

  if (error || !land) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1F1A]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Property not found."}</p>
          <Link href="/lands" className="text-amber-500 hover:text-amber-400 text-sm">← Back to Lands</Link>
        </div>
      </div>
    );
  }

  const priceKobo = getLandPrice(land);
  const images = land.images?.length
    ? land.images.map((img) => ({ src: img.url }))
    : [{ src: getLandImage(land) }];
  const totalKobo = unitsInput ? Number(unitsInput) * priceKobo : 0;

  return (
    <div className="min-h-screen bg-[#0D1F1A] relative" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <Toaster position="top-right" toastOptions={{
        success: { style: { background: "#0D1F1A", color: "#6ee7b7", border: "1px solid #065f46" } },
        error:   { style: { background: "#0D1F1A", color: "#fca5a5", border: "1px solid #7f1d1d" } },
      }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">

        <Link href="/lands" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-8">
          <ArrowLeft size={13} /> Back to Lands
        </Link>

        {images.length > 0 && (
          <div className={`grid gap-3 mb-10 rounded-2xl overflow-hidden border border-white/10 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {images.map((img, i) => (
              <div key={i}
                className={`relative overflow-hidden group cursor-pointer ${i === 0 && images.length > 1 ? "row-span-2" : ""}`}
                style={{ height: i === 0 ? "420px" : "205px" }}
                onClick={() => { setPhotoIndex(i); setLightboxOpen(true); }}
              >
                <img src={img.src} alt={`${land.title} ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4"
                  style={{ background: "linear-gradient(to top, rgba(13,31,26,0.6), transparent)" }}>
                  <span className="text-white/80 text-xs font-bold uppercase tracking-widest">View</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-2">Property Listing</p>
          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {land.title}
          </h1>
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <MapPin size={13} /> {land.location}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Size"        value={`${land.size} sqm`} />
          <StatCard label="Price / Unit" value={priceKobo > 0 ? formatNaira(priceKobo) : "—"} accent />
          <StatCard label="Available"   value={`${land.available_units?.toLocaleString() ?? "—"} units`} />
          <StatCard label="Total Units"  value={land.total_units?.toLocaleString() ?? "—"} />
        </div>

        {pinNotSet && !modalType && (
          <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Info size={18} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-400 mb-1">Transaction PIN Required</p>
              <p className="text-xs text-white/40 leading-relaxed">
                You need to set a 4-digit transaction PIN before you can buy or sell land units.
              </p>
            </div>
            <Link href="/settings"
              className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-[#0D1F1A] px-3 py-2 rounded-lg transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #C8873A, #E8A850)" }}>
              <ShieldCheck size={13} /> Set PIN
            </Link>
          </div>
        )}

        {userUnits > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500/70 mb-0.5">Your Holdings</p>
              <p className="text-white font-bold text-lg">
                {userUnits} <span className="text-white/40 text-sm font-normal">units owned</span>
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-white/30 mb-0.5">Est. Value</p>
              <p className="text-amber-400 font-bold">{priceKobo > 0 ? formatNaira(userUnits * priceKobo) : "—"}</p>
            </div>
          </div>
        )}

        {land.description && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <Layers size={15} className="text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">Description</h3>
            </div>
            <p className="text-white/60 leading-relaxed text-sm">{land.description}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button onClick={() => openModal("purchase")}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
            <ShieldCheck size={16} /> Purchase Units
          </button>
          {userUnits > 0 && (
            <button onClick={() => openModal("sell")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white border border-white/20 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
              <TrendingUp size={16} /> Sell Units
            </button>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)}
          index={photoIndex} slides={images}
          plugins={images.length > 1 ? [Thumbnails] : []} />
      )}

      {modalType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "#0D1F1A", boxShadow: "0 25px 80px rgba(0,0,0,0.6)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-0.5">
                  {modalType === "purchase" ? "Purchase" : "Sell"}
                </p>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {land.title}
                </h2>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Number of Units</label>
                <input type="number" min="1"
                  max={modalType === "sell" ? userUnits : land.available_units}
                  value={unitsInput}
                  onChange={(e) => setUnitsInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  placeholder={`Max: ${modalType === "sell" ? userUnits : land.available_units}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Transaction PIN</label>
                <input type="password" inputMode="numeric" maxLength={4}
                  value={transactionPin}
                  onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 px-4 py-3 rounded-xl text-center text-2xl tracking-[0.5em] outline-none transition-all"
                  placeholder="••••"
                />
              </div>

              {unitsInput > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-xs text-amber-500/70 uppercase tracking-widest mb-1">
                    {modalType === "purchase" ? "Total to Pay" : "You'll Receive"}
                  </p>
                  <p className="text-2xl font-bold text-amber-400" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {formatNaira(totalKobo)}
                  </p>
                </div>
              )}

              {modalError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-red-400 text-sm">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={closeModal}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 text-sm font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={handleAction}
                  disabled={modalLoading || !unitsInput || !transactionPin}
                  className="flex-1 py-3 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
                  {modalLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0D1F1A]/40 border-t-[#0D1F1A] rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pinNotSet && !modalType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "#0D1F1A", boxShadow: "0 25px 80px rgba(0,0,0,0.6)" }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                <Lock size={22} className="text-amber-500" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 mb-2">Action Required</p>
              <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Set Transaction PIN
              </h2>
              <p className="text-white/40 text-sm mb-6 leading-relaxed">
                You need a 4-digit transaction PIN before buying or selling land units.
              </p>
              <div className="space-y-3">
                <Link href="/settings"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
                  <ShieldCheck size={15} /> Go to Settings
                </Link>
                <button onClick={() => setPinNotSet(false)}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 text-sm font-semibold transition-all">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}