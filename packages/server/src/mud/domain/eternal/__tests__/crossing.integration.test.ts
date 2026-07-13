/**
 * University Avenue crossing standup — an integration test over the REAL
 * authored seed YAMLs (loaded from disk, so seed typos in class paths /
 * coords / exits / populates are caught here). Boots the crossing (which
 * cascades into the reoriented Terminus terminal across the avenue) and
 * asserts the corrected S→N / E–W geometry:
 *
 *   crossing ──south──> arrival-gate ──south──> hall ──south──> gate-c
 *      (reciprocal norths back up the chain)
 *   crossing ──west──> bank
 *   crossing ──north──> LOCKED university gate (traverse vetoes 'locked')
 *
 * plus the room standing up with its populated furniture/fixtures.
 *
 * Heavy forward-refs (the bank interior, the other departure gates, the
 * office, the departure terminals) are stubbed — they have their own tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { AppSettings } from "../../../lib/config/AppSettings";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";
import {
  installStore,
  type Doc,
} from "../../lounge/__tests__/lounge-fixtures";
import PersistentHydrator from "../../../lib/persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
const SEEDS = fileURLToPath(new URL("../../../seeds", import.meta.url));

/** Read one real seed YAML → a template Doc at the given templatePath. */
function seed(relFromSeeds: string, path: string): Doc {
  const parsed = YAML.parse(
    readFileSync(`${SEEDS}/${relFromSeeds}`, "utf-8"),
  ) as Record<string, unknown>;
  return {
    path,
    class: parsed.class as string,
    hydratorClass: (parsed.hydratorClass as string) ?? PH,
    data: (parsed.data as Record<string, unknown>) ?? {},
  };
}

const CROSSING = "/domain/eternal/university-avenue/crossing";
const ARRIVAL_GATE = "/domain/terminus/terminal/arrival-gate";
const HALL = "/domain/terminus/terminal/hall";
const GATE_C = "/domain/terminus/terminal/departure-gate-c";
const BANK = "/domain/eternal/university-avenue/bank";
const CAMPUS_GATE = "/domain/eternal/university-avenue/campus-gate";
const DOOR = "/domain/eternal/university-avenue/campus-gate-door";

const OBJECTS = [
  "/domain/eternal/university-avenue/bench",
  "/domain/eternal/university-avenue/camp-chair",
  "/domain/eternal/university-avenue/lamp",
  "/domain/eternal/university-avenue/beacon",
  "/domain/eternal/university-avenue/litter-bin",
  "/domain/eternal/university-avenue/gutter-litter",
];

// Gus + his gear (Phase 4). Gus is a plain populate into the room; his gear
// is not populated — the `/obj/Gus` class equips it at standup (there is no
// declarative seed path to wear/wield gear on a creature). His equip needs a
// resolvable species + body plan, so the test store carries a minimal human
// Species pointing at the real biped body plan.
const GUS = "/domain/eternal/university-avenue/npc/gus";
const VEST = "/domain/eternal/university-avenue/vest";
const WHISTLE = "/domain/eternal/university-avenue/whistle";
const PADDLE = "/domain/eternal/university-avenue/paddle";
const WATCH = "/domain/eternal/university-avenue/pocket-watch";
const LOG = "/domain/eternal/university-avenue/crossing-log";
const THERMOS = "/domain/eternal/university-avenue/thermos";
const HUMAN =
  "/lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens";
const BIPED = "/lib/body-plans/biped";

