import { Evidence } from "./evidence";

export const GUIDE_PROMPT_VERSION = "v1";
export const CROSS_CALL_PROMPT_VERSION = "v1";

/**
 * Builds a grounded prompt formatting retrieved Phase 3 evidence objects for Groq LLM synthesis.
 */
export function buildGroundedGuidePrompt(
  questionId: string,
  questionText: string,
  evidenceList: Evidence[]
) {
  const formattedEvidence = evidenceList
    .map(
      (ev, idx) => `[Evidence ${idx + 1}]
Evidence ID: ${ev.chunkId}
Expert: ${ev.expertName} (${ev.role})
Market: ${ev.market}
Timestamp: ${ev.timestamp}
Interview Question: ${ev.interviewQuestion}
Exact Source Text:
"${ev.exactQuote}"`
    )
    .join("\n\n");

  const systemPrompt = `You are an expert technical interview research analyst.

You are given:
1. One interview-guide question.
2. A set of retrieved evidence objects from expert calls across France, Germany, and the UK.

Your task is to synthesize a clear, grounded analytical answer using ONLY the provided evidence objects.

CRITICAL RULES:
1. Do NOT introduce facts or claims outside the provided evidence.
2. Do NOT use external knowledge.
3. Do NOT invent opinions or quotes for any expert.
4. Do NOT generate quotations or timestamps directly in your output text.
5. Reference supporting evidence ONLY by including their exact Evidence ID string (e.g. "france_expert_002") in the "evidenceIds" array field.
6. Only select Evidence IDs from the supplied evidence list below. Do NOT invent new IDs.
7. Distinguish broad agreement ("consensus") from differing emphasis or divergent views ("mixed").
8. If only one expert has relevant evidence, set "synthesisType" to "single_source".
9. If evidence is insufficient to answer the question, set "synthesisType" to "insufficient_evidence" and state that evidence is insufficient.
10. Keep the answer concise, objective, neutral, and analytical.

OUTPUT FORMAT:
You MUST return a JSON object with the following structure:
{
  "questionId": "${questionId}",
  "answer": "Grounded analytical answer summarizing and comparing expert views...",
  "evidenceIds": ["france_expert_002", "germany_expert_002"],
  "coverage": {
    "expertsCovered": 3,
    "totalExperts": 3
  },
  "synthesisType": "consensus"
}`;

  const userPrompt = `Interview Guide Question [${questionId}]:
"${questionText}"

Supplied Evidence Objects (${evidenceList.length} items):

${formattedEvidence}

Analyze the evidence and return your grounded JSON response now.`;

  return { systemPrompt, userPrompt };
}

/**
 * Phase 5 — Builds a grounded prompt for cross-call theme and difference discovery across expert interviews.
 */
export function buildCrossCallThemesPrompt(
  evidenceList: Evidence[],
  questionText?: string
) {
  const formattedEvidence = evidenceList
    .map(
      (ev, idx) => `[Evidence ${idx + 1}]
Evidence ID: ${ev.chunkId}
Expert: ${ev.expertName} (${ev.role})
Market: ${ev.market}
Timestamp: ${ev.timestamp}
Interview Question: ${ev.interviewQuestion}
Exact Source Text:
"${ev.exactQuote}"`
    )
    .join("\n\n");

  const contextDescription = questionText
    ? `Anchor Topic: "${questionText}"`
    : `Full Cross-Call Analysis across 6 Official Interview Guide Questions`;

  const systemPrompt = `You are an expert MedTech market research analyst analyzing three expert interview calls from France, Germany, and the United Kingdom.

You are given a set of retrieved transcript evidence objects across these three expert calls.

Your task is to identify key themes, differences in emphasis, and true disagreements across the calls.

CATEGORIES TO USE ("type" field):
1. "consensus": Experts express broadly compatible views on the topic (requires support from multiple experts/markets).
2. "difference_in_emphasis": Experts agree on the broad topic, but emphasize different factors, priorities, or local market constraints.
3. "disagreement": Experts express opposing or materially conflicting positions supported by evidence.
4. "single_expert": A key point or topic raised by only one expert/market without cross-call corroboration.
5. "insufficient_evidence": Evidence is not sufficient to establish a reliable cross-call comparison.

CRITICAL GROUNDING RULES:
- Use ONLY the supplied evidence. Do NOT use outside knowledge.
- Do NOT invent expert positions, opinions, or quotes.
- Do NOT generate exact quotations, timestamps, expert names, or source turn IDs in your text output.
- Reference supporting evidence ONLY by returning exact Evidence ID strings (e.g. "france_expert_002") in the "evidenceIds" array for each theme.
- Only select Evidence IDs that appear in the supplied evidence list below. Do NOT invent new IDs.
- Do NOT claim "consensus" unless evidence from multiple experts supports the theme.
- Do NOT label a topic as a "disagreement" merely because experts emphasize different considerations; use "difference_in_emphasis" for different focus areas.
- Keep titles clear and summaries analytical, concise, and neutral.

OUTPUT FORMAT:
Return a JSON object containing an array of theme objects:
{
  "themes": [
    {
      "title": "Economic justification and capital constraints",
      "summary": "Across interviews, economic considerations play a vital role, though capital approval vs operating budget constraints differ across markets.",
      "type": "difference_in_emphasis",
      "evidenceIds": ["chunk_id_1", "chunk_id_2"]
    }
  ]
}`;

  const userPrompt = `Analysis Context: ${contextDescription}

Supplied Evidence Objects (${evidenceList.length} items):

${formattedEvidence}

Analyze the supplied evidence and return your grounded JSON response now.`;

  return { systemPrompt, userPrompt };
}

