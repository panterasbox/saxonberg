/**
 * MagicLogic — the cast pipeline (gates → spend → effects → provenance →
 * Transcript) and the per-primitive executors, each proven against its
 * backing Api. The catalogue is warmed from the REAL authored roster
 * seeds; competence bands are stubbed on the caster class so the
 * band gate is exercised without grinding BKT evidence.
 *
 * The heavy scene physics (firebolt igniting a dummy, spark through the
 * shared pool shocking the caster) are the Practicum integration test's
 * job — here each executor's contract + the accountability/provenance
 * legs are pinned.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import { MagicApi } from "../../../../api/magic";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import { ContainmentApi } from "../../../../api/containment";
import { AccountabilityApi } from "../../../../api/accountability";
import { StuffApi } from "../../../../api/stuff";
import { WorldClockApi } from "../../../../api/worldclock";
import "../../WorldClockRegistry";
import SpellCatalogue from "../../SpellCatalogue";
import Spell from "../../magic/Spell";
import { LightSourceMixin } from "../../../../lib/perception/LightSource";
import Thing from "../../../../lib/stuff/Thing";
import Condition from "../../Condition";
import { Template } from "../../../../lib/stuff/Template";
import { Character } from "../../../../lib/character/Character";
import { Creature } from "../../../../lib/creature/Creature";
import Species from "../../species/Species";
import { Quantity } from "../../../../lib/quantity";
import { Faculty } from "../../../../lib/magic/Faculty";
import { MANA_RESERVE_KEY, OVERCHANNEL_STRAIN_PATH } from "../../../../lib/magic/Caster";
import type { CompetenceBandName } from "../../../../lib/advancement/CompetenceBand";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
/** A light source standing in for the arcane library's GlowlightMote — the executor clones whatever the row's `locus` names. */
class GlowlightOrb extends LightSourceMixin(Thing) {}
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_CLASS = '/platform/idea/magic/Spell';

// The band gate reads the caster's own competenceBandFor since the
// OO sweep; pinned by the module `testBand` var.
let testBand: CompetenceBandName = "untrained";
class TestCharacter extends Character {
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return testBand;
  }
}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  "../../../../../../../content/arcane-library/content/stuff/idea/magic/Spell",
);

const SCALE = 12;
let real = 0;
let seq = 0;

/** Warm a real SpellCatalogue from the authored roster seeds. Installed
 * once (the singleton path index survives across tests — no clearAll,
 * the WorldClockRegistry cache trap), re-warmed per test. */
