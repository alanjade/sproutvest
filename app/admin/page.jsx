"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "../../utils/api";
import toast from "react-hot-toast";
import {
  MapPin, ShieldCheck, Gift, Wallet,
  ArrowRight, TrendingUp, Clock, CheckCircle,
  XCircle, Plus, Eye, MessageSquare, AlertCircle,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    lands:   { total: 0, active: 0, disabled: 0 },
    kyc:     { total: 0, pending: 0, approved: 0, rejected: 0 },
    referrals: { total: 0, completed: 0, pending: 0, totalRewards: 0 },
    support: { total: 0, open: 0, waiting: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardStats(); }, []);

  const fetchDashboardStats = async () => {
    try {
      const [landsRes, kycRes, referralsRes, supportRes] = await Promise.all([
        api.get("/admin/lands"),
        api.get("/admin/kyc"),
        api.get("/admin/referrals/stats"),
        api.get("/admin/support/tickets?per_page=1"), 
      ]);

      const lands  = landsRes.data.data.data ?? landsRes.data.data;
      const kycs   = kycRes.data.data.data   ?? kycRes.data.data;
      const ref    = referralsRes.data.data;
      const supportMeta = supportRes.data.data;

      setStats({
        lands: {
          total:    lands.length,
          active:   lands.filter((l) => l.is_available).length,
          disabled: lands.filter((l) => !l.is_available).length,
        },
        kyc: {
          total:    kycs.length,
          pending:  kycs.filter((k) => k.status === "pending").length,
          approved: kycs.filter((k) => k.status === "approved").length,
          rejected: kycs.filter((k) => k.status === "rejected").length,
        },
        referrals: {
          total:        ref.total_referrals,
          completed:    ref.completed_referrals,
          pending:      ref.pending_referrals,
          totalRewards: ref.total_rewards_issued,
        },
        support: {
          total:   supportMeta?.total   ?? 0,
          open:    supportMeta?.open    ?? 0,
          waiting: supportMeta?.waiting ?? 0,
        },
      });
    } catch {
      toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  const koboToNaira = (kobo) => (kobo / 100).toLocaleString();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1F1A] flex items-center justify-center"
        style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Lands",
      value: stats.lands.total,
      icon: <MapPin size={22} />,
      accent: "#C8873A",
      href: "/admin/lands",
      sub: [
        { label: "Active",   value: stats.lands.active,   color: "text-emerald-400" },
        { label: "Disabled", value: stats.lands.disabled, color: "text-red-400" },
      ],
    },
    {
      label: "KYC Submissions",
      value: stats.kyc.total,
      icon: <ShieldCheck size={22} />,
      accent: "#8B5CF6",
      href: "/admin/kyc",
      sub: [
        { label: "Pending",  value: stats.kyc.pending,  color: "text-amber-400" },
        { label: "Approved", value: stats.kyc.approved, color: "text-emerald-400" },
      ],
    },
    {
      label: "Referrals",
      value: stats.referrals.total,
      icon: <Gift size={22} />,
      accent: "#2D7A55",
      href: "/admin/referrals",
      sub: [
        { label: "Completed", value: stats.referrals.completed, color: "text-emerald-400" },
        { label: "Pending",   value: stats.referrals.pending,   color: "text-amber-400" },
      ],
    },
    {
      label: "Support Tickets",
      value: stats.support.total,
      icon: <MessageSquare size={22} />,
      accent: "#06B6D4",
      href: "/admin/support",
      sub: [
        { label: "Open",    value: stats.support.open,    color: "text-cyan-400" },
        { label: "Waiting", value: stats.support.waiting, color: "text-amber-400" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D1F1A] relative"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #C8873A 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-2">Admin Panel</p>
            <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Dashboard
            </h1>
            <p className="text-white/40 mt-1 text-sm">Manage your platform from one central location</p>
          </div>
          <Link
            href="/admin/lands/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#0D1F1A] text-sm transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #C8873A, #E8A850)" }}
          >
            <Plus size={16} /> Add New Land
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {statCards.map((card) => {
            const inner = (
              <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:-translate-y-1 transition-all group overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{ background: `radial-gradient(circle, ${card.accent}, transparent 70%)` }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${card.accent}20`, color: card.accent }}>
                  {card.icon}
                </div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {card.value}
                </p>
                <div className="flex gap-4 flex-wrap">
                  {card.sub.map((s) => (
                    <span key={s.label} className={`text-xs ${s.color}`}>
                      {s.value !== "" ? `${s.value} ` : ""}{s.label}
                    </span>
                  ))}
                </div>
                {card.href && (
                  <ArrowRight size={14} className="absolute bottom-5 right-5 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
                )}
              </div>
            );
            return card.href
              ? <Link key={card.label} href={card.href}>{inner}</Link>
              : <div key={card.label}>{inner}</div>;
          })}
        </div>

        {/* Management Grid */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">

          {/* Land Management */}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <MapPin size={18} className="text-amber-500" />
                </div>
                <h2 className="font-bold text-white text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Land Management
                </h2>
              </div>
              <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {stats.lands.total} total
              </span>
            </div>
            <div className="p-4 space-y-2">
              <ManagementRow href="/admin/lands" icon={<Eye size={15} />} title="View All Lands" subtitle={`Manage ${stats.lands.total} properties`} accent="white" />
              <ManagementRow href="/admin/lands/create" icon={<Plus size={15} />} title="Add New Land" subtitle="Create a new property listing" accent="#C8873A" highlight />
            </div>
          </div>

          {/* KYC Management */}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-purple-400" />
                </div>
                <h2 className="font-bold text-white text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  KYC Verification
                </h2>
              </div>
              {stats.kyc.pending > 0 && (
                <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {stats.kyc.pending} pending
                </span>
              )}
            </div>
            <div className="p-4 space-y-2">
              <ManagementRow href="/admin/kyc?status=pending" icon={<Clock size={15} />} title="Pending Reviews" subtitle={`${stats.kyc.pending} awaiting review`} accent="#F59E0B" highlight />
              <ManagementRow href="/admin/kyc" icon={<Eye size={15} />} title="All Submissions" subtitle="View all KYC verifications" accent="white" />
            </div>
          </div>

          {/* Support */}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                  <MessageSquare size={18} className="text-cyan-400" />
                </div>
                <h2 className="font-bold text-white text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Support
                </h2>
              </div>
              {stats.support.open > 0 && (
                <span className="text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  {stats.support.open} open
                </span>
              )}
            </div>
            <div className="p-4 space-y-2">
              <ManagementRow href="/admin/support?status=open" icon={<AlertCircle size={15} />} title="Open Tickets" subtitle={`${stats.support.open} need attention`} accent="#06B6D4" highlight />
              <ManagementRow href="/admin/support" icon={<Eye size={15} />} title="All Tickets" subtitle="View full ticket history" accent="white" />
            </div>
          </div>

          {/* Referral */}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Gift size={18} className="text-emerald-400" />
                </div>
                <h2 className="font-bold text-white text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Referral System
                </h2>
              </div>
              <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {stats.referrals.total} total
              </span>
            </div>
            <div className="p-4 space-y-2">
              <ManagementRow href="/admin/referrals" icon={<TrendingUp size={15} />} title="View Stats" subtitle={`₦${koboToNaira(stats.referrals.totalRewards)} rewards issued`} accent="#2D7A55" />
              <ManagementRow href="/admin/referrals?status=pending" icon={<Clock size={15} />} title="Pending Referrals" subtitle={`${stats.referrals.pending} awaiting purchase`} accent="#F59E0B" highlight />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #0D1F1A 100%)", border: "1px solid rgba(200,135,58,0.2)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #C8873A, transparent 70%)" }} />
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-1">Shortcuts</p>
            <h2 className="text-xl font-bold text-white mb-5" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: "/admin/lands/create",       icon: <Plus size={20} />,         label: "Add Land",    accent: "#C8873A" },
                { href: "/admin/kyc?status=pending", icon: <ShieldCheck size={20} />,  label: "Review KYC",  accent: "#8B5CF6" },
                { href: "/admin/support?status=open",icon: <MessageSquare size={20} />,label: "Open Tickets",accent: "#06B6D4" },
                { href: "/admin/lands",              icon: <Eye size={20} />,           label: "Manage All",  accent: "#C8873A" },
              ].map((action) => (
                <Link
                  key={action.label} href={action.href}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:-translate-y-1 transition-all text-center group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ background: `${action.accent}20`, color: action.accent }}>
                    {action.icon}
                  </div>
                  <span className="text-white/70 text-xs font-semibold group-hover:text-white transition-colors">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ManagementRow({ href, icon, title, subtitle, accent, highlight }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
        highlight ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-transparent hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: accent === "white" ? "rgba(255,255,255,0.05)" : `${accent}20`,
            color:      accent === "white" ? "rgba(255,255,255,0.4)"  : accent,
          }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{title}</p>
          <p className="text-xs text-white/30">{subtitle}</p>
        </div>
      </div>
      <ArrowRight size={14} className="text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all shrink-0" />
    </Link>
  );
}