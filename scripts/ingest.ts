import fs from "fs";
import path from "path";
import { ensurePineconeIndex, getPineconeNamespace } from "../lib/pinecone";
import { ExpertResponseChunk } from "../lib/transcript";
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

export async function ingestChunks() {
  const projectRoot = path.resolve(__dirname, "..");
  const chunksPath = path.join(projectRoot, "data", "chunks.json");

  if (!fs.existsSync(chunksPath)) {
    throw new Error(`ERROR: Source data chunks not found at ${chunksPath}. Run 'npm run parse' first.`);
  }

  const rawChunks = fs.readFileSync(chunksPath, "utf-8");
  const chunks: ExpertResponseChunk[] = JSON.parse(rawChunks);

  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error("ERROR: data/chunks.json is empty or invalid.");
  }

  console.log(`Loaded ${chunks.length} expert response chunks from data/chunks.json.`);

  // Validate chunk required fields
  for (const chunk of chunks) {
    if (!chunk.chunkId || !chunk.text || !chunk.market || !chunk.expertName) {
      throw new Error(`ERROR: Malformed chunk record detected: ${JSON.stringify(chunk)}`);
    }
  }

  // Ensure index exists & is ready
  const indexName = await ensurePineconeIndex();
  const namespaceName = process.env.PINECONE_NAMESPACE || "case-v1";
  const ns = getPineconeNamespace(namespaceName);

  // Delete legacy test record if present
  try {
    const nsWithDelete = ns as unknown as { deleteRecords: (opts: { ids: string[] }) => Promise<void> };
    if (typeof nsWithDelete.deleteRecords === "function") {
      await nsWithDelete.deleteRecords({ ids: ["test_001"] });
    }
  } catch {}

  // Construct Pinecone records with retrieval text (Interview question + Expert response)
  const records = chunks.map((chunk) => {
    const retrievalText = `Interview question:\n${chunk.interviewQuestion || ""}\n\nExpert response:\n${chunk.text}`;

    return {
      _id: chunk.chunkId,
      text: retrievalText,
      callId: chunk.callId,
      expertId: chunk.expertId,
      expertName: chunk.expertName,
      role: chunk.role,
      market: chunk.market,
      chunkType: chunk.chunkType,
      timestamp: chunk.timestamp,
      timestampSeconds: chunk.timestampSeconds,
      sourceFile: chunk.sourceFile,
      sourceTurnId: chunk.sourceTurnId,
      interviewQuestion: chunk.interviewQuestion || "",
    };
  });

  // Batching for idempotent upsert
  const BATCH_SIZE = 50;
  let upsertedCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await ns.upsertRecords({ records: batch });
    upsertedCount += batch.length;
    console.log(`Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)...`);
  }

  console.log(`\nSuccessfully upserted ${upsertedCount} records to Pinecone namespace "${namespaceName}".`);

  // Fetch index stats
  const stats = await ns.describeIndexStats();
  const nsStats = stats.namespaces ? stats.namespaces[namespaceName] : undefined;
  const recordCount = nsStats ? nsStats.recordCount : (stats.totalRecordCount || upsertedCount);

  console.log("\nIndex Statistics:");
  console.log(`Index: ${indexName}`);
  console.log(`Namespace: ${namespaceName}`);
  console.log(`Records: ${recordCount}\n`);

  // Run sample verification query
  console.log("Running sample verification semantic search...");
  const sampleQuery = "What are the main barriers to adoption?";
  const sampleResults = await searchChunks(sampleQuery, { topK: 3 });

  console.log(`Sample Query: "${sampleQuery}"`);
  console.log(`Top ${sampleResults.length} Results:`);
  sampleResults.forEach((res, idx) => {
    console.log(`\n  [${idx + 1}] ${res.chunkId} (${res.market} - ${res.expertName} @ ${res.timestamp})`);
    console.log(`      Score: ${res.score.toFixed(4)}`);
    console.log(`      Question: "${res.interviewQuestion}"`);
    console.log(`      Text: "${res.text.substring(0, 100)}..."`);
  });
}

if (require.main === module) {
  ingestChunks().catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
}
