export function toAbsUrl(pathOrUrl: string, baseUrl?: string) {
  if (!pathOrUrl) return pathOrUrl;

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const base = (baseUrl ?? import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return base ? `${base}${path}` : path;
}
