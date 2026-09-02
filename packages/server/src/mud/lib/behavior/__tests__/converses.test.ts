/**
 * converses brain — trait-aware chatter. With the host's `sociability`
 * position stubbed, a Gregarious host speaks (from the warm pool); a Shy
 * host mostly stays quiet, and speaks tersely on the rare turn it does.
 * The demonstrator for Job 1 (traits visibly driving behavior).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { MixinApi } from "../../../api/mixin";
import { brain as converses } from "../converses";
import type { BrainContext } from "../brain";
import type { Stuff } from "../../stuff/Stuff";
import type { AxisEstimate } from "../../trait/TraitPosition";

let stubbedPosition = 0;

function fakeCtx(config: Record<string, unknown>): BrainContext & {
  say: ReturnType<typeof vi.fn>;
} {
  // The brain reads the host's own traitPosition since the OO sweep;
  // the fake host carries the seam (isDispositioned is mocked true).
  const host = {
    stuffId: "host-1",
    traitPosition: async () => ({
      disposition: "sociability",
      position: stubbedPosition,
      mass: Math.abs(stubbedPosition),
      band: "defined",
    }),
  } as unknown as Stuff;
  return {
    host,
    config,
    state: {},
    trigger: { source: "cadence", raw: "cadence:1s" },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  };
}

function stubPosition(position: number): void {
  stubbedPosition = position;
  vi.spyOn(MixinApi, "isDispositioned").mockReturnValue(true);
}

afterEach(() => vi.restoreAllMocks());

describe("converses brain", () => {
  it("declares the label and claims voice", () => {
    expect(converses.label).toBe("converses");
    expect(converses.claims).toEqual(["voice"]);
  });

  it("a Gregarious host speaks from the chatty pool", async () => {
    stubPosition(70);
    const ctx = fakeCtx({ chatty: ["holding court"], terse: ["mm"] });
    await converses.act(ctx);
    expect(ctx.say).toHaveBeenCalledWith("holding court");
  });

  it("a Shy host usually stays quiet", async () => {
    stubPosition(-70);
    vi.spyOn(Math, "random").mockReturnValue(0); // 0 < 70 → silent
    const ctx = fakeCtx({ chatty: ["hi"], terse: ["mm"] });
    await converses.act(ctx);
    expect(ctx.say).not.toHaveBeenCalled();
  });

  it("a Shy host speaks tersely on the rare turn it does", async () => {
    stubPosition(-70);
    vi.spyOn(Math, "random").mockReturnValue(0.99); // 99 < 70 false → speaks
    const ctx = fakeCtx({ chatty: ["hi"], terse: ["mm"] });
    await converses.act(ctx);
    expect(ctx.say).toHaveBeenCalledWith("mm");
  });

  it("no-ops with no pools", async () => {
    stubPosition(70);
    const ctx = fakeCtx({});
    await converses.act(ctx);
    expect(ctx.say).not.toHaveBeenCalled();
  });
});
