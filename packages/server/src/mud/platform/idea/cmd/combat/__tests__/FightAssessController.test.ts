/**
 * `fight assess <target>` (controller-liquidity W7b) — the costed combat
 * read, its own word now that `assess` only examines a body. Only your
 * opponent can be read this way; anyone else is pointed at `assess`.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import FightAssessController from "../FightAssessController";
import { CombatApi } from "../../../../../api/combat";
import { MessageApi } from "../../../../../api/message";
import { Idea } from "../../../../../lib/stuff/Idea";
import { makeStuff } from "../../../../../lib/security/__tests__/test-setup";
import type { CommandContext, CommandModel } from "../../../../../api/command";
import type { Stuff } from "../../../../../lib/stuff/Stuff";

class Body extends Idea {
  getPresentation(): string {
    return "the wolf";
  }
}

let note: ReturnType<typeof vi.fn>;
let said: string[];

function ctxFor(giver: Stuff): CommandContext {
  note = vi.fn();
  return { commandGiver: giver as never, note } as unknown as CommandContext;
}

async function run(giver: Stuff, model: CommandModel): Promise<void> {
  await makeStuff(() => new FightAssessController()).execute(model as never, ctxFor(giver));
}

function rejected(reason: string): boolean {
  return note.mock.calls.some(
    ([n]) => n.kind === "controller-rejected" && n.reason === reason,
  );
}

beforeEach(() => {
  said = [];
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: { toString(): string }) => {
      said.push(body.toString());
      return b;
    };
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => vi.restoreAllMocks());

describe("fight assess", () => {
  it("refuses outside a fight", async () => {
    vi.spyOn(CombatApi, "sessionFor").mockReturnValue(null as never);
    const me = makeStuff(() => new Body());
    await run(me, { subcommand: "assess", target: { stuff: me, raw: "me" } } as never);
    expect(rejected("not-in-combat")).toBe(true);
  });

  it("refuses anyone but your opponent, pointing at `assess`", async () => {
    const me = makeStuff(() => new Body());
    const foe = makeStuff(() => new Body());
    const bystander = makeStuff(() => new Body());
    vi.spyOn(CombatApi, "sessionFor").mockReturnValue({
      opponentState: () => ({ combatant: foe }),
    } as never);
    await run(me, { subcommand: "assess", target: { stuff: bystander, raw: "wolf" } } as never);
    expect(rejected("not-opponent")).toBe(true);
    expect(said.join(" ")).toContain("`assess`");
  });

  it("reads the opponent in bands, spending the exchange", async () => {
    const foe = makeStuff(() => new Body());
    const me = makeStuff(() => new Body()) as Stuff & { assessCombat?: unknown };
    const assess = vi.fn().mockReturnValue({
      ok: true,
      poiseBand: "shaken",
      armed: true,
      conditionBand: "hurt",
      flags: ["prone"],
    });
    (me as unknown as { assessCombat: unknown }).assessCombat = assess;
    vi.spyOn(CombatApi, "sessionFor").mockReturnValue({
      opponentState: () => ({ combatant: foe }),
    } as never);
    await run(me, { subcommand: "assess", target: { stuff: foe, raw: "wolf" } } as never);
    expect(assess).toHaveBeenCalledWith(foe);
    const text = said.join(" ");
    expect(text).toContain("guard shaken");
    expect(text).toContain("looks hurt");
    expect(text).toContain("Off balance: prone.");
  });
});
