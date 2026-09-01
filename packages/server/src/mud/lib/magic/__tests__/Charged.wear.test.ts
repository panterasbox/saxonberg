/**
 * The wear wiring on `Charged` (capability packs D5): an `alwaysOn`
 * charged host that lands in a body slot sustains its bound working on
 * the wearer and pays for it; leaving the slot — or running flat —
 * releases it; a cursed host is never released (the gate refuses
 * upstream) and keeps drawing; an `alwaysOn: false` host does nothing
 * when worn; a restore re-slot with the draw already active fires
 * nothing twice.
 *
 * A bare `Worn` host rather than the pack's `Ring` (the RemoveCurse
 * precedent): `Wearable.fitsSlot` walks per-body-plan claims, which is
 * the slot substrate's business; the wiring under test is Charged's.
 * The real Ring on a real body is the live drive.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { ExecutionContextApi } from '../../../api/execution-context';
import { AdvancementApi } from '../../../api/advancement';
import { RecognitionApi } from '../../../api/recognition';
import { WorldClockApi } from '../../../api/worldclock';
import { MessageApi } from '../../../api/message';
import '../../../platform/idea/WorldClockRegistry';
import SpellCatalogue from '../../../platform/idea/SpellCatalogue';
import Species from '../../../platform/idea/species/Species';
import CartesianLocation from '../../../platform/location/CartesianLocation';
import { Template } from '../../stuff/Template';
import { Character } from '../../character/Character';
import { Idea } from '../../stuff/Idea';
import Thing from '../../stuff/Thing';
import { ContainmentApi } from '../../../api/containment';
import { SlottedMixin } from '../../slot/Slotted';
import { SlottableMixin } from '../../slot/Slottable';
import { BlessableMixin } from '../Blessable';
import { ChargedMixin, CHARGE_DEFAULTS } from '../Charged';
import { ArcaneMixin } from '../Arcane';
import { ReservedMixin } from '../../reserve';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_CLASS = '/platform/idea/magic/Spell';
const VEIL = `${SPELL_PATH_PREFIX}veil`;
const SPELL_SEEDS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../content/arcane-library/content/stuff/idea/magic/Spell',
);

/** A wearer: a Character with one finger, declared statically (no body plan in this fixture). */
class Wearer extends Character {
  override getSlotNames(): readonly string[] {
    return ['finger:left', 'finger:right'];
  }
  override getSlotSpec(name: string): { name: string; accepts: string; capacity: number } | null {
    return this.getSlotNames().includes(name) ? { name, accepts: 'SlottableMixin', capacity: 1 } : null;
  }
}
/** The worn charged host — Ring's substrate without Wearable's body-plan claims. */
class Worn extends BlessableMixin(
  ChargedMixin(ReservedMixin(ArcaneMixin(SlottableMixin(Thing)))),
) {}
/** A host with no vitals: nothing to sustain on. */
class Stand extends SlottedMixin(Idea) {}

let seq = 0;
let catalogue: SpellCatalogue | null = null;
let now = 100000;

async function installCatalogue(): Promise<void> {
  const seeds = readdirSync(SPELL_SEEDS_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => (YAML.parse(readFileSync(join(SPELL_SEEDS_DIR, f), 'utf-8')) as { data: Record<string, unknown> }).data);
  const spy = vi.spyOn(Template, 'findByClass').mockImplementation(async (cls: string) => {
    if (cls !== SPELL_CLASS) return [];
    return seeds.map((seed) => ({ path: `${SPELL_PATH_PREFIX}${String(seed.spellId)}`, data: seed })) as unknown as Template[];
  });
  if (!catalogue) {
    catalogue = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(catalogue, '/platform/idea/SpellCatalogue');
  }
  catalogue.invalidateCache();
  await catalogue.postRegister();
  spy.mockRestore();
}

