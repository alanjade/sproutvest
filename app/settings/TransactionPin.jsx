"use client";

import { useState, useEffect } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import PinInput from "../components/PinInput";
import { KeyRound, AlertCircle } from "lucide-react";

export default function TransactionPin() {
  const [hasPin, setHasPin]         = useState(false);
  const [currentPin, setCurrentPin] = useState(["", "", "", ""]);
  const [newPin, setNewPin]         = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [touched, setTouched]       = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/me");
        const u = res.data?.user ?? res.data?.data ?? {};
        setHasPin(!!u.transaction_pin);
      } catch {}
    })();
  }, []);

  const pinToString = (arr) => arr.join("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const newPinStr     = pinToString(newPin);
    const confirmPinStr = pinToString(confirmPin);
    const currentPinStr = pinToString(currentPin);

    if (newPinStr.length !== 4 || confirmPinStr.length !== 4) {
      const msg = "PIN must contain exactly 4 digits.";
      setError(msg); toast.error(msg); return;
    }
    if (newPinStr !== confirmPinStr) {
      const msg = "New PIN and confirmation PIN do not match.";
      setError(msg); toast.error(msg); return;
    }
    if (hasPin && currentPinStr.length !== 4) {
      const msg = "Please enter your current PIN.";
      setError(msg); toast.error(msg); return;
    }

    setLoading(true);
    try {
      if (hasPin) {
        await api.post("/user/pin/update", { old_pin: currentPinStr, new_pin: newPinStr });
        toast.success("Transaction PIN updated successfully");
      } else {
        await api.post("/user/pin/set", { pin: newPinStr });
        toast.success("Transaction PIN set successfully");
        setHasPin(true);
      }
      setCurrentPin(["", "", "", ""]);
      setNewPin(["", "", "", ""]);
      setConfirmPin(["", "", "", ""]);
      setTouched({ current: false, new: false, confirm: false });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to update PIN. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <KeyRound size={15} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-white/40 leading-relaxed">
          {hasPin
            ? "Enter your current PIN to set a new one. Your PIN is used to authorise all transactions."
            : "Set a 4-digit PIN to secure your transactions. You'll need it every time you buy or sell."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {hasPin && (
          <PinField label="Current PIN">
            <PinInput
              value={currentPin} onChange={setCurrentPin}
              touched={touched.current}
              setTouched={() => setTouched((p) => ({ ...p, current: true }))}
              dark
            />
          </PinField>
        )}

        <PinField label="New PIN">
          <PinInput
            value={newPin} onChange={setNewPin}
            touched={touched.new}
            setTouched={() => setTouched((p) => ({ ...p, new: true }))}
            dark
          />
        </PinField>

        <PinField label="Confirm New PIN">
          <PinInput
            value={confirmPin} onChange={setConfirmPin}
            touched={touched.confirm}
            setTouched={() => setTouched((p) => ({ ...p, confirm: true }))}
            dark
          />
        </PinField>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-red-400 text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#0D1F1A]/40 border-t-[#0D1F1A] rounded-full animate-spin" />
              Processing...
            </span>
          ) : hasPin ? "Update PIN" : "Set PIN"}
        </button>
      </form>
    </div>
  );
}

function PinField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-3">{label}</label>
      {children}
    </div>
  );
}