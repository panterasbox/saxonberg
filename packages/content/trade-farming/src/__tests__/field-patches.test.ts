/**
 * A field divided into patches (field population W1, D2/D3/D14/R4):
 *
 *   - a field with patches installs its soil on the PATCHES and none on
 *     itself; its own reads are the area-weighted aggregate;
 *   - a plant bound by `groundPart` roots in its patch, and answers to the
 *     patch's name;
 *   - a thin patch (`depthScale: 0.35`) holds a third of the water per m²;
 *   - `fieldLines` prints the stand once and a line per sown patch;
 *   - ⭐ W2: the patch lines read at the VIEWER's band — a novice's line is
 *     the start of an expert's, never a different truth;
 *   - grubbing ends every patch's crop;
 *   - a patch forwards the crop's title and sowing to its field;
 *   - a field with no `patches:` has no patch fixtures and keeps its own
 *     soil — today's path;
 *   - ⭐ R4: a patch's reserves AND its soil stamps survive a capture →
 *     materialize of the field (the fixtures slice).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Field, { type PatchSpec } from '../location/Field';
import Patch from '../thing/Patch';
import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import {
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '@saxonberg/server/mud/lib/husbandry/Soil';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import TemplateApplier from '@saxonberg/server/mud/platform/idea/TemplateApplier';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import GroundCharacter from '@saxonberg/content-ground/src/idea/GroundCharacter';
import type { GrowthProfileData } from '@saxonberg/server/mud/lib/husbandry/Growing';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Reserved } from '@saxonberg/server/mud/lib/reserve';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import { PersonaMixin } from '@saxonberg/server/mud/lib/character/Persona';
import TranscriptEntry from '@saxonberg/server/mud/lib/advancement/TranscriptEntry';
import { Competence } from '@saxonberg/server/mud/lib/advancement/Competence';
import { DerivedStandingCache } from '@saxonberg/server/mud/lib/standing/DerivedStandingCache';

/** Set a reserve's level, keeping its capacity. */
function level(host: Reserved, key: string, value: number): void {
  const r = host.getReserve(key)!;
  host.setReserve(
    new Reserve(r.key, r.capacity, Quantity.of(value, r.capacity.unit), r.theme, r.floorEffect),
  );
}

const DAY = 86_400;
const SEED = 4242;
const SPOT = [4, 7] as const;

const SPECS: PatchSpec[] = [
  {
    key: 'top-end',
    name: 'the top end',
    areaM2: 400,
    lean: { depthScale: 0.35, nitrogenPct: 12 },
  },
  { key: 'lane-end', name: 'the lane end', areaM2: 600 },
];

function profile(): GrowthProfileData {
  return {
    moistureHappyAt: 0.3,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0.12,
    luxHappyAt: 120,
    luxDarkAt: 15,
    rootDemand: { seedling: 0.2, young: 1.0, established: 2.0, mature: 3.0 },
    daysToStage: { young: 14, established: 42, mature: 84 },
    seedRateKgPerM2: 0.015,
    yieldKgPerM2: 0.09,
  };
}

/** `StuffApi.clone` of the patch row mints a bare `Patch`. */
function mockPatchClone(): void {
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path !== '/trade/farming/thing/patch') throw new Error(`no row ${path}`);
    return makeStuffAtPath(() => new Patch(), path);
  }) as unknown as typeof StuffApi.clone);
}

function fieldSample() {
  return GroundCharacter.resolve(null, SPOT, SEED);
}

async function dividedField(area = 1000, path?: string): Promise<Field> {
  const f = path
    ? makeStuffAtPath(() => new Field(), path)
    : makeStuff(() => new Field());
  f.setAreaM2(area);
  f.setGroundSpot(SPOT);
  f.patches = SPECS.map((s) => ({ ...s }));
  const sample = fieldSample();
  await f.ensurePatches(null, SEED, sample);
  f.installFieldReserves(sample);
  return f;
}

function crop(f: Field, area: number, part = '', stage = 'young'): Plant {
  const p = makeStuffAtPath(() => {
    const plant = new Plant();
    plant.setShortDescription('stand of wheat');
    plant.setKeywords(['wheat', 'stand']);
    plant.setLifecycleState('alive');
    plant.setProfile(profile());
    plant.setHarvestTemplatePath('/trade/farming/thing/crop/wheat');
    plant.setSownAreaM2(area);
    plant.setGroundPart(part);
    return plant;
  }, '/trade/farming/thing/plant/_test-wheat');
  ContainmentApi.move(p, f as never);
  (p as unknown as { growthStage: string }).growthStage = stage;
  return p;
}

function patch(f: Field, key: string): Patch {
  const p = f.getPatches().find((x) => x.getPatchKey() === key);
  if (!p) throw new Error(`no patch ${key}`);
  return p;
}

