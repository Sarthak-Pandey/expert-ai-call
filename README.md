# Expert Call AI Analyst

## Overview

**Expert Call AI Analyst** is an enterprise-grade technical research platform that converts unstructured expert-call interview transcripts into grounded, traceable market intelligence. Built for healthcare, medtech, and financial research analysts, the application synthesizes insights across multiple geographic markets (France, Germany, United Kingdom) while strictly preserving verbatim quote integrity, timestamps, and expert attribution.

The platform provides two primary workflows:
1. **Interview Guide**: Structured, multi-market synthesis across 6 core interview questions with market coverage metrics and consensus/difference classification.
2. **Ask Across Calls**: Natural-language cross-call Q&A engine with strict evidence ID grounding and verbatim transcript citation.

---

## Problem

Qualitative research using expert-call transcripts typically faces three core challenges:
1. **Hallucination & Fabricated Quotes**: Standard RAG apps often hallucinate quotes or attribute paraphrased text as exact expert statements.
2. **Lack of Traceability**: Traditional LLM responses obscure the exact timestamp, speaker role, or transcript turn from which an insight originated.
3. **Synthesis Drift**: Standard chat models summarize discussions without distinguishing broad consensus from localized differences in emphasis or material disagreements across markets.

The **Expert Call AI Analyst** solves these challenges by decoupling semantic retrieval and synthesis from verbatim quote resolution, maintaining the original transcript JSON as the immutable single source of truth.

---

## Features

- **Structured Interview Guide Analysis**: Instant, grounded synthesis for 6 standardized interview questions across 3 markets.
- **Cross-Call Analysis (Themes & Differences)**: Automated detection of common themes, differences in emphasis, and material disagreements.
- **Ask Across Calls**: Ad-hoc natural language querying across all three expert interviews simultaneously.
- **Verbatim Quote Integrity**: Every quote presented in the UI is resolved server-side directly from parsed transcript JSON—zero LLM quote generation.
- **Timestamp & Metadata Citation**: Every quote carries exact timestamps (`MM:SS`), market badges (France, Germany, UK), expert names, speaker roles, and source file identifiers.
- **Visual Expand Controls**: Handles long verbatim quotes cleanly without altering or truncating underlying text.
- **Insufficient Evidence Protection**: Gracefully declines to answer out-of-domain or unevidenced questions without hallucinating data.
- **Adversarial Security**: Resists prompt injection attacks and rejects invalid or fabricated evidence IDs.

---

## Architecture

