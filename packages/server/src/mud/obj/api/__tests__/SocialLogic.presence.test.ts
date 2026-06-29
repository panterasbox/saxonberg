/**
 * SocialLogic Phase 3 — the presence relay + message restyle.
 *
 * Covers the net-new connect/disconnect → notification fan-out
 * (`SocialApi.boot` → `installPresenceTap` → `relayPresenceImpl`):
 *   - a policied managed-guild member logging in notifies a viewer who
 *     policied that guild non-silently, with NO contacts entry;
 *   - an unmatched login produces nothing;
 *   - an MQL ref is rejected as a notification subject;
 *   - logout symmetry;
 *   - the rate-limiter suppresses a second emit inside the window;
 *   - no movement event produces a presence frame;
 *   - the pushed frame never leaks the viewer's rule list (privacy);
 * and the message restyle (`SocialApi.styleMessageFor`):
 *   - `full` wraps the body in a color-tinted highlight;
 *   - `silent` suppresses the notification but never drops the message.
 *
 * GroupApi.isMember / RecognitionApi / PlayerApi are stubbed so the
 * relay is exercised without a live world; viewers are in-memory
 * Avatar-shaped hosts (Sensor + NotifyPolicy) capturing their frames.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SocialApi } from "../../../api/social";
import { GroupApi } from "../../../api/group";
import { RecognitionApi } from "../../../api/recognition";
import { PlayerApi } from "../../../api/player";
import { EventApi } from "../../../api/event";
import { Events } from "../../../lib/events";
import EventRegistry from "../../EventRegistry";
import { StuffApi } from "../../../api/stuff";
import { Stuff } from "../../../lib/stuff/Stuff";
import { Idea } from "../../../lib/stuff/Idea";
import { Mml } from "../../../api/mml";
import { SensorMixin } from "../../../lib/message/Sensor";
import { NotifyPolicyMixin } from "../../../lib/social/NotifyPolicy";
import { RESERVED } from "../../../lib/social/NotifyRule";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../lib/security/__tests__/test-setup";
import type { MessageFrame } from "@saxonberg/types";

/**
 * An Avatar-shaped host: Sensor (so `scene.toSelf` works) + NotifyPolicy.
 * `connected` stands in for `HasInteractiveMixin.isConnected()` — the relay
 * scans online viewers only, so a linkdead viewer (`connected = false`) is
 * skipped.
 */
