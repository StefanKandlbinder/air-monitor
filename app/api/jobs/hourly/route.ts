import { NextResponse } from "next/server";
import { runChecks } from "@/lib/run-checks";

export async function GET() {
  try {
    const results = await runChecks("MW1");
    return NextResponse.json({ message: "Hourly checks finished", results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
