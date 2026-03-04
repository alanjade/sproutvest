"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../utils/api";
import handleApiError from "../../utils/handleApiError";
import toast, { Toaster } from "react-hot-toast";
import {
  Wallet, TrendingUp, TrendingDown, Clock, CheckCircle,
  XCircle, AlertCircle, CreditCard, ArrowDownCircle, ArrowUpCircle,
  WifiOff, RefreshCw, ServerCrash,
} from "lucide-react";

const FEE_PERCENT = 2;
const FEE_CAP = 3000;
const QUICK_AMOUNTS = [1000, 5000, 10000, 50000];

export default function WalletPage() {
  const [balance, setBalance]           = useState(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pin, setPin]                   = useState("");
  const [loading, setLoading]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [gateway, setGateway]           = useState("monnify");
  const [feePreview, setFeePreview]     = useState(0);
  const [totalPreview, setTotalPreview] = useState(0);
  const [activeTab, setActiveTab]       = useState("deposit");
  const [isLoadingData, setIsLoadingData] = useState(true);
  // null = no error | "network" = no internet | "server" = backend 5xx
  const [loadError, setLoadError]       = useState(null);
  const [serverError, setServerError]   = useState("");
  const router = useRouter();

  /* ─── FETCH ─────────────────────────────────────────────────────────── */
  const fetchWalletData = async (isRetry = false) => {
    setIsLoadingData(true);
    setLoadError(null);
    setServerError("");

    try {
      const [walletRes, txRes] = await Promise.all([
        api.get("/me"),
        api.get("/transactions/user"),
      ]);

      // /me returns { data: { ...user } }  (ProfileController shape)
      const user = walletRes.data?.data ?? walletRes.data?.user ?? {};

      // balance may be stored as wallet_balance (kobo) or balance_kobo
      const balanceKobo =
        user.wallet_balance ??
        user.balance_kobo ??
        user.balance ??
        0;

      setBalance(balanceKobo);

      const txList = txRes.data?.data ?? txRes.data ?? [];
      setTransactions(
        txList.filter((t) => t.type === "Deposit" || t.type === "Withdrawal")
      );

      if (isRetry) toast.success("Wallet loaded");
    } catch (err) {
      if (!err.response) {
        setLoadError("network");
      } else {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          `Server error (${err.response.status})`;
        setServerError(msg);
        setLoadError("server");
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => { fetchWalletData(); }, []);

  /* ─── FEE CALC ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) { setFeePreview(0); setTotalPreview(0); return; }
    const fee = Math.min(Math.round(amt * (FEE_PERCENT / 100)), FEE_CAP);
    setFeePreview(fee);
    setTotalPreview(amt + fee);
  }, [depositAmount]);

  const isFeeCapApplied =
    depositAmount && Number(depositAmount) > 0
      ? Math.round(Number(depositAmount) * (FEE_PERCENT / 100)) > FEE_CAP
      : false;

  /* ─── ACTIONS ───────────────────────────────────────────────────────── */
  const handleDeposit = async () => {
    const amountNaira = Number(depositAmount);
    if (!Number.isInteger(amountNaira) || amountNaira < 1000)
      return toast.error("Minimum deposit is ₦1,000");
    setLoading("deposit");
    try {
      const res = await api.post("/deposit", { amount: amountNaira * 100, gateway });
      if (res.data.payment_url) {
        toast.success(`Redirecting to ${gateway}...`);
        setTimeout(() => window.location.assign(res.data.payment_url), 400);
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(null);
    }
  };

  const handleWithdraw = async () => {
    const amountNaira = Number(withdrawAmount);
    if (!Number.isInteger(amountNaira) || amountNaira < 1000)
      return toast.error("Minimum withdrawal is ₦1,000");
    if (amountNaira > balance / 100) return toast.error("Insufficient balance");
    if (!/^\d{4}$/.test(pin))        return toast.error("PIN must be 4 digits");
    setLoading("withdraw");
    try {
      const res = await api.post("/withdraw", {
        amount: amountNaira * 100,
        transaction_pin: pin,
      });
      toast.success(res.data.message || "Withdrawal successful!");
      setWithdrawAmount("");
      setPin("");
      fetchWalletData();
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (msg.toLowerCase().includes("transaction pin not set")) {
        toast.error("Please set a transaction PIN in settings");
        setTimeout(() => router.push("/settings?tab=pin"), 1500);
      } else if (msg.toLowerCase().includes("insufficient")) {
        toast.error("Insufficient funds");
      } else {
        handleApiError(err);
      }
    } finally {
      setLoading(null);
    }
  };

  /* ─── STATUS HELPERS ────────────────────────────────────────────────── */
  const getStatusIcon = (status) => {
    if (!status) return <Clock size={13} />;
    const s = status.toLowerCase();
    if (s.includes("complete")) return <CheckCircle size={13} />;
    if (s.includes("pend"))     return <Clock size={13} />;
    if (s.includes("fail") || s.includes("reject")) return <XCircle size={13} />;
    return <AlertCircle size={13} />;
  };

  const getStatusStyle = (status) => {
    if (!status) return "bg-white/5 border-white/10 text-white/30";
    const s = status.toLowerCase();
    if (s.includes("complete")) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    if (s.includes("pend"))     return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    if (s.includes("fail") || s.includes("reject")) return "bg-red-500/10 border-red-500/20 text-red-400";
    return "bg-white/5 border-white/10 text-white/30";
  };

  const formatDate = (d) =>
    new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

  /* ─── LOADING ───────────────────────────────────────────────────────── */
  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1F1A]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm tracking-widest uppercase">Loading wallet</p>
        </div>
      </div>
    );
  }

  /* ─── ERROR STATES ──────────────────────────────────────────────────── */
  if (loadError) {
    const isServer = loadError === "server";
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1F1A] px-4"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <Toaster position="top-right" toastOptions={{
          success: { style: { background: "#0D1F1A", color: "#6ee7b7", border: "1px solid #065f46" } },
        }} />
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            {isServer
              ? <ServerCrash size={28} className="text-red-400/60" />
              : <WifiOff    size={28} className="text-white/20" />}
          </div>
          <h2 className="text-xl font-bold text-white mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {isServer ? "Server Error" : "Connection Error"}
          </h2>
          <p className="text-white/40 text-sm mb-2 leading-relaxed">
            {isServer
              ? "The server returned an error. Please try again or contact support."
              : "Unable to load your wallet. Please check your connection and try again."}
          </p>
          {isServer && serverError && (
            <p className="text-red-400/70 text-xs font-mono mb-6 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 wrap-break-word">
              {serverError}
            </p>
          )}
          {!isServer && <div className="mb-6" />}
          <button
            onClick={() => fetchWalletData(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[#0D1F1A] text-sm transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
          >
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ─── RENDER ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0D1F1A] relative"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <Toaster position="top-right" toastOptions={{
        success: { style: { background: "#0D1F1A", color: "#6ee7b7", border: "1px solid #065f46" } },
        error:   { style: { background: "#0D1F1A", color: "#fca5a5", border: "1px solid #7f1d1d" } },
        loading: { style: { background: "#0D1F1A", color: "#fff",    border: "1px solid rgba(255,255,255,0.1)" } },
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-2">Finance</p>
          <h1 className="text-4xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            My Wallet
          </h1>
          <p className="text-white/40 mt-1 text-sm">Manage your funds securely</p>
        </div>

        {/* Balance Card */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 p-6 sm:p-8"
          style={{ background: "linear-gradient(135deg, rgba(200,135,58,0.15) 0%, rgba(13,31,26,0.8) 60%)" }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #E8A850, transparent)", transform: "translate(30%, -30%)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={14} className="text-amber-500/70" />
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500/70">Available Balance</p>
            </div>
            <h2 className="font-bold text-white mb-6 leading-tight break-all"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.6rem, 7vw, 3rem)" }}>
              ₦{(balance / 100).toLocaleString()}
            </h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setActiveTab("deposit")}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition-all">
                <ArrowDownCircle size={14} /> Add Money
              </button>
              <button onClick={() => setActiveTab("withdraw")}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition-all">
                <ArrowUpCircle size={14} /> Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Deposit / Withdraw Panel */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex border-b border-white/10">
            {[
              { id: "deposit",  label: "Deposit",  icon: <TrendingUp  size={14} /> },
              { id: "withdraw", label: "Withdraw", icon: <TrendingDown size={14} /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? "text-amber-500 border-b-2 border-amber-500 bg-amber-500/5"
                    : "text-white/30 hover:text-white/60 hover:bg-white/5"
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === "deposit" ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Payment Gateway</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["monnify", "paystack"].map((p) => (
                      <button key={p} type="button" onClick={() => setGateway(p)}
                        className={`py-3 px-4 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all ${
                          gateway === p
                            ? "text-[#0D1F1A] border-transparent"
                            : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                        }`}
                        style={gateway === p ? { background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" } : {}}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Amount (₦)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-semibold">₦</span>
                    <input type="number" min={1000} value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleDeposit()}
                      placeholder="1,000 minimum"
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {QUICK_AMOUNTS.map((a) => (
                      <button key={a} type="button" onClick={() => setDepositAmount(a.toString())}
                        className="px-3 py-1.5 text-xs font-bold bg-white/5 border border-white/10 hover:border-amber-500/30 hover:text-amber-400 text-white/40 rounded-lg transition-all">
                        ₦{a.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-white/20 mt-2">{FEE_PERCENT}% fee · max ₦{FEE_CAP.toLocaleString()} cap</p>
                </div>

                {depositAmount && Number(depositAmount) >= 1000 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                    <FeeRow label="Deposit Amount" value={`₦${Number(depositAmount).toLocaleString()}`} />
                    <FeeRow label={`Fee (${FEE_PERCENT}%${isFeeCapApplied ? ", capped" : ""})`} value={`₦${feePreview.toLocaleString()}`} />
                    <div className="border-t border-amber-500/20 pt-2 flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-500/70">Total</span>
                      <span className="text-xl font-bold text-amber-400"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                        ₦{totalPreview.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <ActionButton onClick={handleDeposit} loading={loading === "deposit"}
                  disabled={!depositAmount || Number(depositAmount) < 1000} label="Continue to Payment" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/30 mb-0.5">Available Balance</p>
                    <p className="text-amber-400 font-bold">₦{(balance / 100).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Amount (₦)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-semibold">₦</span>
                    <input type="number" min={1000} max={balance / 100} value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleWithdraw()}
                      placeholder="1,000 minimum"
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {QUICK_AMOUNTS.filter((a) => a <= balance / 100).map((a) => (
                      <button key={a} type="button" onClick={() => setWithdrawAmount(a.toString())}
                        className="px-3 py-1.5 text-xs font-bold bg-white/5 border border-white/10 hover:border-amber-500/30 hover:text-amber-400 text-white/40 rounded-lg transition-all">
                        ₦{a.toLocaleString()}
                      </button>
                    ))}
                    {balance / 100 >= 1000 && (
                      <button type="button" onClick={() => setWithdrawAmount(Math.floor(balance / 100).toString())}
                        className="px-3 py-1.5 text-xs font-bold text-[#0D1F1A] rounded-lg transition-all"
                        style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
                        Max
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Transaction PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onKeyDown={(e) => e.key === "Enter" && handleWithdraw()}
                    placeholder="••••"
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 px-4 py-3 rounded-xl text-center text-2xl tracking-[0.5em] outline-none transition-all" />
                </div>

                <ActionButton onClick={handleWithdraw} loading={loading === "withdraw"}
                  disabled={!withdrawAmount || !pin || pin.length !== 4} label="Withdraw Funds" />
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5 bg-white/5">
            <Wallet size={15} className="text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">Transaction History</h3>
            {transactions.length > 0 && (
              <span className="ml-auto text-xs text-white/30">{transactions.length} records</span>
            )}
          </div>
          <div className="p-4 sm:p-5">
            {transactions.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <Wallet size={18} className="text-white/20" />
                </div>
                <p className="text-white/30 text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((t, i) => (
                  <div key={t.id ?? t.reference ?? i}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 sm:px-4 py-3 hover:border-white/15 transition-all gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        t.type === "Deposit" ? "bg-emerald-500/10" : "bg-blue-500/10"
                      }`}>
                        {t.type === "Deposit"
                          ? <ArrowDownCircle size={16} className="text-emerald-400" />
                          : <ArrowUpCircle   size={16} className="text-blue-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{t.type}</p>
                        <p className="text-xs text-white/30 truncate">{formatDate(t.created_at ?? t.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className={`font-bold text-sm tabular-nums ${
                        t.type === "Deposit" ? "text-emerald-400" : "text-blue-400"
                      }`}>
                        {t.type === "Deposit" ? "+" : "-"}₦
                        {(Number(t.amount_kobo ?? t.amount) / (t.amount_kobo ? 100 : 1))
                          .toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${getStatusStyle(t.status)}`}>
                        {getStatusIcon(t.status)}
                        <span className="hidden sm:inline">{t.status}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── SUB-COMPONENTS ────────────────────────────────────────────────────── */
function FeeRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-amber-500/60">{label}</span>
      <span className="text-sm font-semibold text-white/70">{value}</span>
    </div>
  );
}

function ActionButton({ onClick, loading, disabled, label }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full py-3.5 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#0D1F1A]/40 border-t-[#0D1F1A] rounded-full animate-spin" />
          Processing...
        </span>
      ) : label}
    </button>
  );
}