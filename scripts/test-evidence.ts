import fs from "fs";
import path from "path";
import { getEvidenceByChunkId, validateEvidence } from "../lib/evidence";
import { searchChunks } from "../lib/retrieval";

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

export async function testEvidenceIntegrity() {
  console.log("Starting Phase 3 Grounded Evidence Integrity Tests...\n");

  const targetChunks = [
    {
      chunkId: "france_expert_001",
      expectedMarket: "France",
      expectedExpert: "Dr. Jean Martin",
      expectedTimestamp: "00:18",
      expectedFile: "Transcript_1_France.txt",
      snippet: "Adoption is growing, but it is still concentrated in larger academic hospitals",
    },
    {
      chunkId: "france_expert_002",
      expectedMarket: "France",
      expectedExpert: "Dr. Jean Martin",
      expectedTimestamp: "01:20",
      expectedFile: "Transcript_1_France.txt",
      snippet: "The biggest issue is still capital budget approval.",
    },
    {
      chunkId: "germany_expert_002",
      expectedMarket: "Germany",
      expectedExpert: "Anna Keller",
      expectedTimestamp: "01:10",
      expectedFile: "Transcript_2_Germany.txt",
      snippet: "Cost is the first barrier.",
    },
    {
      chunkId: "uk_expert_002",
      expectedMarket: "United Kingdom",
      expectedExpert: "Dr. Emily Carter",
      expectedTimestamp: "01:05",
      expectedFile: "Transcript_3_UK.txt",
      snippet: "Funding is important, but I would say training capacity is just as important.",
    },
    {
      chunkId: "uk_expert_007",
      expectedMarket: "United Kingdom",
      expectedExpert: "Dr. Emily Carter",
      expectedTimestamp: "06:04",
      expectedFile: "Transcript_3_UK.txt",
      snippet: "The key point is that adoption is not just about buying the machine.",
    },
  ];

  let passedDirectChecks = 0;

  for (const tc of targetChunks) {
    console.log(`Checking chunkId "${tc.chunkId}"...`);
    const ev = getEvidenceByChunkId(tc.chunkId);

    if (!validateEvidence(ev)) {
      throw new Error(`Integrity Check Failed: Invalid evidence object for ${tc.chunkId}`);
    }
    if (ev.market !== tc.expectedMarket) {
      throw new Error(`Integrity Check Failed: Market mismatch for ${tc.chunkId}. Expected ${tc.expectedMarket}, got ${ev.market}`);
    }
    if (ev.expertName !== tc.expectedExpert) {
      throw new Error(`Integrity Check Failed: Expert mismatch for ${tc.chunkId}. Expected ${tc.expectedExpert}, got ${ev.expertName}`);
    }
    if (ev.timestamp !== tc.expectedTimestamp) {
      throw new Error(`Integrity Check Failed: Timestamp mismatch for ${tc.chunkId}. Expected ${tc.expectedTimestamp}, got ${ev.timestamp}`);
    }
    if (ev.sourceFile !== tc.expectedFile) {
      throw new Error(`Integrity Check Failed: Source file mismatch for ${tc.chunkId}. Expected ${tc.expectedFile}, got ${ev.sourceFile}`);
    }
    if (!ev.exactQuote.includes(tc.snippet)) {
      throw new Error(`Integrity Check Failed: Snippet missing in exactQuote for ${tc.chunkId}. Found: "${ev.exactQuote}"`);
    }

    console.log(`  ✓ ${tc.chunkId} (${ev.market} - ${ev.expertName} @ ${ev.timestamp}) matched verbatim.\n`);
    passedDirectChecks++;
  }

  console.log(`Direct Quote Integrity Checks Passed: ${passedDirectChecks}/${targetChunks.length}\n`);

  // Semantic Retrieval + Evidence attribute checks
  console.log("Running Retrieval + Evidence Pipeline Integrity Tests...");
  const testQueries = [
    "What are the main barriers to adoption?",
    "How important is ROI?",
    "How important is surgeon training?",
    "What is the purchasing timeline?",
    "What is the expected adoption trend?",
    "How does adoption vary across markets?",
  ];

  for (const q of testQueries) {
    const results = await searchChunks(q, { topK: 3 });
    if (!results || results.length === 0) {
      throw new Error(`Retrieval Check Failed: No results returned for query "${q}"`);
    }

    for (const res of results) {
      const ev = res.evidence;
      if (!ev.chunkId || !ev.exactQuote || !ev.timestamp || !ev.expertName || !ev.market || !ev.sourceFile || !ev.sourceTurnId) {
        throw new Error(`Retrieval Check Failed: Incomplete evidence attributes in result for query "${q}"`);
      }
      if (typeof ev.score !== "number" || isNaN(ev.score)) {
        throw new Error(`Retrieval Check Failed: Missing score in evidence result for query "${q}"`);
      }
    }
    console.log(`  ✓ Query "${q}" returned ${results.length} fully validated evidence items.`);
  }

  console.log("\nAll Phase 3 Evidence Integrity Tests PASSED Successfully!\n");
}

if (require.main === module) {
  testEvidenceIntegrity().catch((err) => {
    console.error("Evidence test failed:", err);
    process.exit(1);
  });
}
