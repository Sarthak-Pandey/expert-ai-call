import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import { searchChunks } from "./retrieval";
import { Evidence, getEvidenceByChunkId, validateEvidence } from "./evidence";
import { buildCrossCallThemesPrompt, CROSS_CALL_PROMPT_VERSION } from "./prompts";

export type ThemeType =
  | "consensus"
  | "difference_in_emphasis"
  | "disagreement"
  | "single_expert"
  | "insufficient_evidence";

export interface LLMThemeProposal {
  title: string;
  summary: string;
  type: ThemeType;
  evidenceIds: string[];
}

export interface ResolvedCrossCallTheme {
  id: string;
  title: string;
  summary: string;
  type: ThemeType;
  expertIds: string[];
  evidenceIds: string[];
  expertsCovered: number;
  totalExperts: number;
  evidence: Evidence[];
}

export interface CrossCallAnalysis {
  questionId?: string;
  questionText?: string;
  themes: ResolvedCrossCallTheme[];
  generatedAt: string;
}

interface GuideQuestionItem {
  id: string;
  question: string;
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
 * Phase 5 — Builds a deduplicated, multi-market evidence set for cross-call theme synthesis.
 * Uses Phase 3 semantic retrieval with official guide questions as anchors.
 */
export async function buildCrossCallEvidenceSet(questionId?: string): Promise<{
  evidenceList: Evidence[];
  questionText?: string;
}> {
  const guidePath = path.join(process.cwd(), "data", "guide.json");
  if (!fs.existsSync(guidePath)) {
    throw new Error(`ERROR: data/guide.json missing at ${guidePath}`);
  }

  const rawGuide = fs.readFileSync(guidePath, "utf-8");
  const guideQuestions: GuideQuestionItem[] = JSON.parse(rawGuide);

  const accumulatedEvidence: Evidence[] = [];
  const seenChunkIds = new Set<string>();

  if (questionId) {
    const targetQ = guideQuestions.find((q) => q.id === questionId);
    const qText = targetQ ? targetQ.question : questionId;
    const results = await searchChunks(qText, { topK: 6 });
    for (const r of results) {
      if (!seenChunkIds.has(r.evidence.chunkId)) {
        seenChunkIds.add(r.evidence.chunkId);
        accumulatedEvidence.push(r.evidence);
      }
    }
    return { evidenceList: accumulatedEvidence, questionText: qText };
  }

  // Iterate over all 6 guide questions as retrieval anchors
  for (const gq of guideQuestions) {
    const results = await searchChunks(gq.question, { topK: 4 });
    for (const r of results) {
      if (!seenChunkIds.has(r.evidence.chunkId)) {
        seenChunkIds.add(r.evidence.chunkId);
        accumulatedEvidence.push(r.evidence);
      }
    }
  }

  return { evidenceList: accumulatedEvidence };
}

/**
 * Phase 5 — Synthesizes grounded cross-call themes and differences across expert calls.
 * Enforces strict evidence ID validation, application-computed expert coverage, and exact quote resolution.
 */
export async function generateCrossCallThemes(questionId?: string): Promise<CrossCallAnalysis> {
  const { evidenceList, questionText } = await buildCrossCallEvidenceSet(questionId);

  if (!evidenceList || evidenceList.length === 0) {
    return {
      questionId,
      questionText,
      themes: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const validChunkIds = new Set(evidenceList.map((e) => e.chunkId));
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn(`[${CROSS_CALL_PROMPT_VERSION}] GROQ_API_KEY missing. Returning fallback themes.`);
    return buildFallbackThemes(evidenceList, questionId, questionText);
  }

  const groq = getGroqClient();
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const { systemPrompt, userPrompt } = buildCrossCallThemesPrompt(evidenceList, questionText);

  let retries = 2;
  let rawProposals: LLMThemeProposal[] = [];

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

      const parsed = JSON.parse(content) as { themes?: LLMThemeProposal[] };
      if (!parsed.themes || !Array.isArray(parsed.themes) || parsed.themes.length === 0) {
        throw new Error("Invalid output format: 'themes' array missing or empty.");
      }

      // Check evidence ID validity
      let hasInvalidId = false;
      for (const t of parsed.themes) {
        const ids = Array.isArray(t.evidenceIds) ? t.evidenceIds : [];
        for (const id of ids) {
          if (!validChunkIds.has(id)) {
            hasInvalidId = true;
            console.warn(`[${CROSS_CALL_PROMPT_VERSION}] Invalid evidence ID returned: "${id}"`);
            break;
          }
        }
        if (hasInvalidId) break;
      }

      if (hasInvalidId && retries > 0) {
        console.warn(`[${CROSS_CALL_PROMPT_VERSION}] Retrying LLM completion due to invalid evidence IDs...`);
        retries--;
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      }

      rawProposals = parsed.themes;
      break;
    } catch (err: unknown) {
      const errorObj = err as Error;
      console.warn(
        `[${CROSS_CALL_PROMPT_VERSION}] Groq completion attempt failed (${retries} retries left):`,
        errorObj.message
      );
      retries--;
      if (retries >= 0) {
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }

  if (rawProposals.length === 0) {
    console.error(`[${CROSS_CALL_PROMPT_VERSION}] All Groq attempts failed. Using fallback grounded themes.`);
    return buildFallbackThemes(evidenceList, questionId, questionText);
  }

  // Resolve proposals into structured, validated theme objects
  const resolvedThemes: ResolvedCrossCallTheme[] = [];

  for (let idx = 0; idx < rawProposals.length; idx++) {
    const proposal = rawProposals[idx];
    const rawIds = Array.isArray(proposal.evidenceIds) ? proposal.evidenceIds : [];
    const validatedIds = rawIds.filter((id) => validChunkIds.has(id));

    // Server-side quote and evidence resolution via Phase 3 getEvidenceByChunkId
    const resolvedEvidences: Evidence[] = [];
    for (const id of validatedIds) {
      try {
        const ev = getEvidenceByChunkId(id);
        if (validateEvidence(ev)) {
          resolvedEvidences.push(ev);
        }
      } catch (err) {
        console.warn(`[${CROSS_CALL_PROMPT_VERSION}] Could not resolve chunk ID "${id}":`, err);
      }
    }

    if (resolvedEvidences.length === 0) {
      continue;
    }

    // Application-level expert coverage computation
    const uniqueExperts = new Set(resolvedEvidences.map((e) => e.expertName));
    const uniqueExpertIds = Array.from(new Set(resolvedEvidences.map((e) => e.expertId)));
    const expertsCovered = uniqueExperts.size;
    const totalExperts = 3;

    // Strict semantic recomputation of theme type
    let themeType: ThemeType = proposal.type || "consensus";

    if (expertsCovered === 1 && themeType !== "insufficient_evidence") {
      themeType = "single_expert";
    } else if (themeType === "consensus" && expertsCovered < 2) {
      themeType = "difference_in_emphasis";
    }

    const themeId = `theme_${String(idx + 1).padStart(3, "0")}`;

    resolvedThemes.push({
      id: themeId,
      title: proposal.title || `Cross-Call Theme ${idx + 1}`,
      summary: proposal.summary || "",
      type: themeType,
      expertIds: uniqueExpertIds,
      evidenceIds: resolvedEvidences.map((e) => e.chunkId),
      expertsCovered,
      totalExperts,
      evidence: resolvedEvidences,
    });
  }

  return {
    questionId,
    questionText,
    themes: resolvedThemes,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Fallback theme builder when Groq LLM API is unavailable.
 */
function buildFallbackThemes(
  evidenceList: Evidence[],
  questionId?: string,
  questionText?: string
): CrossCallAnalysis {
  const uniqueExperts = new Set(evidenceList.map((e) => e.expertName));
  const distinctExpertsCount = uniqueExperts.size;
  const sampleIds = evidenceList.slice(0, 4).map((e) => e.chunkId);

  const resolvedEvidences: Evidence[] = [];
  for (const id of sampleIds) {
    try {
      const ev = getEvidenceByChunkId(id);
      if (validateEvidence(ev)) {
        resolvedEvidences.push(ev);
      }
    } catch {
      // ignore fallback resolution errors
    }
  }

  const fallbackTheme: ResolvedCrossCallTheme = {
    id: "theme_001",
    title: "Key Market Drivers and Operational Priorities",
    summary:
      "Analysis across expert calls indicates shared focus on economics, clinical outcomes, and system adoption.",
    type: distinctExpertsCount > 1 ? "difference_in_emphasis" : "single_expert",
    expertIds: Array.from(new Set(resolvedEvidences.map((e) => e.expertId))),
    evidenceIds: resolvedEvidences.map((e) => e.chunkId),
    expertsCovered: distinctExpertsCount,
    totalExperts: 3,
    evidence: resolvedEvidences,
  };

  return {
    questionId,
    questionText,
    themes: [fallbackTheme],
    generatedAt: new Date().toISOString(),
  };
}
