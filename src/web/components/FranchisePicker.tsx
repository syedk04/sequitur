import { useMemo } from "react";
import { analyzeFranchise } from "../../engine/index.js";
import { FRANCHISES } from "../lib/franchises.js";
import { FranchiseCard } from "./FranchiseCard.js";
import "./FranchisePicker.css";

interface FranchisePickerProps {
  onSelect: (franchiseId: string) => void;
}

export function FranchisePicker({ onSelect }: FranchisePickerProps) {
  const cards = useMemo(
    () =>
      FRANCHISES.map((franchise) => ({
        franchise,
        analysis: analyzeFranchise(franchise),
      })),
    [],
  );

  return (
    <section className="franchise-picker" aria-labelledby="franchise-picker-heading">
      <div className="franchise-picker__intro">
        <h1 id="franchise-picker-heading" className="franchise-picker__title">
          Pick a franchise
        </h1>
        <p className="franchise-picker__subtitle">
          Sequitur maps tangled release-order and chronological watch orders for franchises where
          the two genuinely disagree — pick one to explore its continuity graph.
        </p>
      </div>
      <div className="franchise-picker__grid">
        {cards.map(({ franchise, analysis }) => (
          <FranchiseCard
            key={franchise.id}
            franchise={franchise}
            analysis={analysis}
            onSelect={() => onSelect(franchise.id)}
          />
        ))}
      </div>
    </section>
  );
}
