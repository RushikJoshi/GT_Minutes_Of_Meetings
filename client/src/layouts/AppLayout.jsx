import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWorkspace } from "../hooks/useWorkspace";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded hover:bg-gray-100 transition ${
          isActive ? "bg-gray-100 text-gray-900" : "text-gray-700"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, createWorkspace } = useWorkspace();
  const activeWs = workspaces.find((w) => w?.workspace?._id === activeWorkspaceId);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="font-bold text-gray-900">
            MOM System
          </Link>

          <nav className="flex items-center gap-1">
            <NavItem to="/dashboard">Dashboard</NavItem>
            <NavItem to="/calendar">Calendar</NavItem>
            <NavItem to="/meetings">Meetings</NavItem>
            <NavItem to="/action-items">Action Items</NavItem>
            <NavItem to="/documents">Documents</NavItem>
            <NavItem to="/reports">Reports</NavItem>
            <NavItem to="/notifications">Notifications</NavItem>
            <NavItem to="/settings">Settings</NavItem>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <select
                className="border rounded px-2 py-2 text-sm bg-white"
                value={activeWorkspaceId || ""}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                title="Active workspace"
              >
                {workspaces.map((w) => (
                  <option key={w.workspace._id} value={w.workspace._id}>
                    {w.workspace.name} ({w.role})
                  </option>
                ))}
              </select>
            </div>
            <button
              className="hidden md:inline-flex px-3 py-2 rounded border hover:bg-gray-50 transition text-sm"
              onClick={async () => {
                const name = window.prompt("Workspace name");
                if (!name) return;
                await createWorkspace(name);
              }}
              title="Create workspace"
            >
              + Workspace
            </button>
            <div className="text-sm text-gray-600 hidden sm:block">
              {activeWs?.workspace?.name ? `${activeWs.workspace.name} • ` : ""}
              {user?.email}
            </div>
            <button
              onClick={logout}
              className="px-3 py-2 rounded border hover:bg-gray-50 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="py-6">
        <Outlet />
      </main>
    </div>
  );
}

