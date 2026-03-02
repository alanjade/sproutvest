"use client";

import { useEffect, useState } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import {
  Gift, Copy, Check, Users, CheckCircle,
  Clock, Wallet, Zap, Info,
} from "lucide-react";

function StatusBadge({ status }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 whitespace-nowrap">
        <CheckCircle size={11} /> Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border text-amber-400 bg-amber-500/10 border-amber-500/20 whitespace-nowrap">
      <Clock size={11} /> Pending
    </span>
  );
}

const REWARD_LABELS = {
  cashback: { icon: "💰", label: "Cashback Reward" },
  discount: { icon: "🎟️", label: "Discount Reward" },
  bonus_units: { icon: "🎁", label: "Bonus Units" },
};

export default function ReferralDashboard() {

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/referrals/dashboard");
      setDashboard(res.data.data);
    } catch {
      toast.error("Failed to load referral dashboard");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!dashboard?.referral_link) return;

    navigator.clipboard.writeText(dashboard.referral_link);
    setCopied(true);
    toast.success("Referral link copied!");

    setTimeout(() => setCopied(false), 2000);
  };

  const claimReward = async (rewardId) => {
    try {
      await api.post(`/referrals/rewards/${rewardId}/claim`);
      toast.success("Reward claimed!");
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to claim reward");
    }
  };

  const koboToNaira = (kobo) => (kobo / 100).toLocaleString();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1F1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0D1F1A] relative"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >

      {/* Background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />

      <div
        className="absolute top-0 right-0 w-[60vw] h-[60vw] sm:w-[40vw] sm:h-[40vw] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #2D7A55 0%, transparent 70%)"
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-500 mb-2">
            Account
          </p>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Referral Program
          </h1>

          <p className="text-white/40 mt-1 text-sm">
            Share your link and earn rewards for every referral
          </p>
        </div>

        {/* Referral Link Card */}
        <div
          className="relative rounded-2xl p-4 sm:p-6 mb-8 overflow-hidden border border-amber-500/20"
          style={{
            background: "linear-gradient(135deg, #1a3a2a 0%, #0D1F1A 100%)"
          }}
        >

          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15 pointer-events-none"
            style={{
              background: "radial-gradient(circle, #C8873A, transparent 70%)"
            }}
          />

          <div className="relative z-10">

            <div className="flex items-center gap-2 mb-5">
              <Gift size={18} className="text-amber-500" />
              <h2 className="font-bold text-white text-base sm:text-lg"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Your Referral Link
              </h2>
            </div>

            {/* RESPONSIVE COPY SECTION */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">

              <input
                type="text"
                value={dashboard?.referral_link || ""}
                readOnly
                className="w-full min-w-0 bg-white/5 border border-white/10 text-white/60 text-sm px-4 py-3 rounded-xl outline-none font-mono truncate"
              />

              <button
                onClick={copyReferralLink}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 w-full sm:w-auto whitespace-nowrap ${
                  copied
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-[#0D1F1A]"
                }`}
                style={
                  !copied
                    ? { background: "linear-gradient(135deg, #C8873A, #E8A850)" }
                    : {}
                }
              >
                {copied ? (
                  <>
                    <Check size={15} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={15} /> Copy Link
                  </>
                )}
              </button>

            </div>

            {/* Referral Code */}
            <div>
              <p className="text-xs text-white/30 mb-1">
                Your Referral Code
              </p>

              <code className="text-lg sm:text-2xl font-bold tracking-[0.15em] break-all"
                style={{
                  color: "#C8873A",
                  fontFamily: "monospace"
                }}>
                {dashboard?.referral_code}
              </code>

            </div>

          </div>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

          {[
            {
              label: "Total Referrals",
              value: dashboard?.total_referrals || 0,
              icon: <Users size={18} />,
              accent: "#C8873A"
            },
            {
              label: "Completed",
              value: dashboard?.completed_referrals || 0,
              icon: <CheckCircle size={18} />,
              accent: "#22c55e"
            },
            {
              label: "Pending",
              value: dashboard?.pending_referrals || 0,
              icon: <Clock size={18} />,
              accent: "#F59E0B"
            },
            {
              label: "Unclaimed Rewards",
              value: `₦${koboToNaira(dashboard?.unclaimed_rewards || 0)}`,
              icon: <Wallet size={18} />,
              accent: "#C8873A"
            },
          ].map((card) => (

            <div
              key={card.label}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 overflow-hidden"
            >

              <div
                className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20"
                style={{
                  background: `radial-gradient(circle, ${card.accent}, transparent 70%)`
                }}
              />

              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center mb-2 sm:mb-3"
                style={{
                  background: `${card.accent}20`,
                  color: card.accent
                }}
              >
                {card.icon}
              </div>

              <p className="text-[10px] sm:text-xs text-white/30 uppercase tracking-widest font-bold mb-1">
                {card.label}
              </p>

              <p className="text-lg sm:text-2xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {card.value}
              </p>

            </div>

          ))}

        </div>

        {/* Referrals Table */}
        {dashboard?.referrals?.length > 0 && (

          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto mb-6">

            <div className="min-w-[600px]">

              <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 px-6 py-3 border-b border-white/5 bg-white/5">
                {["Name", "Email", "Status", "Joined"].map((h) => (
                  <span key={h}
                    className="text-xs font-bold uppercase tracking-widest text-white/30">
                    {h}
                  </span>
                ))}
              </div>

              {dashboard.referrals.map((referral) => (

                <div key={referral.id}
                  className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 px-6 py-4 items-center border-b border-white/5">

                  <p className="text-sm font-semibold text-white">
                    {referral.referred_user.name}
                  </p>

                  <p className="text-sm text-white/40 truncate">
                    {referral.referred_user.email}
                  </p>

                  <StatusBadge status={referral.status} />

                  <p className="text-sm text-white/40">
                    {new Date(referral.referred_user.created_at).toLocaleDateString()}
                  </p>

                </div>

              ))}

            </div>

          </div>

        )}

        {/* How it works */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-6">

          <div className="flex items-center gap-2 mb-4">
            <Info size={16} className="text-emerald-400" />
            <h3 className="font-bold text-emerald-300 text-sm">
              How Referrals Work
            </h3>
          </div>

          <ol className="space-y-2 text-sm text-emerald-300/60">

            {[
              "Share your unique referral link",
              "Friend signs up",
              "Friend makes first purchase",
              "You both earn rewards",
              "Claim rewards anytime",
            ].map((item, i) => (

              <li key={i} className="flex gap-2">
                <span className="text-emerald-500 font-bold">
                  {i + 1}.
                </span>
                {item}
              </li>

            ))}

          </ol>

        </div>

      </div>

    </div>
  );
}