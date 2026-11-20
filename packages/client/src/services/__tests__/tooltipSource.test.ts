/**
 * The tooltip sources (tooltips D3, D4): a live thing is asked once per few
 * seconds and forgotten when you move; a miss is said, never blank.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../../store/index";
import { websocketClient } from "../websocket";
import { clearTooltipCaches, thingTip, wikiTip } from "../tooltipSource";
import { CANT_SEE } from "../../components/doc/docs";

function place(stuffId: string, dark = false): void {
  useStore.setState({ navSections: { place: { v: 1, stuffId, name: "x", dark } } as never });
}

beforeEach(() => {
  clearTooltipCaches();
  place("room-1");
  useStore.setState({ clientState: {} });
});
afterEach(() => vi.restoreAllMocks());

describe("thingTip", () => {
  it("one request serves a second hover inside the window", async () => {
    const q = vi.spyOn(websocketClient, "query").mockResolvedValue({
      type: "mql-query-result", frameId: 1, queryId: "q",
      result: [{ stuffId: "t1", displayName: "a lamp" }],
    });
    const a = await thingTip("t1", "look lamp").resolve!();
    const b = await thingTip("t1", "look lamp").resolve!();
    expect(q).toHaveBeenCalledTimes(1);
    expect(q.mock.calls[0]![0]).toBe("#t1");
    expect(a.header?.name).toBe("a lamp");
    expect(b.command).toBe("look lamp");
  });

  it("moving clears it — the next hover asks again", async () => {
    const q = vi.spyOn(websocketClient, "query").mockResolvedValue({
      type: "mql-query-result", frameId: 1, queryId: "q", result: [{ stuffId: "t1", displayName: "a lamp" }],
    });
    await thingTip("t1").resolve!();
    place("room-2");
    await thingTip("t1").resolve!();
    expect(q).toHaveBeenCalledTimes(2);
  });

  it("nothing perceivable (or no answer) is said as a miss, with no command", async () => {
    vi.spyOn(websocketClient, "query").mockResolvedValue(null);
    const doc = await thingTip("t9", "look rock").resolve!();
    expect(doc.miss).toBe(CANT_SEE);
    expect(doc.command).toBeUndefined();
  });

  it("the dark answer becomes the dark line", async () => {
    vi.spyOn(websocketClient, "query").mockResolvedValue({
      type: "mql-query-result", frameId: 1, queryId: "q", dark: true,
      result: [{ stuffId: "t1", displayName: "something", kind: "thing" }],
    });
    const doc = await thingTip("t1").resolve!();
    expect(doc.miss).toBe("Too dark to make out.");
  });
});

describe("wikiTip", () => {
  it("caches per page AND appetite — a different appetite asks again", async () => {
    const w = vi.spyOn(websocketClient, "wikiExcerpt").mockResolvedValue({ header: { name: "Oak" } });
    await wikiTip("oak").resolve!();
    await wikiTip("oak").resolve!();
    useStore.setState({ clientState: { "spoiler.appetite": 2 } });
    await wikiTip("oak").resolve!();
    expect(w).toHaveBeenCalledTimes(2);
  });

  it("no page is said", async () => {
    vi.spyOn(websocketClient, "wikiExcerpt").mockResolvedValue(null);
    expect((await wikiTip("elm").resolve!()).miss).toBe("Nothing in the wiki for that.");
  });
});