class Viewer extends SensorMixin(NotifyPolicyMixin(Idea)) {
  public received: MessageFrame[] = [];
  public connected = true;
  constructor(private pid: string) {
    super();
  }
  getPlayerId(): string {
    return this.pid;
  }
  isConnected(): boolean {
    return this.connected;
  }
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

/** The acting player whose login/logout is relayed. */
class Actor extends Idea {
  constructor(private pid: string) {
    super();
  }
  getPlayerId(): string {
    return this.pid;
  }
}

/** `${personPlayerId}|${ref}` pairs the stubbed isMember reports membership for. */
let membership: Set<string>;
let avatars: Stuff[];
let actor: Actor;

async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, "/obj/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

function makeViewer(pid: string): Viewer {
  const v = makeStuffAtPath(() => new Viewer(pid), `/obj/Avatar/${pid}`);
  avatars.push(v);
  return v;
}

beforeEach(async () => {
  StuffApi.clearAll();
  EventApi._clearAllForTesting();
  membership = new Set();
  avatars = [];

  actor = makeStuff(() => new Actor("actor"));

  // The actor + every viewer is an Avatar; persons resolve by playerId.
  vi.spyOn(PlayerApi, "isAvatarStuff").mockImplementation(
    (o: unknown) =>
      o === actor || (o as { getPlayerId?: unknown }).getPlayerId !== undefined,
  );
  vi.spyOn(PlayerApi, "findAvatarByPlayerId").mockImplementation(
    (pid: string) => (pid === "actor" ? (actor as never) : undefined),
  );
  vi.spyOn(PlayerApi, "getAllAvatars").mockImplementation(
    () => avatars as never,
  );
  vi.spyOn(GroupApi, "isMember").mockImplementation(
    async (pid: string, ref: string) => membership.has(`${pid}|${ref}`),
  );
  // Default: everyone recognized (so an unmatched person falls to
  // `everyone-else`, not `strangers`).
  vi.spyOn(RecognitionApi, "recognizes").mockReturnValue(true);
  vi.spyOn(RecognitionApi, "describe").mockReturnValue("the actor");

  await makeRegistry();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("SocialLogic presence relay", () => {
  it("notifies a viewer who policied a managed guild (no contacts entry)", async () => {
    const v = makeViewer("v1");
    SocialApi.setRule(v, "managed:fighter-guild", { onConnect: "show" });
    membership.add(`actor|managed:fighter-guild`);

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();

    expect(v.received).toHaveLength(1);
    const frame = v.received[0]!;
    expect(frame.topic).toBe("world.social.presence");
    const payload = frame.payload as Record<string, unknown>;
    expect(payload.kind).toBe("presence");
    expect(payload.event).toBe("loggedIn");
    expect((payload.actor as { stuffId: string }).stuffId).toBe(actor.stuffId);
    expect(payload.country).toBeUndefined();
    // Rendered via the default `social.presenceFormat` Liquid template
    // through ProseApi — the line names the transition. No country tail
    // (no resolved origin in the stub).
    expect(JSON.stringify(frame.body)).toContain("entered the game");
    expect(JSON.stringify(frame.body)).not.toContain("from ");
  });

  it("appends country of origin to an arrival when it resolves", async () => {
    const { ConnectionApi } = await import("../../../api/connection");
    vi.spyOn(ConnectionApi, "originOf").mockReturnValue({ country: "Germany" });

    const v = makeViewer("v1");
    SocialApi.setRule(v, "managed:fighter-guild", { onConnect: "show" });
    membership.add(`actor|managed:fighter-guild`);

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();

    expect(v.received).toHaveLength(1);
    const frame = v.received[0]!;
    expect(JSON.stringify(frame.body)).toContain("from Germany");
    expect((frame.payload as { country?: string }).country).toBe("Germany");
  });

  it("produces nothing for an unmatched login", async () => {
    const v = makeViewer("v1");
    // A rule that doesn't contain the actor, and the actor is recognized
    // (so falls to everyone-else → silent).
    SocialApi.setRule(v, "managed:other", { onConnect: "show" });

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();

    expect(v.received).toHaveLength(0);
  });

  it("rejects an MQL ref as a notification subject", async () => {
    const v = makeViewer("v1");
    // The ONLY non-silent match is an MQL ref → excluded → falls to
    // everyone-else (silent) → no frame.
    SocialApi.setRule(v, "mql:species:khazadicus", { onConnect: "show" });
    membership.add(`actor|mql:species:khazadicus`);

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();

    expect(v.received).toHaveLength(0);
  });

  it("relays a logout symmetrically", async () => {
    const v = makeViewer("v1");
    SocialApi.setRule(v, "managed:fighter-guild", { onDisconnect: "show" });
    membership.add(`actor|managed:fighter-guild`);

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedOut, { playerId: "actor" });
    await flush();

    expect(v.received).toHaveLength(1);
    expect((v.received[0]!.payload as { event: string }).event).toBe(
      "loggedOut",
    );
  });

  it("rate-limits a second emit inside the window", async () => {
    const v = makeViewer("v1");
    SocialApi.setRule(v, "managed:fighter-guild", { onConnect: "show" });
    membership.add(`actor|managed:fighter-guild`);

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();

    // Second emit within the window is dropped.
    expect(v.received).toHaveLength(1);
  });

  it("a non-login event produces no presence frame (movement non-goal)", async () => {
    const v = makeViewer("v1");
    SocialApi.setRule(v, "managed:fighter-guild", { onConnect: "show" });
    membership.add(`actor|managed:fighter-guild`);

    SocialApi.boot();
    // The relay subscribes only to login/logout — an arbitrary
    // movement-style event never reaches it.
    EventApi.emit("world.movement.entered", { playerId: "actor" });
    await flush();

    expect(v.received).toHaveLength(0);
  });

  it("never leaks the viewer's rule list in the pushed frame (privacy)", async () => {
    const v = makeViewer("v1");
    SocialApi.setRule(v, "managed:fighter-guild", { onConnect: "show" });
    SocialApi.setRule(v, "managed:secret-cabal", { onConnect: "silent" });
    membership.add(`actor|managed:fighter-guild`);

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();

    expect(v.received).toHaveLength(1);
    const payload = v.received[0]!.payload as Record<string, unknown>;
    // Only the actor ref + presentation fields — no rule list, no ref
    // keys. `country` is absent here (no resolved origin in the stub).
    expect(Object.keys(payload).sort()).toEqual(
      ["actor", "color", "event", "kind"].sort(),
    );
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("fighter-guild");
    expect(serialized).not.toContain("secret-cabal");
  });

  it("skips a linkdead viewer (scans online viewers only)", async () => {
    const v = makeViewer("v1");
    v.connected = false; // linkdead — no live Interactive to push to
    SocialApi.setRule(v, "managed:fighter-guild", { onConnect: "show" });
    membership.add(`actor|managed:fighter-guild`);

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();

    expect(v.received).toHaveLength(0);
  });

  it("does not notify the acting player about their own login", async () => {
    // The actor is itself an online avatar with a matching rule.
    const selfHost = makeStuffAtPath(
      () => new Viewer("actor"),
      "/obj/Avatar/actor-self",
    );
    avatars.push(selfHost);
    vi.spyOn(PlayerApi, "findAvatarByPlayerId").mockImplementation(
      (pid: string) => (pid === "actor" ? (selfHost as never) : undefined),
    );
    SocialApi.setRule(selfHost, "managed:fighter-guild", { onConnect: "show" });
    membership.add(`actor|managed:fighter-guild`);

    SocialApi.boot();
    EventApi.emit(Events.PlayerLoggedIn, { playerId: "actor", userId: "u" });
    await flush();

    expect(selfHost.received).toHaveLength(0);
  });
});

describe("SocialLogic.styleMessageFor", () => {
  it("wraps a full-surface message in a color-tinted highlight", async () => {
    const v = makeViewer("v1");
    const speaker = makeStuffAtPath(() => new Actor("sp"), "/obj/Avatar/sp");
    // `friends` baseline: onMessage=full, color=amber. Speaker ∈ friends.
    membership.add(`sp|contacts:v1:${RESERVED.friends}`);

    const styled = await SocialApi.styleMessageFor(
      v,
      speaker as Stuff,
      Mml.fromMarkup("<speech>hi</speech>"),
    );
    const markup = styled.toString();
    expect(markup).toContain('<highlight color="amber">');
    expect(markup).toContain("<speech>hi</speech>");
  });

  it("silent suppresses the notification but never drops the message", async () => {
    const v = makeViewer("v1");
    const speaker = makeStuffAtPath(() => new Actor("sp"), "/obj/Avatar/sp");
    // `foes` baseline: onMessage=silent. Speaker ∈ foes.
    membership.add(`sp|contacts:v1:${RESERVED.foes}`);

    const body = Mml.fromMarkup("<speech>hi</speech>");
    const styled = await SocialApi.styleMessageFor(v, speaker as Stuff, body);
    // Body unchanged — the message still renders, no highlight wrap.
    expect(styled.toString()).toBe("<speech>hi</speech>");
  });
});
