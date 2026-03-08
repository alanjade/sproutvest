"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../utils/api";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  TrendingUp, Wallet, MapPin, Activity,
  ArrowUpRight, LayoutGrid, ChevronRight,
  ArrowDownLeft, Sparkles, RefreshCw,
} from "lucide-react";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const statusCfg = (status = "") => {
  const s = status?.toLowerCase() || "";
  if (s.includes("success") || s.includes("complete"))
    return { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" };
  if (s.includes("pending"))
    return { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" };
  return { cls: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" };
};

const amountMeta = (type = "") => {
  const t = type?.toLowerCase() || "";
  if (t.includes("deposit") || t.includes("sale"))
    return { sign: "+", color: "text-emerald-400", isCredit: true };
  if (t.includes("withdraw") || t.includes("purchase") || t.includes("invest"))
    return { sign: "−", color: "text-red-400", isCredit: false };
  return { sign: "", color: "text-white/70", isCredit: null };
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString("en-NG", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// Animated number counter
function useCountUp(target, duration = 1100, enabled = true) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!enabled || target === 0) { setValue(target); return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * ease));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, enabled]);

  return value;
}

/* ── Data hook ────────────────────────────────────────────────────────────── */
function useDashboardData(enabled) {
  const [stats, setStats]               = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTx, setLoadingTx]       = useState(true);

  const loadData = useCallback(async () => {
    if (!enabled) return;
    try {
      const [statsRes, txRes, meRes] = await Promise.all([
        api.get("/user/stats"),
        api.get("/transactions/user"),
        api.get("/me"),
      ]);

      const s  = statsRes.data?.data || {};
      const me = meRes.data?.user ?? meRes.data?.data ?? {};

      setStats({
        balance:             me.balance_naira          ?? (me.balance_kobo != null ? me.balance_kobo / 100 : 0),
        total_invested:      (s.total_invested_kobo    ?? 0) / 100,
        lands_owned:          s.total_lands_invested   ?? 0,
        units_owned:          s.total_units_held       ?? 0,
        total_withdrawn:     (s.total_received_kobo    ?? 0) / 100,
        pending_withdrawals:  null,
      });

      const txList = txRes.data?.data?.data ?? txRes.data?.data ?? [];
      setTransactions(txList);
    } catch (err) {
      if (err.response?.status !== 401) toast.error("Failed to load dashboard data.");
    } finally {
      setLoadingStats(false);
      setLoadingTx(false);
    }
  }, [enabled]);

  useEffect(() => { loadData(); }, [loadData]);
  return { stats, transactions, loadingStats, loadingTx, refetch: loadData };
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user, loading: loadingUser } = useAuth();
  const router   = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!localStorage.getItem("token"));
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const { stats, transactions, loadingStats, loadingTx, refetch } = useDashboardData(!!user && hasToken);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem("justLoggedIn") === "1") {
      sessionStorage.removeItem("justLoggedIn");
      toast.success(`Welcome back, ${user.name?.split(" ")[0] || "Investor"}!`, { duration: 3000 });
    }
  }, [user]);

  useEffect(() => {
    if (!loadingUser && !user) router.replace("/login");
  }, [loadingUser, user, router]);

  if (loadingUser || !user) return (
    <div className="min-h-screen bg-[#0D1F1A] flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 w-12 h-12 border-2 border-amber-500/15 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-[#0D1F1A] relative overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none select-none">
        <div className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.065) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />
        <div className="absolute -top-[15%] -right-[5%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(200,135,58,0.11) 0%, transparent 65%)" }} />
        <div className="absolute -bottom-[10%] -left-[10%] w-[45vw] h-[45vw] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(45,122,85,0.09) 0%, transparent 65%)" }} />
        <div className="absolute top-0 left-0 right-0 h-48 bg-linear-to-b from-black/25 to-transparent" />
      </div>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">

        {/* ── Header ── */}
        <header
          className="transition-all duration-700"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)" }}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] font-black tracking-[0.28em] uppercase text-amber-500/60">
                  Dashboard
                </span>
                <span className="w-1 h-1 rounded-full bg-amber-500/30" />
                <span className="text-[10px] text-white/20">
                  {new Date().toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <span className="text-white">{greeting()}, </span>
                <span style={{
                  background: "linear-gradient(135deg, #E8A850 0%, #C8873A 50%, #E8A850 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  {user?.name?.split(" ")[0] || "Investor"}
                </span>
              </h1>
              <p className="text-sm text-white/30 mt-1.5">
                Here's how your investments are performing today.
              </p>
            </div>

            <button
              onClick={refetch}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white/30 border border-white/10 hover:border-white/20 hover:text-white/55 hover:bg-white/5 transition-all"
            >
              <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
              Refresh
            </button>
          </div>
        </header>

        {/* ── Stat Cards ── */}
        <section
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 transition-all duration-700 delay-100"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(14px)" }}
        >
          {loadingStats ? (
            [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={<Wallet size={16} />}
                label="Wallet Balance"
                value={stats?.balance ?? 0}
                accent="amber"
                href="/wallet"
                mounted={mounted}
              />
              <StatCard
                icon={<TrendingUp size={16} />}
                label="Total Invested"
                value={stats?.total_invested ?? 0}
                accent="emerald"
                href="/portfolio"
                mounted={mounted}
              />
              <StatCard
                icon={<MapPin size={16} />}
                label="Lands Invested"
                value={stats?.lands_owned ?? 0}
                accent="blue"
                href="/portfolio"
                mounted={mounted}
                isCount
                sub={`${stats?.units_owned ?? 0} units`}
              />
              <StatCard
                icon={<Activity size={16} />}
                label="Sale Proceeds"
                value={stats?.total_withdrawn ?? 0}
                accent="purple"
                href="/wallet"
                mounted={mounted}
              />
            </>
          )}
        </section>

        {/* ── Quick Actions ── */}
        <section
          className="grid grid-cols-3 gap-3 sm:gap-4 transition-all duration-700 delay-175"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(14px)" }}
        >
          <QuickCard title="Wallet"    desc="Fund & manage"     href="/wallet"    icon={<Wallet size={17} />}     accent="#C8873A" />
          <QuickCard title="Portfolio" desc="Track investments" href="/portfolio" icon={<LayoutGrid size={17} />} accent="#2D7A55" />
          <QuickCard title="Explore"   desc="New opportunities" href="/lands"     icon={<MapPin size={17} />}     accent="#8B5CF6" />
        </section>

        {/* ── Transactions ── */}
        <section
          className="transition-all duration-700 delay-250"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(14px)" }}
        >
          <TransactionsSection transactions={transactions} loading={loadingTx} />
        </section>
      </main>
    </div>
  );
}

