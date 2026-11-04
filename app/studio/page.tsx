"use client";

import { useEffect, useState } from "react";
import Home from "../page";

type AccessState = "checking" | "ready" | "error";

/** The canonical Growth workspace route; / remains backward-compatible. */
export default function StudioPage() {
  const [access, setAccess] = useState<AccessState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkAccess() {
      try {
        const response = await fetch("/api/workspace/profile", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Profile unavailable: " + response.status);
        const data = await response.json();
        if (controller.signal.aborted) return;

        if (!data?.authenticated) {
          window.location.replace("/login?next=%2Fstudio");
          return;
        }
        if (!data?.profile) {
          window.location.replace("/onboarding");
          return;
        }
        setAccess("ready");
      } catch {
        if (!controller.signal.aborted) setAccess("error");
      }
    }

    void checkAccess();
    return () => controller.abort();
  }, []);

  if (access === "ready") return <Home />;

  return (
    <main className="auth-page theme-local" aria-live="polite">
      <div className="auth-card">
        <p className="eyebrow">VEDØY GROWTH / STUDIO</p>
        {access === "checking" ? (
          <>
            <h1>Åpner arbeidsflaten …</h1>
            <p>Vi bekrefter at du har tilgang til bedriftens arbeidsområde.</p>
          </>
        ) : (
          <>
            <h1>Kunne ikke kontrollere innloggingen.</h1>
            <p>Prøv igjen. Hvis feilen fortsetter, kontroller nettverket og at Growth er tilgjengelig.</p>
            <button className="button button-lime" type="button" onClick={() => window.location.reload()}>
              Prøv igjen ↗
            </button>
          </>
        )}
      </div>
    </main>
  );
}
