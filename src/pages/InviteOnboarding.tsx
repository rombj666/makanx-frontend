import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../state/AuthContext";

const InviteOnboarding = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await apiClient.get<{ email: string }>(`/auth/invite/${token}`, null);
        setEmail(res.email);
      } catch (err: any) {
        setError(err.message || "Invalid invite");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const res = await apiClient.post<{ token: string; user: any }>(
        "/auth/complete-invite",
        { token, password, name },
        null
      );
      login(res.token, res.user);
      navigate("/vendor/orders", { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to complete invite");
    }
  };

  if (loading) return <div className="p-6">Loading invite...</div>;

  return (
    <div className="flex items-center justify-center min-h-dvh bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-96">
        <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">
          Complete Your Vendor Invite
        </h2>

        {error && <p className="mb-4 text-red-500 text-sm">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              className="w-full px-3 py-2 border rounded bg-gray-50"
              disabled
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Vendor name"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Create a password"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Confirm password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-white bg-orange-500 rounded hover:bg-orange-600"
          >
            Complete Invite
          </button>
        </form>
      </div>
    </div>
  );
};

export default InviteOnboarding;
