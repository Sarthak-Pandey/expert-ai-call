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
- [x] **Phase 2**: Embeddings and Pinecone ingestion
- [x] **Phase 3**: Grounded evidence layer
- [ ] **Phase 4**: Interview Guide analysis
- [ ] **Phase 5**: Themes and disagreements
- [ ] **Phase 6**: Cross-transcript Q&A
- [ ] **Phase 7**: Evaluation and hallucination controls
- [ ] **Phase 8**: UI polish, documentation and deployment

---

## Current Status

**Phase 3 Completed.** Grounded evidence resolution engine (`lib/evidence.ts`), evidence API endpoint (`POST /api/evidence`), deterministic deduplication, exact quote integrity verification (`npm run test:evidence`), market/expert grouping utilities, and evidence UI viewer are fully implemented.

---

## Phase 3 — Grounded Evidence Layer

Phase 3 creates a deterministic, zero-LLM evidence layer that validates and formats vector search hits into structured `Evidence` objects backed verbatim by Phase 1 source JSON (`data/chunks.json`).

### Evidence Pipeline Architecture

```text
User Question / Query
      ↓
Pinecone Vector Search (POST /api/search)
      ↓
Candidate Chunk IDs + Scores
      ↓
Deterministic Deduplication by chunkId
      ↓
Source JSON Resolution (getEvidenceByChunkId)
      ↓
Evidence Attribute Validation (validateEvidence)
      ↓
Structured Grounded Evidence Objects (exactQuote, timestamp, expert, market, sourceFile)
      ↓
Future LLM Reasoning (Phase 4+)
```

### Key Technical Principles

1. **Zero LLM Quote Generation**: Every `exactQuote` string is extracted verbatim from Phase 1 JSON (`data/chunks.json`) by `chunkId`. Quotes are never synthesized, reconstructed, or reworded by an LLM.
2. **Authoritative Traceability**: Every `Evidence` object carries complete source context: `chunkId`, `callId`, `expertId`, `expertName`, `role`, `market`, `speaker`, `timestamp`, `timestampSeconds`, `exactQuote`, `interviewQuestion`, `sourceFile`, and `sourceTurnId`.
3. **Deterministic Deduplication**: Multiple vector hits for the same `chunkId` are deduplicated deterministically while preserving relevance score ordering.
4. **Validation Rules**: `validateEvidence()` guarantees that all required evidence fields are present and non-empty before passing payload objects to downstream consumers.
5. **Direct Evidence Resolution API**: `POST /api/evidence` allows resolving any `chunkId` directly to its authoritative source evidence payload.
6. **Grouping & Filtering Utilities**: Includes helper utilities (`filterEvidenceByMarket`, `groupEvidenceByMarket`, `groupEvidenceByExpert`) to support cross-market synthesis in future phases.

### Running Phase 3 Scripts

- **Test Exact Quote Integrity**:
  ```bash
  npm run test:evidence
  ```

### Evidence API Endpoints

- `POST /api/search`: Accepts `{ "query": "...", "topK": 5 }` and returns `{ "query": "...", "results": [ Evidence, ... ] }`.
- `POST /api/evidence`: Accepts `{ "chunkId": "france_expert_002" }` and returns `{ "evidence": Evidence }`.

---

## Phase 2 — Embeddings & Pinecone Retrieval

Phase 2 indexes the Phase 1 retrieval units into a Pinecone serverless vector database using Pinecone Integrated Inference (`llama-text-embed-v2`) and provides semantic search capabilities while keeping Phase 1 JSON as the single authoritative source of truth for exact transcript evidence.

### Vector Pipeline Architecture

```text
Phase 1 Chunks (data/chunks.json)
      ↓
Pinecone Integrated Inference (llama-text-embed-v2)
      ↓
Pinecone Serverless Index (expert-ai-call / namespace: case-v1)
      ↓
Semantic Vector Search (POST /api/search)
      ↓
Matched Chunk ID
      ↓
Phase 1 Source JSON Lookup (getChunkById)
      ↓
Exact Evidence (Spoken Text + Timestamp + Metadata)
```

### Key Technical Principles

1. **Pinecone as Index / JSON as Truth**: Pinecone retrieves the relevant `chunkId`s and similarity scores. The original Phase 1 JSON files remain authoritative for exact quotes, timestamps, market names, and turn IDs.
2. **Integrated Inference**: Uses Pinecone's serverless model-aware indexing with `llama-text-embed-v2`. Embeddings are automatically calculated on Pinecone's infrastructure for both document passage ingestion and search queries.
3. **Retrieval Text Construction**: Indexes combined passage representations containing both interview question context and expert answer:
   ```text
   Interview question:
   {interviewQuestion}

   Expert response:
   {text}
   ```
4. **Metadata Preservation**: Stores `callId`, `expertId`, `expertName`, `role`, `market`, `timestamp`, `timestampSeconds`, `sourceFile`, `sourceTurnId`, and `interviewQuestion`.
5. **Idempotent Ingestion**: Ingests records deterministically keyed by Phase 1 `chunkId`s (`france_expert_001`, `germany_expert_001`, etc.) so multiple runs safely update records.
6. **No LLM Answer Generation**: Phase 2 focuses purely on semantic vector retrieval; zero LLM calls or AI-synthesized answers are introduced.

### Running Phase 2 Scripts

- **Ingest Vectors into Pinecone**:
  ```bash
  npm run ingest
  ```
- **Evaluate Semantic Retrieval Coverage**:
  ```bash
  npm run evaluate:retrieval
  ```

### Search API Endpoint

- `POST /api/search`
  - Body: `{ "query": "What are the main barriers to adoption?", "topK": 5, "filter": { "market": "France" } }`
  - Returns: Structured evidence hits containing raw vector scores and exact spoken transcript text resolved from Phase 1 JSON.

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
