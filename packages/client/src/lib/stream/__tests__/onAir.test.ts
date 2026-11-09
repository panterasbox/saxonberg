/**
 * The client on air (broadcast-ready D6, D8): redaction keys on the
 * server's stamp AND this client's own phase; the foreground is one of
 * three words and nothing about what is showing.
 */

import { describe, it, expect } from "vitest";
import { isOnAirPhase, isPrivateFrame, currentForeground, PRIVATE_TAG } from "../onAir";

describe("onAir", () => {
  it("is on air in starting, live and ending — never in standby or offline", () => {
    expect(["starting", "live", "ending"].every(isOnAirPhase)).toBe(true);
    expect(["standby", "offline", undefined, null, 3].some(isOnAirPhase)).toBe(false);
  });

  it("reads a frame private only by the server's stamp", () => {
    expect(isPrivateFrame([PRIVATE_TAG])).toBe(true);
    expect(isPrivateFrame(["audience:witness", "channel:gossip"])).toBe(false);
    expect(isPrivateFrame(undefined)).toBe(false);
  });

  it("maps the document's state to the three foreground words", () => {
    expect(currentForeground({ hidden: true, hasFocus: () => false })).toBe("other-tab");
    expect(currentForeground({ hidden: false, hasFocus: () => false })).toBe("other-app");
    expect(currentForeground({ hidden: false, hasFocus: () => true })).toBe("saxonberg");
  });
});
