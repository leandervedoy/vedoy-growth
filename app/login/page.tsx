"use client";

import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const vedoyLoginUrl = process.env.NEXT_PUBLIC_VEDOY_LOGIN_URL;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setError(data.error || "Kunne ikke logge inn.");
    localStorage.setItem("vedoy-session", "active");
    try { const profileResponse = await fetch("/api/workspace/profile"); const profileData = profileResponse.ok ? await profileResponse.json() : null; window.location.href = profileData?.profile ? "/" : "/onboarding"; } catch { window.location.href = "/"; }
  }

  function startVedoyLogin() {
    if (!vedoyLoginUrl) return setError("Vedøy Login er ikke koblet til Growth ennå. Legg inn NEXT_PUBLIC_VEDOY_LOGIN_URL når tjenesten er klar.");
    try { const target = new URL(vedoyLoginUrl); target.searchParams.set("return_to", `${window.location.origin}/login`); window.location.assign(target.toString()); } catch { setError("Vedøy Login-adressen er ikke gyldig. Sjekk NEXT_PUBLIC_VEDOY_LOGIN_URL."); }
  }

  return <main className="auth-page theme-local"><a className="brand" href="/"><span className="brand-mark">V</span> VEDØY<span className="brand-soft">/GROWTH</span></a><div className="auth-card"><div className="eyebrow">VEDØY / FELLES INNLOGGING</div><h1>Velkommen<br/><span>tilbake.</span></h1><button type="button" className="vedoy-login-button" onClick={startVedoyLogin}><span className="vedoy-login-mark">V</span> Fortsett med Vedøy Login</button><p className="auth-or">eller bruk e-post og passord</p><form onSubmit={submit}><label>E-POST<input name="email" type="email" required placeholder="din@bedrift.no" autoComplete="email" /></label><label>PASSORD<input name="password" type="password" required placeholder="Passord" autoComplete="current-password" /></label><label className="remember-row"><input name="rememberMe" type="checkbox" /> Husk meg på denne enheten</label>{error && <p className="auth-error">{error}</p>}<button className="button button-lime">Logg inn ↗</button></form><div className="auth-register"><span>Ny i Vedøy Growth?</span><a className="button auth-secondary" href="/register">Registrer virksomhet →</a></div><p className="auth-foot">Vedøy Login blir felles innlogging for Growth, Assist og fremtidige Vedøy-tjenester.</p></div></main>;
}
