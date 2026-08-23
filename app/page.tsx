"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkHoursModule } from "@/components/work-hours-module";

type Theme = "local" | "local-dark";
type ModuleId =
  | "sales"
  | "funnel"
  | "audience"
  | "tasks"
  | "social"
  | "analytics"
  | "search"
  | "facebook"
  | "website"
  | "email"
  | "booking"
  | "blog"
  | "support"
  | "seo"
  | "hours"
  | "calendar"
  | "team"
  | "reports"
  | "custom";

type Module = { id: ModuleId; title: string; eyebrow: string };
type WorkspaceConnection = { module_id: string; status: "configured" | "live"; settings: Record<string, string>; updated_at?: string };
type ShopifySnapshot = { connected?: boolean; sales?: number; orders?: number; abandonedCheckouts?: number };
type SocialSnapshot = { connected?: boolean; accounts?: Array<{ username?: string; followers?: number; topCountry?: string }>; posts?: Array<{ id: string; caption: string; likes: number; comments: number; permalink?: string | null }> };
type AnalyticsSnapshot = { connected?: boolean; activeUsers?: number; sessions?: number; views?: number; engagementRate?: number; revenue?: number; reason?: string; updatedAt?: string };
type SearchSnapshot = { connected?: boolean; clicks?: number; impressions?: number; ctr?: number; position?: number; reason?: string; updatedAt?: string };
type WebsiteHistory = {
  available?: boolean;
  uptimePercent?: number | null;
  averageResponseTimeMs?: number | null;
  checks?: Array<{ online?: boolean; response_time_ms?: number | null; checked_at?: string }>;
};
type WebsiteStatus = {
  connected?: boolean;
  online?: boolean;
  healthy?: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  finalUrl?: string;
  source?: "direct" | "google-pagespeed" | "browser";
  checkedAt?: string;
  error?: string;
  pageSpeed?: { performance?: number | null; accessibility?: number | null; bestPractices?: number | null; seo?: number | null } | null;
};

const defaultModules: Module[] = [
  { id: "sales", title: "Salg", eyebrow: "SHOPIFY" },
  { id: "funnel", title: "Kundereise", eyebrow: "SHOPIFY" },
  { id: "audience", title: "Publikum", eyebrow: "SOSIALE MEDIER" },
  { id: "tasks", title: "Neste steg", eyebrow: "VEDØY AI" },
  { id: "social", title: "Instagram / Meta", eyebrow: "SOSIALE MEDIER" },
  { id: "analytics", title: "Google Analytics", eyebrow: "GOOGLE" },
  { id: "search", title: "Search Console", eyebrow: "GOOGLE" },
  { id: "facebook", title: "Facebook", eyebrow: "SOSIALE MEDIER" },
  { id: "website", title: "Nettside-status", eyebrow: "WEB" },
  { id: "email", title: "E-post", eyebrow: "KOMMUNIKASJON" },
  { id: "booking", title: "Booking", eyebrow: "KUNDEFLYT" },
  { id: "blog", title: "Vedøy Blogg", eyebrow: "INNHOLD" },
  { id: "support", title: "Kundehenvendelser", eyebrow: "KUNDESTØTTE" },
  { id: "seo", title: "SEO og synlighet", eyebrow: "MARKEDSFØRING" },
  { id: "hours", title: "Arbeidstimer", eyebrow: "ARBEIDSFLATE" },
  { id: "calendar", title: "Kalender", eyebrow: "ARBEIDSFLATE" },
  { id: "team", title: "Team og roller", eyebrow: "ARBEIDSFLATE" },
  { id: "reports", title: "Vedøy Stats", eyebrow: "RAPPORTER" },
  { id: "custom", title: "Egendefinert HTML", eyebrow: "BYGGER" },
];

