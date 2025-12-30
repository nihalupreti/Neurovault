# Neurovault

A personal knowledge engine that turns your markdown notes into a searchable, queryable, interconnected second brain.

Upload notes, and Neurovault automatically chunks them, generates semantic embeddings, builds a knowledge graph from wikilinks and latent topic connections, and lets you search by meaning or have a conversation with your notes — with citations pointing back to exact sources.

## Features

- **Hybrid Search** — Combines MongoDB full-text keyword search with Qdrant vector similarity, merged via Reciprocal Rank Fusion (RRF). Finds exact terms *and* related concepts in one query. Query DSL with prefix operators: `!keyword:` for exact matches, `!semantic:` for meaning-based, `!file:` for filename, or just type naturally for hybrid.
- **RAG Q&A with Streaming** — Ask natural language questions. Relevant chunks are retrieved, fed as context to an LLM, and the answer streams back via SSE with inline citations to source files.
- **Knowledge Graph** — `[[wikilinks]]` are parsed into explicit edges. A background job discovers implicit connections by comparing chunk embeddings across files. Louvain community detection surfaces topic clusters. Full graph traversal API (neighbors, shortest path, clusters, stats).
- **Provider-Agnostic LLM** — Swap between Google Gemini, OpenAI, or any local model (Ollama, LM Studio, llama.cpp) via environment variables. All providers implement a common `AsyncIterable<string>` streaming interface.
- **Vault Sync** — Git-backed sync with incremental indexing, content-hash chunk diffing, and 3-way merge conflict resolution. WebSocket notifications for real-time updates.
- **Folder Hierarchy** — Nested folder structure with file/folder upload, tree navigation, and markdown rendering with syntax highlighting.

## Architecture

Turborepo monorepo with two apps and five shared packages.

```
neurovault/
├── apps/
│   ├── server/          Express 5 — modular monolith (port 3001)
│   └── web/             Next.js 15 — React 19 frontend (port 3000)
├── packages/
│   ├── config/          MongoDB, Qdrant, Neo4j connection singletons
│   ├── utils/           Embedding generation (Google Gemini, 3072-dim)
│   ├── ui/              Shared React components
│   ├── eslint-config/   Shared lint presets
│   └── typescript-config/
└── infra/
    └── nginx/           Reverse proxy + API gateway
```

### Server Modules

| Module | Responsibility |
|--------|---------------|
| `files/` | File upload (Multer), folder hierarchy (MongoDB), file retrieval |
| `chunker/` | Markdown-aware text splitting (LangChain MarkdownTextSplitter, 800-char chunks, 150-char overlap), embedding generation, dual write to Qdrant + MongoDB |
| `search/` | Hybrid search (text + vector + RRF fusion), query DSL parser, keyword/semantic/file search modes |
| `qa/` | RAG orchestration — retrieval, prompt assembly, LLM streaming, citation extraction |
| `graph/` | Wikilink parsing, Neo4j graph storage, similarity job, Louvain clustering, traversal API |
| `sync/` | Git-backed vault sync, 3-way merge, incremental indexing, WebSocket notifications |

### Data Flow

