/**
 * NotifyController — the `notify` verb surface: bare-name contacts
 * normalization, typed field-option parsing + validation, --above/--below
 * reorder, remove (both grammars: `--remove` and the `remove` subcommand),
 * and the 50-rule soft-cap rejection.
 *
 * The store lives in the in-memory NotifyPolicyMixin giver; the emitted
 * scene body is captured by stubbing `MessageApi.scene` (the
 * StandingController precedent); `ctx.note` is a spy.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import NotifyController from "../NotifyController";
import { SocialApi } from "../../../../api/social";
import { PlayerApi } from "../../../../api/player";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { Idea } from "../../../../lib/stuff/Idea";
import { StuffApi } from "../../../../api/stuff";
import { NotifyPolicyMixin } from "../../../../lib/social/NotifyPolicy";
import { HasInteractiveMixin } from "../../../../lib/connection/HasInteractive";
import { makeStuff } from "../../../../lib/security/__tests__/test-setup";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { SocialRulesState } from "@saxonberg/types";

class NotifyHost extends NotifyPolicyMixin(Idea) {
  getPlayerId(): string {
    return "me";
  }
}

/**
 * A connected host — composes `HasInteractiveMixin` so the controller's
 * `social.rules` projection push fires (the `MixinApi.isHasInteractive`
 * gate). `pushClientStateUpdate` is stubbed via a spy so no backend wire
 * is needed (the `StyleController` precedent).
 */
class ConnectedNotifyHost extends HasInteractiveMixin(NotifyPolicyMixin(Idea)) {
  getPlayerId(): string {
    return "me";
  }
}

interface NotifyModel extends CommandModel {
  ref?: string;
  login?: string;
  disconnect?: string;
  message?: string;
  render?: string;
  color?: string;
  boost?: boolean;
  noBoost?: boolean;
  remove?: boolean;
  above?: string;
  below?: string;
}

const FRIENDS_REF = "contacts:me:friends";

let captured: Mml | null;
let note: ReturnType<typeof vi.fn>;

function captureBody(): void {
  captured = null;
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured = body;
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

function ctxFor(giver: Idea): CommandContext {
  note = vi.fn();
  return { commandGiver: giver as never, note } as unknown as CommandContext;
}

function makeGiver(): NotifyHost {
  const g = makeStuff(() => new NotifyHost());
  vi.spyOn(PlayerApi, "isAvatarStuff").mockImplementation((o: unknown) => o === g);
  return g;
}

async function run(giver: NotifyHost, model: NotifyModel): Promise<void> {
  const ctrl = makeStuff(() => new NotifyController());
  await ctrl.execute(model as CommandModel, ctxFor(giver));
}

beforeEach(() => captureBody());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("NotifyController", () => {
  it("bare `notify` lists the effective rules (the baseline)", async () => {
    const g = makeGiver();
    await run(g, {});
    const body = captured!.toString();
    expect(body).toContain("friends");
    expect(body).toContain("everyone-else");
  });

  it("shows a single rule when only a ref is given (no field options)", async () => {
    const g = makeGiver();
    await run(g, { ref: "friends" });
    const body = captured!.toString();
    expect(body).toContain(FRIENDS_REF);
    // A pure show must not materialize a stored row.
    expect(
      g.notifyRules().some((r) => r.groupRef === FRIENDS_REF),
    ).toBe(false);
  });

  it("sets multiple fields via typed options and normalizes a bare label", async () => {
    const g = makeGiver();
    await run(g, {
      ref: "friends",
      color: "amber",
      boost: true,
      message: "full",
    });

    const stored = SocialApi.listRules(g).find((r) => r.groupRef === FRIENDS_REF);
    expect(stored).toMatchObject({
      groupRef: FRIENDS_REF,
      color: "amber",
      boostInDense: true,
      onMessage: "full",
    });
    expect(captured!.toString()).toContain(FRIENDS_REF);
  });

  it("sets boostInDense=false via --no-boost", async () => {
    const g = makeGiver();
    await run(g, { ref: "friends", noBoost: true });
    const stored = SocialApi.listRules(g).find((r) => r.groupRef === FRIENDS_REF);
    expect(stored?.boostInDense).toBe(false);
  });

  it("rejects an invalid field-option value with a friendly note", async () => {
    const g = makeGiver();
    await run(g, { ref: "friends", color: "fuchsia" });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "controller-rejected", reason: "bad-option" }),
    );
    // Nothing materialized.
    expect(
      SocialApi.listRules(g).filter((r) => r.groupRef === FRIENDS_REF),
    ).toHaveLength(1); // only the virtual baseline, not a stored row
  });

  it("reorders with --above", async () => {
    const g = makeGiver();
    SocialApi.setRule(g, "managed:a", {});
    SocialApi.setRule(g, "managed:b", {});
    await run(g, { ref: "managed:b", above: "managed:a" });
    const stored = g.notifyRules().map((r) => r.groupRef);
    expect(stored).toEqual(["managed:b", "managed:a"]);
  });

  it("removes via the --remove flag and via the remove subcommand", async () => {
    const g = makeGiver();
    SocialApi.setRule(g, "managed:a", {});
    await run(g, { ref: "managed:a", remove: true });
    expect(g.notifyRules().some((r) => r.groupRef === "managed:a")).toBe(false);

    SocialApi.setRule(g, "managed:c", {});
    await run(g, { subcommand: "remove", ref: "managed:c" });
    expect(g.notifyRules().some((r) => r.groupRef === "managed:c")).toBe(false);
  });

  it("pushes the social.rules projection on a mutation", async () => {
    const g = makeStuff(() => new ConnectedNotifyHost());
    vi.spyOn(PlayerApi, "isAvatarStuff").mockImplementation((o: unknown) => o === g);
    const pushSpy = vi
      .spyOn(g, "pushClientStateUpdate")
      .mockImplementation(() => {});

    const ctrl = makeStuff(() => new NotifyController());
    await ctrl.execute(
      { ref: "friends", color: "teal", boost: true } as CommandModel,
      ctxFor(g),
    );

    expect(pushSpy).toHaveBeenCalledWith("social.rules", expect.any(Object));
    const [, state] = pushSpy.mock.calls.at(-1)!;
    const rules = (state as SocialRulesState).rules;
    const friends = rules.find((r) => r.groupRef === FRIENDS_REF);
    expect(friends).toMatchObject({
      groupRef: FRIENDS_REF,
      label: "friends",
      color: "teal",
      boostInDense: true,
      reserved: false,
    });
    // The virtual baseline tail rides along, flagged reserved.
    expect(rules.some((r) => r.groupRef === "everyone-else" && r.reserved)).toBe(
      true,
    );
  });

  it("does not push when the giver has no connected Interactive", async () => {
    const g = makeGiver(); // plain NotifyHost — no HasInteractive
    // No push method exists to spy on; the mutation must still succeed.
    await run(g, { ref: "friends", color: "amber" });
    expect(
      SocialApi.listRules(g).find((r) => r.groupRef === FRIENDS_REF)?.color,
    ).toBe("amber");
  });

  it("enforces the 50-rule soft cap with a rejection", async () => {
    const g = makeGiver();
    for (let i = 0; i < 50; i++) SocialApi.setRule(g, `managed:g${i}`, {});
    expect(g.notifyRules()).toHaveLength(50);

    await run(g, { ref: "managed:over", color: "teal" });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "controller-rejected", reason: "rule-cap" }),
    );
    // The 51st new rule was not stored.
    expect(g.notifyRules()).toHaveLength(50);
    expect(captured!.toString()).toContain("50 notify rules");
  });
});
