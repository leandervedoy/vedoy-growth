"use client";

import "@/app/workspace-tools.css";
import { useEffect, useState } from "react";

type Member = { id: string; display_name: string; email: string; role: "owner" | "admin" | "manager" | "employee"; created_at: string };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [inviteReady, setInviteReady] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch("/api/workspace/members");
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setMembers(data.members || []); setCanManage(Boolean(data.canManage)); setInviteReady(Boolean(data.inviteReady)); }
    else setMessage(data.error || "Kunne ikke hente teamet.");
  }
  useEffect(() => { void load(); }, []);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch("/api/workspace/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setMessage(data.invited ? "Invitasjonen er sendt." : "Brukeren er lagt til."); event.currentTarget.reset(); await load(); }
    else setMessage(data.error || "Kunne ikke legge til brukeren.");
    setLoading(false);
  }

  async function changeRole(id: string, role: Member["role"]) {
    const response = await fetch("/api/workspace/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error || "Kunne ikke endre rollen.");
    await load();
  }

  return <main className="tool-page"><a href="/" className="tool-back">← Dashboard</a><div className="tool-heading"><div><small>VEDØY GROWTH / TILGANG</small><h1>Team og roller</h1><p>Inviter ansatte og styr hvem som kan administrere virksomheten.</p></div></div><div className="tool-columns">{canManage && <form className="tool-form" onSubmit={invite}><h2>Legg til ansatt</h2><label>Navn<input name="displayName" placeholder="Fullt navn" required /></label><label>E-post<input name="email" type="email" placeholder="ansatt@bedrift.no" required /></label><label>Rolle<select name="role" defaultValue="employee"><option value="employee">Ansatt</option><option value="manager">Leder</option><option value="admin">Administrator</option></select></label><button type="submit" disabled={loading}>{loading ? "Sender…" : "Send invitasjon →"}</button>{!inviteReady && <p className="tool-message">Invitasjoner trenger SUPABASE_SERVICE_ROLE_KEY i Vercel.</p>}{message && <p className="tool-message">{message}</p>}</form>}<section className="tool-list"><h2>Team</h2>{members.length ? members.map((member) => <article key={member.id}><b>{member.display_name || member.email || "Bruker"}</b><span>{member.email}</span>{canManage && member.role !== "owner" ? <select value={member.role} onChange={(event) => void changeRole(member.id, event.target.value as Member["role"])}><option value="employee">Ansatt</option><option value="manager">Leder</option><option value="admin">Administrator</option></select> : <small>{member.role === "owner" ? "Eier" : member.role}</small>}</article>) : <p>Ingen medlemmer funnet.</p>}</section></div></main>;
}
