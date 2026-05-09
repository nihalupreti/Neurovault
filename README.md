# Neurovault

A personal knowledge engine that turns your markdown notes into a searchable, queryable, interconnected second brain.

Upload your notes and Neurovault automatically splits them into chunks, generates semantic embeddings, builds a knowledge graph from wikilinks and latent topic connections, and lets you search by meaning or have a conversation with your notes — with citations pointing back to exact sources.

## Features

### Hybrid Search

Combines full-text keyword matching with semantic vector similarity, fused via Reciprocal Rank Fusion. Type a question like "how does photosynthesis work" and Neurovault finds relevant chunks even if the word never appears in your notes. Use search prefixes for precision: `!keyword:`, `!semantic:`, `!file:`.

### Conversational Q&A

Ask natural language questions and get streaming answers grounded in your actual content. Every response includes inline citations pointing back to exact source chunks. Works with Google Gemini, OpenAI, or any OpenAI-compatible local model (Ollama, LM Studio, llama.cpp). Conversations are persisted and titled automatically.

### Selective Context

Choose which files or sections to include before asking a question — useful when your vault is large and you want answers scoped to a specific topic or project.

### Knowledge Graph

Parses `[[wikilinks]]` and discovers hidden connections by comparing chunk embeddings across files. A background job runs Louvain community detection to surface topic clusters. Explore neighbors, shortest paths, and communities from the right rail.

### Book Reader

Import HTML or EPUB books and read chapter-by-chapter with highlights, notes, and vault cross-links. Ask questions scoped to a chapter, a book, or your entire vault. Export reading notes to Obsidian markdown.

### Web Capture

Save URLs (auto-extracted as readable articles or bookmarks) and selected text from the web app or the Chrome/Firefox extension. Forward emails to capture content directly from your inbox. Everything lands in your vault and gets indexed automatically.

### Obsidian Sync

Git-backed vault sync with incremental indexing, content-hash diffing, and 3-way merge conflict resolution. Edit in Obsidian, search and chat in Neurovault — changes propagate both ways.

## Tech Stack

- **Frontend** — Next.js 15, React 19, TanStack Query, Server Components
- **Backend** — Express 5 modular monolith, TypeScript, Zod validation
- **Vector Search** — Qdrant with Jina late chunking embeddings (1024-dim)
- **Document Store** — MongoDB with Mongoose
- **Knowledge Graph** — Neo4j with Graph Data Science plugin
- **Embeddings** — Jina AI (`jina-embeddings-v3`) with task-specific encoding
- **LLM** — Gemini, OpenAI, or any OpenAI-compatible local model
- **Monorepo** — Turborepo with npm workspaces
- **Code Quality** — ESLint 9 (flat config), Prettier, Husky + lint-staged, strict TypeScript

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [MongoDB](https://www.mongodb.com/) — document store
- [Qdrant](https://qdrant.tech/) — vector database
- [Neo4j](https://neo4j.com/) — graph database (with [GDS plugin](https://neo4j.com/docs/graph-data-science/current/installation/))
- [Jina AI API key](https://jina.ai/) — for embeddings

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

JINA_API_KEY=your_jina_api_key
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

## Browser Extension

The Chrome/Firefox extension lets you capture web content without leaving the browser.

**Install:** Load `apps/browser-extension/dist` as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked), or use the Firefox equivalent.

**Setup:** Click the extension icon → open options → enter your Neurovault server URL and admin secret.

**Usage:**

- Click the toolbar icon to save the current page URL
- Right-click any page → **Save page to Neurovault** to capture the full article
- Select text on any page → right-click → **Save selection to Neurovault** to capture a snippet
- A badge on the icon shows capture status: capturing, success, or error

Everything captured lands in your vault and gets indexed automatically.

## Obsidian Plugin

The Obsidian plugin keeps your vault in sync with Neurovault in real time.

**Install:** Copy `apps/obsidian-plugin` into your vault's `.obsidian/plugins/` directory and enable it in Obsidian settings.

**Setup:** Go to Settings → Neurovault → enter your server URL and vault ID.

**What it does:**

- Watches for file changes and pushes them to Neurovault automatically
- Pulls remote changes when notified via WebSocket (falls back to polling)
- Queues offline changes and drains them on reconnect
- Shows a status bar item: `✓ synced`, `↑ syncing`, `↓ pulling`, `⚡ conflict`
- Opens a conflict resolution modal when a 3-way merge fails — choose local, remote, or manual resolution

**Commands** (accessible via `Ctrl+P`):

- `Neurovault: Force sync now` — manually push and pull immediately
- `Neurovault: View sync status` — show file count, pending embeddings, and unresolved conflicts
- `Neurovault: View conflicts` — list any unresolved merge conflicts

## Scripts

```bash
npm run dev           # Start all apps
npm run build         # Build all apps
npm run lint          # Lint all apps (zero warnings)
npm run check-types   # Type-check all apps
npm run test          # Run tests
npm run format        # Format with Prettier
```
