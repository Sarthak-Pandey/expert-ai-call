import fs from "fs";
import path from "path";

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

let cachedChunks: ExpertResponseChunk[] | null = null;

/**
 * Loads all expert response chunks from data/chunks.json.
 */
export function getAllChunks(): ExpertResponseChunk[] {
  if (cachedChunks) return cachedChunks;
  try {
    const chunksPath = path.join(process.cwd(), "data", "chunks.json");
    if (fs.existsSync(chunksPath)) {
      const data = fs.readFileSync(chunksPath, "utf-8");
      cachedChunks = JSON.parse(data) as ExpertResponseChunk[];
      return cachedChunks;
    }
  } catch (err) {
    console.error("Failed to read data/chunks.json:", err);
  }
  return [];
}

/**
 * Phase 2 — Source Resolution Helper
 * Resolves a chunkId back to its original Phase 1 expert response chunk.
 */
export function getChunkById(
  chunkId: string,
  chunks?: ExpertResponseChunk[]
): ExpertResponseChunk | null {
  const sourceChunks = chunks && chunks.length > 0 ? chunks : getAllChunks();
  return sourceChunks.find((c) => c.chunkId === chunkId) || null;
}

/**
 * Phase 1P / Phase 2 — Exact Quote Safety Utility
 * Given a chunk ID, returns the exact original text, timestamp, expert name, market,
 * and source file without any modification or LLM generation.
 */
export function getExactQuote(
  chunkId: string,
  chunks?: ExpertResponseChunk[]
): ExactQuoteResult | null {
  const chunk = getChunkById(chunkId, chunks);
  if (!chunk) return null;
  return {
    text: chunk.text,
    timestamp: chunk.timestamp,
    expertName: chunk.expertName,
    market: chunk.market,
    sourceFile: chunk.sourceFile,
  };
}
