import { useAuth } from "../state/AuthContext";

export const API_BASE = import.meta.env.VITE_API_URL ?? "";
if (!API_BASE) console.warn("VITE_API_URL is not set");
console.log("API_BASE =", API_BASE);

export async function apiFetch<T>(input: string, init?: RequestInit, token?: string | null): Promise<T> {
  const headers = new Headers(init?.headers || {});
  
  // Only set Content-Type to application/json if body is NOT FormData
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const res = await fetch(API_BASE + input, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export function useApi() {
  const { token } = useAuth();
  const call = <T,>(path: string, init?: RequestInit) => apiFetch<T>(path, init, token);
  return { call };
}

export const apiClient = {
  get: <T,>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: "GET" }, token),

  post: <T,>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(
      path,
      { method: "POST", body: JSON.stringify(body) },
      token
    ),

  postForm: <T,>(path: string, formData: FormData, token?: string | null) =>
    apiFetch<T>(
      path,
      { method: "POST", body: formData },
      token
    ),

  put: <T,>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(
      path,
      { method: "PUT", body: JSON.stringify(body) },
      token
    ),

  patch: <T,>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(
      path,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  del: <T,>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: "DELETE" }, token),
};
