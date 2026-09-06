import { postGraphQL } from "./client.js";
import type { AniListRelatedMediaNode, AniListSearchMediaPageResponse } from "./types.js";

/**
 * A single title-search result, light enough to render a disambiguation
 * list without needing the full `relations` payload `client.ts` fetches
 * for crawl targets.
 */
export interface AniListSearchResult {
  id: number;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  year: number | null;
  format: string | null;
  coverImageUrl: string | null;
}

const SEARCH_QUERY = `
  query SearchAnime($query: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(search: $query, type: ANIME) {
        id
        type
        format
        title { romaji english native }
        startDate { year month day }
        episodes
        coverImage { large medium }
      }
    }
  }
`;

interface SearchMediaWithCover extends AniListRelatedMediaNode {
  coverImage?: { large: string | null; medium: string | null } | null;
}

const DEFAULT_PER_PAGE = 10;

/**
 * Searches AniList by title, returning a disambiguation list. Does not
 * fetch relations — that only happens once a specific media id is chosen
 * as a crawl root (see `crawl.ts`).
 */
export async function searchAnime(
  query: string,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<AniListSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed === "") return [];

  const data = await postGraphQL<AniListSearchMediaPageResponse>(SEARCH_QUERY, {
    query: trimmed,
    page: 1,
    perPage,
  });

  return data.Page.media.map((m) => {
    const media = m as SearchMediaWithCover;
    return {
      id: media.id,
      titleRomaji: media.title.romaji,
      titleEnglish: media.title.english,
      titleNative: media.title.native,
      year: media.startDate?.year ?? null,
      format: media.format,
      coverImageUrl: media.coverImage?.large ?? media.coverImage?.medium ?? null,
    };
  });
}
