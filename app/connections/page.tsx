"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Settings = Record<string, string>;
type Connection = { module_id: string; status: "configured" | "live"; settings: Settings; updated_at?: string };

type Integration = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  fields: Array<{ name: string; label: string; placeholder: string; type?: string }>;
  hint: string;
};

type SetupGuide = { needs: string[]; steps: string[]; docsUrl?: string };

const integrations: Integration[] = [
  { id: "shopify", eyebrow: "BUTIKK", title: "Shopify", description: "Salg, ordre og kundereise i dashboardet.", fields: [{ name: "storeDomain", label: "SHOPIFY-DOMENE", placeholder: "din-butikk.myshopify.com" }], hint: "Live salgsdata trenger en Shopify Admin-tilgang lagt inn sikkert på serveren." },
  { id: "instagram", eyebrow: "SOSIALE MEDIER", title: "Instagram / Meta", description: "Følgere, publikum og innsikt fra en bedriftskonto.", fields: [{ name: "username", label: "BRUKERNAVN", placeholder: "bedriften_din" }], hint: "Kontoen må være en Instagram Business- eller Creator-konto for live innsikt." },
  { id: "analytics", eyebrow: "GOOGLE", title: "Google Analytics", description: "Besøk, trafikkilder og mest brukte sider.", fields: [{ name: "propertyId", label: "GA4 PROPERTY ID", placeholder: "123456789" }], hint: "Bruk det numeriske Property ID-et, ikke Measurement ID som starter med G-." },
  { id: "search", eyebrow: "GOOGLE", title: "Search Console", description: "Søk, klikk, posisjoner og synlighet i Google.", fields: [{ name: "siteUrl", label: "SEARCH CONSOLE-EGENSKAP", placeholder: "sc-domain:dittdomene.no eller https://dittdomene.no/" }], hint: "Verdien må være helt lik egenskapen du ser i Search Console." },
  { id: "website", eyebrow: "WEB", title: "Nettside-status", description: "Se om nettsiden er oppe, responstid, historikk og Google PageSpeed-score.", fields: [{ name: "siteUrl", label: "NETTSTED", placeholder: "https://dittdomene.no", type: "url" }, { name: "alertEmail", label: "E-POST FOR VARSLER", placeholder: "drift@dittdomene.no", type: "email" }, { name: "alertThresholdMs", label: "VARSEL OVER ANTALL MS", placeholder: "2500", type: "number" }], hint: "Kontrollen lagrer historikk når dashboardet oppdateres. E-postvarsler krever Resend på serveren." },
  { id: "email", eyebrow: "KOMMUNIKASJON", title: "E-post", description: "Knytt en innboks til arbeidsflaten.", fields: [{ name: "emailAddress", label: "E-POSTADRESSE", placeholder: "hei@bedrift.no", type: "email" }], hint: "En sikker innlogging kobles til før meldinger kan hentes." },
  { id: "booking", eyebrow: "KUNDEFLYT", title: "Booking", description: "Se neste avtale og hold styr på kundeforespørsler.", fields: [{ name: "provider", label: "BOOKINGVERKTØY", placeholder: "Calendly, Timely eller annet" }, { name: "bookingUrl", label: "BOOKINGLENKE", placeholder: "https://...", type: "url" }], hint: "Vi bruker dette til å velge riktig sikker kobling." },
  { id: "blog", eyebrow: "INNHOLD", title: "Vedøy Blogg", description: "Åpne og administrer innlegg på tvers av Vedøy-prosjekter.", fields: [{ name: "blogUrl", label: "BLOGG-ADRESSE", placeholder: "https://dittdomene.no/blogg", type: "url" }], hint: "Du kan alltid skrive og redigere innlegg i Vedøy Blogg." },
  { id: "support", eyebrow: "KUNDESTØTTE", title: "Kundehenvendelser", description: "Samle henvendelser fra den viktigste kanalen din.", fields: [{ name: "inboxUrl", label: "KANAL ELLER INNBOKS", placeholder: "support@bedrift.no eller URL" }], hint: "Legg inn hvor kundene vanligvis kontakter dere." },
  { id: "seo", eyebrow: "MARKEDSFØRING", title: "SEO og synlighet", description: "Følg prioriterte søk og nettstedets synlighet.", fields: [{ name: "siteUrl", label: "NETTSTED", placeholder: "https://dittdomene.no", type: "url" }, { name: "keyword", label: "VIKTIGSTE SØKEORD", placeholder: "f.eks. elektriker haugesund" }], hint: "Koble gjerne Search Console også for mer presise tall." },
  { id: "ai", eyebrow: "VEDØY AI", title: "Neste steg", description: "Velg hvilken type hjelp som skal prioriteres i dashboardet.", fields: [{ name: "model", label: "FOKUS", placeholder: "Salg, innhold eller kundereise" }], hint: "Forslagene kan endres av deg før du bruker dem." },
  { id: "custom", eyebrow: "BYGGER", title: "Egendefinert HTML", description: "Gi en egendefinert modul et navn i arbeidsflaten.", fields: [{ name: "moduleTitle", label: "MODULNAVN", placeholder: "Min virksomhetsmodul" }], hint: "HTML-koden legges inn i modulbyggeren og vises isolert i dashboardet." },
];

