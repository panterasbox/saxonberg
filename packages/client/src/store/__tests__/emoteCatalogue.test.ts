/**
 * The catalogue's lazy fetch.
 *
 * ⭐⭐ It used to ride `ConnectionEstablishedPayload`. `Avatar.enter()`
 * runs on RECONNECT as well as fresh login, so a flaky connection
 * re-shipped the whole catalogue every drop — onto a packet already
 * carrying the topic catalogue, the news window and the frame backfill.
 * Wrong scaling for something expected to get large.
 *
 * Now: one fetch per session at most, on the first reaction opened, with
 * the browser's ETag making later sessions free.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useStore } from "../index";
import {
  ensureEmoteCatalogue,
  invalidateEmoteCatalogue,
} from "../emoteCatalogue";

const NOD = { verb: "nod", emoji: "🙂", searchTerms: [], tags: [], slots: [] };

function mockFetch(impl: () => Promise<unknown>) {
  const spy = vi.fn(async () => {
    const body = await impl();
    return {
      ok: true,
      json: async () => body,
    } as Response;
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

beforeEach(() => {
  invalidateEmoteCatalogue();
});
afterEach(() => vi.unstubAllGlobals());

describe("ensureEmoteCatalogue", () => {
  it("fetches once and fills the store", async () => {
    const spy = mockFetch(async () => ({ emotes: [NOD] }));
    await ensureEmoteCatalogue();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(useStore.getState().emoteCatalogue.get("nod")).toMatchObject({
      verb: "nod",
    });
    expect(useStore.getState().emoteCatalogueState).toBe("loaded");
  });

  it("⭐ does not refetch once loaded — every later open is free", async () => {
    const spy = mockFetch(async () => ({ emotes: [NOD] }));
    await ensureEmoteCatalogue();
    await ensureEmoteCatalogue();
    await ensureEmoteCatalogue();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("⚠ shares an in-flight request rather than racing", async () => {
    // Opening two pickers on the same tick must not be two fetches. The
    // guard has to be the PROMISE — a boolean set before the await still
    // lets the second caller through.
    let release: (v: unknown) => void = () => {};
    const gate = new Promise((r) => (release = r));
    const spy = mockFetch(async () => {
      await gate;
      return { emotes: [NOD] };
    });

    const a = ensureEmoteCatalogue();
    const b = ensureEmoteCatalogue();
    release(null);
    await Promise.all([a, b]);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("⚠⚠ marks a FAILURE as failed, not as an empty catalogue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 }) as Response),
    );
    await ensureEmoteCatalogue();
    // An empty catalogue is a real answer — a world with nothing
    // authored — and the picker renders it as "nothing to pick". A
    // failure that looked the same would be an unwired state wearing an
    // empty state's clothes.
    expect(useStore.getState().emoteCatalogueState).toBe("failed");
    expect(useStore.getState().emoteCatalogue.size).toBe(0);
  });

  it("keeps an EMPTY catalogue distinguishable from a failure", async () => {
    mockFetch(async () => ({ emotes: [] }));
    await ensureEmoteCatalogue();
    expect(useStore.getState().emoteCatalogueState).toBe("loaded");
    expect(useStore.getState().emoteCatalogue.size).toBe(0);
  });

  it("retries after a failure — a failed fetch is not a permanent verdict", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 }) as Response),
    );
    await ensureEmoteCatalogue();
    expect(useStore.getState().emoteCatalogueState).toBe("failed");

    const spy = mockFetch(async () => ({ emotes: [NOD] }));
    await ensureEmoteCatalogue();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(useStore.getState().emoteCatalogueState).toBe("loaded");
  });
});
