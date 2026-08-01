import { NextResponse } from "next/server";
export async function POST(request: Request) { const body = await request.json(); if (!body.name || !body.email || !body.message) return NextResponse.json({ error: "Mangler felter" }, { status: 400 }); console.log("Vedøy Growth contact lead", { ...body, receivedAt: new Date().toISOString() }); return NextResponse.json({ ok: true }); }
