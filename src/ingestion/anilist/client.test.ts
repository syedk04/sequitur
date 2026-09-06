import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AniListRequestError, fetchMediaByIds } from "./client.js";

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

function mediaPage(ids: number[]) {
  return {
    data: {
      Page: {
        pageInfo: { total: ids.length, currentPage: 1, lastPage: 1, hasNextPage: false, perPage: 25 },
        media: ids.map((id) => ({
          id,
          type: "ANIME",
          format: "TV",
          title: { romaji: `Media ${id}`, english: null, native: null },
          startDate: { year: 2020, month: 1, day: 1 },
          episodes: 12,
          relations: { edges: [] },
        })),
      },
    },
  };
}

describe("fetchMediaByIds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("performs a successful batch fetch, POSTing JSON with the expected headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mediaPage([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchMediaByIds([1, 2, 3]);
    await vi.runAllTimersAsync();
    const media = await promise;

    expect(media).toHaveLength(3);
    expect(media.map((m) => m.id)).toEqual([1, 2, 3]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graphql.anilist.co");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((init.headers as Record<string, string>)["Accept"]).toBe("application/json");
    const body = JSON.parse(init.body as string) as { variables: { ids: number[] } };
    expect(body.variables.ids).toEqual([1, 2, 3]);
  });

  it("batches more than MAX_IDS_PER_PAGE ids into multiple page requests", async () => {
    const ids = Array.from({ length: 30 }, (_, i) => i + 1);
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { variables: { ids: number[] } };
      return Promise.resolve(jsonResponse(mediaPage(body.variables.ids)));
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchMediaByIds(ids);
    await vi.runAllTimersAsync();
    const media = await promise;

    expect(media).toHaveLength(30);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries exactly once after a 429 with Retry-After, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 429, headers: { "Retry-After": "2" } }))
      .mockResolvedValueOnce(jsonResponse(mediaPage([1])));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchMediaByIds([1]);
    await vi.runAllTimersAsync();
    const media = await promise;

    expect(media).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a clear error after exhausting retries on repeated 429s", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({}, { status: 429, headers: { "Retry-After": "1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchMediaByIds([1]);
    // Attach a rejection handler immediately to avoid an unhandled rejection
    // warning while fake timers are advanced.
    const expectation = expect(promise).rejects.toThrow(AniListRequestError);
    await vi.runAllTimersAsync();
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once with a fixed backoff on other 5xx errors, then throws if still failing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchMediaByIds([1]);
    const expectation = expect(promise).rejects.toThrow(AniListRequestError);
    await vi.runAllTimersAsync();
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serializes concurrent calls through the single-flight request queue", async () => {
    const callOrder: number[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const body = JSON.parse(init.body as string) as { variables: { ids: number[] } };
      callOrder.push(body.variables.ids[0] as number);
      return Promise.resolve().then(() => {
        inFlight -= 1;
        return jsonResponse(mediaPage(body.variables.ids));
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const p1 = fetchMediaByIds([1]);
    const p2 = fetchMediaByIds([2]);
    const p3 = fetchMediaByIds([3]);

    await vi.runAllTimersAsync();
    await Promise.all([p1, p2, p3]);

    expect(maxInFlight).toBe(1);
    expect(callOrder).toEqual([1, 2, 3]);
  });
});
