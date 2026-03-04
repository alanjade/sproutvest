"use client";

import { createContext, useState, useEffect, useContext, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "../utils/api";
import { resetNotificationCache } from "../services/notificationService";

export const AuthContext = createContext(null);

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function getRole(user) {
  if (!user) return "user";
  if (user.is_admin === true) return "admin";
  if (user.role === "admin")  return "admin";
  return "user";
}

function setCookie(name, value) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax`;
}

function clearCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GUEST_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/support",
];

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const router   = useRouter();
  const pathname = usePathname();

  const hasCheckedAuth = useRef(false);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    try {
      const res      = await api.get("/me");
      const userData = res.data?.data ?? res.data?.user ?? res.data;
      setUser(userData);
      setCookie("auth_token", token);
      setCookie("user_role", getRole(userData));
    } catch (err) {
      console.error("Auth check failed:", err);
      resetNotificationCache();
      localStorage.removeItem("token");
      delete api.defaults.headers.common.Authorization;
      clearCookie("auth_token");
      clearCookie("user_role");
      setUser(null);

      const isGuestRoute = GUEST_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(r + "/")
      );
      if (!isGuestRoute) {
        localStorage.setItem("redirectAfterLogin", pathname);
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/login", { email, password });

    const token =
      res.data?.token ||
      res.data?.access_token ||
      res.data?.data?.token;

    if (!token) throw new Error("Token not returned from server");

    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    try {
      const meRes    = await api.get("/me");
      const userData = meRes.data?.data ?? meRes.data?.user ?? meRes.data;
      setUser(userData);
      setCookie("auth_token", token);
      setCookie("user_role", getRole(userData));
    } catch {
      // Fallback to whatever the login response returned
      const userData = res.data?.user ?? null;
      setUser(userData);
      setCookie("auth_token", token);
      setCookie("user_role", getRole(userData));
    }
  };

  const logout = () => {
    api.post("/logout").catch(() => {});
    resetNotificationCache();
    localStorage.removeItem("token");
    localStorage.removeItem("redirectAfterLogin");
    delete api.defaults.headers.common.Authorization;
    clearCookie("auth_token");
    clearCookie("user_role");
    setUser(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);