/**
 * Destination naming (D13) + the crossroads reachability — integration over
 * the REAL Terminus + crossroads + address-Locality seeds. Boots the network,
 * registers the three board Localities, and asserts each destination node
 * names itself by its covering Locality (not "a Teleport Authority terminal"),
 * plus the crossroads standup: the `both` terminal, the free return leg, and
 * the Gate A → crossroads paid route.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { join, dirname } from "path";
import YAML from "yaml";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { AppSettings } from "@saxonberg/server/mud/lib/config/AppSettings";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { FastTravel } from "@saxonberg/content-tpa/src/lib/FastTravel";
import {
  installStore,
  type Doc,
} from "@saxonberg/server/mud/lib/persistence/__tests__/backend-store";
import PersistentHydrator from "@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator";

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
      // Stand the rooms up WITHOUT their troupes (`cast:` stripped) — the
      // transient NPC layer is heavy Phase-4 hydration with its own tests.
      const data = { ...((parsed.data as Record<string, unknown>) ?? {}) };
      delete data.cast;
      out.push({
        path: `/${path}`,
        class: parsed.class as string,
        hydratorClass: (parsed.hydratorClass as string) ?? PH,
        data,
      });
    }
  }
  return out;
}

const SEEDS = fileURLToPath(new URL("../../../world-seed/content", import.meta.url));
// The terminus rows are this pack's; the suburb's are hinkley-hills' (residences D18).
const TERMINUS = fileURLToPath(new URL("../../content", import.meta.url));
const HINKLEY = fileURLToPath(new URL("../../../hinkley-hills/content", import.meta.url));
// The realm + city Locality rows are the platform pack's (content-packs wave 3).
const PLATFORM = fileURLToPath(new URL("../../../platform/content", import.meta.url));

// The newbie-wilds content ships as a pack now; resolve its root as the
// installer does (module resolution of the workspace package).
const WILDS = join(
  dirname(createRequire(import.meta.url).resolve("@saxonberg/content-newbie-wilds/package.json")),
  "content",
);
const ARRIVAL = "/world/terminus/terminal/thing/arrival-terminal";
const GATE_A = "/world/terminus/terminal/thing/departure-terminal-a";
const CROSSROADS = "/world/newbie-wilds/crossroads/terminal";

// A lounge-terminal stub (Gate A's free route target) + its room.
const STUBS: Doc[] = [
  {
    path: "/world/lounge/thing/terminal",
    class: "/system/tpa/thing/TpaTerminal",
    hydratorClass: PH,
    data: { seatIn: "/world/test/lounge-room", shortDescription: "The Lounge", keywords: ["lounge"], directionality: "both", routes: [] },
  },
  { path: "/world/test/lounge-room", class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "the lounge" } },
  { path: "/world/terminus/university-avenue/location/crossing", class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "University Avenue" } },
  // The terminal office lists the clerk under props (a bare-`Thing` stub keeps the
  // cascade light); the registry office's registrar rides `cast:`, which
  // the loader strips.
  { path: "/world/terminus/terminal/agent/clerk", class: "/platform/thing/Thing", hydratorClass: PH, data: { shortDescription: "the clerk" } },
  // ⭐⭐ The two ends of the Kestrel road (logistics W4). Terminus's
  // Delight road and the wilds crossroads both wire an exit into the
  // rejection pack now — the realm is one connected place — and
  // `applyExits` resolves a destination as a singleton, so the row has
  // to exist. Stubs rather than the real rooms: this suite is about how
  // a TPA destination is named from its covering Locality, and loading
  // the whole mining town to satisfy two exits would drag its trades in
  // behind it. The road itself is asserted in the transport pack and in
  // `logistics-corridors`.
  { path: "/world/rejection/kestrel-road/lower-climb", class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "the lower climb" } },
  { path: "/world/rejection/kestrel-road/yard-gate", class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "the yard gate" } },
];

describe("destination naming + crossroads (real seeds)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    // ⚠ A stub must WIN over a real row. University Avenue used to be
    // another pack's, so the walk below never saw it; it is this pack's
    // street now, and the real crossing `cast:`s Gus — a full NPC
    // whose dispositions reach TraitLogic. This suite is about how a
    // destination is NAMED from its covering Locality, not about who is
    // standing in it, so the crossing stays a stub and the override is
    // by path rather than by list order.
    const stubbed = new Set(STUBS.map((d) => d.path as string));
    const docs = [
      { path: PH, class: PH, data: {} },
      { path: "/platform/idea/AddressRegistry", class: "/platform/idea/AddressRegistry", data: {} },
      ...loadDir(join(TERMINUS, "world/terminus"), "world/terminus"),
      ...loadDir(join(HINKLEY, "world/terminus"), "world/terminus"),
      ...loadDir(join(WILDS, "world/newbie-wilds"), "world/newbie-wilds"),
      ...loadDir(join(SEEDS, "stuff/idea/Locality"), "stuff/idea/Locality"),
      ...loadDir(join(PLATFORM, "platform/idea/Locality"), "platform/idea/Locality"),
    ].filter((d) => !stubbed.has(d.path as string));
    installStore([...docs, ...STUBS]);
    await AppSettings.warm();
    // Stand up the AddressRegistry — its postRegister eagerly clones + registers
    // every Locality under /stuff/idea/Locality/ (claiming their address prefixes).
    await StuffApi.singleton("/platform/idea/AddressRegistry");
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
    expect(StuffApi.findByTemplatePath("/world/newbie-wilds/crossroads/hub")).toBeTruthy();

    // Gate A's outbound paid route to the crossroads carries the demo fare.
    const gateA = await StuffApi.singleton<Stuff & FastTravel>(GATE_A);
    expect(gateA.getRoutes().get(CROSSROADS)?.fee).toBe(15);
    expect(gateA.getRoutes().get("/world/lounge/thing/terminal")?.fee).toBe(0);
  });

  it("falls back to the terminal presentation when no Locality covers a stop", async () => {
    // The lounge stub room carries no address → getDestinationLabel falls
    // back to the terminal's own presentation ("The Lounge" shortDescription).
    const lounge = await StuffApi.singleton<Stuff & FastTravel>("/world/lounge/thing/terminal");
    expect(await lounge.getDestinationLabel()).toBe("The Lounge");
  });
});
