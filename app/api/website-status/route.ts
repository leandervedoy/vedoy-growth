import { setDefaultResultOrder } from "node:dns";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { getAuthContext, getWorkspaceContextFromAuth, supabaseHeaders } from "@/lib/workspace";
import { getConnectionSettings } from "@/lib/workspace-connections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Some hosting providers publish IPv6 before IPv4 even when the IPv6 route is
// not reachable from every Vercel region. Prefer IPv4, while still validating
// every DNS result before making the request.
setDefaultResultOrder("ipv4first");

type PageSpeedResult = {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  serverResponseTimeMs: number | null;
  firstContentfulPaintMs: number | null;
  largestContentfulPaintMs: number | null;
  cumulativeLayoutShift: number | null;
};

const blockedHostSuffixes = [".localhost", ".local", ".internal", ".home", ".lan"];

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
    if (normalized.startsWith("::ffff:")) return isPrivateAddress(normalized.slice(7));
  }

  return false;
}

async function validatePublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Ugyldig nettadresse.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Bare offentlige HTTP- og HTTPS-adresser kan sjekkes.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || blockedHostSuffixes.some((suffix) => hostname.endsWith(suffix))) throw new Error("Private adresser kan ikke sjekkes.");

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Private adresser kan ikke sjekkes.");
  } else {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Nettadressen peker til et privat eller ugyldig nettverk.");
  }

  return url;
}

async function checkAvailability(initialUrl: URL) {
  let current = initialUrl;
  const started = performance.now();

  for (let redirect = 0; redirect <= 3; redirect += 1) {
    let response: WebsiteProbe;
    try {
      response = await fetchWebsite(current, "HEAD");
    } catch (headError) {
      try {
        response = await fetchWebsite(current, "GET");
      } catch (getError) {
        throw getError instanceof Error ? getError : headError;
      }
    }

    if (response.statusCode === 405 || response.statusCode === 501) {
      response = await fetchWebsite(current, "GET");
    }

    const responseTimeMs = Math.round(performance.now() - started);

    if (response.statusCode >= 300 && response.statusCode < 400) {
      const location = response.location;
      if (!location) return { statusCode: response.statusCode, responseTimeMs, finalUrl: current.toString(), healthy: false };
      current = await validatePublicUrl(new URL(location, current).toString());
      continue;
    }

    return {
      statusCode: response.statusCode,
      responseTimeMs,
      finalUrl: current.toString(),
      healthy: response.statusCode >= 200 && response.statusCode < 400,
    };
  }

  throw new Error("Nettsiden videresender for mange ganger.");
}

type WebsiteProbe = { statusCode: number; location?: string };

function fetchWebsite(target: URL, method: "HEAD" | "GET"): Promise<WebsiteProbe> {
  return new Promise((resolve, reject) => {
    const request = (target.protocol === "https:" ? httpsRequest : httpRequest)(
      target,
      {
        method,
        family: 4,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.7",
          "User-Agent": "Mozilla/5.0 (compatible; VedoyGrowthMonitor/1.0; +https://growth.vedoy.store)",
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const rawLocation = response.headers.location;
        const location = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
        response.destroy();
        resolve({ statusCode, location });
      },
    );

    request.setTimeout(10_000, () => {
      const timeout = new Error("Website check timed out");
      timeout.name = "AbortError";
      request.destroy(timeout);
    });
    request.once("error", reject);
    request.end();
  });
}

