import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body?.message ?? "";
    // TODO: Replace this simple echo with a real AI integration.
    const reply = `Echo: ${message}`;
    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
