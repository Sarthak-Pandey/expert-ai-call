import { NextRequest, NextResponse } from "next/server";
import { searchChunks } from "@/lib/retrieval";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, topK, filter, market, callId, expertId } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Invalid request: 'query' must be a non-empty string." },
        { status: 400 }
      );
    }

    const results = await searchChunks(query, {
      topK,
      filter,
      market,
      callId,
      expertId,
    });

    return NextResponse.json({
      query,
      results,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Search API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during search execution." },
      { status: 500 }
    );
  }
}
