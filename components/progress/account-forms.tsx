"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { OrganizationKind } from "@/lib/progress/validation";
import styles from "./account.module.css";

type ProfileDraft = {
  displayName: string;
  organizationName: string;
  organizationKind: OrganizationKind | "";
  emailUpdates: boolean;
  smsUpdates: boolean;
  phone: string;
};
type PublicUser = { email: string; emailConfirmed: boolean };
type ApiResult = { response: Response; data: Record<string, unknown> };
type ProfileFieldsProps = { prefix: string; value: ProfileDraft; onChange: (change: Partial<ProfileDraft>) => void };

const organizationOptions: { value: OrganizationKind; label: string }[] = [
  { value: "business", label: "Bedrift" },
  { value: "sole_trader", label: "Enkeltpersonforetak" },
  { value: "association", label: "Forening" },
  { value: "nonprofit", label: "Ideell organisasjon" },
  { value: "other", label: "Annet" },
];
const emptyProfile: ProfileDraft = { displayName: "", organizationName: "", organizationKind: "", emailUpdates: false, smsUpdates: false, phone: "" };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function requestJson(path: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<ApiResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      ...(method === "GET" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }),
    });
    const data = record(await response.json().catch(() => null)) ?? {};
    return { response, data };
  } finally {
    window.clearTimeout(timeout);
  }
}

function errorMessage(data: Record<string, unknown>, fallback: string) {
  return typeof data.error === "string" && data.error ? data.error : fallback;
}

function readProfile(value: unknown): ProfileDraft | null {
  const profile = record(value);
  if (!profile || typeof profile.display_name !== "string" || typeof profile.organization_name !== "string" ||
      !organizationOptions.some((option) => option.value === profile.organization_kind) ||
      typeof profile.email_updates !== "boolean" || typeof profile.sms_updates !== "boolean") return null;
  return {
    displayName: profile.display_name,
    organizationName: profile.organization_name,
    organizationKind: profile.organization_kind as OrganizationKind,
    emailUpdates: profile.email_updates,
    smsUpdates: profile.sms_updates,
    phone: profile.sms_updates && typeof profile.phone_e164 === "string" ? profile.phone_e164 : "",
  };
}

function phoneIsValid(profile: ProfileDraft) {
  return !profile.smsUpdates || /^\+[1-9][0-9]{7,14}$/.test(profile.phone.replace(/[\s()-]/g, ""));
}

function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

function ErrorNotice({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, [message]);
  return <div className={styles.notice + " " + styles.error} role="alert" tabIndex={-1} ref={ref}>{message}</div>;
}

function OpeningNotice({ login = false }: { login?: boolean }) {
  return <div className={styles.notice + " " + styles.opening} role="status">
    <h2>{login ? "Innloggingen åpner snart" : "Registreringen åpner snart"}</h2>
    <p>Vi gjør kontoløsningen klar. Skjemaet er en forhåndsvisning, og opplysninger blir ikke sendt eller lagret her.</p>
    <Link href="/laer">Du kan lese alle leksjonene allerede nå <span aria-hidden="true">→</span></Link>
  </div>;
}

