import { ProgressShell } from "@/components/progress/landing";
import { AccountPanel } from "@/components/progress/account-forms";
import { launchConfig } from "@/lib/progress/auth";
import styles from "@/components/progress/page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Din konto.", robots: { index: false, follow: true } };
export default function Page() { return <ProgressShell><section className={styles.accountSection}><p className={styles.eyebrow}>VEDØY GROWTH / KONTO</p><h1 className={styles.title}>Din konto.</h1><p className={styles.lead}>Du bestemmer hvilke oppdateringer du vil motta. Arbeidsflaten er fortsatt under utvikling.</p><AccountPanel configured={Boolean(launchConfig())} /></section></ProgressShell>; }
