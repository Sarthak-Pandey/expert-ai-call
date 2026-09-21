import { getPineconeNamespace } from "./pinecone";
import { Evidence, getEvidenceByChunkId } from "./evidence";

export interface SearchOptions {
  topK?: number;
  filter?: Record<string, unknown>;
  market?: string;
  callId?: string;
  expertId?: string;
}

export interface RetrievalResult {
  evidence: Evidence;
}

/**
 * Phase 3 — Grounded Evidence Retrieval Engine
 * Executes a semantic vector search against Pinecone, deduplicates chunk hits deterministically,
 * resolves vector IDs back to authoritative Phase 1 source evidence, and sorts by score.
 */
export async function searchChunks(
  query: string,
  options: SearchOptions = {}
): Promise<RetrievalResult[]> {
  const trimmedQuery = query ? query.trim() : "";
  if (!trimmedQuery) {
    throw new Error("ERROR: Query string must not be empty.");
  }

  // Validate and bound topK between 1 and 20 (default: 5)
  let topK = options.topK ?? 5;
  if (typeof topK !== "number" || isNaN(topK)) {
    throw new Error("ERROR: Invalid topK option. Must be a number between 1 and 20.");
  }
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

  const searchParams = {
    query: {
      topK: topK * 2, // Fetch extra candidate hits to account for potential deduplication
      inputs: { text: trimmedQuery },
    },
    filter,
  };

  const response = await ns.searchRecords(searchParams);
  const hits = response?.result?.hits || [];

  const results: RetrievalResult[] = [];
  const seenChunkIds = new Set<string>();

  for (const hit of hits) {
    const rawHit = hit as unknown as Record<string, unknown>;
    const chunkId = (hit._id || rawHit.id || "") as string;
    const score = (hit._score ?? rawHit.score ?? 0) as number;

    if (!chunkId || seenChunkIds.has(chunkId)) {
      continue; // Deterministic deduplication by chunkId
    }

    try {
      // Resolve chunkId back to authoritative Phase 1 source evidence
      const evidence = getEvidenceByChunkId(chunkId, score);
      seenChunkIds.add(chunkId);
      results.push({ evidence });

      if (results.length >= topK) {
        break;
      }
    } catch (err) {
      console.warn(`Skipping unresolvable vector hit "${chunkId}":`, err);
    }
  }

  // Preserve Pinecone semantic relevance ordering (highest score first)
  results.sort((a, b) => b.evidence.score - a.evidence.score);

  return results;
}
