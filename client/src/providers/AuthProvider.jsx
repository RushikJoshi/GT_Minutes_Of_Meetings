import { createContext, useEffect, useMemo, useState } from "react";
import API, { setAuthToken } from "../api/api";

export const AuthContext = createContext(null);

const LS_KEY = "mom.token";

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(LS_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthToken(token);
    if (token) localStorage.setItem(LS_KEY, token);
    else localStorage.removeItem(LS_KEY);
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await API.get("/auth/me");
        if (!cancelled) setUser(res.data?.user || null);
      } catch (e) {
        if (!cancelled) {
          setUser(null);
          setToken("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      loading,
      async login(email, password) {
        const res = await API.post("/auth/login", { email, password });
        setToken(res.data?.token || "");
        setUser(res.data?.user || null);
      },
      async register(name, email, password) {
        const res = await API.post("/auth/register", { name, email, password });
        setToken(res.data?.token || "");
        setUser(res.data?.user || null);
      },
      logout() {
        setUser(null);
        setToken("");
      },
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

