/**
 * arrival — the origin's table (stream arrival D7): every row, a spoofed
 * `from`, a malformed `watch` dropped, a sign-in return never read,
 * decided once per tab, and the button order for every signal.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  readArrival,
  arrival,
  providerOrder,
  rememberProvider,
  lastProvider,
  withDoor,
} from "../arrival";

describe("readArrival — D7's table", () => {
  it("`from=<carrier>` names that carrier", () => {
    for (const c of ["twitch", "youtube", "kick"] as const) {
      expect(readArrival(`?from=${c}`, "")).toEqual({ door: c, carrier: c, watch: null });
    }
  });

  it("`from=stream` with a carrier's referrer plays that carrier", () => {
    expect(readArrival("?from=stream", "https://www.youtube.com/watch?v=x")).toEqual({
      door: "stream",
      carrier: "youtube",
      watch: null,
    });
  });

  it("`from=stream` with no such referrer means Twitch (the owner)", () => {
    expect(readArrival("?from=stream", "")).toEqual({ door: "stream", carrier: "twitch", watch: null });
    expect(readArrival("?from=stream", "https://example.com/")).toMatchObject({ carrier: "twitch" });
  });

  it("no `from`: a carrier's referrer (or a subdomain) is that carrier's door", () => {
    expect(readArrival("", "https://m.twitch.tv/somebody")).toMatchObject({ door: "twitch", carrier: "twitch" });
    expect(readArrival("", "https://youtu.be/abc")).toMatchObject({ door: "youtube" });
    expect(readArrival("", "https://kick.com/x")).toMatchObject({ door: "kick" });
  });

  it("anything else is no door — a spoofed word included", () => {
    expect(readArrival("", "")).toBeNull();
    expect(readArrival("?from=vimeo", "")).toBeNull();
    expect(readArrival("", "https://nottwitch.tv.evil.com/")).toBeNull();
  });

  it("`watch` is kept only as a program's short name", () => {
    expect(readArrival("?from=kick&watch=Other-Show", "")).toMatchObject({ watch: "other-show" });
    expect(readArrival("?from=kick&watch=not%20a%20name", "")).toMatchObject({ watch: null });
  });

  it("a sign-in's return never decides, even from a carrier's referrer", () => {
    expect(readArrival("?auth=success&via=twitch", "https://www.twitch.tv/")).toBeNull();
  });
});

describe("arrival() — decided once per tab", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("keeps the first decision across a sign-in's round trip", () => {
    window.history.replaceState({}, "", "/?from=youtube&watch=cafe-hour");
    expect(arrival()).toEqual({ door: "youtube", carrier: "youtube", watch: "cafe-hour" });
    window.history.replaceState({}, "", "/?auth=success&via=google");
    expect(arrival()).toEqual({ door: "youtube", carrier: "youtube", watch: "cafe-hour" });
    expect(withDoor("ws://h")).toBe("ws://h?from=youtube");
  });

  it("a plain load decides none, and a later tagged load does not overwrite it", () => {
    expect(arrival()).toEqual({ door: null, carrier: null, watch: null });
    window.history.replaceState({}, "", "/?from=twitch");
    expect(arrival().door).toBeNull();
    expect(withDoor("ws://h")).toBe("ws://h");
  });
});

describe("the buttons' order", () => {
  beforeEach(() => window.localStorage.clear());

  it("the carrier's provider first (YouTube → Google), else the remembered one, else Google · Twitch · Kick", () => {
    expect(providerOrder("kick", "twitch")).toEqual(["kick", "google", "twitch"]);
    expect(providerOrder("youtube", "kick")).toEqual(["google", "twitch", "kick"]);
    expect(providerOrder(null, "twitch")).toEqual(["twitch", "google", "kick"]);
    expect(providerOrder(null, null)).toEqual(["google", "twitch", "kick"]);
  });

  it("remembers only a real provider word", () => {
    rememberProvider("evil");
    expect(lastProvider()).toBeNull();
    rememberProvider("kick");
    expect(lastProvider()).toBe("kick");
  });
});
