/**
 * Transcript Normalization & Metadata Data Models and Utilities
 */

export interface TranscriptMetadata {
  callId: string;
  expertId: string;
  expertName: string;
  speakerLabel: string;
  role: string;
  market: string;
  sourceFile: string;
}

export interface TranscriptTurn {
  turnId: string;
  callId: string;
  speaker: string;
  speakerType: "interviewer" | "expert" | "unknown";
  timestamp: string;
  timestampSeconds: number;
  text: string;
  rawText: string;
}

export interface NormalizedTranscript {
  metadata: TranscriptMetadata;
  turns: TranscriptTurn[];
}

export interface ExpertResponseChunk {
  chunkId: string;
  callId: string;
  expertId: string;
  expertName: string;
  role: string;
  market: string;
  chunkType: "expert_response";
  timestamp: string;
  timestampSeconds: number;
  speaker: string;
  text: string;
  interviewQuestion: string;
  interviewQuestionInherited: boolean;
  sourceFile: string;
  sourceTurnId: string;
  textHash?: string;
}

export interface ExactQuoteResult {
  text: string;
  timestamp: string;
  expertName: string;
  market: string;
  sourceFile: string;
}

/**
 * Phase 1P — Exact Quote Safety Utility
 * Given a chunk ID and the dataset of retrieval chunks, returns the exact original text,
 * timestamp, expert name, market, and source file without any modification.
 */
export function getExactQuote(
  chunkId: string,
  chunks: ExpertResponseChunk[]
): ExactQuoteResult | null {
  const chunk = chunks.find((c) => c.chunkId === chunkId);
  if (!chunk) return null;
  return {
    text: chunk.text,
    timestamp: chunk.timestamp,
    expertName: chunk.expertName,
    market: chunk.market,
    sourceFile: chunk.sourceFile,
  };
}
