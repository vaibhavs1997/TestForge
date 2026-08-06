# Graphify (Cursor token savings)

Graphify builds a **knowledge graph** of this repo’s source code so Cursor agents can query structure and relationships via MCP instead of re-reading large parts of the tree every session.

## Prerequisites

- Python 3 on PATH as `python`
- Install once:

```powershell
python -m pip install "graphifyy[mcp]"
```

## Graph location

- Merged graph: `graphify-out/graph.json` (gitignored; build locally)
- MCP config: `.cursor/mcp.json` points Graphify at that file using `${workspaceFolder}`

After changing MCP config, restart Cursor or reload MCP servers (Settings → MCP).

## Build or refresh the graph

From the repo root. Uses **local AST only** (`--code-only`) so no LLM API key is required.

```powershell
python -m graphify extract backend/src --code-only --no-cluster --out .
python -m graphify extract frontend/src --code-only --no-cluster --out frontend/src
python -m graphify merge-graphs graphify-out/graph.json frontend/src/graphify-out/graph.json --out graphify-out/merged-graph.json
Move-Item -Force graphify-out/merged-graph.json graphify-out/graph.json
Remove-Item -Recurse -Force frontend/src/graphify-out
```

After large refactors, add `--force` to `extract` (see `python -m graphify --help`).

Optional **semantic** edges (uses an LLM API key): omit `--code-only` on `extract` and configure `GEMINI_API_KEY`, `OPENAI_API_KEY`, or another backend Graphify supports.

## Verify MCP

1. `graphify-out/graph.json` exists and is non-empty.
2. Smoke test (stdio server; stop with Ctrl+C):

```powershell
python -m graphify.serve graphify-out/graph.json
```

3. In Cursor: Settings → MCP → **graphify** connected; tools such as `query_graph`, `get_node`, `get_neighbors`, `shortest_path` are listed.

## Using with agents

- Prefer Graphify tools for architecture questions (“what calls X?”, “path from API to execution?”).
- Open specific files only after the graph points you to them.
- Rebuild the graph when structure changes significantly; stale graphs mislead more than they help.

## Global vs project MCP

This repo uses **project-level** `.cursor/mcp.json`. Remove duplicate `graphify` entries from `~/.cursor/mcp.json` so they do not conflict or start without a `graph.json` path.

## Optional: Cursor rule

Graphify can install a Cursor rule that nudges agents to use the graph:

```powershell
python -m graphify cursor install
```

Run from repo root if you want that behavior (creates `.cursor/rules/graphify.mdc`).
