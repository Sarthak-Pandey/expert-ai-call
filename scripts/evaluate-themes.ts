import fs from "fs";
import path from "path";
import { generateCrossCallThemes } from "../lib/themes";
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

export async function evaluateThemes() {
  console.log("==========================================");
  console.log("Phase 5 — Cross-Call Themes Benchmark Audit");
  console.log("==========================================\n");

  const testContexts = [
    { name: "Full Cross-Call Analysis", questionId: undefined },
    { name: "Question Q1 Analysis (Adoption)", questionId: "Q1" },
    { name: "Question Q2 Analysis (Barriers)", questionId: "Q2" },
    { name: "Question Q3 Analysis (Budgets/ROI)", questionId: "Q3" },
    { name: "Question Q4 Analysis (Training/Outcomes)", questionId: "Q4" },
  ];

  let totalThemesGenerated = 0;
  let totalEvidenceIdsChecked = 0;
  let invalidEvidenceIdsCount = 0;
  let quoteResolutionFailures = 0;
  let invalidCoverageCount = 0;

  for (const ctx of testContexts) {
    console.log(`Evaluating Context: "${ctx.name}"...`);

    const result = await generateCrossCallThemes(ctx.questionId);

    if (!result.themes || result.themes.length === 0) {
      console.warn(`  ! No themes generated for context: ${ctx.name}`);
      continue;
    }

    console.log(`  ✓ Generated ${result.themes.length} grounded cross-call themes`);

    for (const theme of result.themes) {
      totalThemesGenerated++;

      // 1. Evidence IDs non-empty check
      if (!theme.evidenceIds || theme.evidenceIds.length === 0) {
        console.error(`  ✗ Theme "${theme.title}" has zero evidence IDs.`);
        invalidEvidenceIdsCount++;
      }

      // 2. Resolve evidence & check exact quotes / timestamps
      let resolvedCount = 0;
      const resolvedExperts = new Set<string>();

      for (const id of theme.evidenceIds) {
        totalEvidenceIdsChecked++;
        try {
          const ev = getEvidenceByChunkId(id);
          if (!validateEvidence(ev) || !ev.exactQuote.trim() || !ev.timestamp.trim()) {
            quoteResolutionFailures++;
          } else {
            resolvedCount++;
            resolvedExperts.add(ev.expertName);
          }
        } catch (err) {
          console.error(`  ✗ Evidence resolution failed for chunk ID "${id}":`, err);
          invalidEvidenceIdsCount++;
        }
      }

      // 3. Verify application-computed expert coverage
      if (theme.expertsCovered !== resolvedExperts.size) {
        console.warn(
          `  ! Theme "${theme.title}" coverage mismatch: claim=${theme.expertsCovered}, calculated=${resolvedExperts.size}`
        );
        invalidCoverageCount++;
      }

      console.log(
        `    - Theme [${theme.type}]: "${theme.title.substring(0, 60)}..." | ${resolvedCount} evidence chunks | ${theme.expertsCovered}/3 experts`
      );
    }

    console.log("");
  }

  console.log("==========================================");
  console.log("Cross-Call Themes Benchmark Summary");
  console.log("==========================================");
  console.log(`Total themes generated  : ${totalThemesGenerated}`);
  console.log(`Total evidence IDs      : ${totalEvidenceIdsChecked}`);
  console.log(`Invalid evidence IDs    : ${invalidEvidenceIdsCount}`);
  console.log(`Quote resolution fails  : ${quoteResolutionFailures}`);
  console.log(`Coverage mismatches     : ${invalidCoverageCount}\n`);

  if (invalidEvidenceIdsCount === 0 && quoteResolutionFailures === 0 && totalThemesGenerated > 0) {
    console.log("ALL Cross-Call Themes PASSED Traceable Grounded Benchmark!\n");
  } else {
    console.warn("WARNING: Some theme checks failed. Please inspect logs above.");
  }
}

if (require.main === module) {
  evaluateThemes().catch((err) => {
    console.error("Themes evaluation failed:", err);
    process.exit(1);
  });
}
