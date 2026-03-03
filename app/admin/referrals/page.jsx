"use client";

import { useEffect, useState } from "react";
import api from "../../../utils/api";
import toast from "react-hot-toast";
import {
  Gift, TrendingUp, Clock, CheckCircle,
  Wallet, Trophy, Users, Info,
} from "lucide-react";

function StatusBadge({ status }) {
  const cfg = {
    pending:   { label: "Pending",   color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/20",   icon: <Clock size={11} /> },
    completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle size={11} /> },
  }[status] || { label: status, color: "text-white/40", bg: "bg-white/5 border-white/10", icon: null };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function AdminReferralManagement() {
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchData(); }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, referralsRes] = await Promise.all([
        api.get("/admin/referrals/stats"),
        api.get(`/admin/referrals${filter !== "all" ? `?status=${filter}` : ""}`),
      ]);
      setStats(statsRes.data.data);
      setReferrals(referralsRes.data.data?.data ?? referralsRes.data.data ?? []);
    } catch {
      toast.error("Failed to load referral data");
    } finally {
      setLoading(false);
    }
  };

  const koboToNaira = (kobo) => (kobo / 100).toLocaleString();

  return (
    <div
      className="min-h-screen bg-[#0D1F1A] relative"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #2D7A55 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-500 mb-2">Admin Panel</p>
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Referral System
          </h1>
          <p className="text-white/40 mt-1 text-sm">Track referrals, rewards, and top performers</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                {[
                  { label: "Total Referrals",   value: stats.total_referrals,     icon: <Users size={20} />,    accent: "#C8873A", sub: null },
                  { label: "Completed",          value: stats.completed_referrals, icon: <CheckCircle size={20} />, accent: "#22c55e", sub: null },
                  { label: "Pending",            value: stats.pending_referrals,   icon: <Clock size={20} />,    accent: "#F59E0B", sub: null },
                  {
                    label: "Rewards Issued",
                    value: `₦${koboToNaira(stats.total_rewards_issued)}`,
                    icon: <Wallet size={20} />,
                    accent: "#C8873A",
                    sub: `₦${koboToNaira(stats.unclaimed_rewards)} unclaimed`,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="relative rounded-2xl border border-white/10 bg-white/5 p-6 overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all"
                  >
                    <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
                      style={{ background: `radial-gradient(circle, ${card.accent}, transparent 70%)` }} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${card.accent}20`, color: card.accent }}>
                      {card.icon}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">{card.label}</p>
                    <p className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {card.value}
                    </p>
                    {card.sub && <p className="text-xs text-white/25 mt-1">{card.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Top Referrers */}
            {stats?.top_referrers?.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden mb-6">
                <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <Trophy size={18} className="text-amber-500" />
                  </div>
                  <h2 className="font-bold text-white text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Top Referrers
                  </h2>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-[40px_1.5fr_1.5fr_1fr_80px] gap-4 px-6 py-3 border-b border-white/5 bg-white/5">
                  {["#", "Name", "Email", "Code", "Referrals"].map((h) => (
                    <span key={h} className="text-xs font-bold uppercase tracking-widest text-white/30">{h}</span>
                  ))}
                </div>

                {stats.top_referrers.map((referrer, i) => (
                  <div
                    key={referrer.id}
                    className={`grid grid-cols-[40px_1.5fr_1.5fr_1fr_80px] gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors ${
                      i < stats.top_referrers.length - 1 ? "border-b border-white/5" : ""
                    }`}
                  >
                    <span className="text-lg">{MEDAL[i] || `#${i + 1}`}</span>
                    <p className="text-sm font-semibold text-white">{referrer.name}</p>
                    <p className="text-sm text-white/40 truncate">{referrer.email}</p>
                    <code className="text-xs bg-white/10 border border-white/10 px-2 py-1 rounded-lg text-amber-400 font-mono w-fit">
                      {referrer.referral_code}
                    </code>
                    <span
                      className="text-xl font-bold"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#C8873A" }}
                    >
                      {referrer.referrals_count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Referrals Table */}
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden mb-6">
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <Gift size={18} className="text-emerald-400" />
                  </div>
                  <h2 className="font-bold text-white text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    All Referrals
                  </h2>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
                  {["all", "pending", "completed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilter(s)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                        filter === s ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {referrals.length === 0 ? (
                <div className="text-center py-16">
                  <Gift size={36} className="mx-auto mb-3 text-white/10" />
                  <p className="text-white/30 text-sm">No {filter !== "all" ? filter : ""} referrals found</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-white/5 bg-white/5">
                    {["Referrer", "Referred User", "Status", "Created", "Completed"].map((h) => (
                      <span key={h} className="text-xs font-bold uppercase tracking-widest text-white/30">{h}</span>
                    ))}
                  </div>

                  {referrals.map((referral, i) => (
                    <div
                      key={referral.id}
                      className={`grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors ${
                        i < referrals.length - 1 ? "border-b border-white/5" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{referral.referrer.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">{referral.referrer.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{referral.referred_user.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">{referral.referred_user.email}</p>
                      </div>
                      <StatusBadge status={referral.status} />
                      <p className="text-sm text-white/40">{new Date(referral.created_at).toLocaleDateString()}</p>
                      <p className="text-sm text-white/40">
                        {referral.completed_at ? new Date(referral.completed_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* How it works */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info size={16} className="text-emerald-400" />
                <h3 className="font-bold text-emerald-300 text-sm">How the Referral System Works</h3>
              </div>
              <ul className="space-y-2 text-sm text-emerald-300/60">
                {[
                  "Users share their unique referral code with friends",
                  "New users register with the referral code during sign-up",
                  "Referral status is 'pending' until the new user makes their first purchase",
                  "Once the first purchase is made, the referral becomes 'completed'",
                  "Both the referrer and referred user receive rewards automatically",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}