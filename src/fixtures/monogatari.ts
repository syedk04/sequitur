import type {
  ConsumptionEdge,
  EdgeRelation,
  Franchise,
  RequirementStrength,
} from "../engine/types.js";

/**
 * Monogatari Series (core "Koyomi era") — the primary "release order and
 * chronological order disagree EXTENSIVELY" demonstration fixture.
 *
 * This is Monogatari's whole claim to fame among watch-order discourse:
 * Kizumonogatari, the chronologically FIRST story in the series, was
 * released essentially LAST (2016-2017 movie trilogy), seven years after
 * Bakemonogatari (2009) kicked the franchise off. Hanamonogatari is
 * another strong divergence case in the opposite direction: it released
 * relatively early (Aug 2014) but is chronologically one of the LATEST
 * entries, right before the series' true epilogue.
 *
 * CURATORIAL CALL — linearization: the real Monogatari story graph
 * branches per-heroine (Kabukimonogatari/Otorimonogatari/Onimonogatari/
 * Koimonogatari, the "Second Season" heroine arcs, don't have a single
 * agreed-upon strict in-universe order relative to each other so much as
 * they're "around the same time"). For this fixture we linearize both
 * tracks into a single chain — a deliberate simplification of a genuinely
 * branchier structure, done so the fixture demonstrates the release-vs-
 * chronological divergence clearly rather than trying to be the
 * definitive, exhaustive Monogatari continuity graph. The linear
 * chronological order used here follows the commonly cited fan "story
 * order" watch guides.
 *
 * CURATORIAL CALL — Hanamonogatari's chronological placement is genuinely
 * contested among fans (some placement guides put it earlier, closer to
 * Tsukimonogatari, rather than at the very end) — that disagreement is
 * captured via a `contested` field on the relevant edge rather than
 * silently picked.
 *
 * SCOPE: covers Kizumonogatari through Zoku Owarimonogatari (the "Koyomi
 * era" of the franchise). Explicitly excludes the later Monogatari Series:
 * Off & Monster Season (Ougimonogatari, Sodachimonogatari, etc.) and all
 * spin-off material outside the Koyomi/Hitagi/Suruga/Nadeko/Tsubasa/
 * Shinobu core cast — that's real future-work scope, not an oversight.
 */

const FRANCHISE_ID = "monogatari";

function chainEdges(
  idPrefix: string,
  track: "release" | "chronological",
  steps: Array<{ from: string; to: string; relation: EdgeRelation; strength: RequirementStrength }>,
): ConsumptionEdge[] {
  return steps.map((step, index) => ({
    id: `${idPrefix}-${index}-${step.from}-${step.to}`,
    from: step.from,
    to: step.to,
    relation: step.relation,
    strength: step.strength,
    tracks: [track],
  }));
}

