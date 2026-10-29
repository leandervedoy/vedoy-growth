import { ProgressShell } from "@/components/progress/landing";
import { LoginForm } from "@/components/progress/account-forms";
import { launchConfig } from "@/lib/progress/auth";
import styles from "@/components/progress/page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Velkommen tilbake.", robots: { index: false, follow: true } };
export default function Page() { return <ProgressShell><section className={styles.accountSection}><p className={styles.eyebrow}>VEDØY GROWTH / KONTO</p><h1 className={styles.title}>Velkommen tilbake.</h1><p className={styles.lead}>Logg inn for å se og endre egne opplysninger og varselsvalg.</p><LoginForm configured={Boolean(launchConfig())} /></section></ProgressShell>; }
