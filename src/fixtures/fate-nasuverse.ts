import type { Franchise } from "../engine/types.js";

/**
 * Fate/Nasuverse — deliberately narrow slice.
 *
 * SCOPE: this fixture exists primarily to demonstrate genuine
 * release-vs-chronological divergence, so it is scoped tightly to the
 * "core" Fate/stay night + Fate/Zero + Heaven's Feel corner of the
 * Nasuverse, plus Fate/Grand Order *only* insofar as it has direct
 * required/recommended edges pointing in from the above (we do not model
 * any of Grand Order's own original story content/Lostbelts).
 *
 * EXPLICITLY EXCLUDED: Fate/kaleid liner Prisma Illya, Fate/EXTRA (and
 * EXTELLA), Garden of Sinners / Kara no Kyoukai, Fate/Apocrypha,
 * Fate/strange Fake, Carnival Phantasm, Fate/hollow ataraxia. These are
 * all real Nasuverse content but are out of scope for this fixture —
 * adding them is future work, not an oversight.
 *
 * CURATORIAL CALL — route/route-adaptation collapsing: Fate/stay night
 * the visual novel is modeled as a SINGLE node (`fsn-vn`) covering all
 * three routes (Fate, Unlimited Blade Works, Heaven's Feel), rather than
 * split per-route. Splitting by route is defensible and arguably more
 * "correct" for a hardcore fan, but the three routes do not have a
 * meaningful required internal *consumption* order relative to each
 * other for a newcomer (opinions differ Fate->UBW->HF vs any order), and
 * splitting would 3x the node count for a franchise that's meant to be
 * the narrow fixture here. Each route's dedicated anime adaptation (the
 * 2006 DEEN TV series for the Fate route, the 2010 DEEN movie and 2014-15
 * ufotable TV series for UBW, and the Heaven's Feel film trilogy) is
 * still modeled as its own node, since those ARE separately consumable,
 * separately released works.
 *
 * CURATORIAL CALL — the release/chronological divergence pair: "Fate/Zero"
 * is represented for cross-work edges by the 2011-2012 ufotable anime
 * (`fz-anime`), since that's what most fans mean colloquially by "Fate/
 * Zero". The Fate/Zero light novel and manga are included as separate
 * nodes (adaptation-linked to the anime on the release track only) but
 * are not independently wired into the fsn-vn divergence pair — treat
 * that as a known simplification, not a claim that the novel/manga don't
 * also chronologically precede Fate/stay night (they do; a fuller model
 * would wire them too).
 */
