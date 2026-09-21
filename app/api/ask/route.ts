import { NextRequest, NextResponse } from "next/server";
import { searchChunks } from "@/lib/retrieval";
import { generateGroundedAskAnswer } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { question, topK } = body;

    // Validate question
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "Invalid request: 'question' must be a non-empty string." },
        { status: 400 }
      );
    }

    if (question.trim().length > 500) {
      return NextResponse.json(
        { error: "Invalid request: 'question' exceeds maximum length of 500 characters." },
        { status: 400 }
      );
    }

    // Validate topK
    let safeTopK = 6;
    if (topK !== undefined) {
      if (typeof topK !== "number" || isNaN(topK) || topK < 1 || topK > 20) {
        return NextResponse.json(
          { error: "Invalid request: 'topK' must be a number between 1 and 20." },
          { status: 400 }
        );
      }
      safeTopK = topK;
    }

    // 1. Phase 3 Semantic Vector Search across all expert calls
    const retrievalResults = await searchChunks(question.trim(), { topK: safeTopK });
    const evidenceList = retrievalResults.map((r) => r.evidence);

    // 2. Phase 6 Grounded LLM Synthesis & Evidence Resolution
    const result = await generateGroundedAskAnswer(question.trim(), evidenceList);

    return NextResponse.json({
      question: result.question,
      answer: result.answer,
      synthesisType: result.synthesisType,
      coverage: result.coverage,
      evidence: result.evidence,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Ask API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during Ask execution." },
      { status: 500 }
    );
  }
}