const setupGuides: Record<string, SetupGuide> = {
  shopify: {
    needs: ["Butikkens .myshopify.com-domene", "En Shopify custom app med read_orders og read_analytics", "Admin API-token leveres sikkert til Vedøy"],
    steps: ["Åpne Shopify → Settings → Domains og kopier .myshopify.com-adressen.", "Gå til Apps and sales channels → Develop apps og opprett en app.", "Gi kun nødvendige lesetilganger. Ikke lim inn token i dette skjemaet eller i chat."],
    docsUrl: "https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin",
  },
  instagram: {
    needs: ["Instagram Business- eller Creator-konto", "Konto koblet til en Facebook-side", "Meta-app med nødvendige Insights-tillatelser"],
    steps: ["Åpne Instagram → Innstillinger → Kontotype og verktøy og kontroller at kontoen er profesjonell.", "Koble kontoen til virksomhetens Facebook-side.", "Skriv inn brukernavnet uten @. Vedøy kobler tilgangstokenet sikkert på serveren."],
    docsUrl: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/get-started",
  },
  analytics: {
    needs: ["Numerisk GA4 Property ID", "Viewer-tilgang til Vedøy sin service account", "Google Analytics Data API aktivert"],
    steps: ["Åpne Google Analytics og velg riktig konto og egenskap.", "Gå til Admin → Property details og kopier det numeriske Property ID-et.", "Gå til Property access management og legg til service account-adressen nedenfor som Viewer."],
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart",
  },
  search: {
    needs: ["Verifisert Search Console-egenskap", "Full eller Restricted tilgang for Vedøy sin service account", "Search Console API aktivert"],
    steps: ["Åpne Search Console og velg riktig egenskap.", "Kopier egenskapen nøyaktig: sc-domain:domene.no eller hele URL-prefixet med avsluttende /.", "Gå til Settings → Users and permissions og legg til service account-adressen nedenfor."],
    docsUrl: "https://support.google.com/webmasters/answer/7687615",
  },
  website: {
    needs: ["Offentlig HTTPS-adresse", "E-post for varsler", "Valgfri Google PageSpeed API-nøkkel på serveren"],
    steps: ["Lim inn hele adressen, inkludert https://.", "Velg når treghet skal varsles; 2500 ms er et godt startpunkt.", "Oppdater dashboardet for å lagre første måling og starte historikken."],
    docsUrl: "https://developers.google.com/speed/docs/insights/v5/get-started",
  },
  email: { needs: ["Google Workspace- eller Microsoft 365-konto", "OAuth-godkjenning fra en administrator"], steps: ["Skriv inn innboksen som skal kobles.", "Vedøy setter opp sikker OAuth. Passord skal aldri lagres i Growth."] },
  booking: { needs: ["Navn på bookingsystem", "Offentlig bookinglenke eller API-tilgang"], steps: ["Velg system og lim inn bookinglenken.", "Bruk Vedøy Booking direkte hvis du ikke har et annet system."] },
};

const localKey = "vedoy-connections";