```
                    Upload
                      │
                      ▼
              ┌───────────────┐
              │  Multer save  │──→ MongoDB (FileMetadata)
              └───────┬───────┘
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
   ┌────────────────┐  ┌────────────────┐
   │    Chunker     │  │  Graph Hook    │
   │ Split → Embed  │  │ Parse [[links]]│
   │ → Qdrant + Mongo│  │ → Neo4j edges  │
   └────────────────┘  └────────────────┘
                                │
                      ┌─────────┴─────────┐
                      ▼                   ▼
             ┌────────────────┐  ┌────────────────┐
             │ Similarity Job │  │    Louvain     │
             │ Chunk vectors  │  │   Clustering   │
             │ → SIMILAR edges│  │  → Community   │
             └────────────────┘  └────────────────┘

                    Query
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   ┌─────────────┐       ┌───────────────┐
   │   Search    │       │     Q&A       │
   │ Text + Vec  │       │ Retrieve top-K│
   │ → RRF merge │       │ → LLM stream  │
   │ → Results   │       │ → SSE + cites │
   └─────────────┘       └───────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TanStack Query, Tailwind CSS, react-markdown |
| Backend | Express 5, TypeScript, tsup |
| Vector DB | Qdrant (3072-dim, cosine similarity) |
| Document DB | MongoDB (Mongoose) |
| Graph DB | Neo4j (+ GDS plugin for Louvain) |
| Embeddings | Google Gemini (`gemini-embedding-001`) |
| LLM | Gemini Flash/Pro or any OpenAI-compatible endpoint |
| Text Splitting | LangChain MarkdownTextSplitter (header-aware, 150-char overlap) |
| Build System | Turborepo, tsup, Turbopack |
| Infrastructure | Nginx reverse proxy, Docker Compose |

## Prerequisites

- **Node.js** >= 18
- **npm** >= 10
- **MongoDB** running locally or remotely
- **Qdrant** running on port 6333 ([quickstart](https://qdrant.tech/documentation/quick-start/))
- **Neo4j** running on port 7687 ([download](https://neo4j.com/download/))
  - Install the [GDS plugin](https://neo4j.com/docs/graph-data-science/current/installation/) for Louvain clustering
- **Google Gemini API key** ([get one](https://ai.google.dev/))

### Quick Infrastructure Setup

```bash
# Qdrant
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Neo4j with GDS
docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  -e NEO4J_PLUGINS='["graph-data-science"]' \
  neo4j:5

# MongoDB
docker run -d --name mongo -p 27017:27017 mongo:7
```

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/nihalupreti/Neurovault.git
cd neurovault
npm install
```

### 2. Configure environment

Create `apps/server/.env`:

```env
DB_URL=mongodb://localhost:27017/neurovault
PORT=3001
GEMINI_API_KEY=your_gemini_api_key

# LLM provider for Q&A (defaults to Gemini)
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Knowledge graph tuning (optional)
GRAPH_SIMILARITY_THRESHOLD=0.7
GRAPH_MAX_SIMILAR_PER_FILE=5
GRAPH_CHUNKS_NEIGHBORS=10
```

Create `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Start development

```bash
npm run dev
```

This starts both apps via Turborepo:
- **Server** at `http://localhost:3001` (tsup watch + auto-restart)
- **Web** at `http://localhost:3000` (Next.js with Turbopack)

### 4. Use it

1. Open `http://localhost:3000`
2. Upload markdown files via the **+** button
3. Wait a few seconds for chunking and embedding to complete
4. Use **Ctrl+K** to search — hybrid by default, or use `!keyword:`, `!semantic:`, `!file:` prefixes
5. Click the **chat icon** to ask questions — answers stream with citations
6. Hit `POST /api/graph/rebuild` to build the knowledge graph

## API Reference

### Search (Hybrid by Default)

```
GET /api/search?q=how does gravity work          # hybrid: text + vector + RRF
GET /api/search?q=!keyword:useState               # exact keyword match only
GET /api/search?q=!semantic:react state management # vector similarity only
GET /api/search?q=!file:newton                     # filename search
GET /api/search?q=!file:lecture !semantic:force     # file-filtered semantic
```

Bare queries run hybrid search — combines MongoDB full-text and Qdrant vector results via Reciprocal Rank Fusion. Use prefix operators to force a specific mode.

### Q&A (SSE Stream)

```
POST /api/qa/ask
Content-Type: application/json

{
  "question": "What are Newton's laws?",
  "history": [],
  "limit": 5
}
```

Streams `event: token`, `event: citations`, `event: done` via Server-Sent Events.

### Knowledge Graph

```
GET  /api/graph                        # Full graph (nodes + edges)
GET  /api/graph/file/:id/neighbors     # Direct connections
GET  /api/graph/file/:id/cluster       # Louvain community
GET  /api/graph/clusters               # All communities
GET  /api/graph/path/:from/:to         # Shortest path
GET  /api/graph/stats                  # Graph metrics
POST /api/graph/rebuild                # Trigger similarity recomputation
```

### Files

```
POST /api/file/upload/file             # Upload files (multipart)
POST /api/file/upload/folder           # Upload folder hierarchy
GET  /api/file?id=<fileId>             # Get file content
GET  /api/file/folder?parentId=<id>    # Get folder tree
```

