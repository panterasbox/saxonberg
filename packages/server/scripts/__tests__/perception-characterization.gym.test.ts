/**
 * perception-characterization — what every place in the realm looks,
 * sounds and smells like, as a committed artifact.
 *
 * ⭐⭐ **Why this exists, and why it is a golden rather than
 * assertions.** The routing build drains four hand-written graph walks
 * — `VisionModality.walkFluxAt`, `SoundModality.walkAt`,
 * `SmellModality.walkAt`, `AudienceGather.walkOutward` — onto one
 * shared skeleton. All four thread **one mutable `visited` set**
 * through a depth-first recursion, which means neighbour order decides
 * which room is charged at which depth, how much a listener hears, and
 * **the compass direction printed with the sound**. Nobody chose that
 * behaviour; it is what four copies of a walk produce. It is also
 * behaviour a player can perceive, so the migration has to preserve it
 * exactly — and *exactly* is not something a handful of unit tests on
 * synthetic grids can establish.
 *
 * So: boot every shipped place, plant an ear in each, and write down
 * the lux, the dB, the ppm and every gather arrival **with its
 * direction**. The golden is captured from the UNMIGRATED walks (W1)
 * and must match byte-for-byte after the migration (W3). ⚠ That means
 * anyone later "tidying" neighbour order in a modality breaks this
 * test, which is the entire point: the order-dependence is pinned
 * deliberately (`routing-plan.md` § Risks 12), not blessed.
 *
 * ⚠⚠ **A gym test, and it must stay one.** `GYM_TESTS` in
 * `vitest.config.ts` is the single source of truth — a gym file NOT in
 * that list runs **nowhere**, and this one boots ~124 places where the
 * terminus standup boots six. It has its own CI job. Moving it into
 * `pnpm test` would put a whole-realm standup on every test run.
 *
 * Regenerate deliberately:
 *
 *     PERCEPTION_GOLDEN_UPDATE=1 pnpm test:gym
 */

import "../../src/test-bootstrap";
import { describe, it, expect, beforeAll } from "vitest";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import YAML from "yaml";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { StuffApi } from "../../src/mud/api/stuff";
import { MixinApi } from "../../src/mud/api/mixin";
import { ContainmentApi } from "../../src/mud/api/containment";
import { AppSettings } from "../../src/mud/lib/config/AppSettings";
import { WorldClockApi } from "../../src/mud/api/worldclock";
import { AudienceGather } from "../../src/mud/lib/perception/AudienceGather";
import { SensorMixin } from "../../src/mud/lib/message/Sensor";
import { ContainableMixin } from "../../src/mud/lib/spatial/Containable";
import { Idea } from "../../src/mud/lib/stuff/Idea";
import { PerceptionApi } from "../../src/mud/api/perception";
import type { VisionModality } from "../../src/mud/platform/idea/modalities/VisionModality";
import type { SoundModality } from "../../src/mud/platform/idea/modalities/SoundModality";
import type { SmellModality } from "../../src/mud/platform/idea/modalities/SmellModality";
import type { Stuff } from "../../src/mud/lib/stuff/Stuff";
import type { Container } from "../../src/mud/lib/spatial/Container";
import type { Containable } from "../../src/mud/lib/spatial/Containable";
import {
  installStore,
  type Doc,
} from "../../src/mud/lib/persistence/__tests__/backend-store";
import TemplateApplier from "../../src/mud/platform/idea/TemplateApplier";
import { installV1QuantityTagTables } from "../../src/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { CONTENT, effectiveRow, inheritanceIndex } from "../pack-roots";
import { scanLocationGraph } from "../check-location-graph";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, "golden", "perception-characterization.json");

/** A bare ear — the `AudienceGather` tests' probe shape exactly. */
class Ear extends SensorMixin(ContainableMixin(Idea)) {}

/**
 * The seven modality singletons, cloned from their REAL rows (the
 * platform pack's `platform/idea/modalities/*.yaml`) rather than built
 * by the in-memory test helper — the fixture already installed every
 * row, and a characterization of shipped content should read the
 * shipped tuning.
 */
const MODALITIES = [
  "vision",
  "sound",
  "smell",
  "touch",
  "taste",
  "verbal-esp",
  "emotive-esp",
] as const;

const vision = (): VisionModality =>
  PerceptionApi.modalityByName("vision") as unknown as VisionModality;
const sound = (): SoundModality =>
  PerceptionApi.modalityByName("sound") as unknown as SoundModality;
const smell = (): SmellModality =>
  PerceptionApi.modalityByName("smell") as unknown as SmellModality;

