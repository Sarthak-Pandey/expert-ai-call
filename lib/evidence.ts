import { getChunkById, ExpertResponseChunk } from "./transcript";

export interface Evidence {
  chunkId: string;
  score: number;
  callId: string;
  expertId: string;
  expertName: string;
  role: string;
  market: string;
  speaker: string;
  timestamp: string;
  timestampSeconds: number;
  exactQuote: string;
  interviewQuestion: string;
  sourceFile: string;
  sourceTurnId: string;
}

/**
 * Validates that an Evidence object contains all required non-empty attributes.
 */
export function validateEvidence(evidence: Partial<Evidence>): boolean {
  if (!evidence) return false;
  if (!evidence.chunkId || typeof evidence.chunkId !== "string" || !evidence.chunkId.trim()) return false;
  if (!evidence.exactQuote || typeof evidence.exactQuote !== "string" || !evidence.exactQuote.trim()) return false;
  if (!evidence.timestamp || typeof evidence.timestamp !== "string" || !evidence.timestamp.trim()) return false;
  if (!evidence.expertName || typeof evidence.expertName !== "string" || !evidence.expertName.trim()) return false;
  if (!evidence.market || typeof evidence.market !== "string" || !evidence.market.trim()) return false;
  if (!evidence.sourceFile || typeof evidence.sourceFile !== "string" || !evidence.sourceFile.trim()) return false;
  return true;
}

/**
 * Phase 3 — Source Resolution Engine
 * Resolves a chunkId to a validated, structured Evidence object using Phase 1 source JSON.
 * Throws a clear error if chunkId is missing or invalid.
 */
export function getEvidenceByChunkId(
  chunkId: string,
  score: number = 1.0,
  chunks?: ExpertResponseChunk[]
): Evidence {
  if (!chunkId || typeof chunkId !== "string" || !chunkId.trim()) {
    throw new Error("ERROR: Valid chunkId must be provided.");
  }

  const chunk = getChunkById(chunkId.trim(), chunks);
  if (!chunk) {
    throw new Error(`ERROR: Evidence not found for chunkId: ${chunkId}`);
  }

  const evidence: Evidence = {
    chunkId: chunk.chunkId,
    score: typeof score === "number" && !isNaN(score) ? score : 1.0,
    callId: chunk.callId,
    expertId: chunk.expertId,
    expertName: chunk.expertName,
    role: chunk.role,
    market: chunk.market,
    speaker: chunk.speaker,
    timestamp: chunk.timestamp,
    timestampSeconds: chunk.timestampSeconds,
    exactQuote: chunk.text, // Authoritative exact spoken text from Phase 1 JSON
    interviewQuestion: chunk.interviewQuestion || "",
    sourceFile: chunk.sourceFile,
    sourceTurnId: chunk.sourceTurnId,
  };

  if (!validateEvidence(evidence)) {
    throw new Error(`ERROR: Incomplete evidence attributes for chunkId: ${chunkId}`);
  }

  return evidence;
}

/**
 * Filters a list of Evidence objects by target market (case-insensitive).
 */
export function filterEvidenceByMarket(evidenceList: Evidence[], market: string): Evidence[] {
  if (!market || !market.trim()) return evidenceList;
  const target = market.trim().toLowerCase();
  return evidenceList.filter((e) => e.market.toLowerCase() === target);
}

/**
 * Groups a list of Evidence objects by market name.
 */
export function groupEvidenceByMarket(evidenceList: Evidence[]): Record<string, Evidence[]> {
  const grouped: Record<string, Evidence[]> = {};
  for (const item of evidenceList) {
    const key = item.market || "Unknown";
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }
  return grouped;
}

/**
 * Groups a list of Evidence objects by expert name.
 */
export function groupEvidenceByExpert(evidenceList: Evidence[]): Record<string, Evidence[]> {
  const grouped: Record<string, Evidence[]> = {};
  for (const item of evidenceList) {
    const key = item.expertName || "Unknown";
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }
  return grouped;
}
