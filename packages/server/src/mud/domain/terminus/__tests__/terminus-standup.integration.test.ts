/**
 * Terminus content standup — an integration test over the REAL authored seed
 * YAMLs (loaded from disk, so seed typos in class paths / coords / exits are
 * caught here). Boots the four terminals as the boot manifest would and
 * asserts: all six rooms live, each terminal seated with correct
 * directionality, the two dead gates out of service, the cross-branch exit to
 * the EU plaza present. Forward-refs (lounge terminal, crossroads, clerk) are
 * stubbed — those land in later phases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import YAML from "yaml";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { AppSettings } from "../../../lib/config/AppSettings";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { FastTravel } from "../../../lib/fasttravel/FastTravel";
import {
  installStore,
  type Doc,
} from "../../lounge/__tests__/lounge-fixtures";
import PersistentHydrator from "../../../lib/persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
const SEED_ROOT = fileURLToPath(
  new URL("../../../seeds/domain/terminus", import.meta.url),
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
      const path = `/domain/terminus${rel.replace(/\\/g, "/")}`;
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
  "/domain/terminus/terminal/arrival-terminal",
  "/domain/terminus/terminal/departure-terminal-a",
  "/domain/terminus/terminal/departure-terminal-b",
  "/domain/terminus/terminal/departure-terminal-c",
];
const ROOMS = [
  "/domain/terminus/terminal/hall",
  "/domain/terminus/terminal/arrival-gate",
  "/domain/terminus/terminal/departure-gate-a",
  "/domain/terminus/terminal/departure-gate-b",
  "/domain/terminus/terminal/departure-gate-c",
  "/domain/terminus/terminal/office",
];

/** Forward-ref stubs (lounge terminal, crossroads, clerk, plaza). */
const STUBS: Doc[] = [
  {
    path: "/domain/lounge/terminal",
    class: "/domain/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: { seatIn: "/domain/test/lounge-room", keywords: ["lounge"], directionality: "both", routes: [] },
  },
  { path: "/domain/test/lounge-room", class: "/lib/stuff/VoidLocation", hydratorClass: PH, data: { shortDescription: "the lounge" } },
  {
    path: "/domain/newbie-wilds/crossroads/terminal",
    class: "/domain/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: { seatIn: "/domain/test/crossroads-room", keywords: ["crossroads"], directionality: "both", routes: [] },
  },
  { path: "/domain/test/crossroads-room", class: "/lib/stuff/VoidLocation", hydratorClass: PH, data: { shortDescription: "the crossroads" } },
  { path: "/domain/terminus/terminal/clerk", class: "/lib/stuff/Thing", hydratorClass: PH, data: { shortDescription: "the clerk" } },
  { path: "/domain/eternal/university-avenue/plaza", class: "/lib/stuff/VoidLocation", hydratorClass: PH, data: { shortDescription: "University Avenue" } },
];

async function boot(): Promise<void> {
  for (const t of TERMINALS) await StuffApi.singleton(t);
}

describe("Terminus content standup (real seeds)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    const seeds = loadSeeds(SEED_ROOT, SEED_ROOT.length);
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
    expect(gateA.getRoutes().size).toBe(2);

    // The two dead gates are out of service.
    for (const dead of [TERMINALS[2]!, TERMINALS[3]!]) {
      const n = StuffApi.findByTemplatePath<Stuff & FastTravel>(dead)!;
      expect(n.getDirectionality()).toBe("departure");
      expect(n.getStatus()).not.toBe("operational");
    }
  });

  it("wires the cross-branch exit from the arrival gate to the EU plaza", async () => {
    await boot();
    const arrivalGate = StuffApi.findByTemplatePath(
      "/domain/terminus/terminal/arrival-gate",
    )!;
    expect(MixinApi.isExitable(arrivalGate)).toBe(true);
    const exits = (
      arrivalGate as unknown as {
        getExits(): Map<string, { getDestinationTemplatePath(): string | null }>;
      }
    ).getExits();
    const dests = [...exits.values()].map((e) => e.getDestinationTemplatePath());
    expect(dests).toContain("/domain/eternal/university-avenue/plaza");
    expect(dests).toContain("/domain/terminus/terminal/hall");
  });

  it("declares every intra-zone connection explicitly on both sides", async () => {
    await boot();
    const HALL = "/domain/terminus/terminal/hall";
    // Each neighbour's OWN template declares its explicit exit back to the hall
    // (getExits() is the explicit map — grid-derived exits aren't in it). The
    // template is self-describing: read the room, know what it connects to.
    const backExit: Record<string, string> = {
      "/domain/terminus/terminal/arrival-gate": "north",
      "/domain/terminus/terminal/departure-gate-a": "west",
      "/domain/terminus/terminal/departure-gate-b": "east",
      "/domain/terminus/terminal/departure-gate-c": "south",
      "/domain/terminus/terminal/office": "down",
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
