# Neurovault

A personal knowledge engine that turns your markdown notes into a searchable, queryable, interconnected second brain.

Upload your notes and Neurovault automatically splits them into chunks, generates semantic embeddings, builds a knowledge graph from wikilinks and latent topic connections, and lets you search by meaning or have a conversation with your notes — with citations pointing back to exact sources.

## What It Does

**Search by meaning, not just keywords.** Type a question like "how does photosynthesis work" and Neurovault finds relevant chunks across all your notes — even if they never mention the word "photosynthesis." Hybrid search combines full-text keyword matching with vector similarity, merged via Reciprocal Rank Fusion.

**Talk to your notes.** Ask natural language questions and get streaming answers grounded in your actual content. Every response comes with inline citations so you can trace claims back to source material. Works with Google Gemini, OpenAI, or any local model (Ollama, LM Studio, llama.cpp).

**See how your ideas connect.** Neurovault parses `[[wikilinks]]` and discovers hidden connections by comparing chunk embeddings across files. A background job runs Louvain community detection to surface topic clusters. Explore your knowledge graph visually — neighbors, shortest paths, communities.

**Read and annotate books.** Import HTML/EPUB books and read them chapter-by-chapter with highlights, notes, and vault links. Ask questions scoped to a chapter, book, or your entire vault. Export reading notes to Obsidian markdown.

**Capture from anywhere.** Save URLs (auto-extracted as articles or bookmarks) and text snippets from the web app, a Chrome extension, or by forwarding emails. Everything lands in your vault and gets indexed automatically.

**Sync with Obsidian.** Git-backed vault sync with incremental indexing, content-hash diffing, and 3-way merge conflict resolution. Edit in Obsidian, search and chat in Neurovault.

## Tech Stack

- **Frontend** — Next.js 15, React 19, TanStack Query, Server Components
- **Backend** — Express 5 modular monolith, TypeScript, Zod validation
- **Vector Search** — Qdrant (3072-dim cosine similarity)
- **Document Store** — MongoDB with Mongoose
- **Knowledge Graph** — Neo4j with Graph Data Science plugin
- **Embeddings** — Google Gemini (`gemini-embedding-001`)
- **LLM** — Gemini, OpenAI, or any OpenAI-compatible local model
- **Text Splitting** — LangChain (markdown-aware, header-preserving)
- **Monorepo** — Turborepo with npm workspaces
- **Code Quality** — ESLint 9 (flat config), Prettier, Husky + lint-staged, strict TypeScript

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [MongoDB](https://www.mongodb.com/) — document store
- [Qdrant](https://qdrant.tech/) — vector database
- [Neo4j](https://neo4j.com/) — graph database (with [GDS plugin](https://neo4j.com/docs/graph-data-science/current/installation/))
- [Google Gemini API key](https://ai.google.dev/) — for embeddings

### Start infrastructure with Docker

```bash
docker run -d --name mongo -p 27017:27017 mongo:7

docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant

docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password \
  -e NEO4J_PLUGINS='["graph-data-science"]' \
  neo4j:5
```

## Setup

```bash
git clone https://github.com/nihalupreti/Neurovault.git
cd Neurovault
npm install
```

Create `apps/server/.env`:

```env
DB_URL=mongodb://localhost:27017/neurovault
PORT=3001
ADMIN_SECRET=pick_a_secret

GEMINI_API_KEY=your_gemini_api_key
UPLOAD_DIR=uploads

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password

# LLM for Q&A (defaults to Gemini)
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash
```

Create `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Start everything:

```bash
npm run dev
```

Server runs on `http://localhost:3001`, web app on `http://localhost:3000`.

## Usage

1. Open `http://localhost:3000`
2. Upload markdown files using the **+** button — they get chunked, embedded, and indexed automatically
3. **Search** with `Ctrl+K` — type naturally for hybrid search, or use prefixes:
   - `!keyword:useState` — exact text match
   - `!semantic:state management in react` — meaning-based similarity
   - `!file:lecture` — search by filename
4. **Ask questions** via the chat panel — answers stream in real-time with citations to your source files
5. **Explore the graph** in the right rail — see how your notes connect through wikilinks and discovered topics
6. **Import a book** and read it with annotations, highlights, and scoped Q&A

### Using a local LLM

Neurovault works with any OpenAI-compatible endpoint. To use Ollama or similar:

```env
LLM_PROVIDER=openai-compatible
LLM_MODEL=llama3
LLM_API_KEY=not-needed
LLM_BASE_URL=http://localhost:11434/v1
```

## Project Structure

```
neurovault/
├── apps/
│   ├── server/             Express API — 10 modules (files, search, qa, graph, sync, ...)
│   ├── web/                Next.js 15 frontend
│   ├── companion/          Background sync service
│   ├── browser-extension/  Chrome/Firefox capture extension
│   ├── email-worker/       Cloudflare Worker for email capture
│   └── obsidian-plugin/    Obsidian vault sync plugin
├── packages/
│   ├── shared/             Types and Zod schemas (single source of truth)
│   ├── config/             Database connection singletons
│   ├── utils/              Embedding utilities
│   ├── ui/                 Shared React components
│   ├── eslint-config/      Shared lint presets
│   └── typescript-config/  Shared TS configs
└── infra/
    └── nginx/              Reverse proxy config
```

## Scripts

```bash
npm run dev           # Start all apps
npm run build         # Build all apps
npm run lint          # Lint all apps (zero warnings)
npm run check-types   # Type-check all apps
npm run test          # Run tests
npm run format        # Format with Prettier
```
