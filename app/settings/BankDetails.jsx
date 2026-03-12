"use client";

import { useState, useEffect } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { Landmark, Lock, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";

export default function BankDetails() {
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [banks, setBanks] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  /* ── Fetch existing details ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/me");
        const data = res.data.user || res.data.data || res.data;
        const bank = data.bank_name?.trim() || "";
        const number = data.account_number?.trim() || "";
        const name = data.account_name?.trim() || "";
        setBankName(bank);
        setAccountNumber(number);
        setAccountName(name);
        if (bank && number && name) setIsLocked(true);
      } catch {
        toast.error("Unable to load your bank details.");
      }
    })();
  }, []);

  /* ── Fetch bank list ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/paystack/banks");
        setBanks(res.data.banks || []);
      } catch {
        toast.error("Unable to load bank list.");
      }   
    })();
  }, []);

  /* ── Auto-verify account ── */
  useEffect(() => {
    if (!bankCode || accountNumber.length !== 10) return;
    const verify = async () => {
      setVerifying(true);
      try {
        const res = await api.post("/paystack/resolve-account", {
          account_number: accountNumber,
          bank_code: bankCode,
        });
        const name = res.data.account_name || res.data.data?.account_name || "";
        if (name) {
          setAccountName(name);
          toast.success("Account verified!");
        } else {
          setAccountName("");
          toast.error("Unable to verify account.");
        }
      } catch {
        setAccountName("");
        toast.error("Account verification failed.");
      } finally {
        setVerifying(false);
      }
    };
    verify();
  }, [bankCode, accountNumber]);

  /* ── Submit ── */
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName) {
      return toast.error("Please fill in all fields and verify your account.");
    }
    setLoading(true);
    try {
      const res = await api.put("/user/bank-details", {
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      });
      setIsLocked(true);
      toast.success(res.data.message || "Bank details saved!");
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to save bank details");
    } finally {
      setLoading(false);
    }
  };

  if (isLocked) {
    return (
      <div className="space-y-4">
        <ReadonlyField label="Bank Name" value={bankName} />
        <ReadonlyField label="Account Number" value={accountNumber} />
        <ReadonlyField label="Account Name" value={accountName} />

        <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3.5 mt-2">
          <Lock size={13} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-white/40 leading-relaxed">
            Bank details are locked after being set once. Contact support to change them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleUpdate} className="space-y-5">

      {/* Bank selector */}
      <Field label="Bank Name">
        <div className="relative">
          <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
          <select
            value={bankCode}
            onChange={(e) => {
              const code = e.target.value;
              const bank = banks.find((b) => b.code === code);
              setBankCode(code);
              setBankName(bank?.name || "");
            }}
            className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white pl-11 pr-10 py-3 rounded-xl text-sm outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="" className="bg-[#0D1F1A]">Select Bank</option>
            {banks.map((bank, i) => (
              <option key={`${bank.code}-${i}`} value={bank.code} className="bg-[#0D1F1A]">
                {bank.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
        </div>
      </Field>

      {/* Account number */}
      <Field label="Account Number">
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          maxLength={10}
          placeholder="Enter 10-digit account number"
          className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 px-4 py-3 rounded-xl text-sm outline-none transition-all tracking-widest"
        />
        {/* Verifying indicator */}
        {verifying && (
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-400">
            <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            Verifying account...
          </div>
        )}
      </Field>

      {/* Account name (readonly, populated after verify) */}
      {accountName && !verifying && (
        <Field label="Account Name">
          <div className="relative">
            <input
              type="text" value={accountName} readOnly
              className="w-full bg-white/[0.03] border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm cursor-not-allowed"
            />
            <CheckCircle size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400" />
          </div>
        </Field>
      )}

      <button
        type="submit"
        disabled={loading || verifying || !accountName}
        className="w-full py-3.5 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#0D1F1A]/40 border-t-[#0D1F1A] rounded-full animate-spin" />
            Saving...
          </span>
        ) : "Save Bank Details"}
      </button>
    </form>
  );
}

/* ── Sub-components ── */
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">{label}</label>
      {children}
    </div>
  );
}

function ReadonlyField({ label, value }) {
  return (
    <Field label={label}>
      <input
        type="text" value={value} readOnly
        className="w-full bg-white/[0.03] border border-white/8 text-white/50 px-4 py-3 rounded-xl text-sm cursor-not-allowed"
      />
    </Field>
  );
}
