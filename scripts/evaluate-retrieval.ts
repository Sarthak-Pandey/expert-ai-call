import fs from "fs";
import path from "path";
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

interface TestCase {
  id: string;
  category: string;
  query: string;
  expectedMarkets: string[];
}

export async function evaluateRetrieval() {
  const testCasesPath = path.join(__dirname, "..", "eval", "test-cases.json");
  if (!fs.existsSync(testCasesPath)) {
    throw new Error(`ERROR: Test cases file missing at ${testCasesPath}`);
  }

  const rawCases = fs.readFileSync(testCasesPath, "utf-8");
  const testCases: TestCase[] = JSON.parse(rawCases);

  console.log(`Starting Semantic Retrieval Evaluation (${testCases.length} Test Cases)\n`);

  const totalCases = testCases.length;
  let fullCoverageCount = 0;

  for (const tc of testCases) {
    const results = await searchChunks(tc.query, { topK: 5 });

    // Collect retrieved markets from top-5 results
    const retrievedMarketsSet = new Set<string>();
    results.forEach((r) => {
      const ev = r.evidence;
      if (ev && ev.market) retrievedMarketsSet.add(ev.market);
    });

    const retrievedMarkets = Array.from(retrievedMarketsSet);

    // Check if expected markets were retrieved
    const missingMarkets = tc.expectedMarkets.filter((m) => !retrievedMarketsSet.has(m));
    const isCovered = missingMarkets.length === 0;

    if (isCovered) fullCoverageCount++;

    const statusSymbol = isCovered ? "✓ Coverage" : `✗ Missing: ${missingMarkets.join(", ")}`;

    console.log(`${tc.id.padEnd(5)} [${tc.category.padEnd(18)}] "${tc.query}"`);
    console.log(`      Expected : ${tc.expectedMarkets.join(", ")}`);
    console.log(`      Retrieved: ${retrievedMarkets.join(", ")}`);
    console.log(`      Status   : ${statusSymbol}\n`);
  }

  const coveragePercent = Math.round((fullCoverageCount / totalCases) * 100);

  const summaryPath = path.join(__dirname, "..", "eval", "regression-summary.json");
  if (fs.existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
      summary.lastExecutedAt = new Date().toISOString();
      summary.retrieval = {
        totalCases,
        passed: fullCoverageCount,
        coverageRatePercent: coveragePercent,
        status: coveragePercent >= 80 ? "PASS" : "FAIL",
      };
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
    } catch {
      // ignore update error
    }
  }

  console.log("==========================================");
  console.log("Retrieval Evaluation Summary");
  console.log("==========================================");
  console.log(`Total Test Cases   : ${totalCases}`);
  console.log(`Full Coverage Cases: ${fullCoverageCount}`);
  console.log(`Coverage Rate      : ${coveragePercent}%\n`);
}

if (require.main === module) {
  evaluateRetrieval().catch((err) => {
    console.error("Evaluation failed:", err);
    process.exit(1);
  });
}
