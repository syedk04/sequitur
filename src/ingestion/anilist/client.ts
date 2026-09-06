import type { AniListGraphQLResponse, AniListMedia, AniListMediaPageResponse } from "./types.js";

/**
 * Thin fetch wrapper around AniList's public GraphQL endpoint.
 *
 * Verified live against https://graphql.anilist.co (2026-09-06): the
 * `Page(page, perPage) { media(id_in: $ids) { ... } }` query shape, the
 * `X-RateLimit-*` headers (observed limit: 30 req/min), and the error
 * envelope (GraphQL validation errors come back as a non-2xx status — HTTP
 * 400 observed — with the same `{data, errors}` JSON body shape as success,
 * not exclusively on HTTP 200) all match what's implemented below.
 */

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

/** Max media ids AniList's `id_in` filter is batched into per page request. */
const MAX_IDS_PER_PAGE = 25;

/** Minimum delay between successive outgoing AniList requests. */
const REQUEST_SPACING_MS = 500;

/** Fixed backoff before the single retry on a non-429 5xx response. */
const SERVER_ERROR_BACKOFF_MS = 1000;

/**
 * Hard timeout per HTTP request. Without this, a hung network or an
 * unresponsive endpoint leaves `fetch()` pending forever, which propagates
 * all the way up to the UI's "loading" state never resolving to either
 * success or a retryable error — there would be no way out short of
 * navigating away, since only the state *update* gets cancelled on
 * navigation, not the underlying in-flight request.
 */
const REQUEST_TIMEOUT_MS = 15000;

const MEDIA_FIELDS = `
  id
  type
  format
  title { romaji english native }
  startDate { year month day }
  episodes
  coverImage { large medium }
  relations {
    edges {
      relationType
      node {
        id
        type
        format
        title { romaji english native }
        startDate { year month day }
        episodes
      }
    }
  }
`;

const MEDIA_PAGE_QUERY = `
  query MediaByIds($ids: [Int], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(id_in: $ids) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * A simple promise-chained single-flight queue: at most one AniList
 * request is ever in flight at a time, with a small fixed delay inserted
 * between requests so we're a good citizen of the public rate limit. This
 * doesn't need to be sophisticated — just enough to serialize concurrent
 * callers.
 */
class RequestQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      // The spacing delay must happen whether `task` succeeds or fails —
      // otherwise a run of failing requests (e.g. a user mashing "Retry"
      // during an outage) skips the spacing entirely and can burst well
      // past AniList's ~30 req/min limit.
      try {
        return await task();
      } finally {
        await sleep(REQUEST_SPACING_MS);
      }
    });
    // Swallow rejections on the internal chain so one failed task doesn't
    // permanently wedge the queue for subsequent, unrelated callers.
    this.tail = result.catch(() => undefined);
    return result;
  }
}

const queue = new RequestQueue();

export class AniListRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AniListRequestError";
  }
}

async function postGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  return queue.run(() => postGraphQLOnce<T>(query, variables, /* isRetry */ false));
}

async function postGraphQLOnce<T>(
  query: string,
  variables: Record<string, unknown>,
  isRetry: boolean,
): Promise<T> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: timeoutController.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AniListRequestError(
        `AniList request timed out after ${REQUEST_TIMEOUT_MS}ms.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    if (isRetry) {
      throw new AniListRequestError(
        "AniList request rate-limited (HTTP 429) again after one retry; giving up.",
        429,
      );
    }
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : 1;
    await sleep((Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 1) * 1000);
    return postGraphQLOnce<T>(query, variables, true);
  }

  if (response.status >= 500) {
    if (isRetry) {
      throw new AniListRequestError(
        `AniList request failed with HTTP ${response.status} again after one retry; giving up.`,
        response.status,
      );
    }
    await sleep(SERVER_ERROR_BACKOFF_MS);
    return postGraphQLOnce<T>(query, variables, true);
  }

  // AniList returns GraphQL validation errors (e.g. an unknown field) as a
  // non-2xx status (verified live: HTTP 400) with a JSON body of the same
  // {data, errors} shape as a successful response — not just on HTTP 200.
  // Parse the body regardless of status so the thrown error carries AniList's
  // actual message instead of a bare status code.
  let body: AniListGraphQLResponse<T> | undefined;
  try {
    body = (await response.json()) as AniListGraphQLResponse<T>;
  } catch {
    body = undefined;
  }

  if (body?.errors && body.errors.length > 0) {
    throw new AniListRequestError(
      `AniList GraphQL error(s): ${body.errors.map((e) => e.message).join("; ")}`,
      response.status,
    );
  }
  if (!response.ok) {
    throw new AniListRequestError(
      `AniList request failed with HTTP ${response.status}.`,
      response.status,
    );
  }
  if (!body?.data) {
    throw new AniListRequestError("AniList response had no data and no errors.");
  }
  return body.data;
}

/**
 * Fetches full `Media` objects (including relations) for a batch of
 * AniList ids, transparently paginating in chunks of up to
 * `MAX_IDS_PER_PAGE` ids per request rather than one request per id.
 */
export async function fetchMediaByIds(ids: number[]): Promise<AniListMedia[]> {
  if (ids.length === 0) return [];

  const results: AniListMedia[] = [];
  for (const idChunk of chunk(ids, MAX_IDS_PER_PAGE)) {
    const data = await postGraphQL<AniListMediaPageResponse>(MEDIA_PAGE_QUERY, {
      ids: idChunk,
      page: 1,
      perPage: MAX_IDS_PER_PAGE,
    });
    results.push(...data.Page.media);
  }
  return results;
}

/** Exposed for tests/advanced callers that need the raw GraphQL post primitive. */
export { postGraphQL };
