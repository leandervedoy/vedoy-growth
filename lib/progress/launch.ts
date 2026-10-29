/** Server-side launch policy. Nothing opens unless explicitly listed below. */
export const WORKSPACE_RETRY_AFTER_SECONDS = 3600;
export const WORKSPACE_UNAVAILABLE_MESSAGE = "Arbeidsflaten er under utvikling.";

const publicPages = new Set([
  "/",
  "/laer",
  "/register",
  "/login",
  "/konto",
  "/personvern",
  "/under-utvikling",
  "/auth/callback",
]);

const publicApis = new Set([
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/launch/profile",
]);

const publicAssets = new Set([
  "/favicon.ico",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/_next/image",
  "/_next/webpack-hmr",
]);

const publicAssetPrefixes = ["/_next/static/", "/images/", "/fonts/", "/logos/", "/static/"];

export function isGrowthWorkspaceOpen(value = process.env.GROWTH_WORKSPACE_OPEN): boolean {
  return value === "true";
}

/** Canonicalize before matching; reject encoded traversal and ambiguous separators. */
export function normalizeLaunchPath(pathname: string): string | null {
  let path = pathname.split(/[?#]/, 1)[0];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Next can keep encoded dots or separators inside a dynamic parameter.
    // Never turn /blog/%252e%252e into an allowlisted / pathname ourselves.
    // Repeat this check after each decode so nested encodings also fail closed.
    if (/%(?:2e|2f|5c)/i.test(path)) return null;
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return null;
    }
    if (decoded === path) break;
    path = decoded;
  }

  // Do not allow ambiguous encodings or URL/control delimiters into the allowlist.
  if (/%[0-9a-f]{2}|[\u0000-\u001f\u007f?#]/i.test(path)) return null;
  path = path.replace(/\\/g, "/");
  if (!path.startsWith("/")) return null;

  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return `/${segments.join("/")}`;
}

type LaunchRequest = {
  pathname: string;
  method?: string;
  headers?: Pick<Headers, "has">;
  workspaceOpen?: boolean;
};

export type LaunchDecision =
  | { kind: "allow"; pathname: string }
  | { kind: "unavailable"; reason: "server_actions_disabled" | "unsupported_method" | "workspace_closed" | "invalid_path" }
  | { kind: "redirect"; location: "/under-utvikling" };

export function classifyLaunchRequest({ pathname, method = "GET", headers, workspaceOpen = false }: LaunchRequest): LaunchDecision {
  // Header names are case-insensitive in both Web Headers and NextRequest.
  // New public forms use REST. Never dispatch an old server action on a public URL.
  if (headers?.has("next-action")) return { kind: "unavailable", reason: "server_actions_disabled" };

  const path = normalizeLaunchPath(pathname);
  if (!path) return { kind: "unavailable", reason: "invalid_path" };

  const isApi = /^\/api(?:\/|$)/i.test(path);
  const readOnlyRequest = method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD";
  const isPublicPage = publicPages.has(path) || /^\/laer\/[^/]+$/.test(path);

  if (isPublicPage) {
    // Multipart server-action forms can omit Next-Action. No public page accepts POST.
    return readOnlyRequest ? { kind: "allow", pathname: path } : { kind: "unavailable", reason: "unsupported_method" };
  }
  if (publicApis.has(path)) return { kind: "allow", pathname: path };

  const isPublicAsset = publicAssets.has(path) || publicAssetPrefixes.some((prefix) => path.startsWith(prefix));
  if (isPublicAsset) {
    return readOnlyRequest ? { kind: "allow", pathname: path } : { kind: "unavailable", reason: "unsupported_method" };
  }

  // _next/data and old downloadable demos intentionally receive no asset exemption.
  if (workspaceOpen) return { kind: "allow", pathname: path };
  if (isApi) return { kind: "unavailable", reason: "workspace_closed" };
  return { kind: "redirect", location: "/under-utvikling" };
}