```text
                        User
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Interview Guide        Ask Across Calls
              │                     │
              └──────────┬──────────┘
                         ▼
                   Retrieval API
                         │
                         ▼
                      Pinecone
                         │
                         ▼
                 Evidence Layer
                         │
                         ▼
                      Groq LLM
                         │
                    Evidence IDs
                         │
                         ▼
               Source JSON / Chunks
                         │
                         ▼
         Exact Quote + Timestamp + Source
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 (Vanilla CSS Custom Utility System)
- **Vector Index**: Pinecone Serverless (`llama-text-embed-v2` Integrated Inference)
- **LLM Engine**: Groq API (`llama-3.3-70b-versatile` / `openai/gpt-oss-120b` with `response_format: json_object`)
- **Parser & Evaluation**: Custom Node.js / TypeScript Deterministic Pipeline

---

## Data Pipeline

1. **Transcript Normalization (`npm run parse`)**:
   Deterministic parser ingests raw text transcripts (`data/raw/*.txt`) and extracts structured speaker turns, timestamps (`timestamp` string and `timestampSeconds` integer), and expert metadata (`data/france.json`, `data/germany.json`, `data/uk.json`).
2. **Retrieval Chunk Generation**:
   Generates expert-response retrieval units (`data/chunks.json`) pairing each expert turn with its active interview question context.
3. **Vector Ingestion (`npm run ingest`)**:
   Upserts passage representations into Pinecone serverless vector index with metadata (`market`, `expertName`, `role`, `timestamp`, `sourceFile`, `sourceTurnId`).

---

## Grounding & Citation Strategy

### Critical Architectural Design Decision

```text
Pinecone determines which evidence is relevant.

The LLM synthesizes retrieved evidence.

The source transcript remains authoritative for
exact quotes, timestamps, experts, markets, and sources.
```

### Model Choice Rationale

1. **Semantic Retrieval**: Keyword search fails to match conceptual queries like "financial constraints" with spoken phrases like "capital budget approval process". Semantic vector search via Pinecone retrieves relevant transcript turns accurately.
2. **Pinecone Serverless**: Provides fast vector similarity indexing with integrated embedding calculation, eliminating local vector store maintenance.
3. **Groq LLM for Synthesis**: High-speed inference enables sub-second multi-turn synthesis while enforcing strict JSON schemas.
4. **Structured JSON Output**: The LLM is restricted to returning ONLY `answer`, `evidenceIds`, and categorization flags (`synthesisType`).
5. **Evidence ID Validation & Server-Side Quote Resolution**: By returning evidence IDs instead of text strings, the server validates every returned chunk ID against the retrieved vector candidates. All verbatim quotes, timestamps, and metadata are hydrated directly from local source JSON (`data/chunks.json`), completely eliminating LLM quote alteration or attribution errors.

---

## Hallucination Controls

The platform implements 7 layers of strict hallucination control:

1. **Retrieval Grounding**: The LLM receives strictly formatted candidate evidence objects and cannot access outside web data or unretrieved text.
2. **Structured Output Enforcement**: Forced JSON schema output ensures clean separation between synthesis text and citation IDs.
3. **Evidence ID Validation**: Every returned `evidenceId` is checked against candidate vectors. Invalid or hallucinated IDs trigger automated server retries (max 2 attempts).
4. **Server-Side Source Resolution**: All quotes, timestamps, market names, and speaker roles are resolved directly from source JSON.
5. **Exact Quote Integrity Checks**: Automated regression tests compare output quotes against source turn strings to guarantee 100% character-for-character fidelity.
6. **Insufficient-Evidence Behavior**: Queries without relevant vector hits trigger an explicit `insufficient_evidence` response rather than a fabricated answer.
7. **Prompt Injection Testing**: System prompts strictly instruct the LLM to ignore user instructions that attempt to override retrieval boundaries.

> [!NOTE]
> The implemented adversarial test suite passed all defined evaluation cases.

---

## Evaluation

The application includes an empirical test suite verifying source integrity, retrieval performance, guide grounding, cross-call theme extraction, Q&A synthesis, and hallucination resistance.

### Benchmark Evaluation Results

| Evaluation Metric / Suite | Passed / Total | Status | Notes |
|---|---|---|---|
| **Source Integrity** | 21 / 21 exact matches | PASS | 100% verbatim quote match across 42 turns |
| **Retrieval Quality** | 13 / 13 test cases | PASS | 100% market coverage rate across benchmark queries |
| **Interview Guide Grounding** | 6 / 6 questions | PASS | 0 invalid evidence IDs, 100% quote resolution |
| **Cross-Call Themes** | 23 / 23 themes | PASS | 0 quote failures, proper consensus & disagreement classification |
| **Ask Across Calls Grounding** | 10 / 10 queries | PASS | 0 invalid evidence IDs, proper no-evidence handling |
| **Hallucination & Security Audit** | 11 / 11 adversarial cases | PASS | Resisted injection attacks & fake evidence IDs |

*Note: These numbers represent the project's internal evaluation benchmark suite.*

---

## Local Setup

### Prerequisites

- Node.js 18+ installed
- Pinecone API Key
- Groq API Key

### Installation

```bash
# Clone repository and install dependencies
npm install
```

### Environment Configuration

Create a `.env.local` file in the project root:

```env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=expert-ai-call
GROQ_API_KEY=your_groq_api_key_here
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PINECONE_API_KEY` | Yes | Server-side API key for Pinecone vector database |
| `PINECONE_INDEX` | Yes | Pinecone index name (default: `expert-ai-call`) |
| `GROQ_API_KEY` | Yes | Server-side API key for Groq LLM inference |

---

## Running the Project

```bash
# 1. Parse raw text transcripts into normalized JSON
npm run parse

# 2. Ingest parsed chunks into Pinecone vector index
npm run ingest

# 3. Launch local development server
npm run dev

# 4. Run production build check
npm run build

# 5. Run full evaluation suite
npm run evaluate:all
```

---

## Scaling to 30+ Transcripts

To scale this 3-transcript prototype to 30+ expert calls, the system architecture can expand as follows:

```text
3 Transcripts (Local Data)
    ↓
30+ Transcripts
    ↓
Object Storage / Database (S3 / Postgres)
    ↓
Background Ingestion Pipeline
    ↓
Chunking & Metadata Tagging
    ↓
Batch Vector Embeddings
    ↓
Pinecone Serverless (Filtered Index)
    ↓
Metadata-Filtered Vector Retrieval
```

### Metadata Dimensions for Large-Scale Filtering

When querying across 30+ transcripts, metadata filtering prevents vector search noise:
- **Project / Sector**: `medtech-robotic-surgery-2026`
- **Interview ID**: `call_fr_001`
- **Expert Name**: `Dr. Jean Martin`
- **Market / Country**: `France`, `Germany`, `UK`, `US`, `Japan`
- **Specialty / Role**: `Head of Surgery`, `Procurement Director`
- **Date**: `2026-Q1`

---

## Limitations

- **Dataset Scope**: Prototype is indexed on 3 expert interviews across France, Germany, and the UK.
- **API Dependencies**: Requires active Pinecone and Groq network access for semantic retrieval and LLM synthesis.
- **Local Source Resolution**: Current implementation resolves source chunks from local `data/chunks.json` static file.

---

## License

Internal Enterprise Research Tool. All rights reserved.