const moduleById = new Map(defaultModules.map((module) => [module.id, module]));
function normalizeModules(value: unknown): Module[] {
  if (!Array.isArray(value)) return defaultModules;
  const seen = new Set<string>();
  return value.flatMap((item) => {
    const id = typeof item === "object" && item && "id" in item ? String((item as { id: unknown }).id) : "";
    const module = moduleById.get(id as ModuleId);
    if (!module || seen.has(id)) return [];
    seen.add(id);
    return [module];
  });
}
const connectionIdForModule: Record<ModuleId, string> = {
  sales: "shopify", funnel: "shopify", audience: "instagram", tasks: "ai", social: "instagram", analytics: "analytics", search: "search", facebook: "instagram", website: "website", email: "email", booking: "booking", blog: "blog", support: "support", seo: "seo", hours: "hours", calendar: "calendar", team: "team", reports: "reports", custom: "custom",
};

function readLocalConnections(): Record<string, WorkspaceConnection> {
  try { return JSON.parse(localStorage.getItem("vedoy-connections") || "{}"); } catch { return {}; }
}

async function fetchWebsiteStatus(): Promise<WebsiteStatus> {
  const response = await fetch("/api/website-status", { cache: "no-store" });
  const result = await response.json();
  if (!result?.connected) return result;

  let finalResult = result as WebsiteStatus;
  if (!result?.online && result?.finalUrl) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10_000);
    const started = performance.now();
    try {
      await fetch(result.finalUrl, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      finalResult = {
        ...result,
        online: true,
        healthy: true,
        responseTimeMs: Math.round(performance.now() - started),
        source: "browser",
        error: undefined,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      finalResult = result;
    } finally {
      window.clearTimeout(timer);
    }
  }

  await fetch("/api/website-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finalResult),
  }).catch(() => undefined);
  return finalResult;
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [theme, setTheme] = useState<Theme>("local");
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("vedoy-theme");
    setTheme(savedTheme === "local-dark" ? "local-dark" : "local");
    setCompact(localStorage.getItem("vedoy-density") === "compact");
    fetch("/api/workspace/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const authenticated = Boolean(data?.authenticated);
        if (authenticated && !data?.profile) { window.location.href = "/onboarding"; return; }
        setLoggedIn(authenticated);
        if (authenticated) localStorage.setItem("vedoy-session", "active");
        else localStorage.removeItem("vedoy-session");
      })
      .catch(() => setLoggedIn(false))
      .finally(() => setAuthChecked(true));

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        }),
      { threshold: 0.08 },
    );

    document.querySelectorAll(".hero,.offer,.how,.contact").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function login() {
    window.location.href = "/login";
  }

  function register() {
    window.location.href = "/register";
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    localStorage.removeItem("vedoy-session");
    setLoggedIn(false);
  }

  function changeTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem("vedoy-theme", next);
  }

  function changeDensity(next: boolean) {
    setCompact(next);
    localStorage.setItem("vedoy-density", next ? "compact" : "comfortable");
  }

  if (!authChecked) return <main className={`theme-${theme} ${compact ? "density-compact" : ""}`} />;

  return (
    <main className={`theme-${theme} ${compact ? "density-compact" : ""}`}>
      <ThemePicker theme={theme} changeTheme={changeTheme} />
      {loggedIn ? (
        <Workspace
          theme={theme}
          compact={compact}
          changeTheme={changeTheme}
          changeDensity={changeDensity}
          logout={logout}
        />
      ) : (
        <Landing login={login} register={register} />
      )}
    </main>
  );
}

