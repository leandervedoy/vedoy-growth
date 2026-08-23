import { z } from "zod";

export const avvikSchema = z.object({
  title: z.string().trim().min(5, "Tittelen må være minst 5 tegn.").max(160, "Tittelen kan være maks 160 tegn."),
  description: z.string().trim().min(15, "Beskrivelsen må være minst 15 tegn.").max(5000, "Beskrivelsen kan være maks 5000 tegn."),
  immediateAction: z.string().trim().min(10, "Strakstiltak må være minst 10 tegn.").max(2000, "Strakstiltak kan være maks 2000 tegn."),
  category: z.enum(["HSE", "QUALITY", "FINANCIAL"], { message: "Velg HMS, kvalitet eller økonomi." }),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], { message: "Velg alvorlighetsgrad." }),
});

export type AvvikInput = z.infer<typeof avvikSchema>;
