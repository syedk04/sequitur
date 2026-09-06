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
  fixtures/     hand-authored franchise data (the domain-expertise layer)
    fate-nasuverse.ts  core F/SN + Zero + Heaven's Feel; the release-vs-chrono divergence case
    monogatari.ts      release order vs. "story order," extensively divergent
    gundam-uc.ts       required main sequence + optional side-stories + a contested edge
  web/          Vite + React + TypeScript UI: franchise picker, graph view, watch-order view
```

The engine has no dependency on the UI and is fully covered by its own test suite — it's designed
to be reused by a future ingestion pipeline or backend without change.

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

This is v1. Deliberately out of scope for now, but designed for: an AniList ingestion pipeline
(to seed franchises the curator doesn't already know cold), a community voting/conflict-resolution
layer for contested edges, and auth. Three franchises are hand-curated by someone who actually
knows them, specifically to validate the data model against real, messy continuity before
building any automated ingestion on top of it.
