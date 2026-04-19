import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    app: "rps-app-mtj",
    phase: "phase-0-bootstrap",
    status: "ok",
  });
}