/** The real seeds under test + the light forward-ref stubs. */
function docs(): Doc[] {
  const real: Doc[] = [
    { path: PH, class: PH, data: {} },
    // The CartesianZones the rooms' coords resolve against.
    seed(
      "domain/eternal/university-avenue.yaml",
      "/domain/eternal/university-avenue",
    ),
    seed("domain/terminus/terminal.yaml", "/domain/terminus/terminal"),
    // The crossing area.
    seed("domain/eternal/university-avenue/crossing.yaml", CROSSING),
    seed("domain/eternal/university-avenue/campus-gate.yaml", CAMPUS_GATE),
    seed("domain/eternal/university-avenue/campus-gate-door.yaml", DOOR),
    seed("domain/eternal/university-avenue/bench.yaml", OBJECTS[0]!),
    seed("domain/eternal/university-avenue/camp-chair.yaml", OBJECTS[1]!),
    seed("domain/eternal/university-avenue/lamp.yaml", OBJECTS[2]!),
    seed("domain/eternal/university-avenue/beacon.yaml", OBJECTS[3]!),
    seed("domain/eternal/university-avenue/litter-bin.yaml", OBJECTS[4]!),
    seed("domain/eternal/university-avenue/gutter-litter.yaml", OBJECTS[5]!),
    // Gus + his gear templates + the anatomy his equip resolves against.
    seed("domain/eternal/university-avenue/npc/gus.yaml", GUS),
    seed("domain/eternal/university-avenue/vest.yaml", VEST),
    seed("domain/eternal/university-avenue/whistle.yaml", WHISTLE),
    seed("domain/eternal/university-avenue/paddle.yaml", PADDLE),
    seed("domain/eternal/university-avenue/pocket-watch.yaml", WATCH),
    seed("domain/eternal/university-avenue/crossing-log.yaml", LOG),
    seed("domain/eternal/university-avenue/thermos.yaml", THERMOS),
    seed("lib/body-plans/biped.yaml", BIPED),
    // Minimal human species → the real biped body plan (the full species
    // tree is content-pack installed and out of scope for this seed test).
    {
      path: HUMAN,
      class: "/lib/species/Species",
      hydratorClass: PH,
      data: { name: "human", _bodyPlanPath: BIPED },
    },
    // The reoriented terminal frontage across the avenue.
    seed("domain/terminus/terminal/arrival-gate.yaml", ARRIVAL_GATE),
    seed("domain/terminus/terminal/hall.yaml", HALL),
    seed("domain/terminus/terminal/departure-gate-c.yaml", GATE_C),
    // The clock-tower (arrival-gate populates it by templatePath).
    seed(
      "domain/terminus/terminal/clock-tower.yaml",
      "/domain/terminus/terminal/clock-tower",
    ),
  ];
  // Light stubs for the rest of the hub the cascade reaches.
  const stub = (p: string, cls = "/lib/stuff/VoidLocation"): Doc => ({
    path: p,
    class: cls,
    hydratorClass: PH,
    data: { shortDescription: p.split("/").pop()! },
  });
  const stubs: Doc[] = [
    stub(BANK),
    stub("/domain/terminus/terminal/departure-gate-a"),
    stub("/domain/terminus/terminal/departure-gate-b"),
    stub("/domain/terminus/terminal/office"),
    stub("/domain/terminus/terminal/departure-terminal-c", "/lib/stuff/Thing"),
  ];
  return [...real, ...stubs];
}

/** Explicit (authored) exit map for a room. */
function exitsOf(
  room: Stuff,
): Map<string, { getDestinationTemplatePath(): string | null }> {
  return (
    room as unknown as {
      getExits(): Map<
        string,
        { getDestinationTemplatePath(): string | null }
      >;
    }
  ).getExits();
}

function destOf(room: Stuff, dir: string): string | null {
  return exitsOf(room).get(dir)?.getDestinationTemplatePath() ?? null;
}

// Booting the crossing loads + clones the real terminal + crossing seed
// graph from disk; the first (cold) case runs ~11s, over the 5s default.
// Bump the whole file so it never flakes on timeout in isolation.
vi.setConfig({ testTimeout: 30000 });

