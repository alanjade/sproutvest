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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
        <CheckCircle size={11} /> Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border text-amber-400 bg-amber-500/10 border-amber-500/20">
      <Clock size={11} /> Pending
    </span>
  );
}

const REWARD_LABELS = {
  cashback:    { icon: "💰", label: "Cashback Reward" },
  discount:    { icon: "🎟️", label: "Discount Reward" },
  bonus_units: { icon: "🎁", label: "Bonus Units" },
};

export default function ReferralDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);

  useEffect(() => { fetchDashboard(); }, []);

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

  const copyReferralLink = async () => {
    const link = dashboard?.referral_link;
    if (!link) return;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(link);
      } else {
        const el = document.createElement("textarea");
        el.value = link;
        el.setAttribute("readonly", "");
        el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
        document.body.appendChild(el);
        el.select();
        el.setSelectionRange(0, el.value.length);
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically — please copy the link manually");
    }
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
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #2D7A55 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-500 mb-2">
            Dashboard
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Referral Program
          </h1>
          <p className="text-white/40 mt-1 text-sm">
            Share your link and earn rewards for every referral
          </p>
        </div>

        {/* Referral Link Card */}
        <div
          className="relative rounded-2xl p-5 sm:p-6 mb-8 overflow-hidden border border-amber-500/20"
          style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #0D1F1A 100%)" }}
        >
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, #C8873A, transparent 70%)" }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-5">
              <Gift size={18} className="text-amber-500" />
              <h2
                className="font-bold text-white text-lg"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Your Referral Link
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input
                type="text"
                value={dashboard?.referral_link || ""}
                readOnly
                className="flex-1 bg-white/5 border border-white/10 text-white/60 text-sm px-4 py-3 rounded-xl outline-none font-mono truncate min-w-0"
              />
              <button
                onClick={copyReferralLink}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 whitespace-nowrap shrink-0 ${
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
                  <><Check size={15} /> Copied!</>
                ) : (
                  <><Copy size={15} /> Copy Link</>
                )}
              </button>
            </div>

            <div>
              <p className="text-xs text-white/30 mb-1">Your Referral Code</p>
              <code
                className="text-xl sm:text-2xl font-bold tracking-[0.15em] break-all"
                style={{ color: "#C8873A", fontFamily: "monospace" }}
              >
                {dashboard?.referral_code}
              </code>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            {
              label: "Total Referrals",
              value: dashboard?.total_referrals || 0,
              icon: <Users size={18} />,
              accent: "#C8873A",
            },
            {
              label: "Completed",
              value: dashboard?.completed_referrals || 0,
              icon: <CheckCircle size={18} />,
              accent: "#22c55e",
            },
            {
              label: "Pending",
              value: dashboard?.pending_referrals || 0,
              icon: <Clock size={18} />,
              accent: "#F59E0B",
            },
            {
              label: "Unclaimed Rewards",
              value: `₦${koboToNaira(dashboard?.unclaimed_rewards_kobo || 0)}`,
              icon: <Wallet size={18} />,
              accent: "#C8873A",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 overflow-hidden hover:-translate-y-1 transition-all"
            >
              <div
                className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20"
                style={{ background: `radial-gradient(circle, ${card.accent}, transparent 70%)` }}
              />
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${card.accent}20`, color: card.accent }}
              >
                {card.icon}
              </div>
              <p className="text-xs text-white/30 uppercase tracking-widest font-bold mb-1">
                {card.label}
              </p>
              <p
                className="text-xl sm:text-2xl font-bold text-white break-all"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Rewards */}
        {dashboard?.rewards?.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden mb-6">
            <div className="flex items-center gap-3 px-5 sm:px-6 py-5 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Zap size={17} className="text-amber-500" />
              </div>
              <h2
                className="font-bold text-white text-lg"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Your Rewards
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {dashboard.rewards.map((reward) => {
                const cfg = REWARD_LABELS[reward.reward_type] || { icon: "🎁", label: "Reward" };
                return (
                  <div
                    key={reward.id}
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                      reward.claimed
                        ? "border-white/5 bg-white/2"
                        : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {cfg.icon} {cfg.label}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {reward.reward_type === "cashback" &&
                          `₦${koboToNaira(reward.amount_kobo)}`}
                        {reward.reward_type === "discount" &&
                          `${reward.discount_percentage}% off your next purchase`}
                        {reward.reward_type === "bonus_units" &&
                          `${reward.units} bonus units`}
                      </p>
                      {reward.referral?.referred_user?.name && (
                        <p className="text-xs text-white/25 mt-1">
                          From: {reward.referral.referred_user.name}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {reward.claimed ? (
                        <span className="flex items-center gap-1.5 text-xs text-white/25 border border-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap">
                          <Check size={12} /> Claimed
                        </span>
                      ) : (
                        <button
                          onClick={() => claimReward(reward.id)}
                          className="text-xs font-bold text-[#0D1F1A] px-4 py-2 rounded-lg transition-all hover:scale-105 whitespace-nowrap"
                          style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Referrals Table */}
        {dashboard?.referrals?.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden mb-6">
            <div className="flex items-center gap-3 px-5 sm:px-6 py-5 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Users size={17} className="text-emerald-400" />
              </div>
              <h2
                className="font-bold text-white text-lg"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Your Referrals
              </h2>
            </div>

            <div className="hidden sm:grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 px-6 py-3 border-b border-white/5 bg-white/5">
              {["Name", "Email", "Status", "Joined"].map((h) => (
                <span
                  key={h}
                  className="text-xs font-bold uppercase tracking-widest text-white/30"
                >
                  {h}
                </span>
              ))}
            </div>
            {/* Mobile header */}
            <div className="grid grid-cols-2 gap-4 px-4 py-3 border-b border-white/5 bg-white/5 sm:hidden">
              {["Name", "Status"].map((h) => (
                <span
                  key={h}
                  className="text-xs font-bold uppercase tracking-widest text-white/30"
                >
                  {h}
                </span>
              ))}
            </div>

            {dashboard.referrals.map((referral, i) => (
              <div
                key={referral.id}
                className={`transition-colors hover:bg-white/5 ${
                  i < dashboard.referrals.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 px-6 py-4 items-center">
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
                {/* Mobile row — stacked card layout */}
                <div className="sm:hidden px-4 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {referral.referred_user.name}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {new Date(referral.referred_user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={referral.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 sm:p-12 text-center mb-6">
            <div className="text-5xl mb-4">🎁</div>
            <h3
              className="text-xl font-bold text-white mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              No Referrals Yet
            </h3>
            <p className="text-white/40 text-sm mb-6">
              Share your referral link with friends to earn rewards!
            </p>
            <button
              onClick={copyReferralLink}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[#0D1F1A] text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #C8873A, #E8A850)" }}
            >
              <Copy size={15} /> Copy Referral Link
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} className="text-emerald-400" />
            <h3 className="font-bold text-emerald-300 text-sm">How Referrals Work</h3>
          </div>
          <ol className="space-y-2 text-sm text-emerald-300/60">
            {[
              "Share your unique referral link with friends",
              "They sign up using your link",
              "When they make their first purchase, your referral is completed",
              "You both receive rewards!",
              "Claim your rewards to add them to your account",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </div>
  );
}