let catalogueSingleton: SpellCatalogue | null = null;
async function installCatalogue(): Promise<void> {
  const seeds = readdirSync(SPELL_SEEDS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map(
      (f) =>
        (
          YAML.parse(readFileSync(join(SPELL_SEEDS_DIR, f), "utf-8")) as {
            data: Record<string, unknown>;
          }
        ).data,
    );
  const spy = vi
    .spyOn(Template, "findByClass")
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (prefix !== SPELL_CLASS) return [];
      return seeds.map((seed) => ({
        path: `${SPELL_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  if (!catalogueSingleton) {
    catalogueSingleton = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(catalogueSingleton, "/platform/idea/SpellCatalogue");
  }
  catalogueSingleton.invalidateCache();
  await catalogueSingleton.postRegister();
  spy.mockRestore();
}

/** Stub the competence bands (the band gate's read seam). */
function stubBands(band: CompetenceBandName): void {
  testBand = band;
}

function makeCaster(): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: "mid", serenity: "mid", composure: "mid" });
  species.setInnateMixins(["CasterMixin"]);
  species.setSentient(true);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/magic-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/caster-${n}`);
  actor.installArcaneReserve();
  return actor;
}

function makeBystander(sentient: boolean): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setSentient(sentient);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/by-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/by-${n}`);
  return actor;
}

let dreadSeed: Condition | null = null;
function installDreadSeed(): void {
  if (dreadSeed) return;
  dreadSeed = makeStuff(() => new Condition());
  dreadSeed.setMentalBands([
    { threshold: 5, stage: 1 },
    { threshold: 15, stage: 2 },
    { threshold: 30, stage: 3 },
  ]);
  stampTemplatePathForTest(dreadSeed, "/platform/idea/Condition/magic/dread");
}

function mana(c: TestCharacter): number {
  return c.getMana()!.current.rawValue();
}

describe("MagicLogic — the cast pipeline", () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    await installCatalogue();
    // (The transcript credit no-ops with PM disconnected; tests that
    // assert it spy the caster instance.)
    vi.spyOn(StuffApi, "clone").mockImplementation(async () =>
      makeStuff(() => new GlowlightOrb()),
    );
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it("gates: no faculty / unknown spell / band too low", async () => {
    stubBands("untrained");
    const beast = makeBystander(false);
    expect((await MagicApi.prepareCast(beast, "firebolt")).refusal).toMatch(
      /no gift/,
    );
    const caster = makeCaster();
    expect(
      (await MagicApi.prepareCast(caster, "no-such-spell")).refusal,
    ).toMatch(/know no working/);
    // untrained on both axes refuses a novice-floor spell — competence IS access
    const refused = await MagicApi.prepareCast(caster, "glowlight");
    expect(refused.ok).toBe(false);
    expect(refused.refusal).toMatch(/beyond your/);
  });

  it("spends the reserve at resolution; overchannel floors it and afflicts strain", async () => {
    stubBands("competent");
    const caster = makeCaster();
    const before = mana(caster); // 120 (mid depth)
    const out = await MagicApi.resolveCast(caster, "glowlight");
    expect(out.ok).toBe(true);
    expect(mana(caster)).toBe(before - 10); // glowlight costs 10

    // drain to nearly nothing, then overchannel
    caster.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-(mana(caster) - 3), "pt"));
    const over = await MagicApi.resolveCast(caster, "dispel"); // costs 20 > 3
    expect(over.ok).toBe(true);
    expect(over.overchanneled).toBe(true);
    expect(mana(caster)).toBe(0);
    expect(
      caster.hasCondition(
        (c) =>
          c.kind === "affliction" && c.templatePath === OVERCHANNEL_STRAIN_PATH,
      ),
    ).toBe(true);
    // strain slows the next cast
    const slowed = await MagicApi.prepareCast(caster, "glowlight");
    expect(slowed.castSeconds!).toBeGreaterThan(2);
  });

  it("credits BOTH grid axes on the Transcript per cast", async () => {
    stubBands("competent");
    const caster = makeCaster();
    const record = vi
      .spyOn(
        caster as unknown as { creditSignature(sig: unknown): Promise<void> },
        "creditSignature",
      )
      .mockResolvedValue(undefined);
    await MagicApi.resolveCast(caster, "glowlight");
    expect(record).toHaveBeenCalledTimes(1);
    const signature = record.mock.calls[0]![0] as {
      discipline: Array<{ discipline: string }>;
    };
    expect(signature.discipline.map((s) => s.discipline).sort()).toEqual([
      "magic-create",
      "magic-light",
    ]);
  });

  it("glowlight = a bound orb + a SustainedEffect (the modifier)", async () => {
    stubBands("competent");
    const clone = vi
      .spyOn(StuffApi, "clone")
      .mockImplementation(async () => makeStuff(() => new GlowlightOrb()));
    const caster = makeCaster();
    const out = await MagicApi.resolveCast(caster, "glowlight");
    expect(out.ok).toBe(true);
    expect(clone).toHaveBeenCalledWith("/stuff/thing/magic/glowlight-mote");
    const sustained = caster
      .getConditions()
      .find((c) => c.kind === "sustained");
    expect(sustained).toBeTruthy();
    expect(sustained!.magicOrigin).toMatchObject({
      verb: "create",
      noun: "light",
      spellId: "glowlight",
      specifiedBy: caster.getTemplatePath(),
      firedBy: caster.getTemplatePath(),
    });
    // the bound orb realizes lit on the reconcile pull
    const orb = StuffApi.findById(
      (sustained as { boundStuffId?: string }).boundStuffId!,
    )!;
    expect(
      (orb as unknown as { getEmittedFlux(): Quantity<"lumen"> })
        .getEmittedFlux()
        .rawValue(),
    ).toBeGreaterThan(0);
  });

  it("dread stages worse against a drained target (the Composure factor)", async () => {
    stubBands("competent");
    const caster = makeCaster();
    const rested = makeCaster();
    const drained = makeCaster();
    drained.adjustReserve(
      MANA_RESERVE_KEY,
      Quantity.of(-Faculty.capacityFor("mid"), "pt"),
    );
    installDreadSeed();

    await MagicApi.resolveCast(caster, "dread", rested);
    await MagicApi.resolveCast(caster, "dread", drained);
    const stageOf = (t: TestCharacter): number =>
      (
        t
          .getConditions()
          .find((c) => c.kind === "affliction") as { stage: number }
      ).stage;
    expect(stageOf(drained)).toBeGreaterThan(stageOf(rested));
  });

  it("dispel is tag-keyed — magical workings unravel, a mundane condition is untouchable", async () => {
    stubBands("competent");
    const caster = makeCaster();
    const target = makeBystander(true);
    target.afflict({
      kind: "affliction",
      templatePath: "/platform/idea/Condition/metabolism/collapse",
      stage: 1,
      elapsed: 0,
    });
    // nothing magical yet — dispel refuses
    const nothing = await MagicApi.resolveCast(caster, "dispel", target);
    expect(nothing.reports.join(" ")).toMatch(/nothing magical/i);

    target.afflict({
      kind: "affliction",
      templatePath: "/platform/idea/Condition/magic/dread",
      stage: 2,
      elapsed: 0,
      magicOrigin: {
        verb: "destroy",
        noun: "mind",
        spellId: "dread",
        specifiedBy: "/obj/test/other",
        firedBy: "/obj/test/other",
      },
    });
    const out = await MagicApi.resolveCast(caster, "dispel", target);
    expect(out.reports.join(" ")).toMatch(/unravel/);
    expect(
      target.hasCondition(
        (c) => c.kind === "affliction" && c.templatePath.includes("dread"),
      ),
    ).toBe(false);
    // the mundane collapse survives — structurally untouchable
    expect(
      target.hasCondition(
        (c) => c.kind === "affliction" && c.templatePath.includes("collapse"),
      ),
    ).toBe(true);
  });

  it("a hostile cast appends the accountability harm row (sentient, non-consented)", async () => {
    stubBands("competent");
    const record = vi
      .spyOn(AccountabilityApi, "record")
      .mockImplementation(() => {});
    const caster = makeCaster();
    const victim = makeBystander(true);
    installDreadSeed();

    await MagicApi.resolveCast(caster, "dread", victim);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0]![0]).toMatchObject({
      kind: "harm",
      initiator: caster.getTemplatePath(),
      victim: victim.getTemplatePath(),
      consented: false,
      sentient: true,
    });
  });

  it("shove routes through the posture surface; veil imposes a disguise", async () => {
    stubBands("competent");
    const caster = makeCaster();
    const target = makeBystander(true);
    await MagicApi.resolveCast(caster, "shove", target);
    expect(target.getPosture()).toBe("lie");

    await MagicApi.resolveCast(caster, "veil");
    const disguise = caster.getDisguise();
    expect(disguise?.appearsAs).toMatch(/veiled/);
    // held up by a sustained effect — dispellable
    expect(caster.hasCondition((c) => c.kind === "sustained")).toBe(true);
  });

  it("arcane sight reads the provenance tags (detect magic)", async () => {
    stubBands("competent");
    const caster = makeCaster();
    const target = makeBystander(true);
    target.afflict({
      kind: "affliction",
      templatePath: "/platform/idea/Condition/magic/dread",
      stage: 1,
      elapsed: 0,
      magicOrigin: {
        verb: "destroy",
        noun: "mind",
        spellId: "dread",
        specifiedBy: "/obj/test/other",
        firedBy: "/obj/test/other",
      },
    });
    const out = await MagicApi.resolveCast(caster, "arcane-sight", target);
    expect(out.reports.join(" ")).toMatch(/destroy·mind/);
    const clean = await MagicApi.resolveCast(caster, "arcane-sight", caster);
    expect(clean.reports.join(" ")).toMatch(/no workings/i);
  });

  it("an anti-magic field vetoes casting at cast time, grid-filterable", async () => {
    stubBands("competent");
    const { default: Location } = await import("../../../../lib/stuff/Location");
    class WardRoom extends Location {}
    const warded = makeStuff(() => new WardRoom());
    warded.setSuppressesMagic({ nouns: ["fire"] });
    const caster = makeCaster();
    ContainmentApi.move(caster as never, warded as never);

    // 'no ·fire here' blocks firebolt…
    const fire = await MagicApi.prepareCast(caster, "firebolt", caster);
    expect(fire.ok).toBe(false);
    expect(fire.refusal).toMatch(/suppresses/);
    // …but admits glowlight (create·light)
    const light = await MagicApi.prepareCast(caster, "glowlight");
    expect(light.ok).toBe(true);

    // the blanket ward blocks everything
    warded.setSuppressesMagic({ all: true });
    expect((await MagicApi.prepareCast(caster, "glowlight")).ok).toBe(false);
  });

  /**
   * ⚠ The band gate shipped with the ranged build CODE-COMPLETE AND
   * TEST-FREE — found in the pre-merge sweep. A gate nobody exercises
   * rots into either a silent no-op or a silent refusal, and the second
   * fact below is the one that matters: the seeded default must refuse
   * NOTHING, or every shipped spell quietly shrinks.
   */
  it("a working refuses a target further out than its envelope reaches", async () => {
    stubBands("competent");
    const { default: Location } = await import("../../../../lib/stuff/Location");
    class WideRoom extends Location {
      public override getLinearExtent(): number {
        return 30; // an authored open cell — the arena affords `far`
      }
    }
    const yard = makeStuff(() => new WideRoom());
    const caster = makeCaster();
    const victim = makeBystander(true);
    ContainmentApi.move(caster as never, yard as never);
    ContainmentApi.move(victim as never, yard as never);
    installDreadSeed();

    // Narrow the envelope to arm's length. The pair has no combat edge,
    // so the band is the ARENA maximum — `far` in a 30 m yard.
    const spy = vi
      .spyOn(AppApi, "setting")
      .mockImplementation((key: string) =>
        key === AppSettingKeys.magicSpellEnvelope
          ? "close"
          : (undefined as never),
      );
    const near = await MagicApi.resolveCast(caster, "dread", victim);
    expect(near.reports.join(" ")).toMatch(/too far off/i);

    // …and the seeded default reaches anywhere in the scene, which is
    // what keeps the gate inert for every spell that shipped before it.
    spy.mockImplementation((key: string) =>
      key === AppSettingKeys.magicSpellEnvelope
        ? "far"
        : (undefined as never),
    );
    const far = await MagicApi.resolveCast(caster, "dread", victim);
    expect(far.reports.join(" ")).not.toMatch(/too far off/i);
  });

  it("the spells view speaks bands, never numbers", async () => {
    stubBands("novice");
    const caster = makeCaster();
    const view = await MagicApi.spellsView(caster);
    expect(view.faculty.capable).toBe(true);
    expect(view.faculty.mana).toBe("brimming");
    expect(view.spells.length).toBeGreaterThanOrEqual(9);
    const glow = view.spells.find((s) => s.spellId === "glowlight")!;
    expect(glow.castable).toBe(true);
    expect(glow.band).toBe("novice");
    const spark = view.spells.find((s) => s.spellId === "spark")!;
    expect(spark.castable).toBe(false); // competent floor, novice caster
    for (const row of view.spells) {
      expect(JSON.stringify(row)).not.toMatch(/\d\d+ ?pt/);
    }
  });
});
