"use client";

import { formatDuration as formatDateDuration, intervalToDuration } from "date-fns";
import { nb } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";

type Entry = { id: string; started_at: string; ended_at: string | null; note: string };

function secondsFor(entry: Entry, now: number) { return Math.max(0, Math.floor(((entry.ended_at ? new Date(entry.ended_at).getTime() : now) - new Date(entry.started_at).getTime()) / 1000)); }
function formatDuration(seconds: number) { return formatDateDuration(intervalToDuration({ start: 0, end: seconds * 1000 }), { format: ["hours", "minutes"], locale: nb }) || "0 minutter"; }

export function WorkHoursModule() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/workspace/hours");
    const data = await response.json().catch(() => ({}));
    if (response.ok) setEntries(data.entries || []);
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);

  const active = entries.find((entry) => !entry.ended_at);
  const todaySeconds = useMemo(() => entries.filter((entry) => new Date(entry.started_at).toDateString() === new Date(now).toDateString()).reduce((total, entry) => total + secondsFor(entry, now), 0), [entries, now]);

  async function toggle() {
    setLoading(true); setError("");
    const response = await fetch("/api/workspace/hours", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: active ? "stop" : "start" }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "Kunne ikke oppdatere timer.");
    await load(); setLoading(false);
  }

  return <div className="module-body work-hours-module"><div className="connection-row"><span className={active ? "status-dot is-on" : "status-dot"} />{active ? "Timer kjører" : "Ikke registrert i dag"}</div><div className="module-primary"><small>I DAG</small><b>{formatDuration(todaySeconds)}</b></div>{active && <p className="module-muted">Pågår i {formatDuration(secondsFor(active, now))}</p>}{error && <p className="work-hours-error">{error}</p>}<button className="module-action" type="button" onClick={toggle} disabled={loading}>{loading ? "Lagrer…" : active ? "Stopp timer" : "Start timer"} →</button></div>;
}
