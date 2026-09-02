/**
 * introduces brain — arrival-witness auto-introduce. Introduces the host
 * to a newcomer who doesn't yet recognize it; skips when they already do
 * or when the host can't introduce (not Soul). `MixinApi.isSoul` and
 * the arriver's own `recognizes` is stubbed; `introduceSelf` is spied.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { brain as introduces } from "../introduces";
import { MixinApi } from "../../../api/mixin";
import type { BrainContext } from "../brain";
import type { Stuff } from "../../stuff/Stuff";

function ctx(host: unknown, subject: unknown): BrainContext {
  return {
    host: host as Stuff,
    config: {},
    state: {},
    perceived: subject
      ? { frame: {} as never, subject: subject as Stuff }
      : undefined,
    trigger: { source: "witness", raw: "arrival" },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  };
}

afterEach(() => vi.restoreAllMocks());

describe("introduces brain", () => {
  it("declares the label and claims attention", () => {
    expect(introduces.label).toBe("introduces");
    expect(introduces.claims).toEqual(["attention"]);
  });

  it("introduces to a newcomer who doesn't yet recognize the host", () => {
    const host = { introduceSelf: vi.fn() };
    vi.spyOn(MixinApi, "isSoul").mockReturnValue(true);
    vi.spyOn(MixinApi, "isBeliefStore").mockReturnValue(true);
    introduces.act(ctx(host, { stuffId: "a", recognizes: () => false }));
    expect(host.introduceSelf).toHaveBeenCalledTimes(1);
  });

  it("skips when the newcomer already recognizes the host", () => {
    const host = { introduceSelf: vi.fn() };
    vi.spyOn(MixinApi, "isSoul").mockReturnValue(true);
    vi.spyOn(MixinApi, "isBeliefStore").mockReturnValue(true);
    introduces.act(ctx(host, { stuffId: "a", recognizes: () => true }));
    expect(host.introduceSelf).not.toHaveBeenCalled();
  });

  it("no-ops with no arriver", () => {
    const host = { introduceSelf: vi.fn() };
    vi.spyOn(MixinApi, "isSoul").mockReturnValue(true);
    introduces.act(ctx(host, undefined));
    expect(host.introduceSelf).not.toHaveBeenCalled();
  });

  it("no-ops when the host can't introduce (not Soul)", () => {
    const host = { introduceSelf: vi.fn() };
    vi.spyOn(MixinApi, "isSoul").mockReturnValue(false);
    introduces.act(ctx(host, { stuffId: "a" }));
    expect(host.introduceSelf).not.toHaveBeenCalled();
  });
});
