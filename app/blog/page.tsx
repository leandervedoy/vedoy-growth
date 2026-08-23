import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog";

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return <main className="blog-page"><header><Link className="brand" href="/"><span className="brand-mark">V</span> VEDØY<span className="brand-soft">/BLOGG</span></Link><Link className="blog-back" href="/">Tilbake til Vedøy Growth ↗</Link></header><section className="blog-hero"><div className="eyebrow">VEDØY / FELLES INNSIKT</div><h1>Ideer som gjør<br/><span>arbeidsdagen enklere.</span></h1><p>Praktiske tanker om teknologi, synlighet og bedre digitale arbeidsflyter — fra Vedøy.</p></section><section className="post-list">{posts.length ? posts.map(post => <article key={post.id}><div className="post-meta">{post.category} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("nb-NO") : "Publisert"}</div><h2>{post.title}</h2><p>{post.excerpt}</p><Link href={`/blog/${post.slug}`}>Les artikkelen ↗</Link></article>) : <article><div className="post-meta">VEDØY BLOGG</div><h2>Første artikkel kommer snart.</h2><p>Her publiserer vi praktiske råd for en enklere digital arbeidshverdag.</p></article>}</section><footer>© 2026 VEDØY · VEDØY Collective · VEDØY Growth · VEDØY IT</footer></main>;
}
