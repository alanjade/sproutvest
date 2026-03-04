"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import FormError from "../components/FormError";
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

const appname = process.env.NEXT_PUBLIC_APP_NAME || "Sproutvest";

export default function Login() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [form, setForm]               = useState({ email: "", password: "" });
  const [error, setError]             = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: "" });
    if (error) setError("");
  };

  const setCookie = (name, value) => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const user = await login(form.email, form.password);

      // Set user_role cookie
      const isAdmin = user?.is_admin === true || user?.data?.is_admin === true;
      setCookie("user_role", isAdmin ? "admin" : "user");

      const paramRedirect = searchParams.get("redirect");
      const savedRedirect = localStorage.getItem("redirectAfterLogin");
      const destination   = paramRedirect || savedRedirect || "/dashboard";

      localStorage.removeItem("redirectAfterLogin");

      if (destination === "/dashboard" || destination.startsWith("/dashboard/")) {
        sessionStorage.setItem("justLoggedIn", "1");
      }

      router.push(destination);
    } catch (err) {
      if (err.response?.status === 422) {
        const errors = err.response.data?.errors;
        if (errors) {
          setFieldErrors(
            Object.fromEntries(
              Object.entries(errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
            )
          );
        } else {
          const msg = err.response.data?.message || "Validation failed.";
          setError(msg);
          toast.error(msg);
        }
      } else {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Login failed. Please try again.";
        setError(msg);
        toast.error(msg, { duration: 5000, position: "top-center" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0D1F1A] flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #C8873A 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #2D7A55 0%, transparent 70%)" }} />
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative z-10 w-full max-w-md">

        <div className="text-center mb-10">
          <Link href="/">
            <h1 className="text-4xl font-bold text-white inline-block"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {appname.slice(0, -4)}
              <span style={{ color: "#C8873A" }}>{appname.slice(-4)}</span>
            </h1>
          </Link>
          <p className="text-white/40 mt-2 text-sm">Welcome back — your portfolio awaits</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Sign In
          </h2>
          <p className="text-white/40 text-sm mb-8">Enter your credentials to continue</p>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start gap-2.5">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <input
                  id="email" name="email" type="email" autoComplete="email"
                  value={form.email} onChange={handleChange}
                  placeholder="you@example.com" required
                  className={`w-full bg-white/5 border text-white placeholder-white/20 pl-11 pr-4 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${
                    fieldErrors.email ? "border-red-500/50" : "border-white/10 hover:border-white/20"
                  }`}
                />
              </div>
              <FormError error={fieldErrors.email} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-semibold text-white/50 uppercase tracking-widest">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <input
                  id="password" name="password" autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••" required
                  className={`w-full bg-white/5 border text-white placeholder-white/20 pl-11 pr-12 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${
                    fieldErrors.password ? "border-red-500/50" : "border-white/10 hover:border-white/20"
                  }`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <FormError error={fieldErrors.password} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-[#0D1F1A] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
              style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <><span>Sign In</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-xs">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 text-sm">
            <span className="text-white/40">Don't have an account?</span>
            <Link href="/register" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors">
              Create one free
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6 px-4">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-white/40 transition-colors">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-white/40 transition-colors">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}