function readLocal(): Record<string, Connection> {
  try {
    return JSON.parse(localStorage.getItem(localKey) || "{}");
  } catch {
    return {};
  }
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [activeId, setActiveId] = useState("shopify");
  const [values, setValues] = useState<Settings>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [googleSetup, setGoogleSetup] = useState<{ configured?: boolean; serviceAccountEmail?: string | null }>({});

  const active = useMemo(() => integrations.find((integration) => integration.id === activeId) || integrations[0], [activeId]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("module");
    if (requested && integrations.some((integration) => integration.id === requested)) setActiveId(requested);
    const local = readLocal();
    setConnections(local);
    fetch("/api/workspace/connections")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.connections) return;
        const next = Object.fromEntries(data.connections.map((connection: Connection) => [connection.module_id, connection]));
        setConnections(next);
        localStorage.setItem(localKey, JSON.stringify(next));
      })
      .catch(() => undefined);
    fetch("/api/google/setup").then((response) => response.ok ? response.json() : null).then((data) => data && setGoogleSetup(data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    setValues(connections[active.id]?.settings || {});
    setMessage("");
  }, [active.id, connections]);

  function select(id: string) {
    setActiveId(id);
    window.history.replaceState(null, "", `/connections?module=${id}`);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const connection: Connection = { module_id: active.id, status: "configured", settings: values, updated_at: new Date().toISOString() };
    const local = { ...connections, [active.id]: connection };
    setConnections(local);
    localStorage.setItem(localKey, JSON.stringify(local));

    try {
      const response = await fetch("/api/workspace/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: active.id, settings: values }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ? `${data.error} Innstillingene er lagret lokalt i mellomtiden.` : "Lagret lokalt. Databasen er ikke klar ennå.");
      } else {
        const next = { ...local, [active.id]: data.connection };
        setConnections(next);
        localStorage.setItem(localKey, JSON.stringify(next));
        setMessage("Tilkoblingen er lagret for denne virksomheten.");
      }
    } catch {
      setMessage("Lagret lokalt. Vi synkroniserer til databasen når forbindelsen er tilbake.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    const local = { ...connections };
    delete local[active.id];
    setConnections(local);
    localStorage.setItem(localKey, JSON.stringify(local));
    try {
      await fetch("/api/workspace/connections", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleId: active.id }) });
    } finally {
      setMessage("Tilkoblingen er fjernet.");
    }
  }

  const connected = connections[active.id];
  const guide = setupGuides[active.id];

  return (
    <main className="connections-page">
      <a className="blog-back" href="/">← Tilbake til dashboard</a>
      <div className="eyebrow">VEDØY GROWTH / TILKOBLINGER</div>
      <h1>Koble det du<br /><span>bruker hver dag.</span></h1>
      <p className="connections-lead">Velg en modul, legg inn virksomhetens informasjon og se statusen direkte i dashboardet.</p>

      <div className="connections-layout">
        <nav className="connection-list" aria-label="Tilkoblinger">
          {integrations.map((integration) => {
            const item = connections[integration.id];
            return <button className={active.id === integration.id ? "is-active" : ""} key={integration.id} onClick={() => select(integration.id)}>
              <span className={item ? "status-dot is-on" : "status-dot"} />
              <span><small>{integration.eyebrow}</small><b>{integration.title}</b></span>
              <span aria-hidden="true">→</span>
            </button>;
          })}
        </nav>

        <section className="connection-editor">
          <div className="connection-editor-top">
            <div><div className="eyebrow">{active.eyebrow}</div><h2>{active.title}</h2><p>{active.description}</p></div>
            <span className={connected ? "connection-badge is-connected" : "connection-badge"}>{connected ? "KONFIGURERT" : "IKKE TILKOBLET"}</span>
          </div>
          <form onSubmit={save}>
            {active.fields.map((field) => <label key={field.name}>{field.label}<input type={field.type || "text"} value={values[field.name] || ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} placeholder={field.placeholder} required /></label>)}
            <p className="connection-hint">{active.hint}</p>
            {guide && <aside className="connection-guide">
              <div><small>DETTE TRENGER DU</small><ul>{guide.needs.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><small>SLIK FINNER DU DET</small><ol>{guide.steps.map((item) => <li key={item}>{item}</li>)}</ol></div>
              {(active.id === "analytics" || active.id === "search") && <p className="service-account-line"><b>VEDØY GOOGLE-KONTO:</b> {googleSetup.serviceAccountEmail || "Ikke konfigurert ennå – kontakt Vedøy."}</p>}
              {guide.docsUrl && <a href={guide.docsUrl} target="_blank" rel="noreferrer">Åpne offisiell veiledning ↗</a>}
            </aside>}
            {message && <p className="connection-message">{message}</p>}
            <div className="connection-actions"><button className="button button-lime" disabled={saving}>{saving ? "Lagrer…" : connected ? "Oppdater tilkobling" : "Lagre tilkobling"} →</button>{connected && <button type="button" className="button connection-remove" onClick={disconnect}>Fjern</button>}</div>
          </form>
        </section>
      </div>
    </main>
  );
}
