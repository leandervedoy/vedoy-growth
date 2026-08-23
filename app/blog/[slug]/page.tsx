import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPost } from "@/lib/blog";

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  return <main className="blog-page article-page"><header><Link className="brand" href="/blog"><span className="brand-mark">V</span> VEDØY<span className="brand-soft">/BLOGG</span></Link></header><article><div className="post-meta">{post.category} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("nb-NO") : "Publisert"}</div><h1>{post.title}</h1><p className="article-lead">{post.excerpt}</p><div className="article-body">{post.body.split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><Link className="blog-back" href="/blog">← Alle artikler</Link></article></main>;
}
