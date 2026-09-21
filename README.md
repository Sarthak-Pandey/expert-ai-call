# Expert Call AI Analyst

## Objective

The **Expert Call AI Analyst** is an AI-powered technical research application designed to analyze expert-call transcripts across multiple markets (France, Germany, UK) with strict grounded evidence, transcript traceability, and zero hallucination.

The application enables:
1. Structured analysis of interview-guide questions supported by exact transcript evidence.
2. Direct quote extraction with exact timestamps.
3. Automated identification of common themes and cross-market disagreements/divergences.
4. Ad-hoc natural language querying across all expert transcripts simultaneously.

---

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Vector Database**: Pinecone (Phase 2+)
- **Embeddings**: Text Embedding Models (Phase 2+)
- **LLM**: Large Language Models (Phase 3+)

---

## Architecture

```text
Transcripts
  → Parser
  → Structured Chunks
  → Embeddings
  → Pinecone
  → Retrieval
  → LLM
  → Grounded Answer + Evidence
```

---

## Development Phases

- [x] **Phase 0**: Project foundation and application skeleton
- [x] **Phase 1**: Transcript parsing and normalization
- [ ] **Phase 2**: Embeddings and Pinecone ingestion
- [ ] **Phase 3**: Retrieval and evidence layer
- [ ] **Phase 4**: Interview Guide analysis
- [ ] **Phase 5**: Themes and disagreements
- [ ] **Phase 6**: Cross-transcript Q&A
- [ ] **Phase 7**: Evaluation and hallucination controls
- [ ] **Phase 8**: UI polish, documentation and deployment

---

## Current Status

**Phase 1 Completed.** Deterministic transcript parsing, normalization, metadata extraction, speaker alias matching, exact text preservation, and retrieval unit creation are fully implemented and verified.

---

## Phase 1 — Transcript Parsing & Normalization

The Phase 1 pipeline converts raw text transcripts (`data/raw/*.txt`) into deterministic JSON files (`data/france.json`, `data/germany.json`, `data/uk.json`) and expert-response retrieval units (`data/chunks.json`).

### Key Features

1. **Deterministic Processing**: No LLMs or stochastic models are used to parse or rewrite transcript text.
2. **Metadata Extraction**: Expert Name, Role, and Market attributes are dynamically parsed from source file headers (`Expert N – Name`, `Role: ...`, `Market: ...`). Supplemental configuration (`data/experts-config.json`) maps file paths to canonical `callId`s, `expertId`s, and explicit short `speakerLabel` aliases (`Dr. Martin`, `Anna Keller`, `Dr. Carter`).
3. **Speaker Alias Matching**: Speaker labels are matched strictly against interviewer patterns and configured expert aliases. Any unrecognized speaker label triggers a warning.
4. **Timestamp Preservation**: Spoken timestamps (`MM:SS` or `HH:MM:SS`) are preserved verbatim in `timestamp` while calculating additive integer `timestampSeconds` for analytical sorting.
5. **Exact Spoken Text Preservation**: Word choices, punctuation, numbers, hyphens, and paragraph breaks are preserved verbatim. Spoken text is never summarized or reworded during parsing.
6. **Expert Response Retrieval Units**: Expert turns are extracted into `data/chunks.json` paired with preceding `interviewQuestion` context, explicit `interviewQuestionInherited` tracking for consecutive expert turns, and optional SHA-256 `textHash` verification.
7. **Exact Quote Safety**: `getExactQuote(chunkId, chunks)` utility provides direct deterministic lookup (`chunkId` → exact original text + timestamp + expert metadata).

### Running the Parser

```bash
npm run parse
```

### Generated Files

- `data/france.json` — Full normalized turn history & metadata for France expert call.
- `data/germany.json` — Full normalized turn history & metadata for Germany expert call.
- `data/uk.json` — Full normalized turn history & metadata for UK expert call.
- `data/chunks.json` — Deterministic expert-response retrieval units ready for vector indexing in Phase 2.

---

## Getting Started

1. Clone or navigate to the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.
