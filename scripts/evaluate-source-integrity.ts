import fs from "fs";
import path from "path";
import { getEvidenceByChunkId, validateEvidence } from "../lib/evidence";

interface ExpertChunk {
  chunkId: string;
  callId: string;
  expertId: string;
  expertName: string;
  role: string;
  market: string;
  speaker: string;
  timestamp: string;
  timestampSeconds: number;
  text: string;
  interviewQuestion: string;
  sourceFile: string;
  sourceTurnId: string;
}

interface KnownCase {
  chunkId: string;
  market: string;
  expertName: string;
  timestamp: string;
  sourceFile: string;
  snippet: string;
}

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return NaN;
}

export async function evaluateSourceIntegrity() {
  console.log("==========================================");
  console.log("Phase 7 — Source & Quote Integrity Audit");
  console.log("==========================================\n");

  const dataDir = path.join(__dirname, "..", "data");
  const transcriptFiles = ["france.json", "germany.json", "uk.json"];
  const chunksFile = path.join(dataDir, "chunks.json");
  const casesFile = path.join(__dirname, "..", "eval", "source-integrity-cases.json");

  // 1. Check File Existence
  for (const tf of transcriptFiles) {
    const fullPath = path.join(dataDir, tf);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`ERROR: Source transcript file missing: ${fullPath}`);
    }
  }

  if (!fs.existsSync(chunksFile)) {
    throw new Error(`ERROR: Master chunks file missing: ${chunksFile}`);
  }

  const rawChunks = fs.readFileSync(chunksFile, "utf-8");
  const chunks: ExpertChunk[] = JSON.parse(rawChunks);

  console.log(`✓ Master chunks loaded: ${chunks.length} retrieval units`);

  // 2. Validate Transcript Files & Turn Metadata
  let totalTurns = 0;
  const seenTurnIds = new Set<string>();

  for (const tf of transcriptFiles) {
    const raw = fs.readFileSync(path.join(dataDir, tf), "utf-8");
    const doc = JSON.parse(raw);
    const meta = doc.metadata || doc;

    if (!meta.callId || !meta.expertId || !meta.expertName || !meta.market || !doc.turns) {
      throw new Error(`ERROR: Incomplete metadata in transcript ${tf}`);
    }

    for (const turn of doc.turns) {
      totalTurns++;
      if (seenTurnIds.has(turn.turnId)) {
        throw new Error(`ERROR: Duplicate turnId "${turn.turnId}" found in ${tf}`);
      }
      seenTurnIds.add(turn.turnId);

      // Validate turn timestamp conversion
      const calcSec = parseTimestampToSeconds(turn.timestamp);
      if (isNaN(calcSec) || calcSec !== turn.timestampSeconds) {
        throw new Error(
          `ERROR: Timestamp mismatch in turn ${turn.turnId}: string="${turn.timestamp}", calcSec=${calcSec}, storedSec=${turn.timestampSeconds}`
        );
      }

      if (!turn.text || !turn.text.trim()) {
        throw new Error(`ERROR: Empty text in turn ${turn.turnId}`);
      }
    }
  }

  console.log(`✓ Total turns validated across 3 transcripts: ${totalTurns} (Turn IDs 100% unique)`);

  // 3. Validate Unique Chunk IDs & Source Turn Resolution
  const seenChunkIds = new Set<string>();
  let quoteMismatches = 0;
  let timestampFailures = 0;

  for (const chunk of chunks) {
    if (seenChunkIds.has(chunk.chunkId)) {
      throw new Error(`ERROR: Duplicate chunkId "${chunk.chunkId}" found in chunks.json`);
    }
    seenChunkIds.add(chunk.chunkId);

    // Turn ID resolution check
    if (!seenTurnIds.has(chunk.sourceTurnId)) {
      throw new Error(
        `ERROR: Chunk ${chunk.chunkId} references non-existent sourceTurnId "${chunk.sourceTurnId}"`
      );
    }

    // Timestamp seconds check
    const calcSec = parseTimestampToSeconds(chunk.timestamp);
    if (isNaN(calcSec) || calcSec !== chunk.timestampSeconds) {
      timestampFailures++;
      console.error(
        `  ✗ Timestamp calculation mismatch for chunk "${chunk.chunkId}": string="${chunk.timestamp}", calcSec=${calcSec}, stored=${chunk.timestampSeconds}`
      );
    }

    // Section 4 Exact Quote Integrity Check: chunk.text == resolved exactQuote
    try {
      const resolvedEv = getEvidenceByChunkId(chunk.chunkId);
      if (!validateEvidence(resolvedEv)) {
        quoteMismatches++;
        console.error(`  ✗ Evidence validation failed for chunk "${chunk.chunkId}"`);
      } else if (resolvedEv.exactQuote !== chunk.text) {
        quoteMismatches++;
        console.error(
          `  ✗ Verbatim quote mismatch for chunk "${chunk.chunkId}":\n    Expected: "${chunk.text}"\n    Resolved: "${resolvedEv.exactQuote}"`
        );
      }
    } catch (err) {
      quoteMismatches++;
      console.error(`  ✗ Resolution exception for chunk "${chunk.chunkId}":`, err);
    }
  }

  const exactMatchesCount = chunks.length - quoteMismatches;

  console.log(`\nExact Quote Integrity Results:`);
  console.log(`  Total chunks tested : ${chunks.length}`);
  console.log(`  Exact quote matches : ${exactMatchesCount}`);
  console.log(`  Quote mismatches    : ${quoteMismatches}`);
  console.log(`  Timestamp failures  : ${timestampFailures}`);

  // 4. Known Case Verification
  let knownCaseFailures = 0;
  if (fs.existsSync(casesFile)) {
    const rawCases = fs.readFileSync(casesFile, "utf-8");
    const knownCases: KnownCase[] = JSON.parse(rawCases);

    console.log(`\nVerifying ${knownCases.length} Known Evidence Case Targets...`);

    for (const kc of knownCases) {
      try {
        const ev = getEvidenceByChunkId(kc.chunkId);
        if (ev.market !== kc.market) {
          console.error(`  ✗ Known Case "${kc.chunkId}" market mismatch: expected=${kc.market}, got=${ev.market}`);
          knownCaseFailures++;
        } else if (ev.expertName !== kc.expertName) {
          console.error(`  ✗ Known Case "${kc.chunkId}" expert mismatch: expected=${kc.expertName}, got=${ev.expertName}`);
          knownCaseFailures++;
        } else if (ev.timestamp !== kc.timestamp) {
          console.error(`  ✗ Known Case "${kc.chunkId}" timestamp mismatch: expected=${kc.timestamp}, got=${ev.timestamp}`);
          knownCaseFailures++;
        } else if (ev.sourceFile !== kc.sourceFile) {
          console.error(`  ✗ Known Case "${kc.chunkId}" sourceFile mismatch: expected=${kc.sourceFile}, got=${ev.sourceFile}`);
          knownCaseFailures++;
        } else if (!ev.exactQuote.includes(kc.snippet)) {
          console.error(`  ✗ Known Case "${kc.chunkId}" snippet missing in exactQuote: "${ev.exactQuote}"`);
          knownCaseFailures++;
        } else {
          console.log(`  ✓ Known Case [${kc.chunkId}] (${kc.market} - ${kc.expertName} @ ${kc.timestamp}) PASS`);
        }
      } catch (err) {
        console.error(`  ✗ Exception testing known case "${kc.chunkId}":`, err);
        knownCaseFailures++;
      }
    }
  }

  // 5. Update Regression Summary
  const summaryPath = path.join(__dirname, "..", "eval", "regression-summary.json");
  if (fs.existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
      summary.lastExecutedAt = new Date().toISOString();
      summary.sourceIntegrity = {
        totalFilesChecked: transcriptFiles.length + 1,
        totalTurnsChecked: totalTurns,
        totalChunksChecked: chunks.length,
        exactQuoteMatches: exactMatchesCount,
        quoteMismatches: quoteMismatches,
        timestampFailures: timestampFailures,
        knownCaseFailures: knownCaseFailures,
        status: quoteMismatches === 0 && timestampFailures === 0 && knownCaseFailures === 0 ? "PASS" : "FAIL",
      };
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
    } catch {
      // ignore summary update error
    }
  }

  console.log("\n==========================================");
  console.log("Source & Quote Integrity Audit Summary");
  console.log("==========================================");
  console.log(`Total turns checked       : ${totalTurns}`);
  console.log(`Total chunks checked      : ${chunks.length}`);
  console.log(`Exact quote matches       : ${exactMatchesCount}/${chunks.length}`);
  console.log(`Quote mismatches          : ${quoteMismatches}`);
  console.log(`Timestamp failures        : ${timestampFailures}`);
  console.log(`Known case failures       : ${knownCaseFailures}\n`);

  if (quoteMismatches > 0 || timestampFailures > 0 || knownCaseFailures > 0) {
    throw new Error("ERROR: Source integrity audit discovered mismatches or failures.");
  }

  console.log("ALL Source & Quote Integrity Audits PASSED 100% Verbatim Match!\n");
}

if (require.main === module) {
  evaluateSourceIntegrity().catch((err) => {
    console.error("Source integrity evaluation failed:", err);
    process.exit(1);
  });
}
