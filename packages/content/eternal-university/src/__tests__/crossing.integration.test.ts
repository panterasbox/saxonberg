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

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { AppSettings } from "@saxonberg/server/mud/lib/config/AppSettings";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import {
  installStore,
  type Doc,
} from "@saxonberg/server/mud/lib/persistence/__tests__/backend-store";
import PersistentHydrator from "@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
// The rows this stand-up reads live across the packs (content-packs
// wave 3): the locality rows in the locality packs, the species in
// species-and-names, the rest in the platform / generic-objects packs.
const PACKS = fileURLToPath(new URL("../../../", import.meta.url));
const SEEDS = `${PACKS}eternal-university/content`;
const ROOTS = ["eternal-university", "terminus", "world-seed", "species-and-names", "generic-objects", "platform"].map(
  (p) => `${PACKS}${p}/content`,
);

/** Read one real content YAML (from whichever pack ships it) → a template Doc at the given templatePath. */
function seed(relFromSeeds: string, path: string): Doc {
  const file = ROOTS.map((r) => `${r}/${relFromSeeds}`).find((f) => existsSync(f));
  if (!file) throw new Error(`no pack ships ${relFromSeeds}`);
  const parsed = YAML.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
  return {
    path,
    class: parsed.class as string,
    hydratorClass: (parsed.hydratorClass as string) ?? PH,
    data: (parsed.data as Record<string, unknown>) ?? {},
  };
}

const CROSSING = "/world/eternal/university-avenue/crossing";
const ARRIVAL_GATE = "/world/terminus/terminal/arrival-gate";
const HALL = "/world/terminus/terminal/hall";
const GATE_C = "/world/terminus/terminal/departure-gate-c";
const AVENUE_BLOCK = "/world/terminus/counting-houses/avenue-block";
const CAMPUS_GATE = "/world/eternal/university-avenue/campus-gate";
const DOOR = "/world/eternal/university-avenue/campus-gate-door";

// The curated realized set: only the flavorful touchables survive as Stuff
// (the camp chair, the beacon, the gutter ticket-stub). The generic municipal
// furniture (bench / lamppost / litter bin) is now room `details:` prose, not
// populated objects — see crossing.yaml.
const OBJECTS = [
  "/world/eternal/university-avenue/camp-chair",
  "/world/eternal/university-avenue/beacon",
  "/world/eternal/university-avenue/gutter-litter",
];

// Gus + his gear (Phase 4). Gus is a plain populate into the room; his gear
// is not populated — the `/platform/agent/Gus` class equips it at standup (there is no
// declarative seed path to wear/wield gear on a creature). His equip needs a
// resolvable species + body plan, so the test store carries a minimal human
// Species pointing at the real biped body plan.
const GUS = "/world/eternal/university-avenue/npc/gus";
const VEST = "/world/eternal/university-avenue/vest";
const WHISTLE = "/world/eternal/university-avenue/whistle";
const PADDLE = "/world/eternal/university-avenue/paddle";
const WATCH = "/world/eternal/university-avenue/pocket-watch";
const LOG = "/world/eternal/university-avenue/crossing-log";
const THERMOS = "/world/eternal/university-avenue/thermos";
const HUMAN =
  "/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens";
const BIPED = "/stuff/idea/species/BodyPlan/biped";

