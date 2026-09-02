/**
 * `enforces` brain — the house-peace decision logic (the wary stub shape:
 * the room scan + combat reads are stubbed so the brain's OWN choices are
 * under test). Proves: the warning-then-86 house rule, the shout-then-
 * hands escalation ladder, the taser fetch only under threat, and — the
 * keystone — that Dave tases the fighter he BELIEVES started it (the one
 * winning), which can be the wrong one.
 */
import "../../../../test-bootstrap";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { brain as enforces } from "../enforces";
import { MixinApi } from "../../../api/mixin";
import { CombatApi } from "../../../api/combat";
import { CommandApi } from "../../../api/command";
import { DocumentApi } from "../../../api/document";
import type { Stuff } from "../../stuff/Stuff";
import type { BrainContext } from "../brain";

interface FakeOcc {
  stuffId: string;
  band: string;
  keyword: string;
  identity: string;
  fighting: boolean;
  arms: string[]; // keywords of weapons a viewer would see on them
}

let occ: FakeOcc[] = [];
const fake = (o: Partial<FakeOcc> & { stuffId: string }): FakeOcc => ({
  band: "healthy",
  keyword: o.stuffId,
  identity: `/id/${o.stuffId}`,
  fighting: false,
  arms: [],
  ...o,
});

function asStuff(o: FakeOcc): Stuff {
  return {
    stuffId: o.stuffId,
    getConditionBand: () => o.band,
    getKeywords: () => [o.keyword],
    hasKeyword: (k: string) => k === o.keyword || o.arms.includes(k),
    getIdentityPath: () => o.identity,
    getTemplatePath: () => o.identity,
  } as unknown as Stuff;
}

const HOST = { stuffId: "dave" } as unknown as Stuff;

function ctx(
  config: Record<string, unknown> = {},
  state: Record<string, unknown> = {},
): BrainContext & { say: ReturnType<typeof vi.fn> } {
  return {
    host: HOST,
    config,
    state,
    trigger: { source: "cadence", raw: "cadence:20s" },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  } as BrainContext & { say: ReturnType<typeof vi.fn> };
}

let forced: string[] = [];

