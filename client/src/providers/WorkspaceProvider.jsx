import { createContext, useEffect, useMemo, useState } from "react";
import API, { setWorkspaceId } from "../api/api";
import { useAuth } from "../hooks/useAuth";

export const WorkspaceContext = createContext(null);

const LS_KEY = "mom.workspaceId";

export default function WorkspaceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    () => localStorage.getItem(LS_KEY) || ""
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWorkspaceId(activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isAuthenticated) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await API.get("/workspaces");
        const items = Array.isArray(res.data) ? res.data : [];
        if (cancelled) return;
        setWorkspaces(items);
        const firstId = items?.[0]?.workspace?._id || "";
        const currentOk = activeWorkspaceId && items.some((w) => w?.workspace?._id === activeWorkspaceId);
        const nextId = currentOk ? activeWorkspaceId : firstId;
        setActiveWorkspaceId(nextId);
        if (nextId) localStorage.setItem(LS_KEY, nextId);
      } catch {
        if (!cancelled) setWorkspaces([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      setActiveWorkspaceId,
      loading,
      async createWorkspace(name) {
        const res = await API.post("/workspaces", { name });
        const created = res.data;
        setWorkspaces((prev) => [created, ...prev]);
        const id = created?.workspace?._id;
        if (id) setActiveWorkspaceId(id);
        return created;
      },
    }),
    [workspaces, activeWorkspaceId, loading]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

