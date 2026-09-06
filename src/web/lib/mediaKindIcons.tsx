import {
  Tv,
  Clapperboard,
  Disc3,
  MonitorPlay,
  Sparkles,
  BookOpen,
  BookMarked,
  Gamepad2,
  BookText,
  Joystick,
  type LucideIcon,
} from "lucide-react";
import type { MediaKind } from "../../engine/types.js";

/**
 * One icon per `MediaKind`, documented here as the single source of truth
 * for the mapping (used by both the graph nodes and the watch-order list).
 */
export const MEDIA_KIND_ICONS: Record<MediaKind, LucideIcon> = {
  tv: Tv,
  movie: Clapperboard,
  ova: Disc3,
  ona: MonitorPlay,
  special: Sparkles,
  novel: BookOpen,
  "light-novel": BookMarked,
  "visual-novel": Joystick,
  manga: BookText,
  game: Gamepad2,
};

export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  tv: "TV series",
  movie: "Movie",
  ova: "OVA",
  ona: "ONA",
  special: "Special",
  novel: "Novel",
  "light-novel": "Light novel",
  "visual-novel": "Visual novel",
  manga: "Manga",
  game: "Game",
};
