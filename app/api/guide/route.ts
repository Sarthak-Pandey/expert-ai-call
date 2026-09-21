import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { searchChunks } from "@/lib/retrieval";
import { generateGroundedGuideAnswer } from "@/lib/llm";
import { Evidence, getEvidenceByChunkId } from "@/lib/evidence";

interface GuideQuestionItem {
  id: string;
  question: string;
}

function loadGuideQuestions(): GuideQuestionItem[] {
  try {
    const guidePath = path.join(process.cwd(), "data", "guide.json");
    if (fs.existsSync(guidePath)) {
      const data = fs.readFileSync(guidePath, "utf-8");
      return JSON.parse(data) as GuideQuestionItem[];
    }
  } catch (err) {
    console.error("Failed to load data/guide.json:", err);
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { questionId, topK } = body;

    if (!questionId || typeof questionId !== "string" || !questionId.trim()) {
      return NextResponse.json(
        { error: "Invalid request: 'questionId' must be a non-empty string." },
        { status: 400 }
      );
    }

    const guideQuestions = loadGuideQuestions();
    const targetItem = guideQuestions.find(
      (q) => q.id.toLowerCase() === questionId.trim().toLowerCase()
    );

    if (!targetItem) {
      return NextResponse.json(
        { error: `Unknown questionId: "${questionId}". Expected Q1 to Q6.` },
        { status: 400 }
      );
    }

    // Phase 3 Semantic Vector Retrieval
    const boundedTopK = typeof topK === "number" && topK >= 1 && topK <= 20 ? topK : 6;
    const retrievalResults = await searchChunks(targetItem.question, { topK: boundedTopK });
    const evidenceList = retrievalResults.map((r) => r.evidence);

    // Grounded LLM Analysis
    const llmAnswer = await generateGroundedGuideAnswer(
      targetItem.id,
      targetItem.question,
      evidenceList
    );

    // Layer 5 Quote Safety: Server-side resolution of evidenceIds back to exact Phase 1 source evidence
    const resolvedEvidence: Evidence[] = [];
    const seenChunkIds = new Set<string>();

    for (const chunkId of llmAnswer.evidenceIds) {
      if (seenChunkIds.has(chunkId)) continue;
      seenChunkIds.add(chunkId);

      // Match score from retrieval results
      const retItem = retrievalResults.find((r) => r.evidence.chunkId === chunkId);
      const score = retItem ? retItem.evidence.score : 1.0;

      try {
        const ev = getEvidenceByChunkId(chunkId, score);
        resolvedEvidence.push(ev);
      } catch (err) {
        console.warn(`Could not resolve evidenceId "${chunkId}":`, err);
      }
    }

    // Fallback if no evidence IDs were resolvable
    if (resolvedEvidence.length === 0 && evidenceList.length > 0) {
      evidenceList.forEach((ev) => resolvedEvidence.push(ev));
    }

    // Calculate distinct experts covered
    const distinctExperts = new Set(resolvedEvidence.map((e) => e.expertName)).size;

    return NextResponse.json({
      questionId: targetItem.id,
      question: targetItem.question,
      answer: llmAnswer.answer,
      synthesisType: llmAnswer.synthesisType,
      coverage: {
        expertsCovered: distinctExperts,
        totalExperts: 3,
      },
      evidence: resolvedEvidence,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Guide API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during guide analysis." },
      { status: 500 }
    );
  }
}
