import { vedoyLibraries } from "@/lib/vedoy-libraries";

export const metadata = {
  title: "Vedøy Libraries — åpne utviklerverktøy",
  description: "Se og bruk åpne Node.js- og TypeScript-biblioteker utviklet av Vedøy.",
};

export default function LibrariesPage() {
  return (
    <main className="libraries-page">
      <nav className="libraries-nav"><a href="/">← Vedøy Growth</a><a href="https://github.com/leandervedoy" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
      <header className="libraries-hero">
        <div className="eyebrow">VEDØY / OPEN SOURCE</div>
        <h1>Små verktøy.<br /><span>Fri bruk.</span></h1>
        <p>Praktiske biblioteker bygget fra systemene vi bruker i Vedøy Growth og Vedøy Booking. Åpent, dokumentert og klart for andre utviklere.</p>
      </header>
      <section className="library-grid">
        {vedoyLibraries.map((library) => <article key={library.name} className="library-card">
          <div className="library-card-top"><span>{library.status}</span><small>{library.version === "Beta" ? library.version : `v${library.version}`}</small></div>
          <h2>{library.name}</h2>
          <p>{library.description}</p>
          <ul>{library.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          <details className="library-how">
            <summary>Slik fungerer det <span aria-hidden="true">+</span></summary>
            <ol>{library.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <pre><code>{library.example}</code></pre>
          </details>
          {"install" in library ? <pre><code>{library.install}</code></pre> : <div className="library-app-label">DEL AV VEDØY GROWTH</div>}
          <div className="library-actions">
            <a className="library-primary" href={library.demoHref}>Prøv demo →</a>
            <a href={library.downloadHref} download={!library.downloadHref.startsWith("http") || undefined}>Last ned ↓</a>
          </div>
          <a className="library-doc-link" href={library.href} target={library.href.startsWith("http") ? "_blank" : undefined} rel={library.href.startsWith("http") ? "noreferrer" : undefined}>{library.action}</a>
        </article>)}
        <article className="library-card library-coming"><div className="library-card-top"><span>ROADMAP</span><small>Snart</small></div><h2>Flere Vedøy-biblioteker</h2><p>Nye byggesteiner publiseres her når de er testet i ekte Vedøy-produkter.</p></article>
      </section>
      <section className="libraries-principles"><small>PRINSIPPER</small><div><span>01</span><p>Gratis og åpent når det kan hjelpe andre.</p></div><div><span>02</span><p>Bygget fra reelle behov hos lokale virksomheter.</p></div><div><span>03</span><p>Enkel kode og tydelig dokumentasjon.</p></div></section>
    </main>
  );
}
