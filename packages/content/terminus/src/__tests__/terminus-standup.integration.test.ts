/**
 * Terminus content standup — an integration test over the REAL authored seed
 * YAMLs (loaded from disk, so seed typos in class paths / coords / exits are
 * caught here). Boots the four terminals as the boot manifest would and
 * asserts: all six rooms live, each terminal seated with correct
 * directionality, the two dead gates out of service, the cross-branch exit to
 * the EU plaza present. Forward-refs (lounge terminal, crossroads, clerk) are
 * stubbed — those land in later phases.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import YAML from "yaml";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { AppSettings } from "@saxonberg/server/mud/lib/config/AppSettings";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { FastTravel } from "@saxonberg/server/mud/lib/fasttravel/FastTravel";
import {
  installStore,
  type Doc,
} from "@saxonberg/server/mud/lib/persistence/__tests__/backend-store";
import PersistentHydrator from "@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
const SEED_ROOT = fileURLToPath(
  new URL("../../../terminus/content/world/terminus", import.meta.url),
);

/** Recursively load the terminus seed YAMLs → template docs. */
function loadSeeds(dir: string, rootLen: number): Doc[] {
  const out: Doc[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...loadSeeds(full, rootLen));
    } else if (
      entry.endsWith(".yaml") &&
      // The clerk (a full NPC) + the city-budget Business are Phase-4 content
      // with their own tests; this standup test stubs the clerk (below) and
      // doesn't exercise the budget, so skip the heavy hydration here.
      entry !== "clerk.yaml" &&
      entry !== "budget.yaml"
    ) {
      const rel = full.slice(rootLen).replace(/\.yaml$/, "");
      const path = `/world/terminus${rel.replace(/\\/g, "/")}`;
      const parsed = YAML.parse(readFileSync(full, "utf-8")) as Record<
        string,
        unknown
      >;
      out.push({
        path,
        class: parsed.class as string,
        hydratorClass: (parsed.hydratorClass as string) ?? PH,
        data: (parsed.data as Record<string, unknown>) ?? {},
      });
    }
  }
  return out;
}

const TERMINALS = [
  "/world/terminus/terminal/thing/arrival-terminal",
  "/world/terminus/terminal/thing/departure-terminal-a",
  "/world/terminus/terminal/thing/departure-terminal-b",
  "/world/terminus/terminal/thing/departure-terminal-c",
];
const ROOMS = [
  "/world/terminus/terminal/location/hall",
  "/world/terminus/terminal/location/arrival-gate",
  "/world/terminus/terminal/location/departure-gate-a",
  "/world/terminus/terminal/location/departure-gate-b",
  "/world/terminus/terminal/location/departure-gate-c",
  "/world/terminus/terminal/location/office",
];

/**
 * Forward-ref stubs (lounge terminal, crossroads, clerk, the avenue
 * crossing). This suite is about the TPA HUB standing up from a single
 * anchor; the rooms the hub's exits cascade into are stubbed so a heavy
 * neighbour cannot drag its whole cast in.
 *
 * ⚠ A stub must now WIN over a real row. University Avenue used to be
 * another pack's, so `loadSeeds` never saw it; it is this pack's street
 * now, so the walk finds the real crossing — which `populates:` Gus, a
 * full NPC with dispositions — and the hub test would be booting the
 * avenue's whole cast to prove a terminal seats itself. The avenue has
 * its own stand-up suite (`crossing.integration.test.ts`); this one
 * overrides by path, which is order-independent.
 */
const STUBS: Doc[] = [
  {
    path: "/world/lounge/thing/terminal",
    class: "/world/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: { seatIn: "/world/test/lounge-room", keywords: ["lounge"], directionality: "both", routes: [] },
  },
  { path: "/world/test/lounge-room", class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "the lounge" } },
  {
    path: "/world/newbie-wilds/crossroads/terminal",
    class: "/world/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: { seatIn: "/world/test/crossroads-room", keywords: ["crossroads"], directionality: "both", routes: [] },
  },
  { path: "/world/test/crossroads-room", class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "the crossroads" } },
  { path: "/world/terminus/terminal/agent/clerk", class: "/platform/thing/Prop", hydratorClass: PH, data: { shortDescription: "the clerk" } },
  // The registry office (cascaded via the arrival gate's east exit)
  // populates the registrar — same heavy-NPC stub treatment.
  { path: "/world/terminus/registry/clerk", class: "/platform/thing/Prop", hydratorClass: PH, data: { shortDescription: "the registrar" } },
  { path: "/world/terminus/university-avenue/location/crossing", class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "University Avenue" } },
];

