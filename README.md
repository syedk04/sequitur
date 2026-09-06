# Sequitur

**What order do I watch this in?** — a graph-algorithm engine for tangled media franchise continuity.

AniList/MAL relation data (sequel, side-story, adaptation) is incomplete and often wrong for
genuinely tangled franchises: Fate/Nasuverse routes and timelines, Monogatari's release order vs.
its famous "story order," Gundam's Universal Century side-stories. Sequitur models a franchise as
a directed graph of typed edges and computes a correct consumption order by hand — while
explicitly surfacing the cases a flat list can't represent: contradictions (cycles), legitimate
divergence between release order and chronological order, and edges the fandom itself disputes.

## What it actually does

- **Typed edges, not one generic "relation."** Every edge carries a requirement strength
  (`required` vs `recommended`), one or both ordering tracks it applies to (`release`,
  `chronological`), and an optional `contested` annotation with the competing view and sources.
- **Per-track topological sort** via Kahn's algorithm. Release order and chronological order are
  sorted independently, so "Fate/Zero airs after Fate/stay night but happens first" isn't a
  contradiction — it's two edges in opposite directions, each scoped to its own track.
- **Cycle detection with an actual fix path.** A real contradiction *within* one track — not
  divergence between tracks — is reported as the specific node walk and edge ids involved, not a
  vague "something's wrong somewhere."
- **Divergence detection.** Once both tracks independently produce a valid order, the engine
  diffs them and reports exactly which node pairs flip position — the tool's actual value
  proposition for something like Monogatari, where release order and story order disagree on
  most of the series.
- **Spoiler-safe filtering with a provable guarantee.** Given an explicit set of "seen" entries,
  an entry is revealed only if its *entire* transitive prerequisite closure (both required and
  recommended edges — a "recommended" side-story can still spoil what comes after it) is already
  seen. Nodes that fail this are omitted outright, not blurred or placeholder'd.
- **Search any anime on AniList and get an auto-generated graph on the fly.** A live GraphQL
  crawl of AniList's relation data (best-first, prioritizing sequel/prequel chains over side
  content so a mainline entry never gets starved out by trivia when a franchise is too large to
  crawl in full) builds a watch-order graph for anything not already hand-curated. It's clearly
  labeled "auto-generated — unverified" in the UI, because AniList's relation data has no
  chronological-order or contested-edge information — the auto-generated graph only ever
  populates the release track, on principle, rather than faking a timeline it doesn't have.
- **Hand-curated fixtures always win.** If a search matches one of the three hand-curated
  franchises below, the curated graph is served instead of an auto-generated duplicate — that's
  the whole reason those three exist in the first place.
- **Filler-episode guide.** For franchises with a hand-curated filler dataset (currently One
  Piece), the watch-order view shows which episode ranges are filler vs. plot-relevant, purely as
  a read-only viewing guide — it doesn't touch the ordering graph or the spoiler-safe seen-set.

## Project layout

```
src/
  engine/       pure TypeScript graph engine — zero UI/framework dependencies
    types.ts          data model (nodes, edges, tracks, analysis result)
    normalize.ts      validates + canonicalizes raw franchise data
    topo-sort.ts       Kahn's algorithm, per ordering track
    cycle-detect.ts    concrete cycle extraction from a stalled sort
    divergence.ts      release-vs-chronological pair comparison
    spoiler-filter.ts  seen-set -> revealable-entries, closure-based
    analyze.ts         orchestrates the above into one result
  ingestion/    live AniList GraphQL integration — network/IO, isolated from the engine
    anilist/mapper.ts  AniList relation type -> our edge model, pure and unit-tested
    anilist/crawl.ts   best-first relation-graph crawl into a self-contained Franchise
    anilist/client.ts  fetch wrapper: batching, retry, rate-limit backoff, timeout
    anilist/cache.ts   IndexedDB-backed response cache
    curated-match.ts   AniList id -> hand-curated Franchise lookup, so curated data always wins
  fixtures/     hand-authored franchise data (the domain-expertise layer)
    fate-nasuverse.ts  core F/SN + Zero + Heaven's Feel; the release-vs-chrono divergence case
    monogatari.ts      release order vs. "story order," extensively divergent
    gundam-uc.ts       required main sequence + optional side-stories + a contested edge
    filler/            hand-curated filler-episode datasets (One Piece), joined by AniList id
  web/          Vite + React + TypeScript UI: search, franchise picker, graph view, watch-order view
```

The engine has no dependency on the UI or the ingestion layer, and is fully covered by its own
test suite. `ingestion/` depends only on the engine's types, never the other way around.

## Running it

```bash
npm install
npm test          # engine test suite (Vitest)
npm run typecheck
npm run lint
npm run dev        # local UI at http://localhost:5173
npm run build      # production build to dist/
```

## Scope

Three franchises (Fate/Nasuverse, Monogatari, Gundam UC) are hand-curated by someone who actually
knows them, and every other searchable series falls back to a live, clearly-labeled
auto-generated AniList crawl. Deliberately still out of scope: a community voting/
conflict-resolution layer for contested edges, and auth — both are real future work, not
oversights. The One Piece filler dataset is likewise a hand-curated, point-in-time best effort
(there's no legitimate free API for filler-episode data), not a live-updating feed.
