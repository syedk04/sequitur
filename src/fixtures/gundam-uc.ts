import type { Franchise } from "../engine/types.js";

/**
 * Mobile Suit Gundam: Universal Century — "required main sequence +
 * optional side content" demonstration fixture.
 *
 * The four-entry main sequence (Mobile Suit Gundam -> Zeta Gundam -> ZZ
 * Gundam -> Char's Counterattack) is modeled as `required`, and happens
 * to be release-order-consistent with its own chronological (in-universe
 * UC-year) order — Sunrise made these in the same order the story
 * happens. The divergence in THIS fixture instead comes from the
 * interquel/side-story content: Mobile Suit Gundam: The Origin (2015-18)
 * is chronologically the EARLIEST entry (UC 0068-0079, a prequel to the
 * original series) but was released last among the "early era" content;
 * 0080/0083/08th MS Team are all chronologically slotted between Mobile
 * Suit Gundam and Zeta Gundam (UC 0079-0083) but were released years
 * after Zeta/ZZ/CCA already aired.
 *
 * CONTESTED EDGE: the `cca -> unicorn` edge carries a `contested` field —
 * whether Gundam Unicorn's ending should be read as a direct, uncontested
 * continuation of Char's Counterattack, or as a softer reinterpretation
 * that sits somewhat uneasily with Tomino's original CCA ending, is a
 * real and long-running fan/creator-intent debate.
 *
 * SCOPE: this is "UC-core" — it excludes Gundam Reconguista in G, the
 * Advance of Zeta manga, Cross Bone Gundam, and the various UC-adjacent
 * manga-only side stories (Ecole du Ciel, Missing Link, etc). Future work.
 */

const FRANCHISE_ID = "gundam-uc";

