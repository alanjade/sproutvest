"use client";

import { createContext, useState, useEffect, useContext, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "../utils/api";
import { resetNotificationCache } from "../services/notificationService";

export const AuthContext = createContext(null);

function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
}
function clearCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

const GUEST_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/support",
];

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
      const userData = res.data.user ?? res.data;
      setUser(userData);
      setCookie("auth_token", token);
      setCookie("user_role", userData?.role || "user");
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

    const userData = res.data?.user || null;
    setCookie("auth_token", token);
    setCookie("user_role", userData?.role || "user");

    if (userData) {
      setUser(userData);
    } else {
      try {
        const meRes       = await api.get("/me");
        const fetchedUser = meRes.data.user ?? meRes.data;
        setUser(fetchedUser);
        setCookie("user_role", fetchedUser?.role || "user");
      } catch {
        // non-fatal — user state will resolve on next protected-route load
      }
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