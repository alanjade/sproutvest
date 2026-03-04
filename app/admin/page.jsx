"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import api from "../../utils/api";
import toast from "react-hot-toast";
import {
  Users, Search, ShieldX,
  ArrowLeft, Eye, MoreVertical,
  Crown, UserX, UserCheck, Trash2,
  ChevronLeft, ChevronRight, Filter, X, AlertCircle,
} from "lucide-react";

const KYC_CONFIG = {
  approved:      { label: "Verified",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  pending:       { label: "Pending",      color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/20"   },
  rejected:      { label: "Rejected",     color: "text-red-400",     bg: "bg-red-500/10    border-red-500/20"     },
  resubmit:      { label: "Resubmit",     color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20"  },
  not_submitted: { label: "Not Submitted",color: "text-white/30",    bg: "bg-white/5       border-white/10"       },
};

const fmt = (n) => `₦${((n ?? 0) / 100).toLocaleString("en-NG")}`;

const fmtShort = (kobo) => {
  const n = (kobo ?? 0) / 100;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n.toLocaleString("en-NG")}`;
};

const fmtDate = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
};

function KycBadge({ status }) {
  const cfg = KYC_CONFIG[status] || KYC_CONFIG.not_submitted;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

function ActionBtn({ onClick, loading, icon, label, cls = "" }) {
  return (
    <button onClick={onClick} disabled={!!loading}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}>
      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : icon}
      {label}
    </button>
  );
}

function UserMenuItems({ user, onView, onAction, onClose }) {
  const item = (cb, icon, label, color = "text-white/70") => (
    <button key={label}
      onClick={() => { cb(); onClose(); }}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm ${color} hover:bg-white/5 transition-colors text-left`}>
      {icon} {label}
    </button>
  );
  return (
    <>
      {item(onView, <Eye size={14} />, "View Details")}
      {!user.is_admin && <>
        {user.is_suspended
          ? item(() => onAction("unsuspend", user), <UserCheck size={14}/>, "Unsuspend", "text-emerald-400")
          : item(() => onAction("suspend", user, `Suspend ${user.name}?`), <UserX size={14}/>, "Suspend", "text-amber-400")}
        {item(() => onAction("makeAdmin", user, `Make ${user.name} an admin?`), <Crown size={14}/>, "Make Admin", "text-purple-400")}
        <div className="h-px bg-white/10 my-1" />
        {item(() => onAction("delete", user, `Permanently delete ${user.name}?`), <Trash2 size={14}/>, "Delete", "text-red-400")}
      </>}
      {user.is_admin &&
        item(() => onAction("removeAdmin", user, `Remove admin from ${user.name}?`), <ShieldX size={14}/>, "Remove Admin", "text-orange-400")}
    </>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters]       = useState({ suspended: "", is_admin: "", kyc_status: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage]             = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [menuOpen, setMenuOpen]     = useState(null);
  const menuRef                     = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filters]);
  useEffect(() => { fetchUsers(); }, [page, debouncedSearch, filters]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 20 });
      if (debouncedSearch)    params.set("search",     debouncedSearch);
      if (filters.suspended)  params.set("suspended",  filters.suspended);
      if (filters.is_admin)   params.set("is_admin",   filters.is_admin);
      if (filters.kyc_status) params.set("kyc_status", filters.kyc_status);
      const res = await api.get(`/admin/users?${params}`);
      const d   = res.data.data;
      setUsers(d.data ?? d ?? []);
      setPagination({ current_page: d.current_page ?? 1, last_page: d.last_page ?? 1, total: d.total ?? 0 });
    } catch { toast.error("Failed to load users"); }
    finally  { setLoading(false); }
  };

  const viewUser = async (userId) => {
    setMenuOpen(null);
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setSelectedUser(res.data.data);
      setShowModal(true);
    } catch { toast.error("Failed to load user details"); }
  };

  const closeModal = () => { setShowModal(false); setSelectedUser(null); };

  const doAction = async (action, user, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setActionLoading(action);
    try {
      const map = {
        suspend:     ["patch",  `/admin/users/${user.id}/suspend`],
        unsuspend:   ["patch",  `/admin/users/${user.id}/unsuspend`],
        makeAdmin:   ["patch",  `/admin/users/${user.id}/make-admin`],
        removeAdmin: ["patch",  `/admin/users/${user.id}/remove-admin`],
        delete:      ["delete", `/admin/users/${user.id}`],
      };
      const [method, url] = map[action];
      const res = await api[method](url);
      toast.success(res.data.message);
      setMenuOpen(null);
      if (showModal) closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally { setActionLoading(null); }
  };

  const clearFilters = () => { setFilters({ suspended: "", is_admin: "", kyc_status: "" }); setSearch(""); };
  const hasActiveFilters = filters.suspended || filters.is_admin || filters.kyc_status || debouncedSearch;

  return (
    <div className="min-h-screen bg-[#0D1F1A] relative" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-6">
          ← Back to Dashboard
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-cyan-400 mb-2">Admin Panel</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              User Management
            </h1>
            <p className="text-white/40 mt-1 text-sm">{pagination.total} total users</p>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or UID..."
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-white/20 pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X size={14} /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${showFilters || hasActiveFilters ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"}`}>
            <Filter size={15} /> Filters {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-white/70 text-sm transition-all">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-xl border border-white/10 bg-white/3">
            {[
              { label: "Status", key: "suspended",  options: [["","All Users"],["true","Suspended"],["false","Active"]] },
              { label: "Role",   key: "is_admin",   options: [["","All Roles"],["true","Admins Only"],["false","Regular Users"]] },
              { label: "KYC",    key: "kyc_status", options: [["","All"],["not_submitted","Not Submitted"],["pending","Pending"],["approved","Approved"],["rejected","Rejected"],["resubmit","Resubmit"]] },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">{f.label}</label>
                <select value={filters[f.key]} onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-500/40">
                  {f.options.map(([val, lbl]) => <option key={val} value={val} className="bg-[#0D1F1A]">{lbl}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-24 border border-white/10 rounded-2xl">
            <Users size={40} className="mx-auto mb-4 text-white/10" />
            <p className="text-white/30">No users found</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-2xl border border-white/10 bg-white/5 mb-5" style={{ overflow: "visible" }}>
              <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_44px] gap-4 px-6 py-3 border-b border-white/10 bg-white/5 rounded-t-2xl">
                {["User","UID","KYC","Balance","Joined",""].map((h) => (
                  <span key={h} className="text-xs font-bold uppercase tracking-widest text-white/30">{h}</span>
                ))}
              </div>
              {users.map((user, i) => {
                const kycStatus = user.kyc_verification?.status ?? "not_submitted";
                return (
                  <div key={user.id}
                    className={`grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_44px] gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors ${i < users.length - 1 ? "border-b border-white/5" : ""}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        {user.is_admin    && <Crown size={11} className="text-amber-400 shrink-0" />}
                        {user.is_suspended && <UserX size={11} className="text-red-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-white/30 truncate">{user.email}</p>
                    </div>
                    <p className="text-xs font-mono text-white/40 truncate">{user.uid}</p>
                    <KycBadge status={kycStatus} />
                    <p className="text-sm text-white/70 tabular-nums">{fmt(user.balance_kobo)}</p>
                    <p className="text-xs text-white/30">{fmtDate(user.created_at)}</p>

                    {/* Dropdown — z-[200] breaks out of table stacking context */}
                    <div className="relative flex items-center justify-center"
                      ref={menuOpen === user.id ? menuRef : null}>
                      <button onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                        <MoreVertical size={14} />
                      </button>
                      {menuOpen === user.id && (
                        <div className="absolute right-0 top-9 w-48 rounded-xl border border-white/10 bg-[#0f2820] shadow-2xl py-1"
                          style={{ zIndex: 200 }}>
                          <UserMenuItems user={user} onView={() => viewUser(user.id)}
                            onAction={doAction} onClose={() => setMenuOpen(null)} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 mb-5">
              {users.map((user) => {
                const kycStatus = user.kyc_verification?.status ?? "not_submitted";
                return (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className="text-sm font-bold text-white truncate">{user.name}</p>
                          {user.is_admin    && <Crown size={11} className="text-amber-400 shrink-0" />}
                          {user.is_suspended && <span className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold shrink-0">Suspended</span>}
                        </div>
                        <p className="text-xs text-white/30 truncate">{user.email}</p>
                      </div>
                      <div className="relative shrink-0" ref={menuOpen === user.id ? menuRef : null}>
                        <button onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                          <MoreVertical size={14} />
                        </button>
                        {menuOpen === user.id && (
                          <div className="absolute right-0 top-9 w-48 rounded-xl border border-white/10 bg-[#0f2820] shadow-2xl py-1" style={{ zIndex: 200 }}>
                            <UserMenuItems user={user} onView={() => viewUser(user.id)}
                              onAction={doAction} onClose={() => setMenuOpen(null)} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-lg p-2 min-w-0">
                        <p className="text-[10px] text-white/30 mb-0.5">KYC</p>
                        <KycBadge status={kycStatus} />
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 min-w-0">
                        <p className="text-[10px] text-white/30 mb-0.5">Balance</p>
                        <p className="text-xs font-bold text-white truncate">{fmtShort(user.balance_kobo)}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 min-w-0">
                        <p className="text-[10px] text-white/30 mb-0.5">Joined</p>
                        <p className="text-xs text-white/60 truncate">{fmtDate(user.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination.last_page > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/30">Page {pagination.current_page} of {pagination.last_page}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.current_page === 1}
                    className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft size={15} />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))} disabled={pagination.current_page === pagination.last_page}
                    className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0f2820] shadow-2xl">
            <div className="flex items-start justify-between p-4 sm:p-6 border-b border-white/10 sticky top-0 bg-[#0f2820] z-10">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{selectedUser.name}</h2>
                  {selectedUser.is_admin    && <Crown size={14} className="text-amber-400" />}
                  {selectedUser.is_suspended && <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold">Suspended</span>}
                </div>
                <p className="text-white/40 text-xs sm:text-sm mt-0.5 truncate">{selectedUser.email}</p>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: "Balance",     value: fmt(selectedUser.balance_kobo) },
                  { label: "Rewards",     value: fmt(selectedUser.rewards_balance_kobo) },
                  { label: "Lands Owned", value: selectedUser.total_lands ?? 0 },
                  { label: "Units Owned", value: selectedUser.total_units_owned ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-sm font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {[
                  { label: "UID",    value: selectedUser.uid },
                  { label: "KYC",    value: <KycBadge status={selectedUser.kyc_status ?? "not_submitted"} /> },
                  { label: "Joined", value: fmtDate(selectedUser.created_at) },
                  { label: "Bank",   value: selectedUser.bank_name ? `${selectedUser.bank_name} — ${selectedUser.account_number}` : "Not set" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{item.label}</p>
                    <div className="text-sm font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              {!selectedUser.is_admin ? (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30">Actions</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedUser.is_suspended
                      ? <ActionBtn onClick={() => doAction("unsuspend", selectedUser)} loading={actionLoading === "unsuspend"} icon={<UserCheck size={15}/>} label="Unsuspend" cls="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20" />
                      : <ActionBtn onClick={() => doAction("suspend", selectedUser, `Suspend ${selectedUser.name}?`)} loading={actionLoading === "suspend"} icon={<UserX size={15}/>} label="Suspend" cls="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20" />}
                    <ActionBtn onClick={() => doAction("makeAdmin", selectedUser, `Make ${selectedUser.name} an admin?`)} loading={actionLoading === "makeAdmin"} icon={<Crown size={15}/>} label="Make Admin" cls="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20" />
                  </div>
                  <ActionBtn onClick={() => doAction("delete", selectedUser, `Permanently delete ${selectedUser.name}? This cannot be undone.`)} loading={actionLoading === "delete"} icon={<Trash2 size={15}/>} label="Delete Account" cls="border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 w-full" />
                </div>
              ) : (
                <ActionBtn onClick={() => doAction("removeAdmin", selectedUser, `Remove admin privileges from ${selectedUser.name}?`)} loading={actionLoading === "removeAdmin"} icon={<ShieldX size={15}/>} label="Remove Admin Privileges" cls="border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 w-full" />
              )}
              <div className="h-2 sm:h-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}