/**
 * Boot the hub the way the real network does — from a SINGLE anchor. The
 * arrival terminal (in reality the lounge's route target) self-seats into the
 * arrival gate; the gate's `north`→hall exit + the hall's exits cascade the
 * rooms, and each gate room `populates:` its own departure terminal. Booting
 * only the arrival terminal must bring the whole hub up (no per-terminal
 * manifest entries) — the #4 lazy-load contract.
 */
async function boot(): Promise<void> {
  await StuffApi.singleton(TERMINALS[0]!);
}

describe("Terminus content standup (real seeds)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    const stubbed = new Set(STUBS.map((d) => d.path as string));
    const seeds = loadSeeds(SEED_ROOT, SEED_ROOT.length).filter(
      (d) => !stubbed.has(d.path as string),
    );
    installStore([{ path: PH, class: PH, data: {} }, ...seeds, ...STUBS]);
    await AppSettings.warm();
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("boots the four terminals and all six rooms", async () => {
    await boot();
    for (const t of TERMINALS) {
      expect(StuffApi.findByTemplatePath(t)).toBeTruthy();
    }
    for (const r of ROOMS) {
      expect(StuffApi.findByTemplatePath(r)).toBeTruthy();
    }
  });

  it("seats each terminal with the authored directionality + status", async () => {
    await boot();
    const arrival = StuffApi.findByTemplatePath<Stuff & FastTravel>(TERMINALS[0]!)!;
    expect(arrival.getDirectionality()).toBe("arrival");
    expect(arrival.getStatus()).toBe("operational");

    const gateA = StuffApi.findByTemplatePath<Stuff & FastTravel>(TERMINALS[1]!)!;
    expect(gateA.getDirectionality()).toBe("departure");
    expect(gateA.getStatus()).toBe("operational");
    // Three routes: the free lounge return, the paid newbie-wilds line,
    // and the cheap hop out to Hinkley Hills (living-world phase 2 — a
    // commuter suburb has to be an ordinary arrangement, not a penalty).
    expect(gateA.getRoutes().size).toBe(3);

    // The two dead gates are out of service.
    for (const dead of [TERMINALS[2]!, TERMINALS[3]!]) {
      const n = StuffApi.findByTemplatePath<Stuff & FastTravel>(dead)!;
      expect(n.getDirectionality()).toBe("departure");
      expect(n.getStatus()).not.toBe("operational");
    }
  });

  it("wires the cross-branch exit from the arrival gate to the EU crossing", async () => {
    await boot();
    const arrivalGate = StuffApi.findByTemplatePath(
      "/world/terminus/terminal/location/arrival-gate",
    )!;
    expect(MixinApi.isExitable(arrivalGate)).toBe(true);
    const exits = (
      arrivalGate as unknown as {
        getExits(): Map<string, { getDestinationTemplatePath(): string | null }>;
      }
    ).getExits();
    const dests = [...exits.values()].map((e) => e.getDestinationTemplatePath());
    expect(dests).toContain("/world/terminus/university-avenue/location/crossing");
    expect(dests).toContain("/world/terminus/terminal/location/hall");
  });

  it("declares every intra-zone connection explicitly on both sides", async () => {
    await boot();
    const HALL = "/world/terminus/terminal/location/hall";
    // Each neighbour's OWN template declares its explicit exit back to the hall
    // (getExits() is the explicit map — grid-derived exits aren't in it). The
    // template is self-describing: read the room, know what it connects to.
    const backExit: Record<string, string> = {
      "/world/terminus/terminal/location/arrival-gate": "south",
      "/world/terminus/terminal/location/departure-gate-a": "west",
      "/world/terminus/terminal/location/departure-gate-b": "east",
      "/world/terminus/terminal/location/departure-gate-c": "north",
      "/world/terminus/terminal/location/office": "down",
    };
    for (const [room, dir] of Object.entries(backExit)) {
      const exits = explicitExits(StuffApi.findByTemplatePath(room)!);
      expect(exits.get(dir)?.getDestinationTemplatePath()).toBe(HALL);
    }
    // And the hall declares all five of its own doorways explicitly.
    const hallExits = explicitExits(StuffApi.findByTemplatePath(HALL)!);
    const hallDests = [...hallExits.values()].map((e) =>
      e.getDestinationTemplatePath(),
    );
    for (const room of Object.keys(backExit)) {
      expect(hallDests).toContain(room);
    }
  });
});

function explicitExits(
  room: Stuff,
): Map<string, { getDestinationTemplatePath(): string | null }> {
  return (
    room as unknown as {
      getExits(): Map<string, { getDestinationTemplatePath(): string | null }>;
    }
  ).getExits();
}
