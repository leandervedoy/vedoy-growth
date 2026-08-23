"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [registered, setRegistered] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      const raw = await response.text();
      let data: { error?: string; authenticated?: boolean } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* a useful status code still reaches the user */ }
      if (!response.ok) return setError(data.error || `Serverfeil (${response.status}). Prøv igjen.`);
      setAuthenticated(Boolean(data.authenticated));
      if (data.authenticated) localStorage.setItem("vedoy-session", "active");
      setRegistered(true);
    } catch { setError("Kunne ikke kontakte serveren. Sjekk nettverket og prøv igjen."); }
  }

  return <main className="auth-page theme-local"><a className="brand" href="/"><span className="brand-mark">V</span> VEDØY<span className="brand-soft">/GROWTH</span></a><div className="auth-card"><div className="eyebrow">VEDØY GROWTH / NY KUNDE</div>{registered ? <div className="auth-success"><span>✓</span><h1>{authenticated ? "Kontoen er klar." : "Sjekk e-posten din."}</h1><p>{authenticated ? "Fortsett med å sette opp arbeidsflaten din." : "Bekreft e-posten din, og logg deretter inn for å åpne arbeidsflaten."}</p><a className="button button-lime" href={authenticated ? "/onboarding" : "/login"}>{authenticated ? "Åpne arbeidsflaten ↗" : "Til innlogging ↗"}</a></div> : <><h1>Bygg din<br/><span>arbeidsflate.</span></h1><p className="auth-intro">Registrer virksomheten din, så bygger vi videre rundt det du faktisk trenger.</p><form onSubmit={submit}><label>FULLT NAVN<input name="fullName" required placeholder="Ditt fulle navn" /></label><label>BEDRIFT<input name="company" required placeholder="Bedriftens navn" /></label><label>DAGLIG LEDER<input name="managingDirector" required placeholder="Navn på daglig leder" /></label><label>TELEFON<input name="phone" required type="tel" placeholder="+47 000 00 000" /></label><label>E-POST<input name="email" required type="email" placeholder="din@bedrift.no" autoComplete="email" /></label><label>LAG PASSORD<input name="password" required type="password" minLength={10} placeholder="Minst 10 tegn" autoComplete="new-password" /></label>{error && <p className="auth-error">{error}</p>}<button className="button button-lime" type="submit">Opprett konto <span>↗</span></button></form><p className="auth-foot">Passordet håndteres sikkert av Supabase Auth. Har du konto? <a href="/login">Logg inn</a>.</p></>}</div></main>;
}
