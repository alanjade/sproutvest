"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "../../../utils/api";
import toast from "react-hot-toast";
import {
  MessageSquare, Clock, CheckCircle, AlertCircle,
  Send, Trash2, User, Search, X, Eye, ArrowLeft,
} from "lucide-react";

const STATUS_CONFIG = {
  open:    { label:"Open",    color:"text-cyan-400",  bg:"bg-cyan-500/10  border-cyan-500/20",  icon:<AlertCircle size={11}/> },
  waiting: { label:"Waiting", color:"text-amber-400", bg:"bg-amber-500/10 border-amber-500/20", icon:<Clock size={11}/> },
  closed:  { label:"Closed",  color:"text-white/40",  bg:"bg-white/5      border-white/10",     icon:<CheckCircle size={11}/> },
};

const PRIORITY_CONFIG = {
  low:    { label:"Low",    color:"text-white/40", dot:"bg-white/20" },
  normal: { label:"Normal", color:"text-blue-400", dot:"bg-blue-400" },
  high:   { label:"High",   color:"text-red-400",  dot:"bg-red-400"  },
};

const CATEGORIES = ["account","payment","kyc","investment","withdrawal","other"];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function PriorityDot({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`}/>
      {cfg.label}
    </span>
  );
}

function DarkSelect({ children, className="", ...props }) {
  return (
    <select className={`bg-[#0f2820] border border-white/10 hover:border-white/20 focus:border-cyan-500/40 text-white px-3 py-2 rounded-xl text-sm outline-none transition-all appearance-none cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  );
}

function TicketModal({ ticket, onClose, onUpdate }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localTicket, setLocalTicket] = useState(ticket);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const handleReply = async () => {
    if (!reply.trim()) { toast.error("Reply cannot be empty"); return; }
    try {
      setSending(true);
      const res = await api.post(`/admin/support/tickets/${localTicket.id}/reply`, { message: reply });
      const newMsg = res.data.data;
      setLocalTicket(prev => ({ ...prev, status:"waiting", messages:[...(prev.messages||[]), newMsg] }));
      setReply("");
      toast.success("Reply sent");
      onUpdate();
    } catch(err) {
      toast.error(err.response?.data?.message || "Failed to send reply");
    } finally { setSending(false); }
  };

  const handleStatusChange = async (status) => {
    try {
      setStatusUpdating(true);
      await api.patch(`/admin/support/tickets/${localTicket.id}/status`, { status });
      setLocalTicket(prev => ({ ...prev, status }));
      toast.success(`Ticket marked as ${status}`);
      onUpdate();
    } catch { toast.error("Failed to update status"); }
    finally { setStatusUpdating(false); }
  };

  const handlePriorityChange = async (priority) => {
    try {
      await api.patch(`/admin/support/tickets/${localTicket.id}/status`, { priority });
      setLocalTicket(prev => ({ ...prev, priority }));
      onUpdate();
    } catch { toast.error("Failed to update priority"); }
  };

  const handleDelete = async () => {
    if (localTicket.status !== "closed") { toast.error("Close the ticket before deleting"); return; }
    if (!window.confirm(`Permanently delete ticket ${localTicket.reference}?`)) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/support/tickets/${localTicket.id}`);
      toast.success("Ticket deleted");
      onClose(); onUpdate();
    } catch(err) {
      toast.error(err.response?.data?.message || "Failed to delete ticket");
    } finally { setDeleting(false); }
  };

  const authorName = (msg) => msg.sender_type === "admin" ? "Admin" : (localTicket.user?.name || localTicket.guest_name || "Guest");

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0f2820] shadow-2xl overflow-hidden"
        style={{ fontFamily:"'DM Sans', 'Helvetica Neue', sans-serif" }}>

        <div className="flex items-start justify-between p-6 border-b border-white/10 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-mono">
                {localTicket.reference}
              </code>
              <StatusBadge status={localTicket.status}/>
              <PriorityDot priority={localTicket.priority}/>
            </div>
            <h2 className="text-base font-bold text-white truncate" style={{ fontFamily:"'Playfair Display', Georgia, serif" }}>
              {localTicket.subject}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              {localTicket.user
                ? `${localTicket.user.name} · ${localTicket.user.email}`
                : `${localTicket.guest_name} · ${localTicket.guest_email} (guest)`}
              {" · "}<span className="capitalize">{localTicket.category}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0">
            <X size={16}/>
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 bg-white/5 shrink-0 flex-wrap">
          <span className="text-xs text-white/30 mr-1">Status:</span>
          {["open","waiting","closed"].map(s => (
            <button key={s} onClick={() => handleStatusChange(s)} disabled={statusUpdating || localTicket.status===s}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                localTicket.status===s
                  ? "bg-white/10 border-white/20 text-white"
                  : "border-white/5 text-white/40 hover:text-white hover:border-white/20 hover:bg-white/5"
              }`}>
              {STATUS_CONFIG[s].label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-white/30">Priority:</span>
            <DarkSelect value={localTicket.priority||"normal"} onChange={e => handlePriorityChange(e.target.value)}>
              {Object.entries(PRIORITY_CONFIG).map(([v,c]) => <option key={v} value={v}>{c.label}</option>)}
            </DarkSelect>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(localTicket.messages||[]).length===0 && <p className="text-center text-white/20 text-sm py-8">No messages yet</p>}
          {(localTicket.messages||[]).map((msg,i) => {
            const isAdmin = msg.sender_type==="admin";
            return (
              <div key={msg.id||i} className={`flex ${isAdmin?"justify-end":"justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isAdmin?"bg-cyan-500/15 border border-cyan-500/20 rounded-br-sm":"bg-white/5 border border-white/10 rounded-bl-sm"}`}>
                  <p className={`text-xs font-bold mb-1 ${isAdmin?"text-cyan-400":"text-white/50"}`}>{authorName(msg)}</p>
                  <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                  <p className="text-[10px] text-white/20 mt-1.5">{new Date(msg.created_at).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>

        {localTicket.status!=="closed" ? (
          <div className="p-4 border-t border-white/10 bg-[#0f2820] shrink-0">
            <div className="flex gap-3">
              <textarea value={reply} onChange={e=>setReply(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) handleReply(); }}
                placeholder="Write a reply… (Cmd+Enter to send)" rows={3}
                className="flex-1 bg-white/5 border border-white/10 focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"/>
              <button onClick={handleReply} disabled={sending||!reply.trim()}
                className="flex flex-col items-center justify-center gap-1 px-4 rounded-xl font-bold text-[#0D1F1A] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] shrink-0"
                style={{ background:"linear-gradient(135deg, #06B6D4, #0891B2)" }}>
                {sending
                  ? <div className="w-4 h-4 border-2 border-[#0D1F1A]/40 border-t-[#0D1F1A] rounded-full animate-spin"/>
                  : <Send size={16}/>}
                <span className="text-[10px]">Send</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-white/10 bg-white/5 shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/30">This ticket is closed.</p>
              <div className="flex gap-2">
                <button onClick={()=>handleStatusChange("open")}
                  className="text-xs font-semibold text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 px-3 py-1.5 rounded-lg transition-all">
                  Reopen
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="text-xs font-semibold text-red-400 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50">
                  <Trash2 size={12}/> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSupportTickets() {
  const searchParams = useSearchParams();
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters]       = useState({
    status:   searchParams.get("status")||"",
    priority: "", category: "", search: "",
  });
  const [pagination, setPagination] = useState({ currentPage:1, lastPage:1, total:0 });

  const fetchTickets = useCallback(async (page=1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ per_page:20, page });
      if (filters.status)   params.append("status",   filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.category) params.append("category", filters.category);
      if (filters.search)   params.append("search",   filters.search);
      const res = await api.get(`/admin/support/tickets?${params}`);
      const data = res.data.data;
      setTickets(data.data ?? data);
      setPagination({ currentPage:data.current_page??1, lastPage:data.last_page??1, total:data.total??0 });
    } catch { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTickets(1); }, [fetchTickets]);

  const openTicket = async (ticketId) => {
    try {
      const res = await api.get(`/admin/support/tickets/${ticketId}`);
      setSelectedTicket(res.data.data);
    } catch { toast.error("Failed to load ticket details"); }
  };

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]:value }));
  const openCount  = tickets.filter(t=>t.status==="open").length;
  const waitCount  = tickets.filter(t=>t.status==="waiting").length;

  const statusTabs = [
    { value:"",       label:"All" },
    { value:"open",   label:"Open" },
    { value:"waiting",label:"Waiting" },
    { value:"closed", label:"Closed" },
  ];

  return (
    <div className="min-h-screen bg-[#0D1F1A] relative" style={{ fontFamily:"'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage:"radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize:"28px 28px" }}/>
      <div className="absolute top-0 left-0 w-[40vw] h-[40vw] rounded-full opacity-10 pointer-events-none"
        style={{ background:"radial-gradient(circle, #06B6D4 0%, transparent 70%)" }}/>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-8">
          <ArrowLeft size={13}/> Back to Dashboard
        </Link>

        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-cyan-500 mb-2">Admin Panel</p>
            <h1 className="text-4xl font-bold text-white" style={{ fontFamily:"'Playfair Display', Georgia, serif" }}>
              Support Tickets
            </h1>
            <p className="text-white/40 mt-1 text-sm">
              {pagination.total} total · {openCount} open · {waitCount} waiting
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            {statusTabs.map(tab => (
              <button key={tab.value} onClick={()=>handleFilterChange("status",tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filters.status===tab.value ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                }`}>
                {tab.label}
                {tab.value==="open" && openCount>0 && (
                  <span className="ml-1.5 text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">{openCount}</span>
                )}
              </button>
            ))}
          </div>

          <DarkSelect value={filters.priority} onChange={e=>handleFilterChange("priority",e.target.value)}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </DarkSelect>

          <DarkSelect value={filters.category} onChange={e=>handleFilterChange("category",e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </DarkSelect>

          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"/>
            <input value={filters.search} onChange={e=>handleFilterChange("search",e.target.value)}
              placeholder="Search reference, subject, email…"
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-cyan-500/40 text-white placeholder-white/20 pl-10 pr-9 py-2 rounded-xl text-sm outline-none transition-all"/>
            {filters.search && (
              <button onClick={()=>handleFilterChange("search","")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
                <X size={13}/>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : tickets.length===0 ? (
          <div className="text-center py-24 border border-white/10 rounded-2xl">
            <MessageSquare size={40} className="mx-auto mb-4 text-white/10"/>
            <p className="text-white/30">No tickets found</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="grid grid-cols-[70px_1.8fr_1fr_1fr_80px_80px_50px] gap-3 px-6 py-3 border-b border-white/10 bg-white/5">
              {["Ref","Subject / User","Category","Status","Priority","Updated",""].map(h=>(
                <span key={h} className="text-xs font-bold uppercase tracking-widest text-white/30">{h}</span>
              ))}
            </div>
            {tickets.map((ticket,i)=>(
              <div key={ticket.id}
                className={`grid grid-cols-[70px_1.8fr_1fr_1fr_80px_80px_50px] gap-3 px-6 py-4 items-center hover:bg-white/5 transition-colors cursor-pointer ${i<tickets.length-1?"border-b border-white/5":""}`}
                onClick={()=>openTicket(ticket.id)}>
                <code className="text-xs text-amber-500/70 font-mono truncate">
                  {ticket.reference?.replace("TKT-","")||ticket.id}
                </code>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                  <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                    <User size={10}/>{ticket.user?.name||ticket.guest_name||"Guest"}
                  </p>
                </div>
                <span className="text-xs text-white/50 capitalize">{ticket.category}</span>
                <StatusBadge status={ticket.status}/>
                <PriorityDot priority={ticket.priority||"normal"}/>
                <p className="text-xs text-white/30">{new Date(ticket.updated_at).toLocaleDateString()}</p>
                <Eye size={14} className="text-white/20 hover:text-white/60 transition-colors"/>
              </div>
            ))}
          </div>
        )}

        {pagination.lastPage>1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({length:pagination.lastPage},(_,i)=>i+1).map(page=>(
              <button key={page} onClick={()=>fetchTickets(page)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                  pagination.currentPage===page
                    ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400"
                    : "text-white/30 hover:text-white hover:bg-white/5 border border-transparent"
                }`}>{page}</button>
            ))}
          </div>
        )}
      </div>

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={()=>setSelectedTicket(null)}
          onUpdate={()=>fetchTickets(pagination.currentPage)}
        />
      )}
    </div>
  );
}