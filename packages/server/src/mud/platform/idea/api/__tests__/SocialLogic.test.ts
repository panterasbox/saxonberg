/**
 * SocialLogic via SocialApi — the Phase-1 surface: the strict-ordered
 * first-match `ruleFor` primitive (multi-match → first wins; reorder flips
 * the outcome both directions; fall-to-everyone-else; strangers; MQL
 * excluded as a notification subject but valid for display), and the store
 * ops (set/persist/read-back incl. color; managed-ref accepted; reserved
 * dedup).
 *
 * GroupApi.isMember / RecognitionApi.recognizes / PlayerApi.isAvatarStuff
 * are stubbed so resolution is exercised without a live world; the store
 * is the in-memory NotifyPolicyMixin host.
 */

import "../../../../../test-bootstrap";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { BeliefStoreMixin } from "../../../../lib/belief/BeliefStore";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SocialApi } from "../../../../api/social";
import { GroupApi } from "../../../../api/group";
import { PlayerApi } from "../../../../api/player";
import { StuffApi } from "../../../../api/stuff";
import { Idea } from "../../../../lib/stuff/Idea";
import { NotifyPolicyMixin } from "../../../../lib/social/NotifyPolicy";
import { RESERVED } from "../../../../lib/social/NotifyRule";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../lib/security/__tests__/test-setup";

// Recognition is the viewer's own belief realm since the OO sweep; the
// module `recognizedDefault` pins it per test.
let recognizedDefault = true;
class NotifyHost extends BeliefStoreMixin(NotifyPolicyMixin(Idea)) {
  override recognizes(_subject: Stuff): boolean {
    return recognizedDefault;
  }

  getPlayerId(): string {
    return "viewer";
  }
}
class Person extends Idea {}

const FRIENDS_REF = `contacts:viewer:${RESERVED.friends}`;

/** Pairs `${personId}|${ref}` the stubbed isMember reports membership for. */
let membership: Set<string>;

function makeViewer(): NotifyHost {
  const v = makeStuff(() => new NotifyHost());
  // The viewer is the only Avatar; persons resolve by templatePath.
  vi.spyOn(PlayerApi, "isAvatarStuff").mockImplementation(
    (o: unknown) => o === v,
  );
  return v;
}

function makePerson(path: string): Person {
  return makeStuffAtPath(() => new Person(), path);
}

