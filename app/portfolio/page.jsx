"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../utils/api";
import handleApiError from "../../utils/handleApiError";
import toast from "react-hot-toast";
import {
  TrendingUp, TrendingDown, Layers,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

const formatNaira = (v) =>
  Number(v || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const koboToNaira = (k) =>
  (Number(k || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 });

export default function Portfolio() {
  const [lands, setLands] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [summary, setSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState({
    type: null, land: null, units: "", pin: "", processing: false,
  });
  const router = useRouter();

  const fetchPortfolioAndUser = useCallback(async () => {
    try {
      const [portfolioRes, userRes] = await Promise.all([
        api.get("/user/lands"),
        api.get("/me"),
      ]);
      setLands((portfolioRes.data.owned_lands || []).filter((l) => l.units_owned > 0));
      setHasPin(!!userRes.data.user?.transaction_pin);
    } catch (err) {
      handleApiError(err);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [summaryRes, txRes] = await Promise.all([
        api.get("/portfolio/summary"),
        api.get("/transactions/user"),
      ]);
      setSummary(summaryRes.data.data);
      setTransactions(
        (txRes.data.data || []).filter(
          (t) => t.type === "Purchase" || t.type === "Sale"
        )
      );
    } catch (err) {
      handleApiError(err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPortfolioAndUser(), fetchAnalytics()]).finally(() =>
      setLoading(false)
    );
  }, [fetchPortfolioAndUser, fetchAnalytics]);

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);

  const paginatedTx = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return transactions.slice(start, start + ITEMS_PER_PAGE);
  }, [transactions, currentPage]);

  useEffect(() => setCurrentPage(1), [transactions]);

  const openModal = (type, land) => {
    if (!hasPin) {
      toast.error("Please set a transaction PIN first");
      setTimeout(() => router.push("/settings"), 1500);
      return;
    }
    setModal({ type, land, units: "", pin: "", processing: false });
  };

  const closeModal = () =>
    setModal({ type: null, land: null, units: "", pin: "", processing: false });

  const handleTransaction = async (e) => {
    e.preventDefault();
    const units = Number(modal.units);

    if (!Number.isInteger(units) || units <= 0)
      return toast.error("Units must be a whole number greater than 0");

    if (modal.type === "sell" && units > modal.land.units_owned)
      return toast.error("Cannot sell more than owned");

    if (modal.pin.length !== 4)
      return toast.error("Enter 4-digit PIN");

    setModal((p) => ({ ...p, processing: true }));
    try {
      await api.post(
        modal.type === "buy"
          ? `/lands/${modal.land.land_id}/purchase`
          : `/lands/${modal.land.land_id}/sell`,
        { units, transaction_pin: modal.pin }
      );
      toast.success("Transaction successful");
      await Promise.all([fetchPortfolioAndUser(), fetchAnalytics()]);
      closeModal();
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (msg.toLowerCase().includes("transaction pin not set")) {
        toast.error("Please set a transaction PIN in settings");
        setTimeout(() => router.push("/settings"), 1500);
      } else {
        handleApiError(err);
      }
    } finally {
      setModal((p) => ({ ...p, processing: false }));
    }
  };

  const totalAmount = useMemo(() => {
    if (!modal.land || !modal.units) return 0;
    const units = parseFloat(modal.units);
    if (isNaN(units) || units <= 0) return 0;
    return (units * Number(modal.land.price_per_unit_kobo || 0)) / 100;
  }, [modal]);

  const formatDate = (d) =>
    new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  useEffect(() => {
    if (safePage !== currentPage) setCurrentPage(safePage);
  }, [safePage, currentPage]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#0D1F1A]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm tracking-widest uppercase">Loading portfolio</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0D1F1A] relative"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-8">

        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-2">
            Investments
          </p>
          <h1
            className="text-4xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Your Portfolio
          </h1>
          <p className="text-white/40 mt-1 text-sm">
            Track your land holdings and transactions
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              title="Portfolio Value"
              value={`₦${formatNaira(summary.current_portfolio_value)}`}
            />
            <SummaryCard
              title="Current Investment"
              value={`₦${formatNaira(summary.total_invested)}`}
            />
            <SummaryCard
              title="Profit / Loss"
              value={`₦${formatNaira(Math.abs(Number(summary.total_profit_loss || 0)))}`}
              positive={Number(summary.total_profit_loss) >= 0}
              signed
              prefix={Number(summary.total_profit_loss) >= 0 ? "+" : "-"}
            />
            <SummaryCard
              title="ROI"
              value={`${Number(summary.profit_loss_percent || 0).toFixed(2)}%`}
              positive={Number(summary.profit_loss_percent) >= 0}
              signed
              prefix={Number(summary.profit_loss_percent) >= 0 ? "+" : "-"}
            />
          </div>
        )}

        {/* Land Holdings */}
        {lands.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Layers size={22} className="text-white/30" />
            </div>
            <p className="text-white/40 mb-5">You haven't purchased any land yet</p>
            <Link
              href="/lands"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[#0D1F1A] text-sm transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
            >
              Browse Available Lands
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {lands.map((land) => (
              <div
                key={land.land_id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition-all"
              >
                <h2
                  className="font-bold text-white text-lg mb-4"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {land.land_name}
                </h2>
                <div className="space-y-2 mb-5">
                  <Row label="Units Owned"    value={land.units_owned} />
                  <Row label="Price per Unit" value={`₦${koboToNaira(land.price_per_unit_kobo)}`} />
                  <Row label="Current Value"  value={`₦${formatNaira(land.current_value)}`} accent />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => openModal("buy", land)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0D1F1A] transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
                  >
                    Buy More
                  </button>
                  <button
                    onClick={() => openModal("sell", land)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Sell
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transaction History */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5 bg-white/5">
            <TrendingUp size={15} className="text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">
              Transaction History
            </h3>
            {transactions.length > 0 && (
              <span className="ml-auto text-xs text-white/30">
                {transactions.length} transactions
              </span>
            )}
          </div>

          <div className="p-5">
            {transactions.length === 0 ? (
              <p className="text-center text-white/30 py-8 text-sm">No transactions yet</p>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedTx.map((t, i) => {
                    const isPurchase = t.type === "Purchase";
                    return (
                      <div
                        key={t.reference ?? `${t.type}-${t.date}-${i}`}
                        className="flex justify-between items-center rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:border-white/15 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isPurchase ? "bg-emerald-500/10" : "bg-red-500/10"
                            }`}
                          >
                            {isPurchase
                              ? <TrendingUp   size={14} className="text-emerald-400" />
                              : <TrendingDown size={14} className="text-red-400" />}
                          </div>
                          <div>
                            <p
                              className={`text-sm font-semibold ${
                                isPurchase ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {t.type} · {t.land}
                            </p>
                            <p className="text-xs text-white/30">
                              {isPurchase ? "+" : "-"}{t.units} unit{t.units !== 1 ? "s" : ""} · {formatDate(t.date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold text-sm ${
                              isPurchase ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isPurchase ? "-" : "+"}₦{formatNaira(t.amount)}
                          </p>
                          <p className="text-xs text-white/30">{t.status}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                          currentPage === page
                            ? "text-[#0D1F1A]"
                            : "bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                        }`}
                        style={
                          currentPage === page
                            ? { background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }
                            : {}
                        }
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal.type && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "#0D1F1A", boxShadow: "0 25px 80px rgba(0,0,0,0.6)" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-0.5">
                  {modal.type}
                </p>
                <h2
                  className="text-xl font-bold text-white"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {modal.land?.land_name}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
                  Number of Units
                  {modal.type === "sell" && modal.land && (
                    <span className="ml-2 normal-case text-white/20 font-normal">
                      (max {modal.land.units_owned})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min={1}
                  max={modal.type === "sell" ? modal.land?.units_owned : undefined}
                  value={modal.units}
                  onChange={(e) => setModal((p) => ({ ...p, units: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  placeholder="Enter units"
                />
              </div>

              {totalAmount > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-xs text-amber-500/70 uppercase tracking-widest mb-1">
                    {modal.type === "buy" ? "Total to Pay" : "You'll Receive"}
                  </p>
                  <p
                    className="text-2xl font-bold text-amber-400"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    ₦{formatNaira(totalAmount)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
                  Transaction PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={modal.pin}
                  onChange={(e) =>
                    setModal((p) => ({
                      ...p,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 px-4 py-3 rounded-xl text-center text-2xl tracking-[0.5em] outline-none transition-all"
                  placeholder="••••"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modal.processing || !modal.units || !modal.pin}
                  className="flex-1 py-3 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
                >
                  {modal.processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0D1F1A]/40 border-t-[#0D1F1A] rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, positive, signed, prefix }) {
  const color = signed
    ? positive ? "text-emerald-400" : "text-red-400"
    : "text-amber-400";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">{title}</p>
      <p className={`text-xl font-bold ${color}`}>{prefix}{value}</p>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-white/30 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-semibold ${accent ? "text-amber-400" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}