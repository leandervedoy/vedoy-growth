"use client";
import { FormEvent, useEffect, useState } from "react";

type Profile = { business_name?: string; description?: string; organization_number?: string; logo_url?: string; owner_name?: string; founder_name?: string; managing_director_name?: string; representative_role?: string };

export default function CompanySettingsPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const canEdit = role === "owner" || role === "admin";

  useEffect(() => {
    fetch("/api/workspace/profile").then((response) => response.json()).then((data) => {
      if (!data?.authenticated) return window.location.assign("/login");
      setProfile(data.profile || {}); setRole(data.role || "");
    }).catch(() => setMessage("Kunne ikke hente virksomhetsprofilen.")).finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canEdit) return;
    setSaving(true); setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/workspace/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Virksomhetsprofilen er oppdatert." : data.error || "Kunne ikke lagre.");
    if (data.profile) setProfile(data.profile); setSaving(false);
  }

  if (loading) return <main className="company-settings-page"><p>Laster virksomheten…</p></main>;
  const field = (name: keyof Profile, label: string, placeholder = "") => <label>{label}<input name={name.replace(/_([a-z])/g, (_, character) => character.toUpperCase())} defaultValue={profile[name] || ""} placeholder={placeholder} disabled={!canEdit} /></label>;
  return <main className="company-settings-page">
    <a href="/">← Til dashboard</a><div className="eyebrow">INNSTILLINGER / MIN BEDRIFT</div>
    <header><div><h1>Min bedrift</h1><p>Felles informasjon som brukes i dashboard, booking, rapporter og tilkoblinger.</p></div>{profile.logo_url && <img src={profile.logo_url} alt="Virksomhetens logo" />}</header>
    <div className="company-role"><span>DIN SYSTEMROLLE</span><b>{role === "owner" ? "Eier" : role === "admin" ? "Administrator" : role === "manager" ? "Leder" : "Ansatt"}</b><small>{canEdit ? "Du kan redigere virksomhetsprofilen." : "Be eier eller administrator om endringer."}</small></div>
    <form onSubmit={save}><div className="company-fields">
      {field("business_name", "VIRKSOMHETSNAVN", "Bedrift AS")}{field("organization_number", "ORGANISASJONSNUMMER", "9 siffer")}{field("logo_url", "LOGO-URL", "https://...")}{field("owner_name", "EIER", "Fullt navn")}{field("founder_name", "STIFTER", "Fullt navn")}{field("managing_director_name", "DAGLIG LEDER", "Fullt navn")}{field("representative_role", "DIN ROLLE / STILLING", "Hvis du ikke er eier eller daglig leder")}
      <label className="company-description">BESKRIVELSE<textarea name="description" defaultValue={profile.description || ""} disabled={!canEdit} /></label>
    </div>{message && <p className="company-message">{message}</p>}{canEdit && <button className="button button-lime" disabled={saving}>{saving ? "Lagrer…" : "Lagre virksomhetsprofil"}</button>}</form>
  </main>;
}
