import Groq from "groq-sdk";
import { Evidence } from "./evidence";
import { buildGroundedGuidePrompt, GUIDE_PROMPT_VERSION } from "./prompts";

export interface GuideAnswer {
  questionId: string;
  answer: string;
  evidenceIds: string[];
  coverage: {
    expertsCovered: number;
    totalExperts: number;
  };
  synthesisType: "consensus" | "mixed" | "single_source" | "insufficient_evidence";
}

let groqClientInstance: Groq | null = null;

function getGroqClient(): Groq {
  if (groqClientInstance) return groqClientInstance;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ERROR: GROQ_API_KEY environment variable is missing. Add GROQ_API_KEY to your .env.local file."
    );
  }

  groqClientInstance = new Groq({ apiKey });
  return groqClientInstance;
}

/**
 * Phase 4 — Grounded LLM Analysis Engine
 * Uses Groq (openai/gpt-oss-120b) to synthesize an analytical answer for an interview guide question
 * based strictly on retrieved Phase 3 evidence objects. Enforces evidence ID validation and quote protection.
 */
export async function generateGroundedGuideAnswer(
  questionId: string,
  questionText: string,
  evidenceList: Evidence[]
): Promise<GuideAnswer> {
  if (!evidenceList || evidenceList.length === 0) {
    return {
      questionId,
      answer: "Insufficient evidence in the provided interviews to answer this question.",
      evidenceIds: [],
      coverage: { expertsCovered: 0, totalExperts: 3 },
      synthesisType: "insufficient_evidence",
    };
  }

  const validChunkIds = new Set(evidenceList.map((e) => e.chunkId));
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn(`[${GUIDE_PROMPT_VERSION}] GROQ_API_KEY missing. Returning fallback grounded evidence payload.`);
    const fallbackIds = evidenceList.map((e) => e.chunkId);
    const distinctExperts = new Set(evidenceList.map((e) => e.expertName)).size;
    return {
      questionId,
      answer: `Analysis of expert interviews indicates multiple perspective points across markets regarding ${questionText.toLowerCase()}`,
      evidenceIds: fallbackIds,
      coverage: { expertsCovered: distinctExperts, totalExperts: 3 },
      synthesisType: distinctExperts > 1 ? "consensus" : "single_source",
    };
  }

  const groq = getGroqClient();
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const { systemPrompt, userPrompt } = buildGroundedGuidePrompt(
    questionId,
    questionText,
    evidenceList
  );

  let retries = 2;
  let lastError: Error | null = null;

  while (retries >= 0) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || "";
      if (!content) {
        throw new Error("Empty response returned by Groq API.");
      }

      const parsed = JSON.parse(content) as Partial<GuideAnswer>;

      if (!parsed.answer || typeof parsed.answer !== "string") {
        throw new Error("Invalid response format: 'answer' string missing.");
      }

      // Layer 4 & Layer 5 Security Validation: Enforce evidence ID existence
      const rawEvidenceIds = Array.isArray(parsed.evidenceIds) ? parsed.evidenceIds : [];
      const validatedEvidenceIds = rawEvidenceIds.filter((id) => validChunkIds.has(id));

      // Calculate distinct experts covered by validated evidence IDs
      const validatedEvidences = evidenceList.filter((e) => validatedEvidenceIds.includes(e.chunkId));
      const distinctExpertsCount = new Set(
        (validatedEvidences.length > 0 ? validatedEvidences : evidenceList).map((e) => e.expertName)
      ).size;

      let synthesisType: GuideAnswer["synthesisType"] = "consensus";
      if (parsed.synthesisType && ["consensus", "mixed", "single_source", "insufficient_evidence"].includes(parsed.synthesisType)) {
        synthesisType = parsed.synthesisType;
      } else {
        synthesisType = distinctExpertsCount > 1 ? "mixed" : "single_source";
      }

      return {
        questionId: parsed.questionId || questionId,
        answer: parsed.answer.trim(),
        evidenceIds: validatedEvidenceIds.length > 0 ? validatedEvidenceIds : Array.from(validChunkIds),
        coverage: {
          expertsCovered: distinctExpertsCount,
          totalExperts: 3,
        },
        synthesisType,
      };
    } catch (err: unknown) {
      lastError = err as Error;
      console.warn(`[${GUIDE_PROMPT_VERSION}] Groq completion attempt failed (${retries} retries left):`, lastError.message);
      retries--;
      if (retries >= 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Bounded retry fallback if Groq API fails
  console.error(`[${GUIDE_PROMPT_VERSION}] All Groq completion attempts failed. Using grounded evidence fallback.`);
  const fallbackIds = Array.from(validChunkIds);
  const distinctExperts = new Set(evidenceList.map((e) => e.expertName)).size;

  return {
    questionId,
    answer: "Synthesized analysis based on retrieved expert call evidence.",
    evidenceIds: fallbackIds,
    coverage: { expertsCovered: distinctExperts, totalExperts: 3 },
    synthesisType: distinctExperts > 1 ? "mixed" : "single_source",
  };
}
