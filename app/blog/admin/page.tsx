"use client";
import { useEffect, useState } from "react";
import type { BlogPost } from "@/lib/blog";

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/blog?admin=1", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(data.error || "Kunne ikke hente artiklene.");
    setPosts(data.posts || []);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return setMessage(data.error || "Kunne ikke lagre artikkelen.");
    form.reset();
    setMessage(body.status === "published" ? "Artikkelen er publisert." : "Utkastet er lagret i Supabase.");
    await load();
  }

  async function setStatus(id: string, status: "draft" | "published") {
    const response = await fetch("/api/blog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? (status === "published" ? "Artikkelen er publisert." : "Artikkelen er satt som utkast.") : data.error || "Kunne ikke endre artikkelen.");
    if (response.ok) await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Slette artikkelen permanent?")) return;
    const response = await fetch(`/api/blog?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Artikkelen er slettet." : data.error || "Kunne ikke slette artikkelen.");
    if (response.ok) await load();
  }

  return <main className="blog-admin"><a className="blog-back" href="/">← Tilbake til dashboard</a><div className="eyebrow">VEDØY BLOGG / ADMIN</div><h1>Administrer artikler</h1>{message && <p className="admin-success">{message}</p>}<form onSubmit={submit}><label>TITTEL<input name="title" required placeholder="Skriv en tydelig tittel" /></label><label>SLUG (VALGFRITT)<input name="slug" placeholder="genereres-fra-tittelen" /></label><label>INGRESS<input name="excerpt" required placeholder="Kort forklaring av artikkelen" /></label><label>KATEGORI<input name="category" defaultValue="Innsikt" /></label><label>INNHOLD<textarea name="body" required placeholder="Skriv artikkelen her…" /></label><label>STATUS<select name="status" defaultValue="draft"><option value="draft">Utkast</option><option value="published">Publisert</option></select></label><button className="button button-lime" disabled={saving}>{saving ? "Lagrer…" : "Lagre i Supabase ↗"}</button></form><section className="tool-list"><h2>Artikler</h2>{posts.length ? posts.map(post => <article key={post.id}><b>{post.title}</b><span>{post.status === "published" ? "Publisert" : "Utkast"} · {post.category}</span><div><button type="button" onClick={() => void setStatus(post.id, post.status === "published" ? "draft" : "published")}>{post.status === "published" ? "Gjør til utkast" : "Publiser"}</button><button type="button" onClick={() => void remove(post.id)}>Slett</button></div></article>) : <p>Ingen artikler ennå.</p>}</section></main>;
}

