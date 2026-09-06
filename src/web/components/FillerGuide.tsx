import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import type { EntryFillerInfo, FillerRangeEntry } from "../../fixtures/filler/index.js";
import "./FillerGuide.css";

interface FillerGuideProps {
  info: EntryFillerInfo;
}

function formatRange(start: number, end: number): string {
  return start === end ? `${start}` : `${start}-${end}`;
}

/** Complement of the filler ranges within [1, totalEpisodes] — i.e. the canon episodes. */
function computeCanonRanges(totalEpisodes: number, fillerRanges: FillerRangeEntry[]): [number, number][] {
  const sorted = [...fillerRanges].sort((a, b) => a.start - b.start);
  const canon: [number, number][] = [];
  let cursor = 1;

  for (const range of sorted) {
    if (range.start > cursor) {
      canon.push([cursor, range.start - 1]);
    }
    cursor = Math.max(cursor, range.end + 1);
  }
  if (cursor <= totalEpisodes) {
    canon.push([cursor, totalEpisodes]);
  }
  return canon;
}

/**
 * Purely additive, informational "which episodes are filler" guide for a
 * watch-order entry. Does not interact with the spoiler-safe seen-set logic
 * in any way — no URL state, no mutation of `urlState.seen`. Just a local
 * expand/collapse toggle.
 */
export function FillerGuide({ info }: FillerGuideProps) {
  const [expanded, setExpanded] = useState(false);

  const canonRanges = computeCanonRanges(info.totalEpisodes, info.fillerRanges);
  const canonSummary = canonRanges.map(([s, e]) => formatRange(s, e)).join(", ");
  const fillerSummary = [...info.fillerRanges]
    .sort((a, b) => a.start - b.start)
    .map((r) => formatRange(r.start, r.end))
    .join(", ");

  return (
    <div className="filler-guide">
      <button
        type="button"
        className="filler-guide__toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown aria-hidden="true" size={14} /> : <ChevronRight aria-hidden="true" size={14} />}
        Watch {canonSummary || "—"} · Skip {fillerSummary || "none"} (filler)
      </button>

      {expanded && (
        <div className="filler-guide__details">
          <ul className="filler-guide__list">
            {[...info.fillerRanges]
              .sort((a, b) => a.start - b.start)
              .map((range, index) => (
                <li key={index}>
                  <span className="mono">{formatRange(range.start, range.end)}</span>
                  {range.note && <span className="filler-guide__note">{range.note}</span>}
                </li>
              ))}
          </ul>
          <p className="filler-guide__citation">
            <Info aria-hidden="true" size={12} />
            Data current as of {info.asOfDate} (through episode {info.totalEpisodes}).{" "}
            {info.source ? `Source: ${info.source}.` : ""} This is a point-in-time best-effort curation, not a
            live-updating feed.
          </p>
        </div>
      )}
    </div>
  );
}
