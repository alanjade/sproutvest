"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, CheckCheck, Clock, CheckCircle } from "lucide-react";
import api from "../../utils/api";

// ── Inline service calls (bypasses notificationService shape issues) ──────────

async function apiFetchNotifications() {
  // GET /notifications → { success, notifications: <paginator> }
  // paginator shape: { data: [...], total, current_page, ... }
  const res = await api.get("/notifications");
  const payload = res.data?.notifications;
  // Handle both paginated ({ data: [...] }) and plain array
  return Array.isArray(payload) ? payload : (payload?.data ?? []);
}

async function apiMarkAllRead() {
  // POST /notifications/read
  await api.post("/notifications/read");
}

async function apiMarkRead(id) {
  // POST /notifications/{id}/read
  await api.post(`/notifications/${id}/read`);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("all");
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiFetchNotifications();
      setNotifications(list);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await apiMarkAllRead();
      // Optimistic update — mark all locally without refetch
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    } catch {
      loadNotifications(); // fallback: refetch on error
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiMarkRead(id);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)
      );
    } catch {
      loadNotifications();
    }
  };

  const filtered    = filter === "unread" ? notifications.filter((n) => !n.read_at) : notifications;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="min-h-screen bg-[#0D1F1A] relative"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.03 }} />

      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all">
              <ArrowLeft size={15} />
            </button>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-0.5">Inbox</p>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Notifications
              </h1>
            </div>
          </div>

          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/30 hover:text-emerald-400 transition-colors px-3 py-2 rounded-xl hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20">
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl border border-white/10 bg-white/5 w-fit">
          {[
            { key: "all",    label: `All (${notifications.length})` },
            { key: "unread", label: `Unread (${unreadCount})` },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={filter === tab.key
                ? { background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)", color: "#0D1F1A" }
                : { color: "rgba(255,255,255,0.35)" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <Bell size={22} className="text-white/15" />
            </div>
            <p className="font-bold text-white mb-1">
              {filter === "unread" ? "All caught up!" : "No notifications yet"}
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              {filter === "unread"
                ? "You have no unread notifications."
                : "Activity and updates will appear here."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {filtered.map((n) => {
              const unread = !n.read_at;
              return (
                <div key={n.id}
                  onClick={() => unread && handleMarkAsRead(n.id)}
                  className={`px-5 py-4 border-b border-white/5 last:border-0 transition-colors ${
                    unread ? "cursor-pointer hover:bg-white/6" : "hover:bg-white/3"
                  }`}
                  style={unread ? { borderLeft: "2px solid rgba(200,135,58,0.6)" } : {}}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">

                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        unread ? "bg-amber-500/15 border border-amber-500/25" : "bg-white/5 border border-white/10"
                      }`}>
                        {unread
                          ? <Bell size={13} className="text-amber-500" />
                          : <CheckCircle size={13} className="text-white/20" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${unread ? "font-semibold text-white" : "text-white/50"}`}>
                          {n.data?.message || n.data?.title || "New activity"}
                        </p>

                        {/* Transaction detail line */}
                        {(n.data?.units || n.data?.amount_kobo) && (
                          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {n.data.units ? `${n.data.units} units` : ""}
                            {n.data.units && n.data.amount_kobo ? " · " : ""}
                            {n.data.amount_kobo ? `₦${(n.data.amount_kobo / 100).toLocaleString()}` : ""}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock size={10} style={{ color: "rgba(255,255,255,0.2)" }} />
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                            {new Date(n.created_at).toLocaleString("en-NG", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {unread && (
                      <span className="w-2 h-2 rounded-full mt-2 shrink-0"
                        style={{ background: "linear-gradient(135deg, #C8873A, #E8A850)" }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}