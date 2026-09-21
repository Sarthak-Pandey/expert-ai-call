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
- [x] **Phase 4**: Grounded LLM Interview Guide analysis
- [x] **Phase 5**: Themes and disagreements
- [ ] **Phase 6**: Cross-transcript Q&A
- [ ] **Phase 7**: Evaluation and hallucination controls
- [ ] **Phase 8**: UI polish, documentation and deployment

---

## Current Status

**Phase 5 Completed.** Multi-market cross-call evidence collection across France, Germany, and the UK (`lib/themes.ts`), prompt versioning (`CROSS_CALL_PROMPT_VERSION = "v1"`), structured JSON LLM theme synthesis with evidence ID validation, application-computed expert coverage, exact quote resolution via Phase 3 evidence layer, themes API endpoint (`POST /api/themes`), themes benchmark evaluation (`npm run evaluate:themes`), and integrated Guide UI (`app/guide/page.tsx` with `ThemeCard` and `DisagreementCard`) are fully implemented.

---

## Phase 5 — Cross-Call Themes & Differences

Phase 5 analyzes all three expert interviews (France, Germany, UK) together to identify recurring common themes, differences in emphasis, and material disagreements using grounded Phase 3 evidence.

### Cross-Call Architecture

```text
Six Guide Questions (Q1–Q6 Retrieval Anchors)
        ↓
Phase 3 Vector Retrieval (searchChunks across France, Germany, UK)
        ↓
Multi-Market Evidence Collection & Deduplication by chunkId
        ↓
Groq LLM Cross-Call Synthesis (openai/gpt-oss-120b / CROSS_CALL_PROMPT_VERSION = "v1")
        ↓
Evidence ID Validation & Retry Engine (bounded to max 2 attempts)
        ↓
Application-Level Expert Coverage Computation (unique experts in evidenceIds)
        ↓
Source Evidence Resolution (getEvidenceByChunkId for exact quotes + timestamps)
        ↓
Themes & Differences Output (Consensus, Difference in Emphasis, Disagreement, Single Expert)
```

### Semantic Categorization Rules

1. **`consensus`**: Experts express broadly compatible views (requires evidence from >= 2 experts).
2. **`difference_in_emphasis`**: Experts agree on the broad topic, but emphasize different priorities, budget models, or local constraints.
3. **`disagreement`**: Experts provide materially opposing positions supported by transcript evidence.
4. **`single_expert`**: Points raised by only one expert/market without cross-call corroboration.
5. **`insufficient_evidence`**: Evidence is insufficient to support a reliable cross-call comparison.

### Key Technical Principles

1. **Zero LLM Quote Generation**: The LLM returns ONLY `evidenceIds`. All verbatim quotes, timestamps, expert names, roles, markets, and source files are resolved server-side using `getEvidenceByChunkId()`.
2. **No Fake Consensus**: Merely discussing a topic is not treated as agreement. Broad agreement requires distinct supporting evidence across multiple experts.
3. **Application-Computed Coverage**: `expertsCovered` is recomputed by the application based on unique resolved expert IDs, ensuring the model cannot claim 3/3 coverage with evidence from only 1 expert.
4. **Themes API Endpoint**: `POST /api/themes` accepts optional `{ "questionId": "Q3" }` or empty body `{}` for full cross-transcript theme synthesis.
5. **Integrated Guide UI**: Themes and key differences are rendered directly on `/guide` using `ThemeCard` and `DisagreementCard` without creating an extra navigation route.

### Running Phase 5 Benchmark

```bash
npm run evaluate:themes
```

---

## Phase 4 — Grounded LLM Interview Guide Analysis

Phase 4 introduces an LLM into the research application to synthesize analytical answers for the six official interview-guide questions using **only retrieved Phase 3 evidence objects**.

### Guide Analysis Pipeline Architecture

```text
Interview Guide Question (Q1–Q6)
      ↓
Phase 3 Semantic Vector Search (searchChunks)
      ↓
Retrieved Grounded Evidence Objects (lib/evidence.ts)
      ↓
Groq LLM Synthesis (openai/gpt-oss-120b / response_format: json_object)
      ↓
Structured JSON Response (answer + evidenceIds)
      ↓
Server-Side Evidence ID Validation & Quote Resolution (getEvidenceByChunkId)
      ↓
Final Grounded Guide Answer (Answer + Verbatim Quotes + Timestamps + Expert Metadata)
```

### Key Technical Principles

1. **Zero LLM Quote Generation**: The LLM returns ONLY `evidenceIds` (e.g. `["france_expert_002", "germany_expert_002"]`). All displayed exact quotes, timestamps, expert names, roles, markets, and source files are resolved server-side from Phase 1/Phase 3 source JSON (`data/chunks.json`).
2. **Retrieval Before Generation**: The LLM never reads raw transcript files directly and cannot perform arbitrary ungrounded web or transcript searches.
3. **Prompt Versioning & Grounding Rules**: Prompts in `lib/prompts.ts` (`GUIDE_PROMPT_VERSION = "v1"`) strictly prohibit outside knowledge, fabricated quotes, or invented expert opinions.
4. **Synthesis Classification**: Automatically classifies answers into `consensus`, `mixed`, `single_source`, or `insufficient_evidence`.
5. **Server-Side Validation**: Every returned `evidenceId` is validated against the retrieved evidence set. Unknown IDs are rejected and cause bounded retries (max 2 attempts).

### Running Phase 4 Evaluation

```bash
npm run evaluate:guide
```

### Guide API Endpoint

- `POST /api/guide`: Accepts `{ "questionId": "Q2", "topK": 6 }` and returns `{ "questionId": "Q2", "question": "...", "answer": "...", "synthesisType": "consensus", "coverage": { "expertsCovered": 3, "totalExperts": 3 }, "evidence": [ Evidence, ... ] }`.

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