function makeWearer(): Wearer {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
  species.setInnateMixins(['CasterMixin']);
  species.setSentient(true);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/wear-${n}`);
  const w = makeStuff(() => new Wearer());
  w.setSpecies(species);
  stampTemplatePathForTest(w, `/obj/test/wearer-${n}`);
  w.installArcaneReserve();
  const room = makeStuff(() => new CartesianLocation());
  stampTemplatePathForTest(room, `/obj/test/wear-room-${n}`);
  ContainmentApi.move(w, room);
  return w;
}

function makeRing(opts: { alwaysOn?: boolean; band?: string; capacityKJ?: number } = {}): Worn {
  const r = makeStuff(() => new Worn());
  stampTemplatePathForTest(r, `/obj/test/ring-${seq++}`);
  r.setCarriedSpellPath(VEIL);
  r.setAlwaysOn(opts.alwaysOn ?? true);
  if (opts.capacityKJ) r.setCapacityKJ(opts.capacityKJ);
  r.installChargeReserve();
  if (opts.band) r.setBlessingBand(opts.band);
  return r;
}

/** Let the void'd discharge promise land. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function heldBy(wearer: Wearer, ring: Worn): number {
  return wearer.getConditions().filter((c) => c.kind === 'sustained' && c.sustainedBy === ring.getTemplatePath()).length;
}

describe('Charged — wearing sustains, releasing releases', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    now = 100000;
    WorldClockApi._setNowProviderForTesting(() => now);
    await installCatalogue();
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
    vi.spyOn(MessageApi, 'scene').mockReturnValue({
      topic: () => ({ toSelf: () => ({ send: () => undefined }) }),
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('worn: a sustained Condition on the wearer, sustainedBy the ring, the veil visible to a second viewer; drawActive', async () => {
    const wearer = makeWearer();
    const other = makeWearer();
    ContainmentApi.move(other, wearer.getContainer() as never);
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(wearer);
    const ring = makeRing();
    wearer.occupy(ring as never, 'finger:left');
    await settle();
    const held = wearer.getConditions().find((c) => c.kind === 'sustained');
    expect(held).toBeDefined();
    expect(held!.kind === 'sustained' && held!.sustainedBy).toBe(ring.getTemplatePath());
    expect(held!.kind === 'sustained' && held!.realizes).toBe('cloak');
    wearer.getVitalSign('heartRate'); // realize by pull
    expect(RecognitionApi.describe(other, wearer)).toContain('a veiled, indistinct figure');
    expect(ring.isDrawActive()).toBe(true);
  });

  it('removed: the Condition is gone, the disguise drops, drawActive is false', async () => {
    const wearer = makeWearer();
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(wearer);
    const ring = makeRing();
    wearer.occupy(ring as never, 'finger:left');
    await settle();
    expect(heldBy(wearer, ring)).toBe(1);
    const out = wearer.tryReleaseFromSlots(ring as never);
    expect(out.released).toBe(true);
    expect(heldBy(wearer, ring)).toBe(0);
    expect(wearer.getDisguise()).toBeNull();
    expect(ring.isDrawActive()).toBe(false);
  });

  it('run flat: the standby draw empties the shell and the hold is released on the next read', async () => {
    const wearer = makeWearer();
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(wearer);
    const ring = makeRing({ capacityKJ: 100 });
    wearer.occupy(ring as never, 'finger:left');
    await settle();
    expect(heldBy(wearer, ring)).toBe(1);
    // Past capacity / standby watts in REAL seconds (the provider is real
    // ms; the draw is metered in real time) — twice over, for margin.
    now += ((ring.getCapacityKJ() * 1000) / CHARGE_DEFAULTS.STANDBY_WATTS) * 1000 * 2;
    expect(ring.isDepleted()).toBe(true);
    expect(ring.isDrawActive()).toBe(false);
    expect(heldBy(wearer, ring)).toBe(0);
  });

  it('cursed: the release gate refuses, the Condition persists, and the charge keeps falling', async () => {
    const wearer = makeWearer();
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(wearer);
    const ring = makeRing({ band: 'cursed' });
    wearer.occupy(ring as never, 'finger:left');
    await settle();
    const before = ring.getStoredKJ();
    const out = wearer.tryReleaseFromSlots(ring as never);
    expect(out.released).toBe(false);
    expect(heldBy(wearer, ring)).toBe(1);
    now += 3600 * 12;
    expect(ring.getStoredKJ()).toBeLessThan(before);
    expect(ring.isDrawActive()).toBe(true);
  });

  it('alwaysOn: false — wearing does nothing', async () => {
    const wearer = makeWearer();
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(wearer);
    const ring = makeRing({ alwaysOn: false });
    wearer.occupy(ring as never, 'finger:left');
    await settle();
    expect(heldBy(wearer, ring)).toBe(0);
    expect(ring.isDrawActive()).toBe(false);
  });

  it('restore: a re-slot with drawActive already true (no command giver) fires nothing — exactly one Condition', async () => {
    const wearer = makeWearer();
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(wearer);
    const ring = makeRing();
    wearer.occupy(ring as never, 'finger:left');
    await settle();
    expect(heldBy(wearer, ring)).toBe(1);
    // A second slot of the same host, the draw already active.
    wearer.occupy(ring as never, 'finger:right');
    await settle();
    expect(heldBy(wearer, ring)).toBe(1);
    // The restore shape: no command giver at all.
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(null);
    wearer.vacate('finger:right', ring as never); // one slot still holds it — nothing released
    expect(heldBy(wearer, ring)).toBe(1);
    expect(ring.isDrawActive()).toBe(true);
  });

  it('a host with no vitals: nothing to sustain on, nothing thrown', async () => {
    const stand = makeStuff(() => new Stand());
    stand.setStaticSlots([{ name: 'peg', accepts: 'SlottableMixin', capacity: 1 }] as never);
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(makeWearer());
    const ring = makeRing();
    expect(() => stand.occupy(ring as never, 'peg')).not.toThrow();
    await settle();
    expect(ring.isDrawActive()).toBe(false);
  });
});