beforeEach(() => {
  forced = [];
  // The host is a command-giver in a room whose contents are the fakes.
  vi.spyOn(MixinApi, "isCommandGiver").mockReturnValue(true);
  vi.spyOn(MixinApi, "isContainable").mockReturnValue(true);
  vi.spyOn(MixinApi, "isContainer").mockReturnValue(true);
  vi.spyOn(MixinApi, "isVitals").mockReturnValue(true);
  vi.spyOn(MixinApi, "isPerceptible").mockReturnValue(true);
  (HOST as unknown as { getContainer: () => unknown }).getContainer = () => ({
    getContents: () => [HOST, ...occ.map(asStuff)],
  });
  // The host's own arms (for hasTaser): none unless a test sets it.
  (HOST as unknown as { getKeywords: () => string[] }).getKeywords = () => [];
  (HOST as unknown as { hasKeyword: (k: string) => boolean }).hasKeyword = () =>
    false;
  (HOST as unknown as { getConditionBand: () => string }).getConditionBand =
    () => "healthy";
  vi.spyOn(CombatApi, "sessionFor").mockImplementation((s) => {
    const f = occ.find((o) => o.stuffId === (s as { stuffId: string }).stuffId);
    return (f?.fighting ? ({} as never) : undefined) as never;
  });
  vi.spyOn(CombatApi, "visibleArms").mockImplementation((_v, subject) => {
    const id = (subject as { stuffId: string }).stuffId;
    if (id === "dave") {
      const hk = (HOST as unknown as { hasKeyword: (k: string) => boolean })
        .hasKeyword;
      return hk("taser") ? ([{}] as never) : ([] as never);
    }
    const f = occ.find((o) => o.stuffId === id);
    return ((f?.arms.length ?? 0) > 0 ? [{}] : []) as never;
  });
  vi.spyOn(CommandApi, "forceCommand").mockImplementation((async (
    _g: unknown,
    text: string,
  ) => {
    forced.push(text);
  }) as never);
  vi.spyOn(DocumentApi, "read").mockResolvedValue(null);
  vi.spyOn(DocumentApi, "save").mockResolvedValue(undefined as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  occ = [];
});

describe("enforces — the house rule (armed patron)", () => {
  it("warns first, no record, no violence", async () => {
    occ = [fake({ stuffId: "rowdy", arms: ["knife"] })];
    const c = ctx({ recordsPath: "/world/lounge/records/86" });
    await enforces.act(c);
    expect(c.say).toHaveBeenCalledTimes(1);
    expect(String(c.say.mock.calls[0]![0]).toLowerCase()).toContain("check it");
    expect(DocumentApi.save).not.toHaveBeenCalled();
    expect(forced).toEqual([]); // no attack on a first warning
  });

  it("still armed after the warning → 86 recorded + ordered out + ejected", async () => {
    occ = [fake({ stuffId: "rowdy", arms: ["knife"] })];
    const state = { warned: { "/id/rowdy": true } };
    const c = ctx(
      { recordsPath: "/world/lounge/records/86", ejectDirection: "south" },
      state,
    );
    await enforces.act(c);
    expect(DocumentApi.save).toHaveBeenCalledWith(
      "/world/lounge/records/86",
      "venue-eighty-six",
      expect.objectContaining({ subjects: expect.arrayContaining(["/id/rowdy"]) }),
    );
    expect(forced).toEqual(["attack rowdy", "fight subdue", "fight rush south"]);
  });

  it("an already-86'd patron skips the warning entirely", async () => {
    occ = [fake({ stuffId: "banned", arms: ["knife"] })];
    vi.mocked(DocumentApi.read).mockResolvedValue({
      getData: () => ({ subjects: ["/id/banned"] }),
    } as never);
    const c = ctx({ recordsPath: "/world/lounge/records/86" });
    await enforces.act(c);
    expect(forced[0]).toBe("attack banned"); // straight to the door
  });
});

describe("enforces — the escalation ladder (a fight)", () => {
  it("shouts first (one beat's grace), no hands yet", async () => {
    occ = [
      fake({ stuffId: "a", fighting: true }),
      fake({ stuffId: "b", fighting: true }),
    ];
    const c = ctx();
    await enforces.act(c);
    expect(c.say).toHaveBeenCalledTimes(1);
    expect(String(c.say.mock.calls[0]![0]).toLowerCase()).toContain("break it up");
    expect(forced).toEqual([]);
    expect(c.state.shouted).toBe(true);
  });

  it("after the shout, wades in hands-first on the believed aggressor", async () => {
    // 'a' is winning (healthy); 'b' is losing (serious). Dave believes the
    // WINNER started it.
    occ = [
      fake({ stuffId: "a", fighting: true, band: "healthy" }),
      fake({ stuffId: "b", fighting: true, band: "serious" }),
    ];
    const c = ctx({}, { shouted: true });
    await enforces.act(c);
    expect(forced).toEqual(["attack a", "fight subdue"]); // no taser fetch
  });

  it("THE WRONG GUY: tases the winner, not the true first-mover", async () => {
    // 'victim' threw first (the ledger would blame them) but is now LOSING
    // (critical); 'bully' is winning (healthy) and visibly armed. Dave saw
    // only the room he walked into → he fetches the taser and hits the
    // one he believes is the aggressor: the bully. He can be wrong; that's
    // the game.
    occ = [
      fake({ stuffId: "victim", fighting: true, band: "critical" }),
      fake({ stuffId: "bully", fighting: true, band: "healthy", arms: ["club"] }),
    ];
    const c = ctx({ taserKeyword: "taser" }, { shouted: true });
    await enforces.act(c);
    // Threat tripped (a weapon's out) → fetch the taser, then hit the
    // believed aggressor (the winner, 'bully'), NOT the true initiator.
    expect(forced).toEqual([
      "go north",
      "get taser",
      "wield taser",
      "switch on taser",
      "go south",
      "attack bully",
      "fight subdue",
    ]);
  });
});