function Header({
  loggedIn,
  login,
  logout,
  theme,
  compact,
  businessName,
  changeTheme,
  changeDensity,
}: {
  loggedIn?: boolean;
  login?: () => void;
  logout?: () => void;
  theme?: Theme;
  compact?: boolean;
  businessName?: string;
  changeTheme?: (x: Theme) => void;
  changeDensity?: (x: boolean) => void;
}) {
  return (
    <nav className="nav">
      <a className="brand" href="#top">
        <span className="brand-mark">V</span> VEDØY<span className="brand-soft">/GROWTH</span>
      </a>
      <div className="nav-links">
        {loggedIn ? (
          <>
            <span className="workspace-label">WORKSPACE / {businessName || "DIN VIRKSOMHET"}</span>
            <a href="/booking">Booking</a>
            <a href="/avvik">Avvik</a>
            <a href="/libraries">Biblioteker</a>
            <details className="settings">
              <summary>Innstillinger ⚙</summary>
              <div className="settings-menu">
                <span>TEMA</span>
                <button className={theme === "local" ? "active" : ""} onClick={() => changeTheme?.("local")}>
                  Haugesund lys
                </button>
                <button className={theme === "local-dark" ? "active" : ""} onClick={() => changeTheme?.("local-dark")}>
                  Haugesund mørk
                </button>
                <span>TETTHET</span>
                <button className={!compact ? "active" : ""} onClick={() => changeDensity?.(false)}>
                  Normal
                </button>
                <button className={compact ? "active" : ""} onClick={() => changeDensity?.(true)}>
                  Kompakt
                </button>
              </div>
            </details>
            <button className="nav-login" onClick={logout}>
              Logg ut
            </button>
          </>
        ) : (
          <>
            <a href="#tilbud">Hva vi tilbyr</a>
            <a href="#slik">Slik fungerer det</a>
            <a href="/libraries">Biblioteker</a>
            <a href="/register">Kom i gang</a>
            <button className="nav-cta" onClick={login}>
              Logg inn <span>↗</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function Landing({ login, register }: { login: () => void; register: () => void }) {
  return (
    <>
      <Header login={login} />
      <section className="hero landing-hero" id="top">
        <div className="grid-glow"></div>
        <div className="hero-inner">
          <div className="eyebrow">
            <span className="pulse"></span> DIGITAL PARTNER FOR VIRKSOMHETER
          </div>
          <h1>
            Få mer gjort.
            <br />
            <span>Med mindre kaos.</span>
          </h1>
          <p>
            Vedøy Growth gir små og mellomstore bedrifter oversikt over salg, kunder, synlighet og
            digitale oppgaver samlet på ett sted.
          </p>
          <div className="hero-actions">
            <button className="button button-lime" onClick={register}>
              Kom i gang <span>↗</span>
            </button>
            <a className="ghost-link" href="#kontakt">
              Ta en uforpliktende prat <span>↘</span>
            </a>
          </div>
        </div>
        <div className="hero-side">
          <div>SYSTEM STATUS</div>
          <div className="status-line">
            <span className="pulse"></span> READY FOR YOUR BUSINESS
          </div>
          <div className="side-code">
            DATA IN
            <br />
            CLARITY OUT
            <br />
            HUMAN SUPPORT
          </div>
        </div>
      </section>
      <section className="ticker">
        <span>SHOPIFY</span>
        <i>×</i>
        <span>ANALYTICS</span>
        <i>×</i>
        <span>AI INSIGHTS</span>
        <i>×</i>
        <span>PERSONLIG OPPFØLGING</span>
      </section>
      <section className="offer" id="tilbud">
        <div className="eyebrow">DETTE FÅR DU</div>
        <h2>
          Et enklere
          <br />
          <span>digitalt system.</span>
        </h2>
        <div className="offer-grid">
          <article>
            <b>01</b>
            <h3>Oversikt</h3>
            <p>Se salg, ordre, kundereise og viktige signaler uten å hoppe mellom systemer.</p>
          </article>
          <article>
            <b>02</b>
            <h3>Oppfølging</h3>
            <p>Få konkrete neste steg, rapporter og hjelp med det som faktisk stopper deg.</p>
          </article>
          <article>
            <b>03</b>
            <h3>Forbedring</h3>
            <p>Bygg arbeidsflaten gradvis. Du velger modulene virksomheten din trenger.</p>
          </article>
        </div>
      </section>
      <section className="how" id="slik">
        <div>
          <div className="eyebrow">SLIK FUNGERER DET</div>
          <h2>
            Først mennesker.
            <br />
            <span>Så system.</span>
          </h2>
        </div>
        <ol>
          <li>
            <b>01</b>
            <span>Vi kartlegger hva du bruker i dag.</span>
          </li>
          <li>
            <b>02</b>
            <span>Vi kobler inn de viktigste datakildene.</span>
          </li>
          <li>
            <b>03</b>
            <span>Du får en arbeidsflate som er lett å endre.</span>
          </li>
        </ol>
      </section>
      <section className="contact" id="kontakt">
        <div>
          <div className="eyebrow">START HER</div>
          <h2>
            La oss gjøre
            <br />
            <span>det enklere.</span>
          </h2>
          <p>Vedøy Growth bygges rundt ekte behov, ikke unødvendige funksjoner.</p>
        </div>
        <button className="button button-lime" onClick={register}>
          Registrer virksomheten <span>↗</span>
        </button>
      </section>
      <footer>
        <a className="brand" href="#top">
          <span className="brand-mark">V</span> VEDØY<span className="brand-soft">/GROWTH</span>
        </a>
        <span>Data inn. Klarhet ut.</span>
        <span>© 2026 VEDØY</span>
      </footer>
    </>
  );
}

function Workspace({
  theme,
  compact,
  changeTheme,
  changeDensity,
  logout,
}: {
  theme: Theme;
  compact: boolean;
  changeTheme: (x: Theme) => void;
  changeDensity: (x: boolean) => void;
  logout: () => void;
}) {
  const [modules, setModules] = useState<Module[]>(defaultModules);
  const [editing, setEditing] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [businessName, setBusinessName] = useState("din virksomhet");
  const [socialUsername, setSocialUsername] = useState("");
  const [customHtml, setCustomHtml] = useState("");
  const [connections, setConnections] = useState<Record<string, WorkspaceConnection>>({});
  const [shopify, setShopify] = useState<ShopifySnapshot | null>(null);
  const [social, setSocial] = useState<SocialSnapshot | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [search, setSearch] = useState<SearchSnapshot | null>(null);
  const [websiteStatus, setWebsiteStatus] = useState<WebsiteStatus | null>(null);
  const [websiteHistory, setWebsiteHistory] = useState<WebsiteHistory | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vedoy-modules");
    if (saved) {
      try {
        setModules(normalizeModules(JSON.parse(saved)));
      } catch {
        setModules(defaultModules);
      }
    }

    setNotes(localStorage.getItem("vedoy-notes") || "");
    setSocialUsername(localStorage.getItem("vedoy-social-username") || "");
    setCustomHtml(localStorage.getItem("vedoy-custom-html") || "");
    setConnections(readLocalConnections());

    fetch("/api/workspace/layout")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.modules) { const next = normalizeModules(data.modules); setModules(next); localStorage.setItem("vedoy-modules", JSON.stringify(next)); } })
      .catch(() => undefined);

    fetch("/api/workspace/notes")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (typeof data?.content === "string") { setNotes(data.content); localStorage.setItem("vedoy-notes", data.content); } })
      .catch(() => undefined);

    fetch("/api/workspace/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.profile?.business_name) setBusinessName(data.profile.business_name);
      })
      .catch(() => undefined);

    fetch("/api/workspace/connections")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.connections) return;
        const next = Object.fromEntries(data.connections.map((connection: WorkspaceConnection) => [connection.module_id, connection]));
        setConnections(next);
        localStorage.setItem("vedoy-connections", JSON.stringify(next));
      })
      .catch(() => undefined);

    void refreshData();
  }, []);

  async function refreshData() {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        fetch("/api/shopify").then((response) => response.json()).then((data) => setShopify(data)),
        fetch("/api/social").then((response) => response.json()).then((data) => {
          setSocial(data);
          if (data.accounts?.[0]?.username) setSocialUsername(data.accounts[0].username);
        }),
        fetch("/api/google/analytics").then((response) => response.json()).then((data) => setAnalytics(data)),
        fetch("/api/google/search-console").then((response) => response.json()).then((data) => setSearch(data)),
        fetchWebsiteStatus().then(async (data) => {
          setWebsiteStatus(data);
          const response = await fetch("/api/website-history", { cache: "no-store" });
          setWebsiteHistory(await response.json().catch(() => null));
        }),
      ]);
    } finally { setRefreshing(false); }
  }

  function save(next: Module[]) {
    setModules(next);
    localStorage.setItem("vedoy-modules", JSON.stringify(next));
    void fetch("/api/workspace/layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modules: next }) });
  }

  function saveNotes() {
    void fetch("/api/workspace/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: notes }) });
  }

  function drop(target: string) {
    if (!dragged || dragged === target) return;
    const next = [...modules];
    const from = next.findIndex((module) => module.id === dragged);
    const to = next.findIndex((module) => module.id === target);
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    save(next);
    setDragged(null);
  }

  const available = useMemo(
    () => defaultModules.map((module) => module.id).filter((id) => !modules.some((module) => module.id === id)),
    [modules],
  );

  return (
    <>
      <Header
        loggedIn
        theme={theme}
        compact={compact}
        businessName={businessName}
        changeTheme={changeTheme}
        changeDensity={changeDensity}
        logout={logout}
      />
      <section className="workspace">
        <div className="workspace-top">
          <div>
            <div className="eyebrow">
              <span className="pulse"></span> LIVE WORKSPACE
            </div>
            <h1>
              God morgen, <span>{businessName}.</span>
            </h1>
            <p>Her er det viktigste å vite akkurat nå.</p>
          </div>
          <div className="workspace-actions">
            <button className="workspace-refresh" onClick={refreshData} disabled={refreshing}>
              {refreshing ? "Oppdaterer…" : "↻ Oppdater data"}
            </button>
            <button className="button button-lime" onClick={() => setEditing(!editing)}>
              {editing ? "Ferdig" : "Tilpass dashboard"} <span>⌘ K</span>
            </button>
          </div>
        </div>

        <div className="chart-strip">
          <div>
            <small>SALG SISTE 30 DAGER</small>
            <strong>{shopify?.connected ? `${Math.round(shopify.sales || 0).toLocaleString("nb-NO")} kr` : "—"}</strong>
            <span className="muted">{shopify?.connected ? `${shopify.orders || 0} ordre` : "Koble Shopify for data"}</span>
          </div>
          <div className="line-chart">
            <svg viewBox="0 0 500 100" preserveAspectRatio="none">
              <path
                d="M0 82 C50 70 80 83 120 62 S190 75 230 48 S290 64 330 38 S400 46 500 12"
                fill="none"
                stroke="var(--lime)"
                strokeWidth="4"
              />
            </svg>
          </div>
        </div>

        <div className="workspace-grid">
          {modules.map((module) => (
            <article
              key={module.id}
              draggable={editing}
              onDragStart={() => setDragged(module.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => drop(module.id)}
              className={`workspace-card card-${module.id} ${dragged === module.id ? "is-dragging" : ""}`}
            >
              <div className="card-head">
                <div>
                  <small>{module.eyebrow}</small>
                  <h3>{module.title}</h3>
                </div>
                {editing && (
                  <button aria-label={`Fjern ${module.title}`} onClick={() => save(modules.filter((item) => item.id !== module.id))}>
                    ×
                  </button>
                )}
              </div>
              <ModuleBody moduleId={module.id} socialUsername={socialUsername} customHtml={customHtml} connection={connections[connectionIdForModule[module.id]]} shopify={shopify} social={social} analytics={analytics} search={search} websiteStatus={websiteStatus} websiteHistory={websiteHistory} />
            </article>
          ))}
        </div>

        {editing && (
          <div className="module-add">
            <span>LEGG TIL MODUL</span>
            {available.map((id) => (
              <button key={id} onClick={() => save([...modules, moduleById.get(id)!])}>
                + {moduleById.get(id)?.title}
              </button>
            ))}
          </div>
        )}

        <section className="notes">
          <div>
            <div className="eyebrow">ARBEIDSNOTATER</div>
            <h2>Husk dette.</h2>
            <p>Notatene lagres sikkert i arbeidsflaten og er bare synlige for deg.</p>
          </div>
          <textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              localStorage.setItem("vedoy-notes", event.target.value);
            }}
            onBlur={saveNotes}
            placeholder="Skriv et notat, en idé eller neste steg..."
          />
        </section>
      </section>
    </>
  );
}