export const fateNasuverse: Franchise = {
  id: "fate-nasuverse",
  name: "Fate/Nasuverse (core)",
  description:
    "Core Fate/stay night, Fate/Zero, and Heaven's Feel, plus Fate/Grand Order only as a " +
    "downstream recommended-knowledge sink. Scoped narrowly — see file header for exclusions.",
  nodes: [
    {
      id: "fz-novel",
      franchiseId: "fate-nasuverse",
      title: "Fate/Zero (light novel)",
      kind: "light-novel",
      releaseDate: "2006-12-16",
      notes:
        "Gen Urobuchi's original novel. Chronologically the earliest Fate/stay night-adjacent " +
        "work: it tells the story of the 4th Holy Grail War, ~10 years before fsn's 5th war.",
    },
    {
      id: "fz-anime",
      franchiseId: "fate-nasuverse",
      title: "Fate/Zero",
      kind: "tv",
      releaseDate: "2011-10-01",
      notes:
        "ufotable's TV adaptation. Used as the representative 'Fate/Zero' node for cross-work " +
        "edges in this fixture (see file header).",
    },
    {
      id: "fz-manga",
      franchiseId: "fate-nasuverse",
      title: "Fate/Zero (manga)",
      kind: "manga",
      releaseDate: "2011-06-16",
      notes: "Shinjirou's manga adaptation, serialized alongside the TV anime's initial run.",
    },
    {
      id: "fsn-vn",
      franchiseId: "fate-nasuverse",
      title: "Fate/stay night",
      altTitles: ["Fate/stay night [Realta Nua]"],
      kind: "visual-novel",
      releaseDate: "2004-01-30",
      notes:
        "Collapses all three routes (Fate, Unlimited Blade Works, Heaven's Feel) into one node " +
        "— see file header for why. Tells the story of the 5th Holy Grail War.",
    },
    {
      id: "fsn-manga",
      franchiseId: "fate-nasuverse",
      title: "Fate/stay night (manga)",
      kind: "manga",
      releaseDate: "2006-03-19",
      notes: "Dat Nishiwaki's manga adaptation, primarily follows the Fate route.",
    },
    {
      id: "fsn-2006-anime",
      franchiseId: "fate-nasuverse",
      title: "Fate/stay night (2006)",
      kind: "tv",
      releaseDate: "2006-01-06",
      notes:
        "Studio DEEN's original TV adaptation. Primarily adapts the Fate route with an " +
        "original ending; famously divisive among fans relative to the source VN.",
    },
    {
      id: "fsn-ubw-movie-2010",
      franchiseId: "fate-nasuverse",
      title: "Fate/stay night: Unlimited Blade Works (2010 film)",
      kind: "movie",
      releaseDate: "2010-01-23",
      lengthMinutes: 120,
      notes: "Studio DEEN's compressed single-film adaptation of the UBW route.",
    },
    {
      id: "fsn-ubw-anime",
      franchiseId: "fate-nasuverse",
      title: "Fate/stay night: Unlimited Blade Works (2014-2015)",
      kind: "tv",
      releaseDate: "2014-10-04",
      notes: "ufotable's two-cour TV adaptation of the UBW route; the most widely-watched one.",
    },
    {
      id: "hf-1",
      franchiseId: "fate-nasuverse",
      title: "Fate/stay night: Heaven's Feel I. presage flower",
      kind: "movie",
      releaseDate: "2017-10-14",
      lengthMinutes: 128,
    },
    {
      id: "hf-2",
      franchiseId: "fate-nasuverse",
      title: "Fate/stay night: Heaven's Feel II. lost butterfly",
      kind: "movie",
      releaseDate: "2019-01-12",
      lengthMinutes: 117,
    },
    {
      id: "hf-3",
      franchiseId: "fate-nasuverse",
      title: "Fate/stay night: Heaven's Feel III. spring song",
      kind: "movie",
      releaseDate: "2020-01-25",
      lengthMinutes: 120,
    },
    {
      id: "fgo",
      franchiseId: "fate-nasuverse",
      title: "Fate/Grand Order",
      kind: "game",
      releaseDate: "2015-07-29",
      notes:
        "Modeled only as a sink for recommended prior-knowledge edges from Zero/stay night — " +
        "none of FGO's own Singularities/Lostbelts are modeled. Out of scope by design.",
    },
  ],
  edges: [
    // --- Same-content adaptations (release track only: chronologically
    // these are the same story beat, so there is no in-universe order
    // between a work and its own adaptation). ---
    {
      id: "e-fz-novel-to-fz-anime",
      from: "fz-novel",
      to: "fz-anime",
      relation: "adaptation",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-fz-novel-to-fz-manga",
      from: "fz-novel",
      to: "fz-manga",
      relation: "adaptation",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-fsn-vn-to-fsn-manga",
      from: "fsn-vn",
      to: "fsn-manga",
      relation: "adaptation",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-fsn-vn-to-fsn-2006-anime",
      from: "fsn-vn",
      to: "fsn-2006-anime",
      relation: "adaptation",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-fsn-vn-to-ubw-movie",
      from: "fsn-vn",
      to: "fsn-ubw-movie-2010",
      relation: "adaptation",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-fsn-vn-to-ubw-anime",
      from: "fsn-vn",
      to: "fsn-ubw-anime",
      relation: "adaptation",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-fsn-vn-to-hf-1",
      from: "fsn-vn",
      to: "hf-1",
      relation: "adaptation",
      strength: "recommended",
      tracks: ["release"],
    },

    // --- Heaven's Feel trilogy internal order: strictly required, and
    // identical on both tracks (a genuine linear direct sequel trilogy). ---
    {
      id: "e-hf1-to-hf2",
      from: "hf-1",
      to: "hf-2",
      relation: "sequel",
      strength: "required",
      tracks: ["release", "chronological"],
    },
    {
      id: "e-hf2-to-hf3",
      from: "hf-2",
      to: "hf-3",
      relation: "sequel",
      strength: "required",
      tracks: ["release", "chronological"],
    },

    // --- THE headline divergence pair: Fate/Zero vs. Fate/stay night. ---
    // Chronologically (in-universe) Zero's 4th Holy Grail War happens
    // roughly a decade before stay night's 5th war.
    {
      id: "e-fz-chrono-before-fsn",
      from: "fz-anime",
      to: "fsn-vn",
      relation: "sequel",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-fz-novel-chrono-before-fsn",
      from: "fz-novel",
      to: "fsn-vn",
      relation: "sequel",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-fz-manga-chrono-before-fsn",
      from: "fz-manga",
      to: "fsn-vn",
      relation: "sequel",
      strength: "recommended",
      tracks: ["chronological"],
    },
    // But Fate/stay night released in 2004, a full two years before the
    // Fate/Zero novel even started and seven years before the anime.
    {
      id: "e-fsn-release-before-fz",
      from: "fsn-vn",
      to: "fz-anime",
      relation: "sequel",
      strength: "recommended",
      tracks: ["release"],
    },

    // Heaven's Feel is the same in-universe event as the rest of stay
    // night (just a different route/ending), so it is chronologically
    // simultaneous with fsn-vn — no chronological edge to fz here directly,
    // but it IS chronologically after Zero via this explicit edge (a fuller
    // model would derive this transitively; we spell it out for accuracy).
    {
      id: "e-fz-chrono-before-hf1",
      from: "fz-anime",
      to: "hf-1",
      relation: "sequel",
      strength: "recommended",
      tracks: ["chronological"],
    },

    // --- Fate/Grand Order: recommended prior knowledge only, release
    // track only (FGO doesn't have a meaningful "chronological" slot of
    // its own in this narrow fixture). ---
    {
      id: "e-fz-to-fgo",
      from: "fz-anime",
      to: "fgo",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-fsn-to-fgo",
      from: "fsn-vn",
      to: "fgo",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
  ],
};
