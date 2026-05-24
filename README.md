# yaddev v2

Portfolio revamp. Astro 5 + TypeScript + vanilla CSS.

The site is built as a literal bundler — each scroll stage is a build phase, the final output is the contact info.

## Stages

1. `entry_point` — terminal hero (this is what's built so far)
2. `resolve_dependencies` — file tree of skills & projects
3. `dependency_graph` — force-directed graph (React island)
4. `tree_shaking` — bundle-size ticker + 91% reduction reveal
5. `code_splitting` — treemap of project chunks (React island)
6. `minification` — bio collapses to one line
7. `output` — `dist/` listing with hashed filenames
8. `contact` — `contact.js` destructured

## Run

Requires **Node 22 LTS** (see `.nvmrc`) and **pnpm 10+** (pinned via `packageManager`).

The scripts mirror the build pipeline — same vocabulary as the scroll stages.

```sh
cd v2
./scripts/setup.sh       # or: pnpm prime  (once node is sorted)
pnpm watch               # dev server
```

### Pipeline commands

| Command | What it does |
| --- | --- |
| `pnpm prime` | Bootstrap: switches Node via fnm/nvm, enables corepack, installs deps |
| `pnpm watch` | Astro dev server with HMR (http://localhost:4321) |
| `pnpm bundle` | Production build to `dist/` |
| `pnpm serve` | Serve the built bundle locally |
| `pnpm analyze` | Typecheck & Astro diagnostics |

## Palette

Twilight Compiler — see `src/styles/tokens.css`.

## Budget

Total interactive JS target: under 60 kB gzipped across the whole site. The portfolio about bundling must itself ship tiny.
