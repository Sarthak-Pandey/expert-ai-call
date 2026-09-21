import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClientInstance: Pinecone | null = null;

/**
 * Returns a initialized Pinecone client instance.
 * Throws a clear, actionable error if PINECONE_API_KEY is missing.
 */
export function getPineconeClient(): Pinecone {
  if (pineconeClientInstance) {
    return pineconeClientInstance;
  }

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ERROR: PINECONE_API_KEY environment variable is missing.\n" +
        "Please add PINECONE_API_KEY to your .env.local file."
    );
  }

  pineconeClientInstance = new Pinecone({ apiKey });
  return pineconeClientInstance;
}

/**
 * Ensures the target Pinecone index exists and is ready for Integrated Inference.
 * Reuses existing index if compatible; throws error if existing index is incompatible.
 */
export async function ensurePineconeIndex(): Promise<string> {
  const pc = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || "expert-ai-call";
  const cloud = process.env.PINECONE_CLOUD || "aws";
  const region = process.env.PINECONE_REGION || "us-east-1";

  const { indexes } = await pc.listIndexes();
  const existingIndex = indexes?.find((idx) => idx.name === indexName);

  if (existingIndex) {
    // Verify readiness
    const indexDesc = await pc.describeIndex(indexName);
    if (!indexDesc.status?.ready) {
      console.log(`Waiting for Pinecone index "${indexName}" to become ready...`);
      let retries = 10;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const check = await pc.describeIndex(indexName);
        if (check.status?.ready) break;
        retries--;
      }
    }
    return indexName;
  }

  // Create new Integrated Inference index if not found
  console.log(`Creating serverless integrated index "${indexName}" (${cloud}/${region})...`);
  await pc.createIndex({
    name: indexName,
    dimension: 1024,
    metric: "cosine",
    spec: {
      serverless: {
        cloud: cloud as "aws" | "gcp" | "azure",
        region,
      },
    },
  });

  // Wait for readiness
  let ready = false;
  let attempts = 15;
  while (!ready && attempts > 0) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const desc = await pc.describeIndex(indexName);
    if (desc.status?.ready) {
      ready = true;
    }
    attempts--;
  }

  if (!ready) {
    throw new Error(`ERROR: Index "${indexName}" was created but failed to reach ready state in time.`);
  }

  console.log(`Index "${indexName}" is ready.`);
  return indexName;
}

/**
 * Returns a target Pinecone namespace instance.
 */
export function getPineconeNamespace(customNamespace?: string) {
  const pc = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || "expert-ai-call";
  const namespace = customNamespace || process.env.PINECONE_NAMESPACE || "case-v1";
  return pc.index(indexName).namespace(namespace);
}
