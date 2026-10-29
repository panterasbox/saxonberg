/**
 * ⭐⭐ The mould as an ENVELOPE (ceramics W7, S12–S16, M9).
 *
 * What the cavity does to a pour, by the physics of it — never a roll:
 *
 *   - an impression of a sword casts a nameless pewter sword with seams,
 *     its mass from the cavity and the metal, "taken from" whose it was;
 *   - a key's wards ride its impression and the cast key turns the lock;
 *   - a face casts a likeness and writes no belief;
 *   - Chvorinov: a thin shape poured too near its melting point misruns; a
 *     closed cavity with no riser goes porous; a riser feeds it sound;
 *   - the chill: cast iron in an iron mould sets white, in sand grey;
 *   - a damp mould blows: the cast is a ruined lump and the pourer burned;
 *   - an absorbent mould drinks plain water into its own wetness;
 *   - a one-piece reusable mould refuses a shape with an undercut;
 *   - the receiver survives the pour or does not (wood burns, tin melts).
 *
 * The clone pipeline needs template rows, so `StuffApi.clone` is stubbed to
 * hand back a fresh thing of the kind asked and record which.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import { Agent } from '../../stuff/Agent';
import Material from '../../material/Material';
import Key from '../../../platform/thing/Key';
import { MouldMixin } from '../Mould';
import { DurableMixin } from '../../material/Durable';
import { CraftedMixin } from '../../craft/Crafted';
import { ThermalMixin } from '../../thermal/Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainerMixin } from '../../spatial/Container';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { BulkableApi } from '../../../api/bulk';
import { ConditionApi } from '../../../api/condition';
import { WorldClockApi } from '../../../api/worldclock';
import { TemplatePaths } from '../../paths';
import type { Stuff } from '../../stuff/Stuff';
import type { ImpressionData } from '../Impression';
import { DetachedError } from '../../errors';
import { MixinApi } from '../../../api/mixin';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestMould extends MouldMixin(
  DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))),
) {
  static _mixinName = 'TestEnvelopeMould';
}
class TestRoom extends ContainerMixin(Good) {
  static _mixinName = 'TestEnvelopeRoom';
}
/** A shaped thing with a length — the sword's row, standing in. */
// A sword is a made thing (a `Weapon` is Crafted), so a cast of one keeps
// what it was cast from (B95).
class TestSword extends CraftedMixin(Good) {
  static _mixinName = 'TestEnvelopeSword';
  /** A blade's impression carries its length, as `Weapon`'s does (B104). */
  public override leaveImpression(nowS: number): ImpressionData | null {
    const shape = super.leaveImpression(nowS);
    return shape === null ? null : { ...shape, lengthM: 0.9 };
  }
}
// A casting is Crafted (B95), so it is graded.
class TestLump extends CraftedMixin(Good) {
  static _mixinName = 'TestEnvelopeLump';
}
/** A face — something that is an agent, and records anything it is told. */
class TestFace extends Agent {
  static _mixinName = 'TestEnvelopeFace';
  public told = 0;
  know(): void {
    this.told++;
  }
  learnIdentityOf(): void {
    this.told++;
  }
}

const SWORD = '/stuff/thing/_env/sword';
const KEY = '/stuff/thing/_env/key';
const PEWTER = '/stuff/idea/material/_env/pewter';
const STEEL = '/stuff/idea/material/_env/steel';
const SAND = '/stuff/idea/material/_env/sand';
const IRON = '/stuff/idea/material/_env/iron';
const CAST_IRON = '/stuff/idea/material/_env/cast-iron';
const WHITE = '/stuff/idea/material/_env/white-iron';
const GREY = '/stuff/idea/material/_env/grey-iron';
const WATER = '/stuff/idea/material/_env/water';
const PINE = '/stuff/idea/material/_env/pine';
const TIN = '/stuff/idea/material/_env/tin';
const LEAD = '/stuff/idea/material/_env/lead';
const BRONZE = '/stuff/idea/material/_env/bronze';
const LUMP = '/stuff/thing/_env/lump';

let cloned: string[] = [];

function material(path: string, setup: (m: Material) => void): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    setup(m);
    return m;
  }, path) as unknown as Material;
}

