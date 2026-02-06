export function toAbsUrl(pathOrUrl: string, baseUrl?: string) {
  if (!pathOrUrl) return pathOrUrl;

  // Already absolute
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const base =
    (baseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  // If no base URL (e.g. during dev), return relative path safely
  return base ? `${base}${path}` : path;
}
