import Link from 'next/link';
import { ProgressShell } from '@/components/progress/landing';
import { launchConfig } from '@/lib/progress/auth';
import styles from '@/components/progress/page.module.css';

export const metadata = { title: 'Dette bygger vi' };
export default function UnderDevelopment() {
  const ready = Boolean(launchConfig());
  return <ProgressShell><section className={styles.content}><p className={styles.eyebrow}>STATUS / UNDER UTVIKLING</p><h1 className={styles.title}>Vi bygger med omtanke.</h1><p className={styles.lead}>Vedøy Growth skal hjelpe bedrifter og organisasjoner med å lære, velge gode tiltak og følge fremgang. Kunnskapen er åpen. Den personlige arbeidsflaten er ikke lansert.</p><div className={styles.grid}><article className={styles.card}><h2>Dette kan du bruke nå</h2><ul><li>Seks åpne leksjoner med konkrete øvelser.</li><li>Spørsmål som setter økonomi, mennesker og miljø i sammenheng.</li><li>{ready ? 'Konto med egne, frivillige varselsvalg.' : 'En forhåndsvisning av registrering og varselsvalg.'}</li></ul></article><article className={styles.card}><h2>Dette arbeider vi med</h2><ul><li>En enkel plan for virksomheten eller organisasjonen.</li><li>Oversikt over tiltak, læring og resultater.</li><li>Trygge samarbeid og tydelig eierskap til egne opplysninger.</li></ul></article></div><div className={styles.notice}><strong>Arbeidsflaten er låst.</strong>Konto gir ikke tilgang til det uferdige verktøyet. Vi har ingen fast lanseringsdato. {ready ? 'Du kan velge e-post, SMS, begge eller ingen varsler på kontosiden.' : 'Registreringen åpner når kontolagring og e-postbekreftelse er klare. Skjemaet sender ikke opplysninger før da.'}</div><div className={styles.actions}><Link href="/laer">Begynn med en leksjon →</Link><Link href="/register">{ready ? 'Velg lanseringsvarsler' : 'Se registreringen'}</Link></div></section></ProgressShell>;
}