function ModuleBody({
  moduleId,
  socialUsername,
  customHtml,
  connection,
  shopify,
  social,
  analytics,
  search,
  websiteStatus,
  websiteHistory,
}: {
  moduleId: ModuleId;
  socialUsername: string;
  customHtml: string;
  connection?: WorkspaceConnection;
  shopify: ShopifySnapshot | null;
  social: SocialSnapshot | null;
  analytics: AnalyticsSnapshot | null;
  search: SearchSnapshot | null;
  websiteStatus: WebsiteStatus | null;
  websiteHistory: WebsiteHistory | null;
}) {
  const connectionId = connectionIdForModule[moduleId];
  const configured = Boolean(connection);
  const socialAccount = social?.accounts?.[0];
  const configuredName = connection?.settings.username || connection?.settings.siteUrl || connection?.settings.storeDomain || connection?.settings.emailAddress || connection?.settings.provider;
  let sources: Array<{ id: string; name: string; url: string }> = [];
  try { const parsed = JSON.parse(connection?.settings.sourcesJson || "[]"); if (Array.isArray(parsed)) sources = parsed.filter((item): item is { id: string; name: string; url: string } => Boolean(item && typeof item.id === "string" && typeof item.name === "string" && typeof item.url === "string")); } catch { /* optional multi-source configuration */ }
  const activeSource = sources.find((source) => source.id === connection?.settings.activeSourceId);
  const sourceLabel = sources.length > 1 ? connection?.settings.activeSourceId === "all" || !activeSource ? `Samlet oversikt · ${sources.length} kilder` : activeSource.name : sources[0]?.name;
  if (moduleId === "sales") {
    return (
      <>
        <strong className="big-number">{shopify?.connected ? `${Math.round(shopify.sales || 0).toLocaleString("nb-NO")} kr` : "—"}</strong>
        <div className="card-foot">
          <span>{shopify?.connected ? `${shopify.orders || 0} ordre` : "Ingen data ennå"}</span>
          <a className="module-inline-link" href="/connections?module=shopify">{configured ? "Innstillinger" : "Koble Shopify"}</a>
        </div>
        {sourceLabel && <small className="module-muted">Kilde: {sourceLabel}</small>}
      </>
    );
  }

  if (moduleId === "funnel") {
    return (
      <>
        <div className="funnel">
          <div>
            <span>SESSIONS</span>
            <b>{shopify?.connected ? shopify.orders || 0 : "—"}</b>
          </div>
          <div>
            <span>I KASSE</span>
            <b>{shopify?.connected ? shopify.abandonedCheckouts || 0 : "—"}</b>
          </div>
          <div>
            <span>CHECKOUT</span>
            <b>—</b>
          </div>
        </div>
        <div className="card-foot">
          <span className="warning">↘ Her stopper flest</span>
        </div>
      </>
    );
  }

  if (moduleId === "audience") {
    return (
      <div className="audience">
        <div className="ring">
          <span>NO</span>
        </div>
        <div>
          <b>{socialAccount?.topCountry || "—"}</b>
          <small>mest publikum</small>
          <b>{socialAccount?.followers?.toLocaleString("nb-NO") || "—"}</b>
          <small>følgere koblet til</small>
        </div>
      </div>
    );
  }

  if (moduleId === "tasks") {
    return (
      <div className="ai-insight">
        <span>✦</span>
        <p>
          <b>Gjør én ting i dag</b>
          <br />
          Test checkout på mobil før neste kampanje.
        </p>
        <a className="module-inline-link" href="/connections?module=ai">Tilpass fokus</a>
      </div>
    );
  }

  if (moduleId === "social" || moduleId === "facebook") {
    const latestPost = social?.posts?.[0];
    return (
      <div className="module-body">
        <div className="connection-row">
          <span className={socialAccount || configured ? "status-dot is-on" : "status-dot"}></span>
          <span>{socialAccount?.username ? `@${socialAccount.username}` : socialUsername ? `@${socialUsername}` : configuredName || "Ikke tilkoblet"}</span>
        </div>
        <div className="module-metrics">
          <span>
            <small>FØLGERE</small>
            <b>{socialAccount?.followers?.toLocaleString("nb-NO") || "—"}</b>
          </span>
          <span>
            <small>TOPP-LAND</small>
            <b>{socialAccount?.topCountry || "—"}</b>
          </span>
        </div>
        {latestPost && <div className="module-primary"><small>SISTE INNLEGG · {latestPost.likes} LIKES / {latestPost.comments} KOMMENTARER</small><b>{latestPost.caption}</b></div>}
        <a className="module-action" href="/connections?module=instagram">
          {socialAccount || configured ? "Åpne tilkobling" : "Koble til konto"} →
        </a>
      </div>
    );
  }

  if (moduleId === "analytics") {
    return (
      <div className="module-body">
        <div className="connection-row"><span className={analytics?.connected ? "status-dot is-on" : "status-dot"}></span><span>{analytics?.connected ? "Live GA4-data" : analytics?.reason || "Ikke tilkoblet"}</span></div>
        <div className="module-metrics"><span><small>AKTIVE BRUKERE</small><b>{analytics?.connected ? analytics.activeUsers?.toLocaleString("nb-NO") : "—"}</b></span><span><small>ØKTER</small><b>{analytics?.connected ? analytics.sessions?.toLocaleString("nb-NO") : "—"}</b></span></div>
        {analytics?.connected && <div className="website-score-row"><small>VISNINGER {analytics.views?.toLocaleString("nb-NO")}</small><small>ENGASJEMENT {Math.round((analytics.engagementRate || 0) * 100)}%</small></div>}
        <a className="module-action" href="/connections?module=analytics">{analytics?.connected ? "Analytics-innstillinger" : "Koble Google Analytics"} →</a>
      </div>
    );
  }

  if (moduleId === "search") {
    return (
      <div className="module-body">
        <div className="connection-row"><span className={search?.connected ? "status-dot is-on" : "status-dot"}></span><span>{search?.connected ? "Live Search Console-data" : search?.reason || "Ikke tilkoblet"}</span></div>
        <div className="module-metrics"><span><small>KLIKK</small><b>{search?.connected ? search.clicks?.toLocaleString("nb-NO") : "—"}</b></span><span><small>VISNINGER</small><b>{search?.connected ? search.impressions?.toLocaleString("nb-NO") : "—"}</b></span></div>
        {search?.connected && <div className="website-score-row"><small>CTR {((search.ctr || 0) * 100).toFixed(1)}%</small><small>POSISJON {(search.position || 0).toFixed(1)}</small></div>}
        <a className="module-action" href="/connections?module=search">{search?.connected ? "Search Console-innstillinger" : "Koble Search Console"} →</a>
      </div>
    );
  }

  if (moduleId === "website") {
    const responseLabel = typeof websiteStatus?.responseTimeMs === "number" ? `${websiteStatus.responseTimeMs} ms` : "—";
    const performanceScore = websiteStatus?.pageSpeed?.performance;
    const statusText = !configured
      ? "Ikke tilkoblet"
      : websiteStatus?.online
        ? websiteStatus.healthy ? "Oppe" : `Svarte ${websiteStatus.statusCode || "med feil"}`
        : websiteStatus?.error ? "Nede / utilgjengelig" : "Sjekker…";
    return (
      <div className="module-body website-status-module">
        <div className="connection-row">
          <span className={websiteStatus?.healthy ? "status-dot is-on" : "status-dot is-error"}></span>
          <span>{statusText}</span>
        </div>
        <div className="module-metrics">
          <span><small>RESPONSTID</small><b>{responseLabel}</b></span>
          <span><small>PAGESPEED MOBIL</small><b>{typeof performanceScore === "number" ? `${performanceScore}/100` : "—"}</b></span>
        </div>
        {websiteStatus?.pageSpeed && <div className="website-score-row"><small>SEO {websiteStatus.pageSpeed.seo ?? "—"}</small><small>TILGJ. {websiteStatus.pageSpeed.accessibility ?? "—"}</small></div>}
        {websiteStatus?.source === "google-pagespeed" && <small className="website-checked">Bekreftet av Google PageSpeed</small>}
        {websiteStatus?.source === "browser" && <small className="website-checked">Målt fra nettleseren din</small>}
        {websiteHistory?.available && websiteHistory.checks?.length ? <>
          <div className="website-history" aria-label="Responstidshistorikk siste 30 dager">{websiteHistory.checks.slice(-18).map((check, index) => <i key={`${check.checked_at || index}`} className={check.online ? "is-up" : "is-down"} style={{ height: `${Math.max(12, Math.min(100, ((check.response_time_ms || 0) / 3000) * 100))}%` }} />)}</div>
          <div className="website-score-row"><small>OPPETID {websiteHistory.uptimePercent ?? "—"}%</small><small>SNITT {websiteHistory.averageResponseTimeMs ?? "—"} MS</small></div>
        </> : null}
        {websiteStatus?.checkedAt && <small className="website-checked">Sist sjekket {new Date(websiteStatus.checkedAt).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}</small>}
        {sourceLabel && <small className="website-checked">Kilde: {sourceLabel}</small>}
        {websiteStatus?.error && <p className="work-hours-error">{websiteStatus.error}</p>}
        <a className="module-action" href="/connections?module=website">{configured ? "Endre nettside" : "Koble nettside"} →</a>
      </div>
    );
  }

  if (moduleId === "email") {
    return <IntegrationCard label="Innboks" value="— nye" action="Koble e-post" connection={connection} moduleId={connectionId} />;
  }

  if (moduleId === "booking") {
    return <IntegrationCard label="Neste booking" value="Planlegg kundeavtale" action="Åpne booking" href="/booking" connection={connection} moduleId={connectionId} />;
  }

  if (moduleId === "calendar") return <IntegrationCard label="Plan og avtaler" value="Felles kalender" action="Åpne kalender" href="/calendar" connection={connection} moduleId={connectionId} />;
  if (moduleId === "team") return <IntegrationCard label="Ansatte" value="Roller og tilgang" action="Administrer team" href="/team" connection={connection} moduleId={connectionId} />;
  if (moduleId === "reports") return <IntegrationCard label="Data og eksport" value="Timer / booking / kanaler" action="Åpne rapporter" href="/reports" connection={connection} moduleId={connectionId} />;

  if (moduleId === "blog") {
    return <IntegrationCard label="Siste innlegg" value={configured ? "Klar" : "—"} action="Åpne blogg" href="/blog/admin" connection={connection} moduleId={connectionId} />;
  }

  if (moduleId === "support") {
    return <IntegrationCard label="Henvendelser" value="— åpne" action="Koble kanal" connection={connection} moduleId={connectionId} />;
  }

  if (moduleId === "seo") {
    return <IntegrationCard label="Synlighet" value="—" action="Koble SEO" connection={connection} moduleId={connectionId} />;
  }

  if (moduleId === "hours") {
    return <WorkHoursModule />;
  }

  if (moduleId === "custom") {
    return (
      <div className="module-body">
        {customHtml ? (
          <iframe className="custom-module-frame" title="Egendefinert modul" sandbox="" srcDoc={customHtml} />
        ) : (
          <>
            <p className="module-muted">Lag en modul med egen HTML-kode.</p>
            <a className="module-action" href="/module-builder">
              Åpne modulbygger →
            </a>
          </>
        )}
      </div>
    );
  }

  return null;
}

function IntegrationCard({
  label,
  value,
  action,
  href,
  connection,
  moduleId,
}: {
  label: string;
  value: string;
  action: string;
  href?: string;
  connection?: WorkspaceConnection;
  moduleId: string;
}) {
  return (
    <div className="module-body">
      <div className="connection-row">
        <span className={connection ? "status-dot is-on" : "status-dot"}></span>
        <span>{connection ? "Konfigurert" : "Ikke tilkoblet"}</span>
      </div>
      <div className="module-primary">
        <small>{label}</small>
        <b>{value}</b>
      </div>
      <a className="module-action" href={href || `/connections?module=${moduleId}`}>
        {action} →
      </a>
    </div>
  );
}

function ThemePicker({ theme, changeTheme }: { theme: Theme; changeTheme: (x: Theme) => void }) {
  return (
    <div className="theme-picker">
      <span>TEMA</span>
      <select value={theme} onChange={(event) => changeTheme(event.target.value as Theme)} aria-label="Velg tema">
        <option value="local">Haugesund / Lokal lys</option>
        <option value="local-dark">Haugesund / Lokal mørk</option>
      </select>
    </div>
  );
}
