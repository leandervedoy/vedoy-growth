export type BlogPostStatus = "published" | "draft";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  coverUrl?: string | null;
  publishedAt?: string | null;
  status: BlogPostStatus;
  createdAt?: string;
  updatedAt?: string;
};

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category?: string | null;
  cover_url?: string | null;
  status: BlogPostStatus;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function mapBlogRow(row: BlogRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.content,
    category: row.category || "Innsikt",
    coverUrl: row.cover_url,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function blogConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const { url, key } = blogConfig();
  if (!url || !key) return [];
  const response = await fetch(`${url}/rest/v1/vedoy_blog_posts?status=eq.published&select=*&order=published_at.desc.nullslast,created_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 300 },
  });
  if (!response.ok) return [];
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows.map(mapBlogRow) : [];
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const { url, key } = blogConfig();
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/vedoy_blog_posts?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 300 },
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? mapBlogRow(rows[0]) : null;
}