/** A reader with a competence transcript (W2's novice/expert pair). */
class Reader extends AdvancementMixin(PersonaMixin(Idea)) {
  static _mixinName = 'FieldPatchesTestReader';
}

describe('a field divided into patches', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  beforeEach(() => {
    if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) {
      makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    }
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    mockPatchClone();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('⭐ installs soil on the patches and none on the field itself', async () => {
    const f = await dividedField();
    const parts = f.getPatches();
    expect(parts.map((p) => p.getPatchKey())).toEqual(['top-end', 'lane-end']);
    expect(f.soilParts()).toHaveLength(2);
    for (const p of parts) {
      expect(MixinApi.isAdornment(p as unknown as Stuff)).toBe(true);
      expect(p.getAdornedTo()).toBe(f);
      expect(p.hasReserve(SOIL_MOISTURE_RESERVE_KEY)).toBe(true);
    }
    expect(f.hasReserve(SOIL_MOISTURE_RESERVE_KEY)).toBe(false);
    expect(f.hasReserve(SOIL_NITROGEN_RESERVE_KEY)).toBe(false);
    // The patches are fixtures, never loose contents.
    expect(f.getContents()).not.toContain(parts[0]);
  });

  it('get-or-create: a second run re-sizes, it does not mint again', async () => {
    const f = await dividedField();
    const first = f.getPatches();
    await f.ensurePatches(null, SEED, fieldSample());
    expect(f.getPatches()).toEqual(first);
    expect(f.getFixtures().filter((x) => x instanceof Patch)).toHaveLength(2);
  });

  it('the patches tile the field: the last absorbs the difference', async () => {
    const f = await dividedField(1200);
    expect(patch(f, 'top-end').getAreaM2()).toBe(400);
    expect(patch(f, 'lane-end').getAreaM2()).toBe(800);
  });

  it('a patch reads by its name, definite, and answers to its words', async () => {
    const f = await dividedField();
    const top = patch(f, 'top-end');
    expect(top.presentationPhrase().definite()).toBe('the top end');
    expect(top.getKeywords()).toEqual(expect.arrayContaining(['top end', 'top', 'end', 'top-end']));
    expect(f.soilPartRefusal()).toBe('Which part? Name one: the top end or the lane end.');
  });

  it("⭐ the field's moisture is the area-weighted mean of its patches", async () => {
    const f = await dividedField();
    const top = patch(f, 'top-end');
    const lane = patch(f, 'lane-end');
    level(top, SOIL_MOISTURE_RESERVE_KEY, 0);
    const laneCap = lane.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.capacity.rawValue();
    level(lane, SOIL_MOISTURE_RESERVE_KEY, laneCap);
    expect(top.soilMoistureFraction()).toBeCloseTo(0, 6);
    expect(lane.soilMoistureFraction()).toBeCloseTo(1, 6);
    // 400 m² dry, 600 m² full → 0.6.
    expect(f.soilMoistureFraction()).toBeCloseTo(0.6, 6);
  });

  it('⭐ the thin top end holds a third of the water per square metre', async () => {
    const f = await dividedField();
    const top = patch(f, 'top-end');
    const lane = patch(f, 'lane-end');
    const perM2 = (p: Patch) =>
      p.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.capacity.rawValue() / p.getAreaM2();
    // The water per m² follows the depth: a third as deep (the lean's
    // 0.35, held at the ground's own floor depth) holds a third.
    const depthRatio = top.soilDepthM()! / fieldSample().topsoilM;
    expect(perM2(top) / perM2(lane)).toBeCloseTo(depthRatio, 6);
    expect(depthRatio).toBeGreaterThan(0.3);
    expect(depthRatio).toBeLessThan(0.4);
    expect(lane.soilDepthM()).toBeCloseTo(fieldSample().topsoilM, 6);
    // The lean's nitrogen override reaches the patch's reserve.
    expect(top.getReserve(SOIL_NITROGEN_RESERVE_KEY)!.current.rawValue()).toBe(12);
  });

  it('⭐ a plant bound by groundPart roots in its patch, and answers to its name', async () => {
    const f = await dividedField();
    const top = patch(f, 'top-end');
    const p = crop(f, 300, 'top-end');
    expect(p.getBed()).toBe(top);
    expect(f.cropOn(top)).toBe(p);
    expect(top.cropsOn()).toEqual([p]);
    expect(p.getKeywords()).toEqual(expect.arrayContaining(['wheat', 'top end', 'top-end']));
    // An unbound crop roots in the whole field and keeps its own words.
    const loose = crop(f, 100, '');
    expect(loose.getBed()).toBe(f);
    expect(loose.getKeywords()).not.toContain('top end');
  });

  it('a key naming no patch falls back to the whole field (R8)', async () => {
    const f = await dividedField();
    const p = crop(f, 300, 'gone');
    expect(p.getBed()).toBe(f);
    expect(p.getKeywords()).not.toContain('gone');
  });

  it("a patch's thirst is its crops plus its share of the field's sward", async () => {
    const f = await dividedField();
    const top = patch(f, 'top-end');
    const sward = f.swardTranspirationPerGameDay();
    expect(top.soilWaterDemandPerGameDay()).toBeCloseTo(sward * 0.4, 6);
    crop(f, 300, 'top-end');
    expect(top.soilWaterDemandPerGameDay()).toBeCloseTo(sward * 0.4 + 300 * 1.2, 6);
  });

  it('a patch catches the sky of the field it is part of', async () => {
    const f = await dividedField();
    const top = patch(f, 'top-end');
    expect(top.getField()).toBe(f);
    expect((top as unknown as { watershedScope(): unknown }).watershedScope()).toBe(f);
    expect(top.soilCatchmentAreaM2()).toBe(400);
  });

  it("⭐ a patch forwards the crop's title and sowing to its field (W0 hand-off)", async () => {
    const f = await dividedField();
    const top = patch(f, 'top-end');
    const title = vi.spyOn(f, 'ensureCropTitle').mockResolvedValue(undefined);
    await top.ensureCropTitle();
    expect(title).toHaveBeenCalledOnce();
    expect(top.sowingRefusal()).toBe(f.sowingRefusal());
    expect(top.sowingRefusal()).toMatch(/not been ploughed/);
  });

  describe('look', () => {
    it('⭐ prints the stand once, then a line per sown patch, in words', async () => {
      const f = await dividedField();
      crop(f, 300, 'top-end');
      crop(f, 300, 'lane-end');
      const lines = f.fieldLines();
      const text = lines.join(' ');
      expect(text.match(/stand of wheat grows/gi)).toHaveLength(1);
      expect(text).toMatch(/over about two-thirds of it/);
      expect(lines.some((l) => /^At the top end it is /.test(l))).toBe(true);
      expect(lines.some((l) => /^At the lane end it is /.test(l))).toBe(true);
      expect(text).not.toMatch(/\d/);
    });

    it('a patch with no crop says nothing of a crop', async () => {
      const f = await dividedField();
      crop(f, 300, 'top-end');
      expect(f.fieldLines().some((l) => /lane end/.test(l))).toBe(false);
    });

    it('⭐ W2: a novice reads less than an expert, at the same moment — never a different truth', async () => {
      const f = await dividedField();
      const top = crop(f, 300, 'top-end');
      crop(f, 300, 'lane-end');
      // Dry the top end so something is short there and the bands differ.
      level(patch(f, 'top-end'), SOIL_MOISTURE_RESERVE_KEY, 0);
      top.getVigor();
      clock.mockReturnValue(Quantity.of(base + 20 * DAY, 's'));

      const rows: Array<Record<string, unknown>> = [];
      DerivedStandingCache._clearAllForTesting();
      vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
      vi.spyOn(TranscriptEntry, 'find').mockImplementation(
        async (query: Record<string, unknown>) =>
          rows.filter((r) =>
            Object.entries(query).every(([k, v]) => r[k] === v),
          ) as never,
      );
      const reader = async (path: string, band: 'novice' | 'expert'): Promise<Reader> => {
        const r = makeStuffAtPath(() => new Reader(), path);
        const run = Competence.seedRunFor(band)!;
        for (let i = 0; i < run.count; i++) {
          rows.push({
            owner: path,
            discipline: 'horticulture',
            difficulty: run.difficulty,
            outcome: 'success',
            when: null,
            kind: 'claim',
          });
        }
        await r.warmCompetenceDigest();
        expect(r.competenceBandCached('horticulture')).toBe(band);
        return r;
      };
      const novice = await reader('/test/agent/novice-farmer', 'novice');
      const expert = await reader('/test/agent/expert-farmer', 'expert');

      const at = (lines: string[]): string =>
        lines.find((l) => l.startsWith('At the top end'))!;
      const lo = at(f.fieldLines(novice));
      const hi = at(f.fieldLines(expert));
      expect(lo).toBeTruthy();
      // The novice's line is the START of the expert's: more words, the
      // same sentence first.
      expect(hi.startsWith(lo)).toBe(true);
      expect(hi.length).toBeGreaterThan(lo.length);
      expect(lo).toMatch(/short of something/);
      expect(lo).not.toMatch(/dry/);
      expect(hi).toMatch(/The soil is dry there\./);
      expect(`${lo} ${hi}`).not.toMatch(/\d/);
      // And the patch's own look reads at the same band.
      expect(top.getBed()).toBe(patch(f, 'top-end'));
      expect(patch(f, 'top-end').patchLines(expert).join(' ')).toMatch(/The soil is dry there\./);
      expect(patch(f, 'top-end').patchLines(novice).join(' ')).not.toMatch(/dry/);
    });

    it("`look at the top end`: the ground, then the crop rooted there", async () => {
      const f = await dividedField();
      const top = patch(f, 'top-end');
      crop(f, 300, 'top-end');
      const lines = top.patchLines(null);
      expect(lines[0]).toMatch(/ground/i);
      expect(lines).toContain('A stand of wheat grows here.');
      expect(lines.join(' ')).toMatch(/It is .* and /);
    });
  });

  it('⭐ grubbing ends every patch\'s crop', async () => {
    const f = await dividedField();
    const a = crop(f, 300, 'top-end');
    const b = crop(f, 300, 'lane-end');
    const destruct = vi.spyOn(StuffApi, 'destruct').mockResolvedValue(undefined as never);
    f.bankWork('clearing', 1, {
      clearing: 4,
      stonePicking: 0,
      draining: 0,
      liming: 0,
    } as never);
    expect(destruct).toHaveBeenCalledWith(a);
    expect(destruct).toHaveBeenCalledWith(b);
  });

  it('⭐ a field with no patches has no patch fixtures and keeps its own soil', async () => {
    const f = makeStuff(() => new Field());
    f.setAreaM2(1000);
    const sample = fieldSample();
    await f.ensurePatches(null, SEED, sample);
    f.installFieldReserves(sample);
    expect(f.getPatches()).toEqual([]);
    expect(f.soilParts()).toEqual([]);
    expect(f.getFixtures().some((x) => x instanceof Patch)).toBe(false);
    expect(f.hasReserve(SOIL_MOISTURE_RESERVE_KEY)).toBe(true);
    const p = crop(f, 300);
    expect(p.getBed()).toBe(f);
    expect(f.soilPartRefusal()).toBeNull();
  });
});

