import React, { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // Optional: clear any stale token when visiting login page
  useEffect(() => {
    localStorage.removeItem("token");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // IMPORTANT: pass token=null so Authorization header is NOT sent
      const res = await apiClient.post<{ token: string; user: any }>(
        "/auth/login",
        { email, password },
        null
      );

      login(res.token, res.user);
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Login failed";
      setError(msg);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-96">
        <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">
          MakanX Login
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-white bg-orange-500 rounded hover:bg-orange-600"
          >
            Login
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          <p>Demo Accounts:</p>
          <ul className="list-disc pl-5">
            <li>customer@makanx.com / password</li>
            <li>vendor@makanx.com / password</li>
            <li>organizer@makanx.com / password</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
