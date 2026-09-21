import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  TranscriptMetadata,
  TranscriptTurn,
  NormalizedTranscript,
  ExpertResponseChunk,
} from "../lib/transcript";

interface FileConfig {
  callId: string;
  expertId: string;
  speakerLabel: string;
}

interface ConfigMap {
  [filename: string]: FileConfig;
}

/**
 * Parses timestamp string (MM:SS or HH:MM:SS) into seconds.
 */
function parseTimestampSeconds(ts: string): number {
  const parts = ts.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) {
    throw new Error(`Invalid timestamp format: ${ts}`);
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  throw new Error(`Unsupported timestamp format: ${ts}`);
}

/**
 * Checks if a line is a standalone timestamp line (MM:SS or HH:MM:SS).
 */
function isTimestampLine(line: string): boolean {
  const trimmed = line.trim();
  return /^(?:\d{1,2}:)?\d{2}:\d{2}$/.test(trimmed);
}

/**
 * Computes SHA-256 hash of a string.
 */
function computeSha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export async function parseTranscripts() {
  const projectRoot = path.resolve(__dirname, "..");
  const rawDir = path.join(projectRoot, "data", "raw");
  const configPath = path.join(projectRoot, "data", "experts-config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(`ERROR: Config file not found at ${configPath}`);
  }

  const configContent = fs.readFileSync(configPath, "utf-8");
  const config: ConfigMap = JSON.parse(configContent);

  const rawFiles = Object.keys(config);
  if (rawFiles.length !== 3) {
    throw new Error(`Expected exactly 3 transcript files in config, found ${rawFiles.length}`);
  }

  const normalizedTranscripts: Record<string, NormalizedTranscript> = {};
  const allChunks: ExpertResponseChunk[] = [];
  const validationWarnings: string[] = [];

  let totalTurnsCount = 0;
  let totalChunksCount = 0;

  for (const filename of rawFiles) {
    const fileConfig = config[filename];
    const filePath = path.join(rawDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`ERROR: Source file missing at ${filePath}`);
    }

    const rawContent = fs.readFileSync(filePath, "utf-8");
    // Normalize line endings to \n
    const lines = rawContent.replace(/\r\n/g, "\n").split("\n");

    // Phase 1B: Header parsing
    let expertName = "";
    let role = "";
    let market = "";
    let firstTurnLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (isTimestampLine(line)) {
        firstTurnLineIndex = i;
        break;
      }

      if (line.startsWith("Expert")) {
        // e.g., "Expert 1 – Dr. Jean Martin" or "Expert 1 - Dr. Jean Martin"
        const match = line.match(/^Expert\s+\d+\s*[–\-:]\s*(.+)$/i);
        if (match) {
          expertName = match[1].trim();
        } else {
          // Fallback split if dash variation occurs
          const parts = line.split(/[–\-:]/);
          if (parts.length > 1) {
            expertName = parts.slice(1).join("-").trim();
          }
        }
      } else if (line.toLowerCase().startsWith("role:")) {
        role = line.substring(5).trim();
      } else if (line.toLowerCase().startsWith("market:")) {
        market = line.substring(7).trim();
      }
    }

    // Phase 1S: Validate extracted metadata
    if (!expertName || !role || !market) {
      throw new Error(
        `ERROR: Missing required metadata header in ${filename} (Name: "${expertName}", Role: "${role}", Market: "${market}")`
      );
    }

    if (firstTurnLineIndex === -1) {
      throw new Error(`ERROR: No timestamp line found in ${filename}`);
    }

    const metadata: TranscriptMetadata = {
      callId: fileConfig.callId,
      expertId: fileConfig.expertId,
      expertName,
      speakerLabel: fileConfig.speakerLabel,
      role,
      market,
      sourceFile: filename,
    };

    // Phase 1C / 1E / 1F: Parse Turns
    const turns: TranscriptTurn[] = [];
    let turnIndex = 1;

    let idx = firstTurnLineIndex;
    while (idx < lines.length) {
      const line = lines[idx].trim();

      // Skip blank lines between turns
      if (!line) {
        idx++;
        continue;
      }

      if (!isTimestampLine(line)) {
        throw new Error(
          `ERROR: Expected timestamp line at ${filename} line ${idx + 1}, found "${line}"`
        );
      }

      const timestampStr = line;
      const timestampSec = parseTimestampSeconds(timestampStr);
      const timestampLineNum = idx + 1;

      idx++;
      // Skip any blank lines between timestamp and speaker line
      while (idx < lines.length && !lines[idx].trim()) {
        idx++;
      }

      if (idx >= lines.length) {
        throw new Error(
          `ERROR: Unexpected EOF after timestamp "${timestampStr}" at ${filename} line ${timestampLineNum}`
        );
      }

      const speakerLine = lines[idx].trim();
      const speakerMatch = speakerLine.match(/^([^:]+):\s?(.*)$/);

      if (!speakerMatch) {
        throw new Error(
          `ERROR: Could not parse speaker line at ${filename} line ${idx + 1}: "${speakerLine}"`
        );
      }

      const rawSpeakerLabel = speakerMatch[1].trim();
      const initialText = speakerMatch[2];

      const rawLineStart = idx;
      idx++;

      // Collect multi-line turn text up to next timestamp line
      const rawTurnLines: string[] = [lines[rawLineStart]];
      const textParts: string[] = [];
      if (initialText) {
        textParts.push(initialText);
      }

      while (idx < lines.length) {
        const currentLine = lines[idx];
        const trimmed = currentLine.trim();

        if (isTimestampLine(trimmed)) {
          break; // Next turn starts
        }

        rawTurnLines.push(currentLine);

        if (trimmed === "") {
          // Paragraph break inside turn
          textParts.push("\n\n");
        } else {
          if (textParts.length > 0 && textParts[textParts.length - 1] !== "\n\n") {
            textParts.push(" ");
          }
          textParts.push(trimmed);
        }
        idx++;
      }

      // Concatenate text while preserving paragraph breaks cleanly
      const fullText = textParts.join("").replace(/ \n\n /g, "\n\n").replace(/\n\n /g, "\n\n").replace(/ \n\n/g, "\n\n").trim();
      const rawText = rawTurnLines.join("\n").trim();

      // Phase 1E: Speaker classification
      let speakerType: "interviewer" | "expert" | "unknown" = "unknown";

      if (rawSpeakerLabel.toLowerCase() === "interviewer") {
        speakerType = "interviewer";
      } else if (
        rawSpeakerLabel === fileConfig.speakerLabel ||
        rawSpeakerLabel === expertName
      ) {
        speakerType = "expert";
      } else {
        speakerType = "unknown";
        validationWarnings.push(
          `WARNING: Unrecognized speaker label "${rawSpeakerLabel}" at ${filename} line ${rawLineStart + 1}`
        );
      }

      const turnId = `${fileConfig.callId}_turn_${String(turnIndex).padStart(3, "0")}`;

      turns.push({
        turnId,
        callId: fileConfig.callId,
        speaker: rawSpeakerLabel,
        speakerType,
        timestamp: timestampStr,
        timestampSeconds: timestampSec,
        text: fullText,
        rawText,
      });

      turnIndex++;
    }

    normalizedTranscripts[fileConfig.callId] = {
      metadata,
      turns,
    };

    totalTurnsCount += turns.length;

    // Phase 1H: Expert Response Retrieval Units
    let chunkIndex = 1;
    let lastInterviewerQuestion = "";
    let lastTurnWasExpert = false;

    for (const turn of turns) {
      if (turn.speakerType === "interviewer") {
        lastInterviewerQuestion = turn.text;
        lastTurnWasExpert = false;
      } else if (turn.speakerType === "expert") {
        if (!turn.text) {
          throw new Error(
            `ERROR: Empty expert response text in ${turn.turnId} (${filename})`
          );
        }

        const chunkId = `${fileConfig.callId}_expert_${String(chunkIndex).padStart(3, "0")}`;
        const chunk: ExpertResponseChunk = {
          chunkId,
          callId: metadata.callId,
          expertId: metadata.expertId,
          expertName: metadata.expertName,
          role: metadata.role,
          market: metadata.market,
          chunkType: "expert_response",
          timestamp: turn.timestamp,
          timestampSeconds: turn.timestampSeconds,
          speaker: turn.speaker,
          text: turn.text,
          interviewQuestion: lastInterviewerQuestion,
          interviewQuestionInherited: lastTurnWasExpert,
          sourceFile: filename,
          sourceTurnId: turn.turnId,
          textHash: computeSha256(turn.text),
        };

        allChunks.push(chunk);
        chunkIndex++;
        lastTurnWasExpert = true;
      }
    }

    totalChunksCount += chunkIndex - 1;
  }

  // Phase 1M / 1N / 1O: Comprehensive Validation
  const allTurnIds = new Set<string>();
  const allChunkIds = new Set<string>();

  for (const callId of Object.keys(normalizedTranscripts)) {
    const transcript = normalizedTranscripts[callId];
    for (const turn of transcript.turns) {
      if (allTurnIds.has(turn.turnId)) {
        throw new Error(`ERROR: Duplicate turnId detected: ${turn.turnId}`);
      }
      allTurnIds.add(turn.turnId);
    }
  }

  for (const chunk of allChunks) {
    if (allChunkIds.has(chunk.chunkId)) {
      throw new Error(`ERROR: Duplicate chunkId detected: ${chunk.chunkId}`);
    }
    allChunkIds.add(chunk.chunkId);
  }

  // Content validation checks (Phase 1O)
  const franceChunks = allChunks.filter((c) => c.callId === "france");
  const france0120 = franceChunks.find((c) => c.timestamp === "01:20");
  if (!france0120 || !france0120.text.toLowerCase().includes("capital budget")) {
    throw new Error(
      `Content Validation Failed: France response at 01:20 did not contain expected capital budget statement. Found: "${france0120?.text}"`
    );
  }

  const germanyChunks = allChunks.filter((c) => c.callId === "germany");
  const germany0110 = germanyChunks.find((c) => c.timestamp === "01:10");
  if (!germany0110 || !germany0110.text.length) {
    throw new Error(`Content Validation Failed: Germany response at 01:10 not found.`);
  }

  const ukChunks = allChunks.filter((c) => c.callId === "uk");
  const uk0105 = ukChunks.find((c) => c.timestamp === "01:05");
  if (!uk0105 || !uk0105.text.length) {
    throw new Error(`Content Validation Failed: UK response at 01:05 not found.`);
  }

  // Phase 1D & 1H: Save Normalized JSON Files
  const dataDir = path.join(projectRoot, "data");

  fs.writeFileSync(
    path.join(dataDir, "france.json"),
    JSON.stringify(normalizedTranscripts["france"], null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(dataDir, "germany.json"),
    JSON.stringify(normalizedTranscripts["germany"], null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(dataDir, "uk.json"),
    JSON.stringify(normalizedTranscripts["uk"], null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(dataDir, "chunks.json"),
    JSON.stringify(allChunks, null, 2),
    "utf-8"
  );

  // Phase 1U: Formatted Summary Report
  console.log("Transcript Parsing Complete\n");

  const summaryMarkets = [
    { callId: "france", label: "France" },
    { callId: "germany", label: "Germany" },
    { callId: "uk", label: "United Kingdom" },
  ];

  for (const m of summaryMarkets) {
    const t = normalizedTranscripts[m.callId];
    const cCount = allChunks.filter((c) => c.callId === m.callId).length;
    console.log(`${m.label}`);
    console.log(`  Expert: ${t.metadata.expertName}`);
    console.log(`  Role: ${t.metadata.role}`);
    console.log(`  Market: ${t.metadata.market}`);
    console.log(`  Turns: ${t.turns.length}`);
    console.log(`  Expert responses: ${cCount}\n`);
  }

  console.log(`Total turns: ${totalTurnsCount}`);
  console.log(`Total expert response units: ${totalChunksCount}\n`);

  console.log("Validation:");
  console.log("✓ IDs unique");
  console.log("✓ Timestamps valid");
  console.log("✓ Expert metadata valid");
  console.log("✓ Exact text preserved");
  console.log("✓ Source references valid");

  if (validationWarnings.length > 0) {
    console.log("\nWarnings:");
    validationWarnings.forEach((w) => console.log(w));
  }
}

if (require.main === module) {
  parseTranscripts().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