function readableFetchError(error: unknown) {
  if (!(error instanceof Error)) return "Kunne ikke sjekke nettsiden.";
  if (error.name === "AbortError") return "Tidsavbrudd: nettsiden svarte ikke innen 10 sekunder.";

  const cause = error.cause as { code?: string } | undefined;
  switch (cause?.code) {
    case "ENETUNREACH":
    case "EHOSTUNREACH":
      return "Nettverket kunne ikke nå nettsiden akkurat nå.";
    case "ECONNREFUSED":
      return "Nettsiden avviste tilkoblingen.";
    case "ECONNRESET":
      return "Tilkoblingen ble avbrutt av nettsiden. Prøv å oppdatere.";
    case "ENOTFOUND":
      return "Fant ikke domenet i DNS.";
    case "CERT_HAS_EXPIRED":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      return "Nettsidens sikkerhetssertifikat kunne ikke bekreftes.";
    default:
      return error.message === "fetch failed" ? "Kunne ikke kontakte nettsiden fra måletjenesten." : error.message;
  }
}

function auditNumber(audits: Record<string, { numericValue?: number }> | undefined, key: string) {
  const value = audits?.[key]?.numericValue;
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

async function checkPageSpeed(target: URL): Promise<PageSpeedResult | null> {
  const endpoint = new URL("https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", target.toString());
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.append("category", "accessibility");
  endpoint.searchParams.append("category", "best-practices");
  endpoint.searchParams.append("category", "seo");
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (key) endpoint.searchParams.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22_000);
  try {
    const response = await fetch(endpoint, { next: { revalidate: 900 }, signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    const categories = data?.lighthouseResult?.categories;
    const audits = data?.lighthouseResult?.audits;
    const score = (name: string) => typeof categories?.[name]?.score === "number" ? Math.round(categories[name].score * 100) : null;
    return {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
      serverResponseTimeMs: auditNumber(audits, "server-response-time"),
      firstContentfulPaintMs: auditNumber(audits, "first-contentful-paint"),
      largestContentfulPaintMs: auditNumber(audits, "largest-contentful-paint"),
      cumulativeLayoutShift: typeof audits?.["cumulative-layout-shift"]?.numericValue === "number" ? Number(audits["cumulative-layout-shift"].numericValue.toFixed(3)) : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Logg inn for å sjekke nettsiden." }, { status: 401 });

  const connectionResponse = await fetch(
    `${auth.url}/rest/v1/workspace_connections?owner_id=eq.${auth.user.id}&module_id=eq.website&select=settings,updated_at&limit=1`,
    { headers: supabaseHeaders(auth), cache: "no-store" },
  );
  const connections = await connectionResponse.json().catch(() => []);
  const siteUrl = typeof connections?.[0]?.settings?.siteUrl === "string" ? connections[0].settings.siteUrl.trim() : "";
  if (!connectionResponse.ok) return NextResponse.json({ error: "Kunne ikke hente nettsidetilkoblingen." }, { status: 502 });
  if (!siteUrl) return NextResponse.json({ connected: false, checkedAt: new Date().toISOString() });

  let checkedUrl: string | undefined;
  try {
    const safeUrl = await validatePublicUrl(siteUrl);
    checkedUrl = safeUrl.toString();
    try {
      const availability = await checkAvailability(safeUrl);
      const pageSpeed = availability.healthy ? await checkPageSpeed(new URL(availability.finalUrl)) : null;
      return NextResponse.json({
        connected: true,
        online: true,
        ...availability,
        pageSpeed,
        source: "direct",
        checkedAt: new Date().toISOString(),
      });
    } catch (directError) {
      // Some CDNs reject requests from datacenter IP ranges. A successful
      // Lighthouse run proves that Google reached and rendered the public site.
      const pageSpeed = await checkPageSpeed(safeUrl);
      if (pageSpeed) {
        return NextResponse.json({
          connected: true,
          online: true,
          healthy: true,
          statusCode: 200,
          responseTimeMs: pageSpeed.serverResponseTimeMs ?? undefined,
          finalUrl: safeUrl.toString(),
          pageSpeed,
          source: "google-pagespeed",
          checkedAt: new Date().toISOString(),
        });
      }
      throw directError;
    }
  } catch (error) {
    const message = readableFetchError(error);
    console.error("Website status check failed", {
      site: siteUrl,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
    });
    return NextResponse.json({
      connected: true,
      online: false,
      healthy: false,
      finalUrl: checkedUrl,
      error: message,
      checkedAt: new Date().toISOString(),
    });
  }
}

function safeScore(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
}

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const workspace = await getWorkspaceContextFromAuth(auth);
  if (!workspace) return NextResponse.json({ error: "Opprett virksomheten først." }, { status: 409 });
  const connection = await getConnectionSettings(auth, "website").catch(() => undefined);
  const siteUrl = connection?.settings?.siteUrl?.trim() || "";
  if (!siteUrl) return NextResponse.json({ error: "Nettsiden er ikke konfigurert." }, { status: 400 });

  try {
    await validatePublicUrl(siteUrl);
  } catch {
    return NextResponse.json({ error: "Ugyldig nettsideadresse." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const online = body?.online === true;
  const responseTimeMs = Number.isFinite(Number(body?.responseTimeMs))
    ? Math.max(0, Math.min(120_000, Math.round(Number(body.responseTimeMs))))
    : null;
  const source = ["direct", "google-pagespeed", "browser"].includes(body?.source) ? body.source : "browser";
  const statusCode = Number.isInteger(Number(body?.statusCode)) ? Math.max(0, Math.min(599, Number(body.statusCode))) : null;
  const pageSpeed = body?.pageSpeed && typeof body.pageSpeed === "object" ? body.pageSpeed : {};
  const thresholdMs = Math.max(250, Math.min(60_000, Number(connection?.settings?.alertThresholdMs) || 2_500));

  const latestResponse = await fetch(
    `${auth.url}/rest/v1/website_status_checks?owner_id=eq.${auth.user.id}&site_url=eq.${encodeURIComponent(siteUrl)}&select=online,response_time_ms,checked_at&order=checked_at.desc&limit=1`,
    { headers: supabaseHeaders(auth), cache: "no-store" },
  );
  const latestRows = latestResponse.ok ? await latestResponse.json().catch(() => []) : [];
  const latest = latestRows[0] as { online?: boolean; response_time_ms?: number } | undefined;

  const insertResponse = await fetch(`${auth.url}/rest/v1/website_status_checks`, {
    method: "POST",
    headers: supabaseHeaders(auth, { Prefer: "return=representation" }),
    body: JSON.stringify({
      business_id: workspace.business.id,
      owner_id: auth.user.id,
      site_url: siteUrl,
      online,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      source,
      performance_score: safeScore(pageSpeed.performance),
      accessibility_score: safeScore(pageSpeed.accessibility),
      seo_score: safeScore(pageSpeed.seo),
      checked_at: new Date().toISOString(),
    }),
  });
  if (!insertResponse.ok) {
    return NextResponse.json({ stored: false, reason: "Kjør nyeste supabase/schema.sql for å lagre historikk." });
  }

  const isAlert = !online || (responseTimeMs !== null && responseTimeMs > thresholdMs);
  const previousAlert = latest ? !latest.online || (Number(latest.response_time_ms) || 0) > thresholdMs : false;
  const alertEmail = connection?.settings?.alertEmail?.trim() || "";
  let alertSent = false;
  if (isAlert && !previousAlert && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail) && process.env.RESEND_API_KEY && process.env.ALERT_FROM_EMAIL) {
    const alertResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL,
        to: [alertEmail],
        subject: online ? `Vedøy Growth: ${siteUrl} er treg` : `Vedøy Growth: ${siteUrl} kan være nede`,
        text: `Nettsjekken for ${siteUrl} registrerte ${online ? `en responstid på ${responseTimeMs} ms` : "at siden ikke svarte"}. Sjekket ${new Date().toLocaleString("nb-NO")}.`,
      }),
      cache: "no-store",
    });
    alertSent = alertResponse.ok;
  }

  return NextResponse.json({ stored: true, alert: { triggered: isAlert, sent: alertSent, thresholdMs } });
}