/* ── SkeletonCard ─────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 h-32 overflow-hidden relative">
      <div className="absolute inset-0 animate-pulse bg-white/5" />
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, accent, href, mounted, isCount, sub }) {
  const palette = {
    amber:   { glow: "rgba(200,135,58,0.14)",  icon: "rgba(200,135,58,1)",   ring: "rgba(200,135,58,0.22)" },
    emerald: { glow: "rgba(45,122,85,0.14)",   icon: "rgba(74,222,128,1)",   ring: "rgba(45,122,85,0.22)"  },
    blue:    { glow: "rgba(59,130,246,0.14)",  icon: "rgba(96,165,250,1)",   ring: "rgba(59,130,246,0.22)" },
    purple:  { glow: "rgba(139,92,246,0.14)",  icon: "rgba(167,139,250,1)",  ring: "rgba(139,92,246,0.22)" },
  };
  const a   = palette[accent] || palette.amber;
  const num = parseFloat(value) || 0;
  const animated = useCountUp(num, 1000, mounted);

  const display = isCount
    ? animated.toLocaleString()
    : "₦" + animated.toLocaleString("en-NG");

  const inner = (
    <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 sm:p-5 hover:bg-white/5.5 hover:border-white/12 transition-all duration-300 overflow-hidden h-full flex flex-col">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${a.glow}, transparent 70%)` }} />

      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 shrink-0"
        style={{ background: a.glow, boxShadow: `0 0 0 1px ${a.ring}`, color: a.icon }}
      >
        {icon}
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25 mb-1.5 truncate">
        {label}
      </p>

      <p
        className="text-xl sm:text-2xl font-bold text-white leading-none mt-auto"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        title={isCount ? String(num) : `₦${num.toLocaleString()}`}
      >
        {display}
      </p>

      {sub && <p className="text-[11px] text-white/25 mt-1.5 truncate">{sub}</p>}

      <ChevronRight
        size={12}
        className="absolute bottom-4 right-4 text-white/15 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300"
      />
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

/* ── QuickCard ────────────────────────────────────────────────────────────── */
function QuickCard({ title, desc, href, icon, accent }) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl border border-white/[0.07] bg-white/3 hover:bg-white/5.5 hover:border-white/12 transition-all duration-300 overflow-hidden block"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 20% 60%, ${accent}15, transparent 65%)` }}
      />
      <div className="relative p-4 sm:p-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-[1.08]"
          style={{ background: `${accent}16`, color: accent, boxShadow: `0 0 0 1px ${accent}28` }}
        >
          {icon}
        </div>
        <h3 className="font-bold text-white/85 text-sm leading-none">{title}</h3>
        <p className="text-[11px] text-white/27 mt-1 hidden sm:block leading-snug">{desc}</p>
        <div className="hidden sm:flex items-center gap-1 mt-3">
          <span className="text-xs font-bold transition-colors" style={{ color: accent }}>Open</span>
          <ArrowUpRight
            size={11}
            style={{ color: accent }}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-200"
          />
        </div>
      </div>
    </Link>
  );
}