function ProfileFields({ prefix, value, onChange }: ProfileFieldsProps) {
  return <div className={styles.fields}>
    <div className={styles.field}><label htmlFor={prefix + "-name"}>Navnet ditt</label><input className={styles.input} id={prefix + "-name"} name="displayName" autoComplete="name" maxLength={120} required value={value.displayName} onChange={(event) => onChange({ displayName: event.target.value })} /></div>
    <div className={styles.field}><label htmlFor={prefix + "-organization"}>Navn på virksomheten eller organisasjonen</label><input className={styles.input} id={prefix + "-organization"} name="organizationName" autoComplete="organization" maxLength={160} required value={value.organizationName} onChange={(event) => onChange({ organizationName: event.target.value })} /></div>
    <div className={styles.field}><label htmlFor={prefix + "-kind"}>Hva slags virksomhet eller organisasjon?</label><select className={styles.input} id={prefix + "-kind"} name="organizationKind" required value={value.organizationKind} onChange={(event) => onChange({ organizationKind: event.target.value as ProfileDraft["organizationKind"] })}><option value="" disabled>Velg det som passer best</option>{organizationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
  </div>;
}

function Preferences({ prefix, value, onChange, account = false }: ProfileFieldsProps & { account?: boolean }) {
  return <fieldset className={styles.preferences} aria-describedby={prefix + "-updates-note"}>
    <legend>Vil du høre fra oss? <span>Valgfritt</span></legend>
    <p className={styles.fieldHint} id={prefix + "-updates-note"}>Velg e-post, SMS, begge eller ingen. Valgene påvirker ikke tilgangen til kontoen din.</p>
    <div className={styles.choices}>
      <label className={styles.choice} htmlFor={prefix + "-email-updates"}><input className={styles.checkbox} type="checkbox" id={prefix + "-email-updates"} name="emailUpdates" checked={value.emailUpdates} onChange={(event) => onChange({ emailUpdates: event.target.checked })} /><span>Ja, send meg e-post om lansering og viktige produktnyheter.</span></label>
      <label className={styles.choice} htmlFor={prefix + "-sms-updates"}><input className={styles.checkbox} type="checkbox" id={prefix + "-sms-updates"} name="smsUpdates" checked={value.smsUpdates} onChange={(event) => onChange({ smsUpdates: event.target.checked, ...(!event.target.checked ? { phone: "" } : {}) })} /><span>Ja, send meg SMS om lansering og viktige produktnyheter.</span></label>
    </div>
    {value.smsUpdates && <div className={styles.phoneField}><label htmlFor={prefix + "-phone"}>Mobilnummer med landskode</label><input className={styles.input} id={prefix + "-phone"} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+47 987 65 432" maxLength={32} required value={value.phone} onChange={(event) => onChange({ phone: event.target.value })} aria-describedby={prefix + "-phone-hint"} /><p className={styles.fieldHint} id={prefix + "-phone-hint"}>Nummeret brukes til SMS-valget ditt. Det fjernes fra den aktive varselprofilen når du slår av SMS og lagrer.</p></div>}
    <p className={styles.deliveryNote}>Valgene lagres før vi starter utsendelser. E-post og SMS med produktnyheter er ikke aktivert ennå.</p>
    {account ? <div className={styles.withdrawal}><button className={styles.plainButton} type="button" disabled={!value.emailUpdates && !value.smsUpdates} onClick={() => onChange({ emailUpdates: false, smsUpdates: false, phone: "" })}>Slå av begge valgene</button><p>Fjern et kryss og velg «Lagre endringer» for å trekke valget tilbake. Endringer gjelder først når du lagrer.</p></div> : <p className={styles.fieldHint}>Du kan endre eller trekke tilbake hvert valg på kontosiden.</p>}
  </fieldset>;
}

function PasswordField({ prefix, value, onChange, isNew = false }: { prefix: string; value: string; onChange: (value: string) => void; isNew?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div className={styles.field}><label htmlFor={prefix + "-password"}>Passord</label><div className={styles.passwordField}><input className={styles.input} id={prefix + "-password"} name="password" type={visible ? "text" : "password"} autoComplete={isNew ? "new-password" : "current-password"} minLength={isNew ? 12 : undefined} maxLength={128} required value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={isNew ? prefix + "-password-hint" : undefined} /><button className={styles.passwordToggle} type="button" aria-label={visible ? "Skjul passord" : "Vis passord"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Skjul" : "Vis"}</button></div>{isNew && <p className={styles.fieldHint} id={prefix + "-password-hint"}>Bruk mellom 12 og 128 tegn. En lang setning kan være lettere å huske.</p>}</div>;
}

export function RegistrationForm({ configured }: { configured: boolean }) {
  const prefix = useId();
  const [profile, setProfile] = useState<ProfileDraft>({ ...emptyProfile });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");

  function updateProfile(change: Partial<ProfileDraft>) { setProfile((current) => ({ ...current, ...change })); setError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy) return;
    setError("");
    if (!phoneIsValid(profile)) { setError("Skriv mobilnummer med landskode, for eksempel +47 987 65 432."); return; }
    setBusy(true);
    try {
      const { response, data } = await requestJson("/api/auth/register", "POST", { ...profile, phone: profile.smsUpdates ? profile.phone : "", email, password, privacyAccepted, website });
      if (response.status !== 201 || data.ok !== true) { setError(errorMessage(data, "Registreringen kunne ikke bekreftes. Prøv igjen om litt.")); return; }
      setPassword("");
      if (data.authenticated === true) { window.location.assign("/konto"); return; }
      setReceipt(typeof data.message === "string" ? data.message : "Hvis adressen kan registreres, får du en e-post for å bekrefte kontoen. Har du allerede konto, kan du logge inn.");
    } catch { setError("Vi fikk ikke bekreftet registreringen. Kontroller forbindelsen og prøv igjen."); }
    finally { setBusy(false); }
  }

  return <section className={styles.card} aria-label="Opprett konto">
    {!configured && <OpeningNotice />}
    {receipt ? <div className={styles.receipt} role="status"><span className={styles.receiptIcon} aria-hidden="true">↗</span><h2>Neste steg</h2><p>{receipt}</p><Link className={styles.buttonLink} href="/login">Gå til innlogging <span aria-hidden="true">→</span></Link></div> : <form onSubmit={submit} aria-busy={busy}>
      <fieldset className={styles.formFields} disabled={!configured || busy}>
        <legend className={styles.sectionTitle}>Litt om deg</legend>
        <p className={styles.sectionIntro}>Fyll ut feltene under. E-post og SMS om produktnyheter er helt valgfritt.</p>
        <ProfileFields prefix={prefix} value={profile} onChange={updateProfile} />
        <div className={styles.credentials}><div className={styles.field}><label htmlFor={prefix + "-email"}>E-postadresse</label><input className={styles.input} id={prefix + "-email"} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} /></div><PasswordField prefix={prefix} value={password} onChange={(value) => { setPassword(value); setError(""); }} isNew /></div>
        <Preferences prefix={prefix} value={profile} onChange={updateProfile} />
        <label className={styles.privacyChoice} htmlFor={prefix + "-privacy"}><input className={styles.checkbox} id={prefix + "-privacy"} type="checkbox" name="privacyAccepted" required checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} /><span>Jeg har lest <Link href="/personvern" target="_blank" rel="noopener noreferrer">personvernerklæringen<span className={styles.srOnly}> (åpnes i ny fane)</span></Link>.</span></label>
        <div className={styles.honeypot} aria-hidden="true"><label htmlFor={prefix + "-website"}>Nettside</label><input id={prefix + "-website"} name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
      </fieldset>
      {error && <ErrorNotice message={error} />}
      <button className={styles.submitButton} type="submit" disabled={!configured || busy}>{busy ? <><Spinner />Oppretter konto …</> : configured ? <>Opprett konto <span aria-hidden="true">→</span></> : "Registreringen åpner snart"}</button>
      <p className={styles.formFoot}>Har du allerede konto? <Link href="/login">Logg inn</Link></p>
    </form>}
  </section>;
}

export function LoginForm({ configured }: { configured: boolean }) {
  const prefix = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy) return;
    setError(""); setBusy(true);
    try {
      const { response, data } = await requestJson("/api/auth/login", "POST", { email, password });
      if (!response.ok || data.ok !== true) { setError(errorMessage(data, "Innloggingen kunne ikke bekreftes. Prøv igjen.")); return; }
      setPassword("");
      window.location.assign("/konto");
    } catch { setError("Vi fikk ikke kontakt med innloggingstjenesten. Prøv igjen om litt."); }
    finally { setBusy(false); }
  }

  return <section className={styles.card} aria-label="Innlogging">
    {!configured && <OpeningNotice login />}
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset className={styles.formFields} disabled={!configured || busy}><legend className={styles.srOnly}>Logg inn med e-post og passord</legend><div className={styles.fields}><div className={styles.field}><label htmlFor={prefix + "-email"}>E-postadresse</label><input className={styles.input} id={prefix + "-email"} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} /></div><PasswordField prefix={prefix} value={password} onChange={(value) => { setPassword(value); setError(""); }} /></div></fieldset>
      {error && <ErrorNotice message={error} />}
      <button className={styles.submitButton} type="submit" disabled={!configured || busy}>{busy ? <><Spinner />Logger inn …</> : configured ? <>Logg inn <span aria-hidden="true">→</span></> : "Innloggingen åpner snart"}</button>
      <p className={styles.formFoot}>Ny hos Vedøy Growth? <Link href="/register">Se registrering</Link></p>
    </form>
  </section>;
}

