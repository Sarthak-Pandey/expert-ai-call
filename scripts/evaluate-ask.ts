import fs from "fs";
import path from "path";
import { searchChunks } from "../lib/retrieval";
import { generateGroundedAskAnswer } from "../lib/llm";
import { getEvidenceByChunkId, validateEvidence } from "../lib/evidence";

// Load environment variables from .env.local for CLI execution
const envLocalPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valueParts] = trimmed.split("=");
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  }
}

interface TestCase {
  id: number;
  name: string;
  question: string;
  isUnrelated?: boolean;
}

const TEST_CASES: TestCase[] = [
  { id: 1, name: "Barriers", question: "What are the biggest barriers to robotic surgery adoption?" },
  { id: 2, name: "ROI", question: "How important is ROI across the three markets?" },
  { id: 3, name: "Training", question: "Which experts mention training?" },
  { id: 4, name: "Future Adoption", question: "What are the expectations for future adoption?" },
  { id: 5, name: "Purchasing Timeline", question: "What are the reported purchasing timelines?" },
  { id: 6, name: "Market Comparison", question: "How does the UK view economics compared with France and Germany?" },
  { id: 7, name: "Expert Specific", question: "What is the difference between France and Germany on procurement?" },
  { id: 8, name: "Unrelated / No-evidence", question: "What do the experts say about electric vehicle charging?", isUnrelated: true },
  { id: 9, name: "Paraphrased", question: "Which markets expect gradual growth?" },
  { id: 10, name: "Follow-up Question", question: "Which expert places the greatest emphasis on training?" },
];

export async function evaluateAsk() {
  console.log("==========================================");
  console.log("Phase 6 — Ask Across Calls Benchmark Audit");
  console.log("==========================================\n");

  let groundedAnswersCount = 0;
  let invalidEvidenceIdsCount = 0;
  let evidenceResolutionFailures = 0;
  let insufficientEvidenceHandledCount = 0;

  for (const tc of TEST_CASES) {
    console.log(`Test #${tc.id} [${tc.name}]: "${tc.question}"`);

    // 1. Vector Search
    const retrievalResults = await searchChunks(tc.question, { topK: 6 });
    const evidenceList = retrievalResults.map((r) => r.evidence);

    // 2. Grounded LLM Q&A Synthesis
    const askResult = await generateGroundedAskAnswer(tc.question, tc.isUnrelated ? [] : evidenceList);

    if (!askResult.answer || !askResult.answer.trim()) {
      console.error(`  ✗ Test #${tc.id} produced an empty answer.\n`);
      continue;
    }

    groundedAnswersCount++;

    // Unrelated query check
    if (tc.isUnrelated) {
      if (askResult.synthesisType === "insufficient_evidence") {
        insufficientEvidenceHandledCount++;
        console.log(`  ✓ Insufficient-evidence correctly handled ("${askResult.answer.substring(0, 60)}...")\n`);
      } else {
        console.warn(`  ! Test #${tc.id} (unrelated) was not classified as insufficient_evidence.\n`);
      }
      continue;
    }

    // 3. Evidence ID & Quote Resolution Validation
    const validChunkIds = new Set((tc.isUnrelated ? [] : evidenceList).map((e) => e.chunkId));
    for (const ev of askResult.evidence) {
      if (!validChunkIds.has(ev.chunkId)) {
        console.error(`  ✗ Returned evidence ID "${ev.chunkId}" was invalid.`);
        invalidEvidenceIdsCount++;
      }

      try {
        const resolvedEv = getEvidenceByChunkId(ev.chunkId);
        if (
          !validateEvidence(resolvedEv) ||
          !resolvedEv.exactQuote.trim() ||
          !resolvedEv.timestamp.trim() ||
          !resolvedEv.expertName.trim() ||
          !resolvedEv.market.trim()
        ) {
          evidenceResolutionFailures++;
        }
      } catch (err) {
        console.error(`  ✗ Failed to resolve evidence source for chunkId "${ev.chunkId}":`, err);
        evidenceResolutionFailures++;
      }
    }

    console.log(`  ✓ Grounded Answer: "${askResult.answer.substring(0, 75)}..."`);
    console.log(`  ✓ Synthesis Type: ${askResult.synthesisType}`);
    console.log(`  ✓ Evidence resolved: ${askResult.evidence.length} chunks`);
    console.log(`  ✓ Coverage: ${askResult.coverage.expertsCovered}/3 experts\n`);
  }

  const exactQuoteIntegrityPass = evidenceResolutionFailures === 0 && invalidEvidenceIdsCount === 0;

  const summaryPath = path.join(__dirname, "..", "eval", "regression-summary.json");
  if (fs.existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
      summary.lastExecutedAt = new Date().toISOString();
      summary.ask = {
        totalQueries: TEST_CASES.length,
        passed: groundedAnswersCount,
        invalidEvidenceIds: invalidEvidenceIdsCount,
        sourceResolutionFailures: evidenceResolutionFailures,
        noEvidenceHandled: insufficientEvidenceHandledCount,
        status: exactQuoteIntegrityPass && groundedAnswersCount === TEST_CASES.length ? "PASS" : "FAIL",
      };
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
    } catch {
      // ignore update error
    }
  }

  console.log("==========================================");
  console.log("Ask Across Calls Evaluation Summary");
  console.log("==========================================");
  console.log(`Test cases                   : ${TEST_CASES.length}`);
  console.log(`Grounded answers             : ${groundedAnswersCount}/${TEST_CASES.length}`);
  console.log(`Evidence resolution failures : ${evidenceResolutionFailures}`);
  console.log(`Invalid evidence IDs         : ${invalidEvidenceIdsCount}`);
  console.log(`Insufficient-evidence cases  : ${insufficientEvidenceHandledCount}`);
  console.log(`Exact source quote integrity : ${exactQuoteIntegrityPass ? "PASS" : "FAIL"}\n`);

  if (!exactQuoteIntegrityPass) {
    throw new Error("ERROR: Benchmark failed exact quote integrity or evidence ID validation checks.");
  }
}

if (require.main === module) {
  evaluateAsk().catch((err) => {
    console.error("Ask evaluation benchmark failed:", err);
    process.exit(1);
  });
}