interface PlaceReading {
  place: string;
  /** `null` when the place would not clone — recorded, never skipped. */
  failed?: string;
  lux?: number;
  peakLux?: number;
  lightSources?: number;
  colourTemperature?: number | null;
  db?: number | null;
  soundSources?: number;
  ppm?: number | null;
  smell?: string | null;
  /** The gather, in walk order, with the direction it was heard from. */
  gather?: Array<{ at: string; db: number; direction: string | null }>;
}

/** 3 dp — enough to catch a changed attenuation, blind to float noise. */
const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Install EVERY authored row, not just the places: a place clones its
 * exits, its fixtures, its floor material and its props, and a missing
 * row anywhere in that cascade is a *Template not found* throw.
 * `cast:` is stripped — the standup's move, and exactly what cast
 * transience means: the set without the actors.
 */
function installEveryRow(): void {
  // ⚠⚠ `idx.rules` is NOT optional decoration. `effectiveRow` without
  // it merges every field with `replace`, so a child row REPLACES its
  // parent's `props:` instead of substituting by entry — and the first
  // run of this fixture proved the cost: Dave's Bar came up with five
  // props instead of twenty-five, the back-bar among the missing, and
  // the house tablet then threw *"the host must be populated earlier
  // in the list"*. The helper's own header warns about this exact
  // failure in these exact words ("`bar-content` promptly asserted
  // that Dave's Bar had no glass rack"), which is worth knowing: the
  // trap is documented and still catches the next caller.
  const idx = inheritanceIndex();
  const rows = idx.rows;
  const docs: Doc[] = [{ path: TemplateApplier.templatePath, class: TemplateApplier.templatePath, data: {} }];
  for (const row of rows.values()) {
    const eff = effectiveRow(row.path, rows, idx.rules);
    const data = { ...eff.data };
    delete data.cast;
    docs.push({ path: row.path, class: eff.class ?? undefined, data });
  }
  installStore(docs);
}

/**
 * ⚠⚠ **The boot union, and why the fixture cannot skip it.** A pack
 * declares `boot:` entries for singletons that other content resolves
 * SYNCHRONOUSLY during hydration, and the platform pack says so in as
 * many words about this exact case: *"a garment row authoring
 * `constructionForm: woven` THROWS at hydration if the roster is cold,
 * so this must precede any locality's props: clone."*
 *
 * The first run of this fixture proved it the hard way — **63 of 128
 * places failed to clone**, 61 of them on *unknown form 'woven'*,
 * because `FabricCatalogue` had never been warmed. A fixture that
 * characterizes half the realm and reports green is worse than no
 * fixture, so the boot union is read off every pack's manifest and
 * cloned in pack order, exactly as the installer does it.
 */
function bootUnion(): string[] {
  const out: string[] = [];
  for (const pack of readdirSync(CONTENT).sort()) {
    const manifest = join(CONTENT, pack, "pack.yaml");
    if (!existsSync(manifest)) continue;
    const parsed = YAML.parse(readFileSync(manifest, "utf8")) as {
      boot?: Array<{ template?: string }>;
    } | null;
    for (const entry of parsed?.boot ?? []) {
      if (typeof entry?.template === "string") out.push(entry.template);
    }
  }
  return out;
}

const readings: PlaceReading[] = [];
let placeCount = 0;