export function AccountPanel({ configured }: { configured: boolean }) {
  const prefix = useId();
  const [phase, setPhase] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [profile, setProfile] = useState<ProfileDraft>({ ...emptyProfile });
  const [savedProfile, setSavedProfile] = useState<ProfileDraft>({ ...emptyProfile });
  const [busy, setBusy] = useState<"save" | "logout" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const sessionRequest = useRef<Promise<ApiResult> | null>(null);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    setPhase("loading"); setError("");
    if (!sessionRequest.current) sessionRequest.current = requestJson("/api/auth/session", "GET");
    sessionRequest.current.then(({ response, data }) => {
      if (!active) return;
      if (response.status === 401) { setPhase("signed-out"); return; }
      if (!response.ok) { setError(errorMessage(data, "Kontoinformasjonen er midlertidig utilgjengelig. Prøv igjen om litt.")); setPhase("error"); return; }
      const returnedUser = record(data.user);
      const returnedProfile = data.profile === null ? { ...emptyProfile } : readProfile(data.profile);
      if (!returnedUser || typeof returnedUser.email !== "string" || !returnedProfile) { setError("Kontoinformasjonen kunne ikke leses. Prøv igjen om litt."); setPhase("error"); return; }
      setUser({ email: returnedUser.email, emailConfirmed: returnedUser.emailConfirmed === true });
      setProfile(returnedProfile); setSavedProfile(returnedProfile); setPhase("ready");
    }).catch(() => { if (active) { setError("Vi fikk ikke hentet kontoen. Kontroller forbindelsen og prøv igjen."); setPhase("error"); } });
    return () => { active = false; };
  }, [configured, retry]);

  function updateProfile(change: Partial<ProfileDraft>) { setProfile((current) => ({ ...current, ...change })); setSaved(false); setError(""); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy || phase !== "ready") return;
    setError(""); setSaved(false);
    if (!phoneIsValid(profile)) { setError("Skriv mobilnummer med landskode, for eksempel +47 987 65 432."); return; }
    setBusy("save");
    try {
      const { response, data } = await requestJson("/api/launch/profile", "PATCH", { ...profile, phone: profile.smsUpdates ? profile.phone : "" });
      if (response.status === 401) { setError("Økten er utløpt. Logg inn på nytt før du lagrer."); setPhase("signed-out"); return; }
      const confirmed = readProfile(data.profile);
      if (!response.ok || data.ok !== true || !confirmed) { setError(errorMessage(data, "Endringene ble ikke bekreftet lagret. Prøv igjen om litt.")); return; }
      setProfile(confirmed); setSavedProfile(confirmed); setSaved(true);
    } catch { setError("Vi fikk ikke bekreftet lagringen. Kontroller forbindelsen og prøv igjen."); }
    finally { setBusy(null); }
  }
  async function logout() {
    if (busy) return;
    setBusy("logout"); setError(""); setSaved(false);
    try {
      const { response, data } = await requestJson("/api/auth/logout", "POST", {});
      if (!response.ok || data.ok !== true) { setError(errorMessage(data, "Utloggingen kunne ikke bekreftes. Prøv igjen.")); return; }
      window.location.assign("/login");
    } catch { setError("Vi fikk ikke bekreftet utloggingen. Prøv igjen."); }
    finally { setBusy(null); }
  }

  if (!configured) return <section className={styles.card} aria-label="Kontostatus"><OpeningNotice /><p className={styles.fieldHint}>Kontoinnstillingene blir tilgjengelige når registreringen åpner.</p></section>;
  if (phase === "loading") return <section className={styles.card} aria-label="Kontostatus"><p className={styles.loading} role="status"><Spinner />Henter kontoen din …</p></section>;
  if (phase === "signed-out") return <section className={styles.card} aria-label="Innlogging kreves">{error && <ErrorNotice message={error} />}<h2 className={styles.sectionTitle}>Logg inn for å åpne kontoen</h2><p className={styles.sectionIntro}>Her kan du se opplysningene dine og endre valgene for e-post og SMS.</p><Link className={styles.buttonLink} href="/login">Gå til innlogging <span aria-hidden="true">→</span></Link></section>;
  if (phase === "error") return <section className={styles.card} aria-label="Kontostatus"><ErrorNotice message={error} /><div className={styles.errorActions}><button className={styles.secondaryButton} type="button" onClick={() => { sessionRequest.current = null; setRetry((value) => value + 1); }}>Prøv igjen</button><Link href="/login">Gå til innlogging</Link></div></section>;

  const dirty = JSON.stringify(profile) !== JSON.stringify(savedProfile);
  return <section className={styles.card} aria-label="Konto og meldingsvalg">
    <div className={styles.identity}><div><p className={styles.identityLabel}>INNLOGGET SOM</p><p className={styles.email}>{user?.email}</p></div><span className={styles.emailStatus}>{user?.emailConfirmed ? "E-post bekreftet" : "E-post ikke bekreftet"}</span></div>
    <div className={styles.workspaceNote}><span aria-hidden="true">◌</span><p>Arbeidsflaten er fortsatt under utvikling. Du kan lese leksjonene og administrere kontoen din nå.</p></div>
    <form onSubmit={save} aria-busy={busy === "save"}>
      <fieldset className={styles.formFields} disabled={busy !== null}><legend className={styles.sectionTitle}>Dine opplysninger og valg</legend><p className={styles.sectionIntro}>Du bestemmer hvordan du vil høre fra oss.</p><ProfileFields prefix={prefix} value={profile} onChange={updateProfile} /><Preferences prefix={prefix} value={profile} onChange={updateProfile} account /></fieldset>
      {error && <ErrorNotice message={error} />}
      {saved && <div className={styles.notice + " " + styles.success} role="status">Endringene er lagret. {profile.emailUpdates || profile.smsUpdates ? "Du kan endre valgene dine igjen når du vil." : "Begge valgene for produktnyheter er slått av."}</div>}
      <button className={styles.submitButton} type="submit" disabled={busy !== null || !dirty}>{busy === "save" ? <><Spinner />Lagrer …</> : <>Lagre endringer <span aria-hidden="true">→</span></>}</button>
      {dirty && !saved && <p className={styles.unsavedNote}>Du har endringer som ikke er lagret.</p>}
    </form>
    <div className={styles.accountBottom}><Link href="/personvern">Personvernerklæringen</Link><button className={styles.plainButton} type="button" disabled={busy !== null} onClick={logout}>{busy === "logout" ? <><Spinner />Logger ut …</> : "Logg ut"}</button></div>
  </section>;
}

export function AuthCallback() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Discard all callback parameters without reading or exchanging any token.
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  return <section className={styles.card} aria-label="Fullfør innloggingen"><h2 className={styles.sectionTitle}>Fullfør innloggingen</h2><p className={styles.sectionIntro}>Logg inn med e-post og passord for å fortsette.</p><Link className={styles.buttonLink} href="/login">Gå til innlogging <span aria-hidden="true">→</span></Link></section>;
}
