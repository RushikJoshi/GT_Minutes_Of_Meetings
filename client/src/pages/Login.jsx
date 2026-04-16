import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      const to = location.state?.from || "/dashboard";
      navigate(to, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || "Login failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white shadow rounded p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-gray-600 mt-1">Welcome back.</p>

        {error ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              className="w-full border rounded p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input
              className="w-full border rounded p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              placeholder="••••••••"
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800 transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          New here?{" "}
          <Link className="text-blue-700 hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

