/**
 * Destination naming (D13) + the crossroads reachability — integration over
 * the REAL Terminus + crossroads + address-Locality seeds. Boots the network,
 * registers the three board Localities, and asserts each destination node
 * names itself by its covering Locality (not "a Teleport Authority terminal"),
 * plus the crossroads standup: the `both` terminal, the free return leg, and
 * the Gate A → crossroads paid route.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import YAML from "yaml";
import { StuffApi } from "../../../api/stuff";
import { AppSettings } from "../../../lib/config/AppSettings";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { FastTravel } from "../../../lib/fasttravel/FastTravel";
import {
  installStore,
  type Doc,
} from "../../lounge/__tests__/lounge-fixtures";
import PersistentHydrator from "../../../obj/persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;

function loadDir(dir: string, pathPrefixFrom: string): Doc[] {
  const out: Doc[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...loadDir(full, pathPrefixFrom));
    } else if (
      entry.endsWith(".yaml") &&
      entry !== "clerk.yaml" &&
      entry !== "budget.yaml"
    ) {
      const idx = full.indexOf(pathPrefixFrom);
      const path = full.slice(idx).replace(/\.yaml$/, "").replace(/\\/g, "/");
      const parsed = YAML.parse(readFileSync(full, "utf-8")) as Record<
        string,
        unknown
      >;
      out.push({
        path: `/${path}`,
        class: parsed.class as string,
        hydratorClass: (parsed.hydratorClass as string) ?? PH,
        data: (parsed.data as Record<string, unknown>) ?? {},
      });
    }
  }
  return out;
}

const SEEDS = fileURLToPath(new URL("../../../seeds", import.meta.url));

const ARRIVAL = "/domain/terminus/terminal/arrival-terminal";
const GATE_A = "/domain/terminus/terminal/departure-terminal-a";
const CROSSROADS = "/domain/newbie-wilds/crossroads/terminal";

// A lounge-terminal stub (Gate A's free route target) + its room.
const STUBS: Doc[] = [
  {
    path: "/domain/lounge/terminal",
    class: "/domain/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: { seatIn: "/domain/test/lounge-room", shortDescription: "The Lounge", keywords: ["lounge"], directionality: "both", routes: [] },
  },
  { path: "/domain/test/lounge-room", class: "/obj/VoidLocation", hydratorClass: PH, data: { shortDescription: "the lounge" } },
  { path: "/domain/eternal/university-avenue/crossing", class: "/obj/VoidLocation", hydratorClass: PH, data: { shortDescription: "University Avenue" } },
  // The office populates the clerk (a full NPC, Phase 4) — stub it here so the
  // cascade resolves without heavy NPC hydration.
  { path: "/domain/terminus/terminal/clerk", class: "/obj/Prop", hydratorClass: PH, data: { shortDescription: "the clerk" } },
  // The registry office (cascaded off the arrival gate, civics) populates
  // the registrar — same stub treatment.
  { path: "/domain/terminus/registry/clerk", class: "/obj/Prop", hydratorClass: PH, data: { shortDescription: "the registrar" } },
];

describe("destination naming + crossroads (real seeds)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    const docs = [
      { path: PH, class: PH, data: {} },
      { path: "/obj/AddressRegistry", class: "/obj/AddressRegistry", data: {} },
      ...loadDir(join(SEEDS, "domain/terminus"), "domain/terminus"),
      ...loadDir(join(SEEDS, "domain/newbie-wilds"), "domain/newbie-wilds"),
      ...loadDir(join(SEEDS, "obj/Locality"), "obj/Locality"),
      ...STUBS,
    ];
    installStore(docs);
    await AppSettings.warm();
    // Stand up the AddressRegistry — its postRegister eagerly clones + registers
    // every Locality under /obj/Locality/ (claiming their address prefixes).
    await StuffApi.singleton("/obj/AddressRegistry");
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("names each destination by its covering Locality", async () => {
    const arrival = await StuffApi.singleton<Stuff & FastTravel>(ARRIVAL);
    const crossroads = await StuffApi.singleton<Stuff & FastTravel>(CROSSROADS);
    expect(await arrival.getDestinationLabel()).toBe("Terminus");
    expect(await crossroads.getDestinationLabel()).toBe("The Last Counted Mile");
  });

  it("stands up the crossroads with a free return + the Gate A paid route", async () => {
    const crossroads = await StuffApi.singleton<Stuff & FastTravel>(CROSSROADS);
    expect(crossroads.getDirectionality()).toBe("both");
    // Free return leg back to the Terminus arrival node.
    expect(crossroads.getRoutes().get(ARRIVAL)?.fee).toBe(0);
    // The crossroads landing hub is live.
    expect(StuffApi.findByTemplatePath("/domain/newbie-wilds/crossroads/hub")).toBeTruthy();

    // Gate A's outbound paid route to the crossroads carries the demo fare.
    const gateA = await StuffApi.singleton<Stuff & FastTravel>(GATE_A);
    expect(gateA.getRoutes().get(CROSSROADS)?.fee).toBe(15);
    expect(gateA.getRoutes().get("/domain/lounge/terminal")?.fee).toBe(0);
  });

  it("falls back to the terminal presentation when no Locality covers a stop", async () => {
    // The lounge stub room carries no address → getDestinationLabel falls
    // back to the terminal's own presentation ("The Lounge" shortDescription).
    const lounge = await StuffApi.singleton<Stuff & FastTravel>("/domain/lounge/terminal");
    expect(await lounge.getDestinationLabel()).toBe("The Lounge");
  });
});