describe('⭐ R4 — a patch survives a restart on its field\'s record', () => {
  let snapshots: Record<string, unknown>[];
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    // Capturing a Reserved host preloads its quantity marshallers through
    // the Document seam; a no-op resolver keeps it quiet (the Panel test).
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    snapshots = [];
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    mockPatchClone();
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
    vi.spyOn(PersistApi, 'find').mockImplementation(
      async (col: string, query: Record<string, unknown>) => {
        if (col !== Collections.HolderSnapshots) return [];
        return snapshots.filter((d) => Object.entries(query).every(([k, v]) => d[k] === v));
      },
    );
    vi.spyOn(PersistApi, 'save').mockImplementation(
      async (col: string, doc: Record<string, unknown>) => {
        if (col !== Collections.HolderSnapshots) return 'id';
        const i = snapshots.findIndex((d) => d.scope === doc.scope && d.owner === doc.owner);
        if (i >= 0) {
          snapshots[i] = { ...doc, _id: snapshots[i]!._id };
          return snapshots[i]!._id as string;
        }
        const _id = String(snapshots.length + 1);
        snapshots.push({ ...doc, _id });
        return _id;
      },
    );
    vi.spyOn(PersistApi, 'delete').mockResolvedValue(undefined as never);
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'farm' });
    makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("⭐ the patch's reserves and soil stamps come back onto the re-minted patch", async () => {
    const PATH = '/world/test/kept-field';
    const f = await dividedField(1000, PATH);
    const top = patch(f, 'top-end');
    // An act: the top end is drunk dry and its window has run.
    clock.mockReturnValue(Quantity.of(base + 3 * DAY, 's'));
    top.soilMoistureFraction();
    level(top, SOIL_MOISTURE_RESERVE_KEY, 7);
    const stamp = top.soilClockStamp;
    expect(stamp).toBeGreaterThan(0);

    await PersistableApi.capture(f);

    // The world restarts: the field is re-minted, its onCreate mints fresh
    // patches (half-full, unstamped), and the record overlays them.
    StuffApi.unregister(top);
    StuffApi.unregister(patch(f, 'lane-end'));
    StuffApi.unregister(f);
    // Two days later: the fresh patch stamps ITS window at the new now, so
    // only the record can give back the old stamp.
    clock.mockReturnValue(Quantity.of(base + 5 * DAY, 's'));
    const reborn = await dividedField(1000, PATH);
    const freshTop = patch(reborn, 'top-end');
    expect(freshTop).not.toBe(top);
    expect(freshTop.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue()).not.toBe(7);
    expect(freshTop.soilClockStamp).not.toBe(stamp);

    await PersistableApi.materialize(reborn);

    expect(freshTop.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue()).toBe(7);
    expect(freshTop.soilClockStamp).toBe(stamp);
    // Still the field's part, still its sky.
    expect(reborn.getPatches()[0]).toBe(freshTop);
  });
});
