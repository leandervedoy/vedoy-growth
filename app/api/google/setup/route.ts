import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/workspace";
import { googleServiceAccountEmail, googleServiceAccountReady } from "@/lib/google-service-account";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  return NextResponse.json({
    configured: googleServiceAccountReady(),
    serviceAccountEmail: googleServiceAccountEmail() || null,
  });
}

