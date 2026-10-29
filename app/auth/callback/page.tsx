import { ProgressShell } from "@/components/progress/landing";
import { AuthCallback } from "@/components/progress/account-forms";
import styles from "@/components/progress/page.module.css";
export const metadata = { title: "Bekreft konto", robots: { index: false, follow: false } };
export default function Page() { return <ProgressShell><section className={styles.accountSection}><AuthCallback /></section></ProgressShell>; }