/** The real seeds under test + the light forward-ref stubs. */
function docs(): Doc[] {
  const real: Doc[] = [
    { path: PH, class: PH, data: {} },
    // The CartesianZones the rooms' coords resolve against.
    seed(
      "world/eternal/university-avenue.yaml",
      "/world/eternal/university-avenue",
    ),
    seed("world/terminus/terminal.yaml", "/world/terminus/terminal"),
    // The crossing area.
    seed("world/eternal/university-avenue/crossing.yaml", CROSSING),
    seed("world/eternal/university-avenue/campus-gate.yaml", CAMPUS_GATE),
    seed("world/eternal/university-avenue/campus-gate-door.yaml", DOOR),
    seed("world/eternal/university-avenue/camp-chair.yaml", OBJECTS[0]!),
    seed("world/eternal/university-avenue/beacon.yaml", OBJECTS[1]!),
    seed("world/eternal/university-avenue/gutter-litter.yaml", OBJECTS[2]!),
    // Gus + his gear templates + the anatomy his equip resolves against.
    seed("world/eternal/university-avenue/npc/gus.yaml", GUS),
    seed("world/eternal/university-avenue/vest.yaml", VEST),
    seed("world/eternal/university-avenue/whistle.yaml", WHISTLE),
    seed("world/eternal/university-avenue/paddle.yaml", PADDLE),
    seed("world/eternal/university-avenue/pocket-watch.yaml", WATCH),
    seed("world/eternal/university-avenue/crossing-log.yaml", LOG),
    seed("world/eternal/university-avenue/thermos.yaml", THERMOS),
    seed("stuff/idea/species/BodyPlan/biped.yaml", BIPED),
    // Minimal human species → the real biped body plan (the full species
    // tree is content-pack installed and out of scope for this seed test).
    {
      path: HUMAN,
      class: "/platform/idea/species/Species",
      hydratorClass: PH,
      data: { name: "human", _bodyPlanPath: BIPED },
    },
    // The reoriented terminal frontage across the avenue.
    seed("world/terminus/terminal/arrival-gate.yaml", ARRIVAL_GATE),
    seed("world/terminus/terminal/hall.yaml", HALL),
    // The hall's populates list stands the public noticeboard up (the
    // labor market's discovery surface — see contract.md).
    seed(
      "world/terminus/terminal/job-board.yaml",
      "/world/terminus/terminal/job-board",
    ),
    seed("world/terminus/terminal/departure-gate-c.yaml", GATE_C),
  ];
  // Light stubs for the rest of the hub the cascade reaches.
  const stub = (p: string, cls = "/platform/location/VoidLocation"): Doc => ({
    path: p,
    class: cls,
    hydratorClass: PH,
    data: { shortDescription: p.split("/").pop()! },
  });
  const stubs: Doc[] = [
    stub(AVENUE_BLOCK),
    stub("/world/terminus/terminal/departure-gate-a"),
    stub("/world/terminus/terminal/departure-gate-b"),
    stub("/world/terminus/terminal/office"),
    // The registry annex off the arrival gate's east frontage (civics).
    stub("/world/terminus/registry/office"),
    stub("/world/terminus/terminal/departure-terminal-c", "/platform/thing/Prop"),
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
    // crossing.west -> the Counting-Houses avenue block (re-homed)
    expect(destOf(crossing, "west")).toBe(AVENUE_BLOCK);
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

  it("populates the crossing with its curated flavor objects", async () => {
    const crossing = (await StuffApi.singleton(
      CROSSING,
    )) as unknown as Stuff & Container;
    for (const p of OBJECTS) {
      const obj = StuffApi.findByTemplatePath(p);
      expect(obj, `expected ${p} to be populated`).toBeTruthy();
    }
    // The camp chair (the relief's) is Foldable and seeded deployed (unfolded).
    const chair = StuffApi.findByTemplatePath(OBJECTS[0]!)!;
    expect(MixinApi.isFoldable(chair)).toBe(true);
    expect((chair as unknown as { isFolded(): boolean }).isFolded()).toBe(false);
    // The kept objects actually live in the room.
    const contents = crossing.getContents();
    expect(contents).toContain(chair as unknown as Stuff & Containable);
    // The generic municipal furniture was cut to prose — no bench / lamppost /
    // litter bin stands up as loose Stuff.
    const contentPaths = (contents as ReadonlyArray<Stuff>).map((s) =>
      s.getTemplatePath(),
    );
    expect(contentPaths).not.toContain(
      "/world/eternal/university-avenue/bench",
    );
    expect(contentPaths).not.toContain(
      "/world/eternal/university-avenue/lamp",
    );
    expect(contentPaths).not.toContain(
      "/world/eternal/university-avenue/litter-bin",
    );
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

  it("renders the terminal clock tower as prose (no ClockTower Stuff stands up)", async () => {
    // The tower is prose now — no `/world/terminus/terminal/clock-tower`
    // Stuff is populated; the crossing's `tower` detail carries the
    // authored base and reads the world clock directly (the live HH:MM
    // append + graceful-degrade are covered in Crossing.test.ts).
    const crossing = (await StuffApi.singleton(CROSSING)) as unknown as {
      getDetail(id: string): string | null;
    };
    expect(
      StuffApi.findByTemplatePath("/world/terminus/terminal/clock-tower"),
    ).toBeFalsy();
    const detail = crossing.getDetail("tower");
    expect(detail).toBeTruthy();
    expect(detail).toContain("civic clock tower");
  });

  it("keeps Gus on the stateless primitive floor (greets/idles, no memory brain)", () => {
    // Statelessness is achieved by COMPOSITION (no engine "decline memory"
    // flag exists): the crossing-ritual fires fresh on every arrival (it does
    // not dedupe by seen-set, so a repeat crosser is ceremonied anew), and NO
    // recognition-building / agentic brain is wired. (Phase 5: the arrival
    // greet graduated to the dedicated crossing-ritual — tally + performance;
    // the plain `greets` now carries only the courteous departure see-off.)
    const parsed = YAML.parse(
      readFileSync(`${SEEDS}/world/eternal/university-avenue/npc/gus.yaml`, {
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