describe("perception characterization — every place in the realm", () => {
  beforeAll(async () => {
    // ⚠⚠ **Pin the clock, or the golden does not reproduce.** The first
    // two runs of this fixture differed on `lux` and nothing else:
    // `signalAt` samples `CelestialApi.skyFactorNow()`, so every
    // sky-exposed place reads a different number as the game day
    // advances in real time. `peakLux` was byte-identical across runs
    // because `skyFactorDailyPeak()` is time-invariant — which is the
    // tell that found it. A golden that cannot reproduce proves
    // nothing, and worse, its noise would MASK the behaviour change
    // this fixture exists to catch.
    //
    // Pinned to a fixed epoch rather than dropping the live reading:
    // the live walk and the peak walk differ in more than a scalar
    // (the sky leg can be the only contributor in one and not the
    // other), so keeping both is keeping coverage.
    WorldClockApi._setNowProviderForTesting(() => 1_760_000_000_000);

    StuffApi.clearAll();
    installEveryRow();
    // ⚠ A Quantity field cannot round-trip without the tag tables, and
    // the failure reads as a Document problem three frames away:
    // *"marshaller resolver not wired"* while cloning a turf bank.
    installV1QuantityTagTables();
    await AppSettings.warm();

    // The boot union first — a cold catalogue THROWS during a place's
    // own hydration, not politely at the end.
    const bootFailures: string[] = [];
    for (const template of bootUnion()) {
      try {
        await StuffApi.singleton(template);
      } catch (e) {
        bootFailures.push(
          `${template}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
    if (bootFailures.length > 0) {
      console.log(
        `  ⚠ ${bootFailures.length} boot singleton(s) did not clone:\n` +
          bootFailures.map((f) => `    ${f}`).join("\n")
      );
    }

    for (const name of MODALITIES) {
      await StuffApi.singleton(`/platform/idea/modalities/${name}`);
    }
    // ⚠ The name→singleton map caches a MISS: anything in the boot
    // union that resolved a modality before these were cloned left the
    // cache saying there is no vision.
    PerceptionApi._resetModalityCacheForTest();

    // ⚠ DERIVED, never listed: a row is a place iff its effective class
    // extends a Location root AND composes `SingletonMixin`. This is
    // `check-location-graph`'s own derivation, reused rather than
    // copied — two copies of "what is a place" would drift, and the
    // gate is the one that is already CI-enforced.
    const places = scanLocationGraph()
      .nodes.map((n) => n.identity)
      .sort();
    placeCount = places.length;

    const live: Array<{ path: string; loc: Stuff & Container }> = [];
    for (const path of places) {
      try {
        const loc = await StuffApi.singleton<Stuff>(path);
        if (!loc || !MixinApi.isContainer(loc)) {
          readings.push({ place: path, failed: "not a container" });
          continue;
        }
        live.push({ path, loc: loc as Stuff & Container });
      } catch (e) {
        readings.push({
          place: path,
          failed: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // One ear per place, planted BEFORE any reading: the gather needs
    // something to reach in every neighbour, and a direction to print.
    const earAt = new Map<string, string>();
    for (const { path, loc } of live) {
      const ear = await StuffApi.create(() => new Ear());
      ContainmentApi.move(ear as unknown as Stuff & Containable, loc);
      earAt.set(ear.stuffId, path);
    }

    for (const { path, loc } of live) {
      const reading: PlaceReading = { place: path };

      const light = vision().signalAt(loc);
      reading.lux = round(light.intensity.rawValue());
      reading.lightSources = light.sources.length;
      reading.colourTemperature = light.colorTemperature
        ? round(light.colorTemperature.rawValue())
        : null;
      reading.peakLux = round(vision().peakSignalAt(loc).intensity.rawValue());

      const heard = sound().signalAt(loc);
      reading.db = heard ? round(heard.level.rawValue()) : null;
      reading.soundSources = heard ? heard.sources.length : 0;

      const smelled = smell().signalAt(loc);
      reading.ppm = smelled ? round(smelled.concentration.rawValue()) : null;
      reading.smell = smelled ? (smelled.identity ?? null) : null;

      // ⭐ The gather in WALK ORDER — not sorted. The order is the
      // behaviour being pinned, and `Scene` consumes `out` in it.
      reading.gather = AudienceGather.gather(loc, 100).map((a) => ({
        at: earAt.get(a.sensor.stuffId) ?? `<unplaced:${a.sensor.stuffId}>`,
        db: round(a.db),
        direction: a.direction,
      }));

      readings.push(reading);
    }

    readings.sort((a, b) => a.place.localeCompare(b.place));
  }, 600_000);

  it("⚠ booted a non-trivial number of places — a guard matching nothing passes", () => {
    // The realm had 124 place rows when this was written
    // (`check-location-graph`'s own first run). The floor is a smoke
    // test on the enumeration, not a pin on content growth: a fixture
    // that silently enumerated zero would otherwise be GREEN.
    expect(placeCount).toBeGreaterThan(100);
    expect(readings.length).toBe(placeCount);
  });

  it("records a reading for every place, with nothing silently skipped", () => {
    const failed = readings.filter((r) => r.failed);
    // A place that will not clone is recorded with its reason, not
    // dropped — a silent skip cost an acceptance criterion once.
    if (failed.length > 0) {
      console.log(
        `  ⚠ ${failed.length} place(s) did not clone:\n` +
          failed.map((f) => `    ${f.place}: ${f.failed}`).join("\n")
      );
    }
    expect(readings.every((r) => r.failed || typeof r.lux === "number")).toBe(
      true
    );
  });

  it("⭐ matches the committed golden byte-for-byte", () => {
    const serialized = JSON.stringify(readings, null, 2) + "\n";

    if (process.env.PERCEPTION_GOLDEN_UPDATE === "1" || !existsSync(GOLDEN)) {
      mkdirSync(dirname(GOLDEN), { recursive: true });
      writeFileSync(GOLDEN, serialized, "utf8");
      console.log(
        `  wrote ${readings.length} place readings to ` +
          `scripts/__tests__/golden/perception-characterization.json`
      );
      return;
    }

    expect(serialized).toBe(readFileSync(GOLDEN, "utf8"));
  });
});