export const monogatari: Franchise = {
  id: FRANCHISE_ID,
  name: "Monogatari Series (Koyomi era)",
  description:
    "Bakemonogatari through Zoku Owarimonogatari. Primary fixture for demonstrating extensive, " +
    "not-just-one-pair release-vs-chronological divergence.",
  nodes: [
    {
      id: "kizu",
      franchiseId: FRANCHISE_ID,
      title: "Kizumonogatari",
      altTitles: ["Kizumonogatari: Tekketsu-hen / Nekketsu-hen / Reiketsu-hen"],
      kind: "movie",
      releaseDate: "2016-08-19",
      lengthMinutes: 260,
      notes:
        "Movie trilogy collapsed into one node. Chronologically the FIRST story in the series " +
        "(Koyomi's spring-break vampire arc), but released dead last relative to everything " +
        "else in this fixture except the true epilogue — the headline divergence case.",
    },
    {
      id: "bake",
      franchiseId: FRANCHISE_ID,
      title: "Bakemonogatari",
      kind: "tv",
      releaseDate: "2009-07-03",
      notes: "Where the anime franchise actually began. Chronologically follows Kizumonogatari.",
    },
    {
      id: "neko-kuro",
      franchiseId: FRANCHISE_ID,
      title: "Nekomonogatari: Kuro",
      kind: "ova",
      releaseDate: "2012-12-31",
      notes: "Tsubasa Family arc; chronologically set during Bakemonogatari's Golden Week.",
    },
    {
      id: "nise",
      franchiseId: FRANCHISE_ID,
      title: "Nisemonogatari",
      kind: "tv",
      releaseDate: "2012-01-08",
      notes:
        "Karen Bee / Tsukihi Phoenix. Released BEFORE Nekomonogatari: Kuro despite Kuro " +
        "being chronologically earlier — an internal divergence pair within this fixture.",
    },
    {
      id: "neko-shiro",
      franchiseId: FRANCHISE_ID,
      title: "Nekomonogatari: Shiro",
      kind: "tv",
      releaseDate: "2013-07-06",
      notes: "Tsubasa Cat arc; opens the Monogatari Series Second Season broadcast.",
    },
    {
      id: "kabuki",
      franchiseId: FRANCHISE_ID,
      title: "Kabukimonogatari",
      kind: "tv",
      releaseDate: "2013-08-03",
      notes: "Mayoi Jiangshi.",
    },
    {
      id: "otori",
      franchiseId: FRANCHISE_ID,
      title: "Otorimonogatari",
      kind: "tv",
      releaseDate: "2013-08-31",
      notes: "Nadeko Medusa.",
    },
    {
      id: "oni",
      franchiseId: FRANCHISE_ID,
      title: "Onimonogatari",
      kind: "tv",
      releaseDate: "2013-09-28",
      notes: "Shinobu Time.",
    },
    {
      id: "koi",
      franchiseId: FRANCHISE_ID,
      title: "Koimonogatari",
      kind: "tv",
      releaseDate: "2013-10-26",
      notes: "Hitagi End; closes out Second Season.",
    },
    {
      id: "hana",
      franchiseId: FRANCHISE_ID,
      title: "Hanamonogatari",
      kind: "tv",
      releaseDate: "2014-08-01",
      notes:
        "Suruga Devil. Released relatively early (Aug 2014) but is chronologically one of the " +
        "LATEST entries in the series (Suruga's third-year winter) — the second headline " +
        "divergence case, in the opposite direction from Kizumonogatari's.",
    },
    {
      id: "tsuki",
      franchiseId: FRANCHISE_ID,
      title: "Tsukimonogatari",
      kind: "movie",
      releaseDate: "2014-12-27",
      lengthMinutes: 54,
      notes: "Yotsugi Doll; Shinobu-focused New Year's story.",
    },
    {
      id: "owari-1-2",
      franchiseId: FRANCHISE_ID,
      title: "Owarimonogatari (Part 1 & 2)",
      kind: "tv",
      releaseDate: "2015-10-03",
      notes:
        "Ougi Formula, Sodachi Riddle, Sodachi Lost, Shinobu Mail. TV parts 1 and 2 collapsed " +
        "into a single node for this fixture.",
    },
    {
      id: "koyomi-monogatari",
      franchiseId: FRANCHISE_ID,
      title: "Koyomimonogatari",
      kind: "ona",
      releaseDate: "2016-08-24",
      notes:
        "12 short side-stories scattered across Koyomi's timeline, bundled with the Kizu " +
        "movies' home video releases. Placed here as a bridge before Owarimonogatari's final " +
        "arc per common fan viewing guides.",
    },
    {
      id: "owari-3",
      franchiseId: FRANCHISE_ID,
      title: "Owarimonogatari (Part 3 / Naoetsu High arc)",
      kind: "tv",
      releaseDate: "2017-08-12",
      notes: "The Araragi Koyomi arc closing out the main Owarimonogatari story.",
    },
    {
      id: "zoku-owari",
      franchiseId: FRANCHISE_ID,
      title: "Zoku Owarimonogatari",
      kind: "movie",
      releaseDate: "2018-01-13",
      lengthMinutes: 65,
      notes: "Hitagi Rendezvous. Chronologically the series' true epilogue — Koyomi as an adult.",
    },
  ],
  edges: [
    // --- Chronological ("story order") chain ---
    ...chainEdges("chrono", "chronological", [
      { from: "kizu", to: "bake", relation: "sequel", strength: "required" },
      { from: "bake", to: "neko-kuro", relation: "side-story", strength: "recommended" },
      { from: "neko-kuro", to: "nise", relation: "sequel", strength: "required" },
      { from: "nise", to: "neko-shiro", relation: "side-story", strength: "recommended" },
      { from: "neko-shiro", to: "kabuki", relation: "side-story", strength: "recommended" },
      { from: "kabuki", to: "otori", relation: "side-story", strength: "recommended" },
      { from: "otori", to: "oni", relation: "side-story", strength: "recommended" },
      { from: "oni", to: "koi", relation: "side-story", strength: "recommended" },
      { from: "koi", to: "tsuki", relation: "side-story", strength: "recommended" },
      { from: "tsuki", to: "owari-1-2", relation: "sequel", strength: "required" },
      {
        from: "owari-1-2",
        to: "koyomi-monogatari",
        relation: "side-story",
        strength: "recommended",
      },
      { from: "koyomi-monogatari", to: "owari-3", relation: "sequel", strength: "required" },
      { from: "owari-3", to: "hana", relation: "side-story", strength: "recommended" },
      { from: "hana", to: "zoku-owari", relation: "sequel", strength: "required" },
    ]),

    // --- Release order chain (actual historical broadcast/publication order) ---
    ...chainEdges("release", "release", [
      { from: "bake", to: "nise", relation: "sequel", strength: "required" },
      { from: "nise", to: "neko-kuro", relation: "side-story", strength: "recommended" },
      { from: "neko-kuro", to: "neko-shiro", relation: "side-story", strength: "recommended" },
      { from: "neko-shiro", to: "kabuki", relation: "side-story", strength: "recommended" },
      { from: "kabuki", to: "otori", relation: "side-story", strength: "recommended" },
      { from: "otori", to: "oni", relation: "side-story", strength: "recommended" },
      { from: "oni", to: "koi", relation: "side-story", strength: "recommended" },
      { from: "koi", to: "hana", relation: "side-story", strength: "recommended" },
      { from: "hana", to: "tsuki", relation: "side-story", strength: "recommended" },
      { from: "tsuki", to: "owari-1-2", relation: "sequel", strength: "required" },
      { from: "owari-1-2", to: "kizu", relation: "shared-universe", strength: "recommended" },
      {
        from: "kizu",
        to: "koyomi-monogatari",
        relation: "shared-universe",
        strength: "recommended",
      },
      { from: "koyomi-monogatari", to: "owari-3", relation: "sequel", strength: "required" },
      { from: "owari-3", to: "zoku-owari", relation: "sequel", strength: "required" },
    ]),
  ].map((edge) => {
    // Attach the one contested edge: Hanamonogatari's chronological
    // placement right before the epilogue is a real fan disagreement.
    if (edge.from === "owari-3" && edge.to === "hana") {
      return {
        ...edge,
        contested: {
          reason:
            "Some fan chronological guides place Hanamonogatari earlier, closer to " +
            "Tsukimonogatari/Koimonogatari, rather than immediately before Owarimonogatari's " +
            "epilogue — Suruga's exact age/grade references are read differently by different " +
            "guides.",
          alternativeView:
            "Hanamonogatari between Koimonogatari and Tsukimonogatari, i.e. chronologically " +
            "much earlier than placed in this fixture.",
        },
      };
    }
    return edge;
  }),
};