beforeEach(() => {
  StuffApi.clearAll();
  membership = new Set();
  vi.spyOn(GroupApi, "isMember").mockImplementation(
    async (pid: string, ref: string) => membership.has(`${pid}|${ref}`),
  );
  // Default: everyone is recognized (so an unmatched person falls to
  // `everyone-else`, not `strangers`). Overridden per-test.
  recognizedDefault = true;
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("SocialApi.ruleFor — strict ordered first-match", () => {
  it("returns the first matching rule when a person matches several", async () => {
    const v = makeViewer();
    const p = makePerson("/platform/agent/Avatar/p1");
    // Two stored rules, both containing the person; first should win.
    v.setNotifyRule("managed:a", { onConnect: "silent" });
    v.setNotifyRule("managed:b", { onConnect: "show" });
    membership.add(`/platform/agent/Avatar/p1|managed:a`);
    membership.add(`/platform/agent/Avatar/p1|managed:b`);

    const r = await v.resolveNotifyRule(p);
    expect(r.groupRef).toBe("managed:a");
    expect(r.reserved).toBe(false);
  });

  it("reordering a deny above an allow flips the outcome both directions", async () => {
    const v = makeViewer();
    const p = makePerson("/platform/agent/Avatar/p1");
    // `deny` mutes (message=silent); `allow` surfaces (message=full).
    v.setNotifyRule("managed:allow", { onMessage: "full" });
    v.setNotifyRule("managed:deny", { onMessage: "silent" });
    membership.add(`/platform/agent/Avatar/p1|managed:allow`);
    membership.add(`/platform/agent/Avatar/p1|managed:deny`);

    // Stored order: allow, deny → allow wins (surfaced).
    expect((await v.resolveNotifyRule(p)).onMessage).toBe("full");

    // Move deny above allow → muted.
    expect(v.moveNotifyRule("managed:deny", "managed:allow", "above")).toBe(
      true,
    );
    expect((await v.resolveNotifyRule(p)).onMessage).toBe("silent");

    // Move deny back below allow → surfaced again.
    expect(v.moveNotifyRule("managed:deny", "managed:allow", "below")).toBe(
      true,
    );
    expect((await v.resolveNotifyRule(p)).onMessage).toBe("full");
  });

  it("falls through to the everyone-else baseline when nothing matches", async () => {
    const v = makeViewer();
    const p = makePerson("/platform/agent/Avatar/p1");
    v.setNotifyRule("managed:a", {});
    // No membership added → no stored or contacts rule matches; recognized
    // (default) so not a stranger either.
    const r = await v.resolveNotifyRule(p);
    expect(r.groupRef).toBe(RESERVED.everyoneElse);
    expect(r.reserved).toBe(true);
  });

  it("resolves an unrecognized person to the strangers baseline", async () => {
    const v = makeViewer();
    const p = makePerson("/platform/agent/Avatar/stranger");
    recognizedDefault = false;
    const r = await v.resolveNotifyRule(p);
    expect(r.groupRef).toBe(RESERVED.strangers);
    expect(r.reserved).toBe(true);
  });

  it("accepts a managed-group ref as a matching subject", async () => {
    const v = makeViewer();
    const p = makePerson("/platform/agent/Avatar/guildie");
    v.setNotifyRule("managed:fighter-guild", { onConnect: "show" });
    membership.add(`/platform/agent/Avatar/guildie|managed:fighter-guild`);
    const r = await v.resolveNotifyRule(p);
    expect(r.groupRef).toBe("managed:fighter-guild");
    expect(r.onConnect).toBe("show");
  });

  it("materializing a head-baseline reserved rule (friends) preserves its head precedence over a higher custom rule", async () => {
    const v = makeViewer();
    const p = makePerson("/platform/agent/Avatar/dual");
    // A boosted custom guild rule — the only stored rule, so it sits above
    // where a tail-appended `friends` would land.
    v.setNotifyRule("managed:guild", { boostInDense: true });
    // The person is BOTH a guild member and a friend.
    membership.add(`/platform/agent/Avatar/dual|managed:guild`);
    membership.add(`/platform/agent/Avatar/dual|${FRIENDS_REF}`);

    // Before materialization: virtual `friends` lives at the head, above the
    // stored guild rule, so the dual person resolves to friends.
    const before = await v.resolveNotifyRule(p);
    expect(before.groupRef).toBe(FRIENDS_REF);
    expect(before.reserved).toBe(true);

    // Editing friends materializes it. The bug appended it to the tail
    // (below managed:guild), flipping the resolution to the guild rule.
    v.setNotifyRule(FRIENDS_REF, { color: "violet" });

    // After materialization: friends still wins — it was inserted at the
    // head, not appended below the custom guild rule.
    const after = await v.resolveNotifyRule(p);
    expect(after.groupRef).toBe(FRIENDS_REF);
    expect(after.reserved).toBe(false);

    // And the stored order reflects friends ahead of the guild rule.
    const stored = v.effectiveNotifyRules().map((r) => r.groupRef);
    expect(stored.indexOf(FRIENDS_REF)).toBeLessThan(
      stored.indexOf("managed:guild"),
    );
  });

  it("materializing both head baselines keeps foes before friends, above custom rules", async () => {
    const v = makeViewer();
    const foesRef = `contacts:viewer:${RESERVED.foes}`;
    v.setNotifyRule("managed:guild", {});
    // Materialize friends first, then foes — foes must still rank ahead.
    v.setNotifyRule(FRIENDS_REF, { color: "violet" });
    v.setNotifyRule(foesRef, { color: "rose" });

    const order = v.effectiveNotifyRules().map((r) => r.groupRef);
    expect(order.indexOf(foesRef)).toBeLessThan(order.indexOf(FRIENDS_REF));
    expect(order.indexOf(FRIENDS_REF)).toBeLessThan(
      order.indexOf("managed:guild"),
    );
  });

  it("re-materializing an already-stored head baseline does not move it", async () => {
    const v = makeViewer();
    v.setNotifyRule(FRIENDS_REF, { color: "violet" });
    v.setNotifyRule("managed:guild", {});
    // friends is stored at the head; a second edit must not relocate it
    // (and must not jump it relative to the now-stored guild rule).
    v.setNotifyRule(FRIENDS_REF, { color: "teal" });

    const order = v.effectiveNotifyRules().map((r) => r.groupRef);
    expect(order.indexOf(FRIENDS_REF)).toBeLessThan(
      order.indexOf("managed:guild"),
    );
    const friends = v.effectiveNotifyRules().find((r) => r.groupRef === FRIENDS_REF);
    expect(friends?.color).toBe("teal");
  });

  it("stores an MQL ref but skips it under excludeMql (display vs notify)", async () => {
    const v = makeViewer();
    const p = makePerson("/platform/agent/Avatar/p1");
    // mql rule first, managed rule second; person is in both.
    v.setNotifyRule("mql:species:khazadicus", { onMessage: "full" });
    v.setNotifyRule("managed:b", { onMessage: "summary" });
    membership.add(`/platform/agent/Avatar/p1|mql:species:khazadicus`);
    membership.add(`/platform/agent/Avatar/p1|managed:b`);

    // Display path (no exclude): the mql rule is first and wins.
    const display = await v.resolveNotifyRule(p);
    expect(display.groupRef).toBe("mql:species:khazadicus");

    // Notification path: mql excluded → resolves to the managed rule.
    const notify = await v.resolveNotifyRule(p, { excludeMql: true });
    expect(notify.groupRef).toBe("managed:b");
  });
});

describe("SocialApi store ops", () => {
  it("sets, persists, and reads back a rule including color", async () => {
    const v = makeViewer();
    const result = v.setNotifyRule("managed:a", {
      color: "teal",
      onMessage: "summary",
      boostInDense: true,
    });
    expect(result.created).toBe(true);
    expect(result.rule.color).toBe("teal");

    const stored = v.effectiveNotifyRules().find((r) => r.groupRef === "managed:a");
    expect(stored).toBeDefined();
    expect(stored).toMatchObject({
      color: "teal",
      onMessage: "summary",
      boostInDense: true,
    });

    // A second set updates in place (created=false), merging the patch.
    const again = v.setNotifyRule("managed:a", { color: "rose" });
    expect(again.created).toBe(false);
    expect(again.rule.color).toBe("rose");
    expect(again.rule.onMessage).toBe("summary"); // prior field preserved
  });

  it("removeRule drops a stored rule (group falls to the tail)", async () => {
    const v = makeViewer();
    v.setNotifyRule("managed:a", {});
    expect(v.clearNotifyRule("managed:a")).toBe(true);
    expect(v.clearNotifyRule("managed:a")).toBe(false);
    expect(
      v.effectiveNotifyRules().some((r) => r.groupRef === "managed:a"),
    ).toBe(false);
  });

  it("materializing a reserved label dedups its virtual baseline twin", async () => {
    const v = makeViewer();
    // Before: friends is virtual, appears once.
    const before = v.effectiveNotifyRules().filter(
      (r) => r.groupRef === FRIENDS_REF,
    );
    expect(before).toHaveLength(1);

    // Editing friends materializes it at the same canonical ref — still one.
    v.setNotifyRule(FRIENDS_REF, { color: "violet" });
    const after = v.effectiveNotifyRules().filter(
      (r) => r.groupRef === FRIENDS_REF,
    );
    expect(after).toHaveLength(1);
    expect(after[0]?.color).toBe("violet");
  });
});
