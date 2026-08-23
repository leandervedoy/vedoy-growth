import { NextResponse } from "next/server";
import { createSlug, getPublishedPosts, mapBlogRow, type BlogPostStatus } from "@/lib/blog";
import { getAuthContext, supabaseHeaders } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const select = "id,slug,title,excerpt,content,category,cover_url,status,published_at,created_at,updated_at";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("admin") !== "1") return NextResponse.json({ posts: await getPublishedPosts(), source: "supabase" });
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Logg inn for å administrere bloggen." }, { status: 401 });
  const response = await fetch(`${auth.url}/rest/v1/vedoy_blog_posts?select=${select}&order=updated_at.desc`, { headers: supabaseHeaders(auth), cache: "no-store" });
  const rows = await response.json().catch(() => []);
  if (!response.ok) return NextResponse.json({ error: "Du har ikke tilgang til bloggadministrasjon." }, { status: response.status });
  return NextResponse.json({ posts: Array.isArray(rows) ? rows.map(mapBlogRow) : [], source: "supabase" });
}

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Logg inn for å lagre artikler." }, { status: 401 });
  const post = await request.json().catch(() => null);
  const title = cleanText(post?.title, 180);
  const excerpt = cleanText(post?.excerpt, 500);
  const content = cleanText(post?.body, 50_000);
  const category = cleanText(post?.category, 80) || "Innsikt";
  const status: BlogPostStatus = post?.status === "published" ? "published" : "draft";
  const slug = createSlug(cleanText(post?.slug, 100) || title);
  if (!title || !excerpt || !content || !slug) return NextResponse.json({ error: "Tittel, ingress og innhold er påkrevd." }, { status: 400 });
  const response = await fetch(`${auth.url}/rest/v1/vedoy_blog_posts?select=${select}`, {
    method: "POST",
    headers: { ...supabaseHeaders(auth), Prefer: "return=representation" },
    body: JSON.stringify({ slug, title, excerpt, content, category, status, author_id: auth.user.id, published_at: status === "published" ? new Date().toISOString() : null }),
  });
  const rows = await response.json().catch(() => []);
  if (!response.ok) return NextResponse.json({ error: response.status === 409 ? "Denne nettadressen er allerede brukt. Endre tittelen eller slug." : "Kunne ikke lagre artikkelen." }, { status: response.status });
  return NextResponse.json({ post: mapBlogRow(rows[0]), persisted: true });
}

export async function PATCH(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Logg inn for å endre artikler." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = cleanText(body?.id, 50);
  const status: BlogPostStatus | null = body?.status === "published" || body?.status === "draft" ? body.status : null;
  if (!id || !status) return NextResponse.json({ error: "Ugyldig artikkel eller status." }, { status: 400 });
  const response = await fetch(`${auth.url}/rest/v1/vedoy_blog_posts?id=eq.${encodeURIComponent(id)}&select=${select}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(auth), Prefer: "return=representation" },
    body: JSON.stringify({ status, published_at: status === "published" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }),
  });
  const rows = await response.json().catch(() => []);
  if (!response.ok || !rows[0]) return NextResponse.json({ error: "Kunne ikke endre artikkelen." }, { status: response.ok ? 404 : response.status });
  return NextResponse.json({ post: mapBlogRow(rows[0]) });
}

export async function DELETE(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Logg inn for å slette artikler." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id")?.slice(0, 50);
  if (!id) return NextResponse.json({ error: "Artikkel mangler." }, { status: 400 });
  const response = await fetch(`${auth.url}/rest/v1/vedoy_blog_posts?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: supabaseHeaders(auth) });
  return response.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Kunne ikke slette artikkelen." }, { status: response.status });
}
