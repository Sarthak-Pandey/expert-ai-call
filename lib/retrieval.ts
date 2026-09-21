import { getPineconeNamespace } from "./pinecone";
import { getChunkById, ExpertResponseChunk } from "./transcript";

export interface SearchOptions {
  topK?: number;
  filter?: Record<string, unknown>;
  market?: string;
  callId?: string;
  expertId?: string;
}

export interface RetrievalResult {
  chunkId: string;
  score: number;
  callId: string;
  expertId: string;
  expertName: string;
  role: string;
  market: string;
  timestamp: string;
  timestampSeconds: number;
  text: string;
  interviewQuestion: string;
  sourceFile: string;
  sourceTurnId: string;
}

/**
 * Executes a semantic vector search against Pinecone and maps results back to exact Phase 1 source JSON records.
 */
export async function searchChunks(
  query: string,
  options: SearchOptions = {}
): Promise<RetrievalResult[]> {
  const trimmedQuery = query ? query.trim() : "";
  if (!trimmedQuery) {
    throw new Error("ERROR: Query string must not be empty.");
  }

  // Bound topK between 1 and 20 (default: 5)
  let topK = options.topK ?? 5;
  if (topK < 1) topK = 1;
  if (topK > 20) topK = 20;

  // Build metadata filter (enforce expert_response chunkType)
  const filter: Record<string, unknown> = {
    chunkType: "expert_response",
    ...(options.filter || {}),
  };
  if (options.market) filter.market = options.market;
  if (options.callId) filter.callId = options.callId;
  if (options.expertId) filter.expertId = options.expertId;

  const ns = getPineconeNamespace();

  const searchParams: { query: { topK: number; inputs: { text: string } }; filter: Record<string, unknown> } = {
    query: {
      topK,
      inputs: { text: trimmedQuery },
    },
    filter,
  };

  const response = await ns.searchRecords(searchParams);
  const hits = response?.result?.hits || [];

  const results: RetrievalResult[] = [];

  for (const hit of hits) {
    const rawHit = hit as unknown as Record<string, unknown>;
    const chunkId = (hit._id || rawHit.id || "") as string;
    const score = (hit._score ?? rawHit.score ?? 0) as number;

    // Phase 2 Architecture Rule: Always resolve chunkId back to Phase 1 JSON source of truth
    const sourceChunk: ExpertResponseChunk | null = getChunkById(chunkId);

    if (sourceChunk) {
      results.push({
        chunkId: sourceChunk.chunkId,
        score,
        callId: sourceChunk.callId,
        expertId: sourceChunk.expertId,
        expertName: sourceChunk.expertName,
        role: sourceChunk.role,
        market: sourceChunk.market,
        timestamp: sourceChunk.timestamp,
        timestampSeconds: sourceChunk.timestampSeconds,
        text: sourceChunk.text, // Exact spoken text from Phase 1
        interviewQuestion: sourceChunk.interviewQuestion,
        sourceFile: sourceChunk.sourceFile,
        sourceTurnId: sourceChunk.sourceTurnId,
      });
    }
  }

  return results;
}
