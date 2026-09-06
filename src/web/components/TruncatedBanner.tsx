import { Info } from "lucide-react";
import "./TruncatedBanner.css";

interface TruncatedBannerProps {
  nodeCount: number;
}

/**
 * Coverage-limit notice for AniList-crawled franchises that hit their
 * node/depth cap before exhausting the relation graph. Deliberately
 * distinct (amber, informational) from `CycleBanner` (red, correctness
 * problem) — this means "there may be more we didn't fetch", not
 * "the data is contradictory".
 */
export function TruncatedBanner({ nodeCount }: TruncatedBannerProps) {
  return (
    <div className="truncated-banner" role="status">
      <Info aria-hidden="true" size={18} />
      <span>
        Showing {nodeCount} entr{nodeCount === 1 ? "y" : "ies"} — this franchise may have more that
        weren&apos;t loaded.
      </span>
    </div>
  );
}
