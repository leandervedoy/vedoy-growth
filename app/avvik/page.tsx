"use client";

import { useState } from "react";
import { lagreAvvik } from "@/app/actions/avvik";

type FieldErrors = Record<string, string[] | undefined>;

export default function AvvikPage() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({}); setFormError(""); setSuccess(""); setSending(true);
    const form = event.currentTarget;
    const result = await lagreAvvik(new FormData(form));
    setSending(false);
    if (!result.success) { setErrors(result.fieldErrors || {}); setFormError(result.formError || ""); return; }
    form.reset();
    setSuccess(`Avviket er registrert med sporings-ID ${result.id.slice(0, 8).toUpperCase()}.`);
  }

  return <main className="avvik-page"><nav><a href="/">← Dashboard</a><span>VEDØY GROWTH / AVVIK</span></nav><header><div className="eyebrow">SPORBAR AVVIKSHÅNDTERING</div><h1>Meld det.<br/><span>Følg det opp.</span></h1><p>Registrer avvik med tydelig kategori, alvorlighetsgrad og strakstiltak. Dette gir virksomheten et ryddig utgangspunkt for videre oppfølging.</p></header><section className="avvik-shell"><aside><small>ENKEL RUTINE</small><ol><li><b>01</b><span>Beskriv hva som skjedde.</span></li><li><b>02</b><span>Registrer hva som ble gjort med en gang.</span></li><li><b>03</b><span>Følg opp med dokumentert historikk.</span></li></ol></aside><form onSubmit={submit} noValidate><label>TITTEL<input name="title" placeholder="Kort tittel på avviket" aria-invalid={Boolean(errors.title)} />{errors.title && <em>{errors.title[0]}</em>}</label><label>BESKRIVELSE<textarea name="description" rows={5} placeholder="Hva skjedde, hvor og når?" aria-invalid={Boolean(errors.description)} />{errors.description && <em>{errors.description[0]}</em>}</label><label>STRAKSTILTAK<textarea name="immediateAction" rows={3} placeholder="Hva ble gjort der og da?" aria-invalid={Boolean(errors.immediateAction)} />{errors.immediateAction && <em>{errors.immediateAction[0]}</em>}</label><div className="avvik-selects"><label>KATEGORI<select name="category" defaultValue="QUALITY" aria-invalid={Boolean(errors.category)}><option value="HSE">HMS</option><option value="QUALITY">Kvalitet</option><option value="FINANCIAL">Økonomi</option></select>{errors.category && <em>{errors.category[0]}</em>}</label><label>ALVORLIGHETSGRAD<select name="severity" defaultValue="MEDIUM" aria-invalid={Boolean(errors.severity)}><option value="LOW">Lav</option><option value="MEDIUM">Medium</option><option value="HIGH">Høy</option><option value="CRITICAL">Kritisk</option></select>{errors.severity && <em>{errors.severity[0]}</em>}</label></div>{formError && <p className="avvik-error">{formError}</p>}{success && <p className="avvik-success">{success}</p>}<button className="button button-lime" disabled={sending}>{sending ? "Registrerer …" : "Registrer avvik →"}</button></form></section></main>;
}