/* ── TransactionsSection ──────────────────────────────────────────────────── */
function TransactionsSection({ transactions, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/3 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 bg-white/2">
          <div className="h-4 w-44 rounded-lg bg-white/[0.07] animate-pulse" />
        </div>
        <div className="divide-y divide-white/5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded bg-white/5 animate-pulse w-2/5" />
                <div className="h-2.5 rounded bg-white/3 animate-pulse w-1/4" />
              </div>
              <div className="h-4 rounded bg-white/5 animate-pulse w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/3 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(200,135,58,0.1)", boxShadow: "0 0 0 1px rgba(200,135,58,0.18)" }}>
              <Activity size={13} className="text-amber-500" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
              Recent Transactions
            </h2>
          </div>
        </div>

        <div className="flex flex-col items-center text-center px-5 py-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "rgba(200,135,58,0.07)", boxShadow: "0 0 0 1px rgba(200,135,58,0.13)" }}
          >
            <Sparkles size={16} className="text-amber-500/50" />
          </div>
          <p
            className="font-bold text-white/60 text-sm mb-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            No transactions yet
          </p>
          <p className="text-xs text-white/25 mb-5 max-w-50 leading-relaxed">
            Invest in verified land to see activity here.
          </p>
          <Link
            href="/lands"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs text-[#0D1F1A] transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
          >
            Browse Properties <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(200,135,58,0.1)", boxShadow: "0 0 0 1px rgba(200,135,58,0.18)" }}>
            <Activity size={13} className="text-amber-500" />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            Recent Transactions
          </h2>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/10 text-white/20">
            {transactions.length}
          </span>
        </div>
        <Link href="/wallet"
          className="flex items-center gap-1 text-xs font-bold text-amber-500/65 hover:text-amber-400 transition-colors">
          View all <ChevronRight size={11} />
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {[
                { label: "Type / Asset", align: "text-left"  },
                { label: "Amount",       align: "text-right" },
                { label: "Status",       align: "text-left"  },
                { label: "Date",         align: "text-left"  },
              ].map(({ label, align }) => (
                <th key={label}
                  className={`px-5 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-white/20 ${align}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 8).map((tx, idx) => {
              const { sign, color, isCredit } = amountMeta(tx?.type);
              const { cls, dot }              = statusCfg(tx?.status);
              const amountNaira = Number(tx?.amount ?? 0);
              const landName    = tx?.land?.title ?? null;
              const txDate      = tx?.date ?? tx?.created_at;

              return (
                <tr key={tx?.id ?? idx}
                  className="border-b border-white/[0.035] hover:bg-white/[0.022] transition-colors group">

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-[1.04] ${
                        isCredit === true   ? "bg-emerald-500/10"
                        : isCredit === false ? "bg-red-500/10"
                        : "bg-white/5"
                      }`}>
                        {isCredit === true
                          ? <ArrowDownLeft size={14} className="text-emerald-400" />
                          : isCredit === false
                          ? <ArrowUpRight size={14} className="text-red-400" />
                          : <Activity size={14} className="text-white/25" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold capitalize text-white/75 text-sm leading-none truncate">
                          {tx?.type?.replace(/_/g, " ") || "Transaction"}
                        </p>
                        <p className="text-[11px] text-white/22 mt-1 truncate">
                          {landName || "Wallet"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <span className={`font-bold tabular-nums text-[0.9rem] ${color}`}
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {sign}₦{amountNaira.toLocaleString("en-NG")}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      {tx?.status || "—"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-[11px] text-white/22 whitespace-nowrap">
                    {formatDate(txDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-white/5">
        {transactions.slice(0, 6).map((tx, idx) => {
          const { sign, color, isCredit } = amountMeta(tx?.type);
          const { cls, dot }              = statusCfg(tx?.status);
          const amountNaira = Number(tx?.amount_kobo ?? 0) / 100;
          const landName    = tx?.land?.title ?? null;
          const txDate      = tx?.transaction_date ?? tx?.created_at;

          return (
            <div key={tx?.id ?? idx}
              className="px-4 py-3.5 flex items-center gap-3 hover:bg-white/2 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isCredit === true   ? "bg-emerald-500/10"
                : isCredit === false ? "bg-red-500/10"
                : "bg-white/5"
              }`}>
                {isCredit === true
                  ? <ArrowDownLeft size={15} className="text-emerald-400" />
                  : isCredit === false
                  ? <ArrowUpRight size={15} className="text-red-400" />
                  : <Activity size={15} className="text-white/25" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm capitalize text-white/75 truncate leading-none">
                  {tx?.type?.replace(/_/g, " ") || "Transaction"}
                </p>
                <p className="text-[11px] text-white/22 mt-1 truncate">
                  {landName || "Wallet"} · {formatDate(txDate)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`font-bold text-sm tabular-nums ${color}`}>
                  {sign}₦{amountNaira.toLocaleString("en-NG")}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-[0.08em] ${cls}`}>
                  <span className={`w-1 h-1 rounded-full ${dot}`} />
                  {tx?.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {transactions.length > 6 && (
        <div className="px-5 py-3 border-t border-white/5 text-center bg-white/1">
          <Link href="/wallet"
            className="text-xs text-white/20 hover:text-amber-500 transition-colors font-semibold">
            View all {transactions.length} transactions →
          </Link>
        </div>
      )}
    </div>
  );
}