## Using a Local LLM

Neurovault supports any OpenAI-compatible endpoint for Q&A. To use a local model:

```env
LLM_PROVIDER=openai-compatible
LLM_MODEL=llama3
LLM_API_KEY=not-needed
LLM_BASE_URL=http://localhost:11434/v1   # Ollama
```

Works with Ollama, LM Studio, llama.cpp server, vLLM, or any service exposing the OpenAI chat completions API.

## Project Structure

```
apps/server/src/
├── index.ts                    # Express app entry, route registration
└── modules/
    ├── files/
    │   ├── file-handler.ts     # Upload handlers
    │   ├── fileMetadata.model.ts
    │   ├── file-events.ts      # Post-upload dispatch
    │   ├── graph-hook.ts       # Wikilink extraction on upload
    │   └── routes.ts
    ├── chunker/
    │   ├── dispatcher.ts       # Async chunking dispatch
    │   └── semanticChunker.ts  # Split + embed + Qdrant upsert
    ├── search/
    │   ├── query-parser.ts     # DSL parser (!file:, !keyword:, !semantic:)
    │   ├── rrf.ts              # Reciprocal Rank Fusion
    │   ├── chunk-text.model.ts # MongoDB text index for keyword search
    │   ├── search-handler.ts   # Route parsed queries to strategies
    │   ├── search-service.ts   # Hybrid, keyword, semantic, file search
    │   └── search-queries.ts   # Qdrant query builders
    ├── qa/
    │   ├── qa-handler.ts       # SSE streaming endpoint
    │   ├── qa-service.ts       # Retrieve → prompt → stream
    │   ├── qa-prompts.ts       # System prompt with [Source N] tags
    │   └── providers/
    │       ├── types.ts        # LLMProvider interface
    │       ├── gemini-provider.ts
    │       ├── openai-provider.ts
    │       └── index.ts        # Factory
    ├── graph/
    │   ├── wikilink-parser.ts  # Pure [[link]] extraction
    │   ├── resolve-links.ts    # Match links to file IDs
    │   ├── graph-service.ts    # Neo4j CRUD + queries
    │   ├── similarity-job.ts   # Background edge computation
    │   ├── graph-handler.ts
    │   └── graph-routes.ts
    └── sync/
        ├── sync-service.ts     # Push/pull with conflict detection
        ├── git-storage.ts      # isomorphic-git wrapper
        ├── index-pipeline.ts   # Incremental re-indexing
        ├── chunk-differ.ts     # Content-hash diffing
        ├── reconciliation.ts   # Qdrant consistency checks
        ├── ws-manager.ts       # WebSocket manager
        └── models.ts           # Vault, FileVersion, ConflictRecord

apps/web/
├── app/
│   ├── layout.tsx
│   └── page.tsx                # Main page with header + chat toggle
├── components/
│   ├── mainBody.tsx            # 3-column layout: tree | content | TOC/chat
│   ├── searchBar.tsx           # Ctrl+K trigger
│   ├── searchModal.tsx         # Search UI with React Query
│   ├── markdownViewer.tsx      # Rendered markdown with highlighting
│   ├── folderTree.tsx          # File tree sidebar
│   └── chat/
│       ├── ChatPanel.tsx       # Chat container with message state
│       ├── ChatMessage.tsx     # Bubble with markdown + citations
│       ├── ChatInput.tsx       # Input with send/stop
│       └── CitationCard.tsx    # Clickable source reference
├── hooks/
│   └── useQAStream.ts         # SSE consumer (fetch + ReadableStream)
├── contexts/
│   └── HighlightContext.tsx    # Search result → file navigation
└── utils/
    └── http.ts                 # Axios wrapper + React Query client
```

## Scripts

```bash
npm run dev          # Start all apps (Turborepo, persistent)
npm run build        # Build all apps
npm run lint         # Lint all apps (--max-warnings 0)
npm run check-types  # Type-check all apps
npm run format       # Prettier across repo
```

Individual apps:

```bash
cd apps/server && npm run dev     # Server only (tsup watch)
cd apps/server && npm test        # Run server tests (vitest)
cd apps/web && npm run dev        # Frontend only (Turbopack)
```

## License

MIT
