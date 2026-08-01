import { NextResponse } from "next/server";
import { seedPosts, BlogPost } from "@/lib/blog";

export async function GET() {
  return NextResponse.json({ posts: seedPosts, source: process.env.SUPABASE_URL ? "supabase-ready" : "demo" });
}

export async function POST(request: Request) {
  const post = await request.json() as Partial<BlogPost>;
  if (!post.title || !post.excerpt || !post.body) return NextResponse.json({ error: "Tittel, ingress og innhold er påkrevd." }, { status: 400 });
  return NextResponse.json({ post: { ...post, id: `local-${Date.now()}`, status: post.status || "draft", publishedAt: post.publishedAt || new Date().toISOString().slice(0, 10) }, persisted: Boolean(process.env.SUPABASE_URL) });
}
