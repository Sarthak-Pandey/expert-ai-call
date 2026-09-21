import { NextRequest, NextResponse } from "next/server";
import { getEvidenceByChunkId } from "@/lib/evidence";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { chunkId } = body;

    if (!chunkId || typeof chunkId !== "string" || !chunkId.trim()) {
      return NextResponse.json(
        { error: "Invalid request: 'chunkId' string must be provided." },
        { status: 400 }
      );
    }

    const evidence = getEvidenceByChunkId(chunkId.trim());
    return NextResponse.json({ evidence });
  } catch (error: unknown) {
    const err = error as Error;
    const isNotFound = err.message?.includes("Evidence not found");
    const status = isNotFound ? 404 : 500;

    return NextResponse.json(
      { error: err?.message || "Internal server error during evidence resolution." },
      { status }
    );
  }
}