describe("University Avenue crossing standup (real seeds)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    installStore(docs());
    await AppSettings.warm();
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("stands the crossing up and cascades the reoriented terminal", async () => {
    await StuffApi.singleton(CROSSING);
    for (const p of [CROSSING, ARRIVAL_GATE, HALL, GATE_C, CAMPUS_GATE]) {
      expect(StuffApi.findByTemplatePath(p)).toBeTruthy();
    }
  });

  it("wires the corrected S→N chain with reciprocal exits on both sides", async () => {
    await StuffApi.singleton(CROSSING);
    const crossing = StuffApi.findByTemplatePath(CROSSING)!;
    const arrivalGate = StuffApi.findByTemplatePath(ARRIVAL_GATE)!;
    const hall = StuffApi.findByTemplatePath(HALL)!;
    const gateC = StuffApi.findByTemplatePath(GATE_C)!;

    // crossing.south <-> arrival-gate.north
    expect(destOf(crossing, "south")).toBe(ARRIVAL_GATE);
    expect(destOf(arrivalGate, "north")).toBe(CROSSING);
    // arrival-gate.south <-> hall.north
    expect(destOf(arrivalGate, "south")).toBe(HALL);
    expect(destOf(hall, "north")).toBe(ARRIVAL_GATE);
    // hall.south <-> gate-c.north
    expect(destOf(hall, "south")).toBe(GATE_C);
    expect(destOf(gateC, "north")).toBe(HALL);
    // crossing.west -> bank
    expect(destOf(crossing, "west")).toBe(BANK);
    // No east exit (Gus soft-walls it).
    expect(exitsOf(crossing).has("east")).toBe(false);
  });

  it("guards the north gate with a locked Door that vetoes traverse", async () => {
    await StuffApi.singleton(CROSSING);
    const crossing = StuffApi.findByTemplatePath(CROSSING)!;
    const north = exitsOf(crossing).get("north") as unknown as {
      getDoor(): { isLocked(): boolean } | null;
      canTraverse(
        mover: Stuff & Containable,
        mode?: string,
      ): { ok: boolean; gate?: string };
    };
    expect(north).toBeTruthy();
    expect(north.getDoor()?.isLocked()).toBe(true);
    const mover = {} as unknown as Stuff & Containable;
    const guard = north.canTraverse(mover);
    expect(guard.ok).toBe(false);
    expect(guard.gate).toBe("locked");
  });

  it("populates the crossing with its furniture and fixtures", async () => {
    const crossing = (await StuffApi.singleton(
      CROSSING,
    )) as unknown as Stuff & Container;
    for (const p of OBJECTS) {
      const obj = StuffApi.findByTemplatePath(p);
      expect(obj, `expected ${p} to be populated`).toBeTruthy();
    }
    // The bench is a Postured host (its authored `sit` slot lit up).
    const bench = StuffApi.findByTemplatePath(OBJECTS[0]!)!;
    expect(MixinApi.isPostured(bench)).toBe(true);
    // The camp chair is Foldable and seeded deployed (unfolded).
    const chair = StuffApi.findByTemplatePath(OBJECTS[1]!)!;
    expect(MixinApi.isFoldable(chair)).toBe(true);
    expect((chair as unknown as { isFolded(): boolean }).isFolded()).toBe(false);
    // The furniture actually lives in the room.
    const contents = crossing.getContents();
    expect(contents).toContain(bench as unknown as Stuff & Containable);
  });

  it("boots Gus into the room, dressed for his shift", async () => {
    const crossing = (await StuffApi.singleton(
      CROSSING,
    )) as unknown as Stuff & Container;
    const gus = StuffApi.findByTemplatePath(GUS);
    expect(gus, "Gus stands up in the crossing").toBeTruthy();
    // He's a plain populate — in the room's contents (his gear is inside HIM,
    // not loose in the room).
    expect(crossing.getContents()).toContain(
      gus as unknown as Stuff & Containable,
    );

    const g = gus as unknown as {
      getOccupants(slot: string): ReadonlySet<Stuff>;
      getContents(): ReadonlyArray<Stuff>;
    };
    const wornOn = (slot: string): string[] =>
      [...g.getOccupants(slot)].map((s) => s.getTemplatePath() ?? "");
    // Worn: the hi-vis vest on the torso, the whistle on the neck.
    expect(wornOn("torso")).toContain(VEST);
    expect(wornOn("neck")).toContain(WHISTLE);
    // Wielded: the STOP paddle in the right hand.
    expect(wornOn("hand:right")).toContain(PADDLE);
    // Carried in inventory: the drifting watch, the crossing-log, the thermos
    // he never opens.
    const carried = g.getContents().map((s) => s.getTemplatePath() ?? "");
    for (const p of [WATCH, LOG, THERMOS]) {
      expect(carried, `expected Gus to carry ${p}`).toContain(p);
    }
    // The loose room thermos was reconciled onto Gus — it is NOT loose in the
    // room.
    expect(
      (crossing.getContents() as ReadonlyArray<Stuff>).map((s) =>
        s.getTemplatePath(),
      ),
    ).not.toContain(THERMOS);
  });

  it("keeps Gus on the stateless primitive floor (greets/idles, no memory brain)", () => {
    // Statelessness is achieved by COMPOSITION (no engine "decline memory"
    // flag exists): the crossing-ritual fires fresh on every arrival (it does
    // not dedupe by seen-set, so a repeat crosser is ceremonied anew), and NO
    // recognition-building / agentic brain is wired. (Phase 5: the arrival
    // greet graduated to the dedicated crossing-ritual — tally + performance;
    // the plain `greets` now carries only the courteous departure see-off.)
    const parsed = YAML.parse(
      readFileSync(`${SEEDS}/domain/eternal/university-avenue/npc/gus.yaml`, {
        encoding: "utf-8",
      }),
    ) as { data: { behaviors: Array<{ brain: string; trigger: string }> } };
    const behaviors = parsed.data.behaviors ?? [];
    const brains = behaviors.map((b) => b.brain);
    expect(brains).toContain("/lib/behavior/idles");
    // The crossing ritual on arrival (the always-fresh crossing ceremony).
    const ritualTriggers = behaviors
      .filter((b) => b.brain === "/lib/behavior/crossing-ritual")
      .map((b) => b.trigger);
    expect(ritualTriggers).toContain("arrival");
    // A courteous see-off on departure (plain greets, no tally).
    const greetTriggers = behaviors
      .filter((b) => b.brain === "/lib/behavior/greets")
      .map((b) => b.trigger);
    expect(greetTriggers).toContain("departure");
    // No auto-introduce / branching-tree / trait-chatter — the deliberately
    // primitive, forgets-you floor.
    for (const banned of [
      "/lib/behavior/introduces",
      "/lib/behavior/tree-dialogue",
      "/lib/behavior/converses",
    ]) {
      expect(brains, `Gus must not wire ${banned}`).not.toContain(banned);
    }
  });
});