function metal(path: string, mp: number, density: number, k = 50, alpha = 2e-5): Material {
  return material(path, (m) => {
    m.setTags(['metal']);
    m.setDensity(Quantity.of(density, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(400, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(k, 'W/(m·K)'));
    m.setMeltingPoint(Quantity.of(mp, 'K'));
    m.setThermalExpansion(alpha);
    m.setHardness(Quantity.of(50, 'MPa'));
    m.castTemplate = LUMP;
  });
}

function mats(): void {
  metal(PEWTER, 500, 7900, 55, 2.3e-5);
  metal(STEEL, 1723, 7800);
  metal(IRON, 1811, 7870, 80);
  metal(WHITE, 1420, 7700);
  metal(GREY, 1420, 7150);
  metal(TIN, 505, 7310, 67);
  metal(LEAD, 600, 11340, 35);
  metal(BRONZE, 1220, 8800, 60, 1.8e-5);
  const ci = metal(CAST_IRON, 1420, 7200, 55, 1.1e-5);
  ci.setChillsTo([
    { mouldConductivityAbove: 20, becomes: WHITE },
    { mouldConductivityAbove: 0, becomes: GREY },
  ]);
  material(SAND, (m) => {
    m.setTags(['granular']);
    m.setDensity(Quantity.of(1600, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(830, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.27, 'W/(m·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(5, '%'));
  });
  material(WATER, (m) => {
    m.setTags(['liquid']);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(273, 'K'));
  });
  material(PINE, (m) => {
    m.setTags(['wood', 'flammable']);
    m.setDensity(Quantity.of(510, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setAutoignitionTemperature(Quantity.of(540, 'K'));
  });
}

function mat(path: string): Material {
  return StuffApi.findByTemplatePath<Material>(path)!;
}

function room(): TestRoom {
  return makeStuff(() => new TestRoom());
}

function sandFlask(): TestMould {
  const m = makeStuff(() => new TestMould());
  const b = m as unknown as { interiorBulk: boolean; setInteriorCapacity(q: Quantity<'L'>): void };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(3, 'L'));
  m.setMaterial(mat(SAND));
  m.setMass(Quantity.of(20, 'kg'));
  m.setImpressible(true);
  m.setAbsorbent(true);
  m.setReusable(false);
  return m;
}

function sword(): TestSword {
  const s = makeStuff(() => new TestSword());
  stampTemplatePathForTest(s, SWORD);
  s.setMaterial(mat(STEEL));
  s.setMass(Quantity.of(1.0, 'kg'));
  (s as unknown as { setShortDescription(x: string): void }).setShortDescription('arming sword');
  return s;
}

function pour(m: TestMould, matPath: string, kg: number, k: number): void {
  const material = mat(matPath);
  const litres = (kg / material.getDensity().rawValue()) * 1000;
  const b = m as unknown as {
    setBulkMaterial(a: 'interior', x: Material): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
  };
  b.setBulkMaterial('interior', material);
  b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  m.receivedPour({ temperatureK: k, litres, material });
}

/** Set it as the freeze would: clear the pool and hand it to the mould. */
async function set(m: TestMould, matPath: string, kg: number): Promise<Stuff | null> {
  const b = m as unknown as {
    setBulkMaterial(a: 'interior', x: Material | null): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
  };
  b.setBulkAmount('interior', Quantity.of(0, 'L'));
  b.setBulkMaterial('interior', null);
  return m.castInto({ material: mat(matPath), massKg: kg, payload: null, stampMaterial: true });
}

function desc(s: Stuff): { short: string; long: string } {
  const v = s as unknown as { getShortDescription(): string; getLongDescription(): string };
  return { short: v.getShortDescription(), long: v.getLongDescription() };
}

describe('the mould as an envelope (ceramics W7)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 1_000_000);
    cloned = [];
    mats();
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      cloned.push(path);
      const c =
        path === SWORD
          ? makeStuff(() => new TestSword())
          : path === KEY
            ? makeStuff(() => new Key())
            : makeStuff(() => new TestLump());
      stampTemplatePathForTest(c, path);
      if (path === SWORD) (c as unknown as { setShortDescription(x: string): void }).setShortDescription('arming sword');
      return c;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('⭐ an impression of a sword casts a nameless pewter sword: seams, derived mass, provenance', async () => {
    const r = room();
    const flask = sandFlask();
    ContainmentApi.move(flask, r);
    const out = await flask.takeImpression(sword(), flask);
    expect(out.ok).toBe(true);
    expect(flask.getImpression()?.getKindPath()).toBe(SWORD);
    // Rammed green sand is damp — but below the blow.
    expect(flask.getWetness()).toBeGreaterThan(0.1);
    expect(flask.getWetness()).toBeLessThan(0.3);
    flask.setRiser(true);
    pour(flask, PEWTER, 1.2, 600);
    const cast = await set(flask, PEWTER, 1.2);
    expect(cloned[0]).toBe(SWORD);
    const c = cast as unknown as TestSword;
    expect(c.getMaterial()?.getTemplatePath()).toBe(PEWTER);
    // The cavity's volume in pewter, shrunk by pewter's own shrink.
    const s = mat(PEWTER).castShrinkage();
    const cavityKg = (1.0 / 7800) * 7900;
    expect(c.getMass().rawValue()).toBeCloseTo(cavityKg / Math.pow(1 + s, 3), 4);
    const d = desc(c);
    expect(d.short).toBe('pewter cast of an arming sword');
    expect(d.long).toMatch(/seams/i);
    expect(d.long).toMatch(/no maker's mark/i);
    expect(d.long).toMatch(/a shade smaller/i);
    expect(c.getCastFrom()?.kindPath).toBe(SWORD);
    // A consumed mould is broken to release: the cast is in the room.
    expect(flask.isDestroyed()).toBe(true);
    expect(r.getContents()).toContain(c);
    // The overfill was broken off as a runner, never lost.
    await new Promise((res) => setTimeout(res, 0));
    expect(cloned).toContain(LUMP);
  });

  it('⭐⭐ a key\'s wards ride its impression — the cast key opens the same lock', async () => {
    const k = makeStuff(() => new Key());
    stampTemplatePathForTest(k, KEY);
    k.ensureCredential('key').addKey('kw-123', 'pin-tumbler');
    (k as unknown as { setMaterial(m: Material): void }).setMaterial(mat(STEEL));
    (k as unknown as { setMass(q: Quantity<'kg'>): void }).setMass(Quantity.of(0.02, 'kg'));
    const wax = sandFlask();
    ContainmentApi.move(wax, room());
    expect((await wax.takeImpression(k, wax)).ok).toBe(true);
    wax.setRiser(true);
    pour(wax, BRONZE, 0.05, 1350);
    const cast = (await set(wax, BRONZE, 0.05)) as unknown as Key;
    expect(cast.getCredential('key')?.authorize('kw-123', 'pin-tumbler')).toBe(true);
  });

  it('⭐ a key cast with NO riser (porous where it froze last) still carries its wards', async () => {
    const k = makeStuff(() => new Key());
    stampTemplatePathForTest(k, KEY);
    k.ensureCredential('key').addKey('kw-456', 'pin-tumbler');
    (k as unknown as { setMaterial(m: Material): void }).setMaterial(mat(STEEL));
    (k as unknown as { setMass(q: Quantity<'kg'>): void }).setMass(Quantity.of(0.02, 'kg'));
    const wax = sandFlask();
    ContainmentApi.move(wax, room());
    expect((await wax.takeImpression(k, wax)).ok).toBe(true);
    pour(wax, BRONZE, 0.05, 1350);
    const cast = (await set(wax, BRONZE, 0.05)) as unknown as Key;
    expect(cast.getCredential('key')?.authorize('kw-456', 'pin-tumbler')).toBe(true);
  });

  it('⚠⚠ a face casts a LIKENESS and nothing anywhere is told who it is', async () => {
    const face = makeStuff(() => new TestFace());
    (face as unknown as { setMass(q: Quantity<'kg'>): void }).setMass(Quantity.of(70, 'kg'));
    const imp = face.leaveImpression(0);
    expect(imp?.kindPath).toBe(TemplatePaths.likeness);
    expect(imp?.carried).toEqual({});
    const plaster = sandFlask();
    ContainmentApi.move(plaster, room());
    expect((await plaster.takeImpression(face, face)).ok).toBe(true);
    pour(plaster, PEWTER, 3, 600);
    await set(plaster, PEWTER, 3);
    expect(cloned[0]).toBe(TemplatePaths.likeness);
    expect(face.told).toBe(0);
  });

  it('a pour through the REAL transfer tells the mould its superheat', async () => {
    // The unit tests' `pour()` calls receivedPour by hand; this one goes
    // through BulkableApi.transfer, the path every player pour takes.
    const r = room();
    const flask = sandFlask();
    ContainmentApi.move(flask, r);
    await flask.takeImpression(sword(), flask);
    flask.setRiser(true);
    const crucible = makeStuff(() => new TestMould());
    ContainmentApi.move(crucible, r);
    const c = crucible as unknown as {
      interiorBulk: boolean;
      setInteriorCapacity(q: Quantity<'L'>): void;
      setBulkMaterial(a: 'interior', m: Material): void;
      setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
      setStampedTemperatureK(k: number): void;
      setLastAmbientK(k: number): void;
    };
    c.interiorBulk = true;
    c.setInteriorCapacity(Quantity.of(3, 'L'));
    c.setBulkMaterial('interior', mat(PEWTER));
    c.setBulkAmount('interior', Quantity.of(0.2, 'L'));
    c.setStampedTemperatureK(600);
    c.setLastAmbientK(600);
    // Any read of the mould mid-pour must not find a cold pool to freeze.
    const read = vi.spyOn(flask, 'receivedPour');
    BulkableApi.transfer(BulkableApi.slotFor(crucible)!, BulkableApi.slotFor(flask)!, { kind: 'all' });
    expect(read).toHaveBeenCalled();
    expect(flask.pourSuperheatK, 'the superheat is on record').toBeGreaterThan(50);
  });

  it('⭐ Chvorinov: too cool into a thin shape misruns; hot enough fills', async () => {
    const cold = sandFlask();
    ContainmentApi.move(cold, room());
    await cold.takeImpression(sword(), cold);
    cold.setRiser(true);
    pour(cold, PEWTER, 1.2, 505); // 5 K over its melting point
    const misrun = (await set(cold, PEWTER, 1.2)) as unknown as Good;
    // The flaw is the fact; its words are the look's, never baked (R2-D7).
    expect(misrun.getFlaws().some((f) => f.kind === 'misrun' && f.visible)).toBe(true);
    expect(desc(misrun).short).not.toMatch(/misrun/);

    const hot = sandFlask();
    ContainmentApi.move(hot, room());
    await hot.takeImpression(sword(), hot);
    hot.setRiser(true);
    pour(hot, PEWTER, 1.2, 600);
    const sound = (await set(hot, PEWTER, 1.2)) as unknown as Good;
    expect(desc(sound).short).not.toMatch(/misrun/);
    expect(sound.getFlaws()).toHaveLength(0);
  });

  it('⭐ no riser → porous where it froze last; a riser → sound', async () => {
    const bare = sandFlask();
    ContainmentApi.move(bare, room());
    await bare.takeImpression(sword(), bare);
    pour(bare, PEWTER, 1.2, 600);
    const porous = (await set(bare, PEWTER, 1.2)) as unknown as Good;
    expect(porous.getFlaws().some((f) => f.kind === 'shrinkage' && f.visible)).toBe(true);
    expect(desc(porous).long).not.toMatch(/porous/i);
  });

  it('⭐ the chill: cast iron in an iron mould sets white; in sand, grey', async () => {
    const iron = makeStuff(() => new TestMould());
    iron.setMaterial(mat(IRON));
    iron.setCastTemplate(LUMP);
    ContainmentApi.move(iron, room());
    pour(iron, CAST_IRON, 1, 1650);
    const white = (await set(iron, CAST_IRON, 1)) as unknown as Good;
    expect(white.getMaterial()?.getTemplatePath()).toBe(WHITE);

    const sand = sandFlask();
    ContainmentApi.move(sand, room());
    await sand.takeImpression(sword(), sand);
    sand.setRiser(true);
    pour(sand, CAST_IRON, 1.2, 1700);
    const grey = (await set(sand, CAST_IRON, 1.2)) as unknown as Good;
    expect(grey.getMaterial()?.getTemplatePath()).toBe(GREY);
  });

  it('⭐ a damp flask BLOWS: a ruined lump, and the pourer is burned', async () => {
    const inflict = vi.spyOn(ConditionApi, 'inflict').mockReturnValue({} as never);
    const flask = sandFlask();
    ContainmentApi.move(flask, room());
    await flask.takeImpression(sword(), flask);
    // Watered: the sand drinks it into its own wetness.
    pour(flask, WATER, 0.6, 290);
    expect(flask.getBulkAmount('interior').rawValue()).toBe(0);
    expect(flask.getWetness()).toBeGreaterThan(0.3);
    pour(flask, PEWTER, 1.2, 600);
    const pourer = makeStuff(() => new TestFace());
    vi.spyOn(
      (await import('../../../api/mixin')).MixinApi,
      'isVitals',
    ).mockImplementation(((s: Stuff) => s === pourer) as never);
    flask.afterPouredInBy(pourer, 0.15);
    expect(inflict).toHaveBeenCalledWith(pourer, expect.objectContaining({ mechanism: 'heat' }));
    const lump = (await set(flask, PEWTER, 1.2)) as unknown as Good;
    expect(cloned[0]).toBe(LUMP);
    expect(desc(lump).short).toMatch(/blown/);
    // ⭐ B104: the blow is a FLAW — the grade's ceiling and the look's words
    // are its, nothing baked into the description.
    expect(lump.getFlaws().map((f) => f.kind)).toContain('blowhole');
    if (!MixinApi.isGraded(lump)) throw new Error('a casting is graded');
    expect(lump.getGrade().getBand()).toBe('poor');
    expect(desc(lump).long).not.toMatch(/steam holes/);
  });

  it('⭐ a one-use flask standing NOWHERE refuses to cast: DetachedError, nothing minted (B104)', async () => {
    const flask = sandFlask();
    await flask.takeImpression(sword(), flask);
    await expect(set(flask, PEWTER, 1.2)).rejects.toThrow(DetachedError);
    expect(cloned).toHaveLength(0);
    expect(flask.isDestroyed()).toBe(false);
  });

  it('⭐ a cast row that will not mint THROWS — what set is not lost silently (B104)', async () => {
    const flask = sandFlask();
    ContainmentApi.move(flask, room());
    await flask.takeImpression(sword(), flask);
    vi.mocked(StuffApi.clone).mockRejectedValueOnce(new Error('no such row'));
    await expect(set(flask, PEWTER, 1.2)).rejects.toThrow(/no such row/);
    expect(flask.isDestroyed()).toBe(false);
  });

  it('⭐ draft: a one-piece reusable mould will not take a shape with an undercut', async () => {
    const rigid = sandFlask();
    rigid.setReusable(true);
    const s = sword();
    vi.spyOn(s, 'leaveImpression').mockReturnValue({
      ...s.leaveImpression(0)!,
      undercut: true,
    });
    const out = await rigid.takeImpression(s, rigid);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('undercut');
    // …and a consumed sand mould takes it: it is broken to release.
    const sand = sandFlask();
    expect((await sand.takeImpression(s, sand)).ok).toBe(true);
  });

  it('⭐⭐ every pour obeys its receiver: lead melts a tin cup, bronze burns a wooden mould, pewter into bronze holds', () => {
    const r = room();
    const crucible = makeStuff(() => new TestMould());
    ContainmentApi.move(crucible, r);
    const fill = (v: TestMould, path: string, litres: number, k: number): void => {
      const b = v as unknown as {
        interiorBulk: boolean;
        setInteriorCapacity(q: Quantity<'L'>): void;
        setBulkMaterial(a: 'interior', m: Material): void;
        setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
        setStampedTemperatureK(k: number): void;
        setLastAmbientK(k: number): void;
      };
      b.interiorBulk = true;
      b.setInteriorCapacity(Quantity.of(2, 'L'));
      b.setBulkMaterial('interior', mat(path));
      b.setBulkAmount('interior', Quantity.of(litres, 'L'));
      b.setStampedTemperatureK(k);
      b.setLastAmbientK(k);
    };
    const vessel = (path: string): TestMould => {
      const v = makeStuff(() => new TestMould());
      const b = v as unknown as { interiorBulk: boolean; setInteriorCapacity(q: Quantity<'L'>): void };
      b.interiorBulk = true;
      b.setInteriorCapacity(Quantity.of(2, 'L'));
      v.setMaterial(mat(path));
      v.setMass(Quantity.of(1, 'kg'));
      ContainmentApi.move(v, r);
      return v;
    };
    fill(crucible, LEAD, 0.1, 700);
    const tinCup = vessel(TIN);
    const melted = BulkableApi.transfer(
      BulkableApi.slotFor(crucible)!,
      BulkableApi.slotFor(tinCup)!,
      { kind: 'all' },
    );
    expect(melted.status).toBe('melted');
    expect(tinCup.isDestroyed()).toBe(true);

    fill(crucible, BRONZE, 0.1, 1350);
    const frame = vessel(PINE);
    const burned = BulkableApi.transfer(
      BulkableApi.slotFor(crucible)!,
      BulkableApi.slotFor(frame)!,
      { kind: 'all' },
    );
    expect(burned.status).toBe('burned');
    expect(frame.isDestroyed()).toBe(true);

    fill(crucible, PEWTER, 0.1, 600);
    const bronzeCup = vessel(BRONZE);
    const held = BulkableApi.transfer(
      BulkableApi.slotFor(crucible)!,
      BulkableApi.slotFor(bronzeCup)!,
      { kind: 'all' },
    );
    expect(held.status).not.toBe('melted');
    expect(held.applied).toBeGreaterThan(0);
    expect(bronzeCup.isDestroyed()).toBe(false);
    // …and the mould heard what came in and how hot.
    expect(bronzeCup.getPourSuperheatK()).toBeGreaterThan(0);
  });
});
