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

    if (topK !== undefined && (typeof topK !== "number" || isNaN(topK) || topK < 1 || topK > 20)) {
      return NextResponse.json(
        { error: "Invalid request: 'topK' must be a number between 1 and 20." },
        { status: 400 }
      );
    }

    const retrievalResults = await searchChunks(query, {
      topK,
      filter,
      market,
      callId,
      expertId,
    });

    const results = retrievalResults.map((r) => r.evidence);

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