export const gundamUC: Franchise = {
  id: FRANCHISE_ID,
  name: "Mobile Suit Gundam: Universal Century",
  description:
    "The UC main sequence (required) plus interquel/side-story content (recommended) that " +
    "demonstrates release-order vs. in-universe-timeline divergence for side content.",
  nodes: [
    {
      id: "origin",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam: The Origin",
      kind: "ova",
      releaseDate: "2015-06-27",
      inUniverseNote: "UC 0068-0079",
      notes:
        "Chronologically the earliest entry modeled here (covers Char and the Zabi family's " +
        "backstory through the start of the One Year War) but released decades after the " +
        "original series it precedes.",
    },
    {
      id: "msg",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam",
      kind: "tv",
      releaseDate: "1979-04-07",
      inUniverseNote: "UC 0079",
      notes: "The original series; start of the One Year War. Required main-sequence entry 1/4.",
    },
    {
      id: "08th",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam: The 08th MS Team",
      kind: "ova",
      releaseDate: "1996-01-25",
      inUniverseNote: "UC 0079",
      notes: "Ground-war side story concurrent with the One Year War's back half.",
    },
    {
      id: "0080",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam 0080: War in the Pocket",
      kind: "ova",
      releaseDate: "1989-03-25",
      inUniverseNote: "UC 0079-0080",
      notes: "Interquel set in the immediate aftermath of the One Year War.",
    },
    {
      id: "0083",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam 0083: Stardust Memory",
      kind: "ova",
      releaseDate: "1991-05-24",
      inUniverseNote: "UC 0083",
      notes: "Interquel bridging the gap between the One Year War and the Gryps Conflict.",
    },
    {
      id: "zeta",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Zeta Gundam",
      kind: "tv",
      releaseDate: "1985-03-02",
      inUniverseNote: "UC 0087-0088",
      notes: "The Gryps Conflict / AEUG vs. Titans. Required main-sequence entry 2/4.",
    },
    {
      id: "zz",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam ZZ",
      kind: "tv",
      releaseDate: "1986-03-01",
      inUniverseNote: "UC 0088",
      notes: "Direct continuation of Zeta; the fall of the Neo Zeon remnants. Required 3/4.",
    },
    {
      id: "cca",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam: Char's Counterattack",
      kind: "movie",
      releaseDate: "1988-03-12",
      lengthMinutes: 124,
      inUniverseNote: "UC 0093",
      notes: "The Second Neo Zeon War; Char and Amuro's final confrontation. Required 4/4.",
    },
    {
      id: "unicorn",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam Unicorn",
      kind: "ova",
      releaseDate: "2010-03-12",
      inUniverseNote: "UC 0096",
      notes: "Set three years after CCA. See file header re: the contested placement edge.",
    },
    {
      id: "twilight-axis",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam: Twilight Axis",
      kind: "ova",
      releaseDate: "2017-05-26",
      inUniverseNote: "UC 0096",
      notes: "Side story concurrent with the middle of Unicorn's own runtime.",
    },
    {
      id: "narrative",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam Narrative",
      kind: "movie",
      releaseDate: "2018-10-19",
      lengthMinutes: 129,
      inUniverseNote: "UC 0097",
      notes: "Direct follow-up to Unicorn, tying up the Phenex/Sinanju Stein threads.",
    },
    {
      id: "hathaway",
      franchiseId: FRANCHISE_ID,
      title: "Mobile Suit Gundam Hathaway",
      kind: "movie",
      releaseDate: "2021-06-11",
      inUniverseNote: "UC 0105",
      notes:
        "Based on Tomino's novel continuity for Hathaway Noa. Placed here as the latest UC " +
        "entry modeled; some readers treat the novel-derived post-CCA continuity as distinct " +
        "from the animated CCA's exact ending, but that nuance is out of scope for this edge " +
        "set beyond the one contested edge already called out.",
    },
  ],
  edges: [
    // --- Required main sequence: consistent on both tracks. ---
    {
      id: "e-msg-zeta",
      from: "msg",
      to: "zeta",
      relation: "sequel",
      strength: "required",
      tracks: ["release", "chronological"],
    },
    {
      id: "e-zeta-zz",
      from: "zeta",
      to: "zz",
      relation: "sequel",
      strength: "required",
      tracks: ["release", "chronological"],
    },
    {
      id: "e-zz-cca",
      from: "zz",
      to: "cca",
      relation: "sequel",
      strength: "required",
      tracks: ["release", "chronological"],
    },

    // --- Chronological (UC timeline) placement of interquel/side content ---
    {
      id: "e-chrono-origin-msg",
      from: "origin",
      to: "msg",
      relation: "side-story",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-chrono-msg-08th",
      from: "msg",
      to: "08th",
      relation: "side-story",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-chrono-08th-0080",
      from: "08th",
      to: "0080",
      relation: "side-story",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-chrono-0080-0083",
      from: "0080",
      to: "0083",
      relation: "side-story",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-chrono-0083-zeta",
      from: "0083",
      to: "zeta",
      relation: "side-story",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-cca-unicorn",
      from: "cca",
      to: "unicorn",
      relation: "sequel",
      strength: "recommended",
      tracks: ["release", "chronological"],
      contested: {
        reason:
          "Unicorn's ending is sometimes read as reinterpreting/softening Char's " +
          "Counterattack's original ending for Amuro and Char (the Nu Gundam/Sazabi " +
          "psycoframe climax); whether it's an uncontested direct sequel or a distinct, " +
          "semi-separate continuation is a genuine, long-running fan and creator-intent debate.",
        alternativeView:
          "Treat Unicorn (and its own follow-ons, Narrative and Hathaway) as a softer " +
          "'UC continuation' continuity rather than a strict direct sequel to CCA.",
      },
    },
    {
      id: "e-unicorn-twilight-axis",
      from: "unicorn",
      to: "twilight-axis",
      relation: "side-story",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-twilight-axis-narrative",
      from: "twilight-axis",
      to: "narrative",
      relation: "sequel",
      strength: "recommended",
      tracks: ["chronological"],
    },
    {
      id: "e-narrative-hathaway",
      from: "narrative",
      to: "hathaway",
      relation: "sequel",
      strength: "recommended",
      tracks: ["chronological"],
    },

    // --- Release order (real historical release dates) for the same
    // side content, which diverges substantially from the chronological
    // placement above. ---
    {
      id: "e-release-cca-0080",
      from: "cca",
      to: "0080",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-release-0080-0083",
      from: "0080",
      to: "0083",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-release-0083-08th",
      from: "0083",
      to: "08th",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-release-08th-unicorn",
      from: "08th",
      to: "unicorn",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-release-unicorn-origin",
      from: "unicorn",
      to: "origin",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-release-origin-twilight-axis",
      from: "origin",
      to: "twilight-axis",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-release-twilight-axis-narrative",
      from: "twilight-axis",
      to: "narrative",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
    {
      id: "e-release-narrative-hathaway",
      from: "narrative",
      to: "hathaway",
      relation: "shared-universe",
      strength: "recommended",
      tracks: ["release"],
    },
  ],
};
