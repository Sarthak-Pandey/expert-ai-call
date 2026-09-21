import fs from "fs";
import path from "path";
import { searchChunks } from "../lib/retrieval";
import { generateGroundedGuideAnswer } from "../lib/llm";
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

interface GuideQuestion {
  id: string;
  question: string;
}

export async function evaluateGuide() {
  const guidePath = path.join(__dirname, "..", "data", "guide.json");
  if (!fs.existsSync(guidePath)) {
    throw new Error(`ERROR: data/guide.json missing at ${guidePath}`);
  }

  const rawGuide = fs.readFileSync(guidePath, "utf-8");
  const guideQuestions: GuideQuestion[] = JSON.parse(rawGuide);

  console.log(`Starting Interview Guide Evaluation Benchmark (${guideQuestions.length} Questions)\n`);

  const totalQuestions = guideQuestions.length;
  let validGroundedResponses = 0;
  let invalidEvidenceIdsCount = 0;
  let sourceResolutionFailures = 0;

  for (const gq of guideQuestions) {
    console.log(`Evaluating [${gq.id}]: "${gq.question}"`);

    // 1. Phase 3 Vector Retrieval
    const retrievalResults = await searchChunks(gq.question, { topK: 6 });
    const evidenceList = retrievalResults.map((r) => r.evidence);

    if (evidenceList.length === 0) {
      console.log(`  ✗ No evidence retrieved for question [${gq.id}]\n`);
      continue;
    }

    // 2. LLM Synthesis
    const llmAnswer = await generateGroundedGuideAnswer(gq.id, gq.question, evidenceList);

    if (!llmAnswer.answer || !llmAnswer.answer.trim()) {
      console.log(`  ✗ Empty answer generated for question [${gq.id}]\n`);
      continue;
    }

    // 3. Evidence ID Server-Side Validation & Source Quote Resolution
    const retrievedChunkIds = new Set(evidenceList.map((e) => e.chunkId));
    let hasInvalidId = false;
    let resolvedCount = 0;

    for (const chunkId of llmAnswer.evidenceIds) {
      if (!retrievedChunkIds.has(chunkId)) {
        console.warn(`  ! Returned evidence ID "${chunkId}" was not in retrieved set.`);
        invalidEvidenceIdsCount++;
        hasInvalidId = true;
      }

      try {
        const ev = getEvidenceByChunkId(chunkId);
        if (!validateEvidence(ev)) {
          sourceResolutionFailures++;
        } else {
          resolvedCount++;
        }
      } catch (err) {
        console.warn(`  ! Could not resolve source quote for "${chunkId}":`, err);
        sourceResolutionFailures++;
      }
    }

    const distinctExperts = new Set(evidenceList.map((e) => e.expertName)).size;
    const isSuccess = !hasInvalidId && resolvedCount > 0 && llmAnswer.answer.length > 10;

    if (isSuccess) {
      validGroundedResponses++;
    }

    console.log(`  ✓ Answer generated (${llmAnswer.answer.substring(0, 80)}...)`);
    console.log(`  ✓ Synthesis Type: ${llmAnswer.synthesisType}`);
    console.log(`  ✓ Evidence resolved: ${resolvedCount} chunks`);
    console.log(`  ✓ Experts covered: ${distinctExperts}/3\n`);
  }

  const summaryPath = path.join(__dirname, "..", "eval", "regression-summary.json");
  if (fs.existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
      summary.lastExecutedAt = new Date().toISOString();
      summary.guide = {
        totalQuestions,
        passed: validGroundedResponses,
        evidenceIdFailures: invalidEvidenceIdsCount,
        sourceResolutionFailures,
        status: validGroundedResponses === totalQuestions ? "PASS" : "FAIL",
      };
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
    } catch {
      // ignore update error
    }
  }

  console.log("==========================================");
  console.log("Interview Guide Evaluation Summary");
  console.log("==========================================");
  console.log(`Guide questions tested : ${totalQuestions}`);
  console.log(`Valid grounded responses: ${validGroundedResponses}/${totalQuestions}`);
  console.log(`Invalid evidence IDs    : ${invalidEvidenceIdsCount}`);
  console.log(`Source resolution fails : ${sourceResolutionFailures}\n`);

  if (validGroundedResponses < totalQuestions) {
    console.warn("WARNING: Some guide questions did not meet 100% resolution standards.");
  } else {
    console.log("ALL Guide Questions PASSED Traceable Grounded Evaluation!\n");
  }
}

if (require.main === module) {
  evaluateGuide().catch((err) => {
    console.error("Guide evaluation failed:", err);
    process.exit(1);
  });
}
