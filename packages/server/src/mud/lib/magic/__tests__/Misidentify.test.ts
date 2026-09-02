/**
 * **The decoy has to be a real thing, or the lie is not believable.**
 *
 * A cursed scroll of identify plants a `believedName` — a record
 * indistinguishable from an honest identification, naming a *different
 * real class*. That is what makes bad information strictly worse than
 * none: the holder finds out by acting on it.
 *
 * The name is **borrowed from the world**, not invented, and how it is
 * borrowed is the thing under test. It used to be a bespoke
 * `StuffApi.getAllObjects().filter(...)` — which `lint:world-scan` bans
 * outside three engine homes, and which had been failing that CI gate
 * on this branch unnoticed. It is now a system-mode MQL query.
 *
 * ⚠ The conversion is silent when it breaks: an empty result falls back
 * to the canned `'something entirely harmless'`, so a query that
 * returned nothing would still plant *a* name and every existing test
 * would pass. These assert the decoy is a **real other item's** name,
 * which is the only thing that can tell the two apart.
 */

import "../../../../test-bootstrap";
import type { CompetenceBandName } from '../../advancement/CompetenceBand';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { MagicApi } from '../../../api/magic';
import { ExecutionContextApi } from '../../../api/execution-context';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import SpellCatalogue from '../../../platform/idea/SpellCatalogue';
import Spell from '../../../platform/idea/magic/Spell';
import Scroll from '../../../../../../content/arcana/src/thing/Scroll';
import IdentifiableThing from '../../../platform/thing/IdentifiableThing';
import SingletonCartesianLocation from '../../../platform/location/SingletonCartesianLocation';
import Species from '../../../platform/idea/species/Species';
import { Character } from '../../character/Character';
import { Template } from '../../stuff/Template';
import { IDENTIFICATION } from '../../belief/BeliefStore';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_CLASS = '/platform/idea/magic/Spell';

const SPELL_SEEDS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../content/arcane-library/content/stuff/idea/magic/Spell',
);

// The competence read runs ON the caster since the OO sweep; this
// pins the band per test (credits no-op — PM is disconnected here).
let testBand: CompetenceBandName = 'competent';
class TestCharacter extends Character {
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return testBand;
  }
}

let seq = 0;
let catalogueSingleton: SpellCatalogue | null = null;

async function installCatalogue(): Promise<void> {
  const seeds = readdirSync(SPELL_SEEDS_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map(
      (f) =>
        (
          YAML.parse(readFileSync(join(SPELL_SEEDS_DIR, f), 'utf-8')) as {
            data: Record<string, unknown>;
          }
        ).data,
    );
  const spy = vi
    .spyOn(Template, 'findByClass')
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (prefix !== SPELL_CLASS) return [];
      return seeds.map((seed) => ({
        path: `${SPELL_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  if (!catalogueSingleton) {
    catalogueSingleton = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(catalogueSingleton, '/platform/idea/SpellCatalogue');
  }
  catalogueSingleton.invalidateCache();
  await catalogueSingleton.postRegister();
  spy.mockRestore();
}

function makeActor(): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
  species.setInnateMixins(['CasterMixin']);
  species.setSentient(true);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/mi-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/mi-actor-${n}`);
  actor.installArcaneReserve();
  return actor;
}

function makeItem(trueName: string): IdentifiableThing {
  const t = makeStuff(() => new IdentifiableThing());
  stampTemplatePathForTest(t, `/obj/test/mi-item-${seq++}`);
  t.setShortDescription('a nondescript thing');
  t.setIdentifiedName(trueName);
  return t;
}

function makeScroll(spellId: string): Scroll {
  const s = makeStuff(() => new Scroll());
  stampTemplatePathForTest(s, `/obj/test/mi-scroll-${seq++}`);
  s.setMarkText('a spiral of pressed characters');
  s.setCarriedSpellPath(`/stuff/idea/magic/Spell/${spellId}`);
  return s;
}

describe('misidentify — the decoy is borrowed from the world', () => {
  beforeEach(async () => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    catalogueSingleton = null;
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    await installCatalogue();
    testBand = 'competent';
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('⭐ plants a name taken from another REAL item, not a canned string', async () => {
    const room = makeStuff(() => new SingletonCartesianLocation());
    stampTemplatePathForTest(room, `/obj/test/mi-room-${seq++}`);
    const reader = makeActor();
    ContainmentApi.move(reader, room);

    const subject = makeItem('a wand of firebolt');
    ContainmentApi.move(subject, room);
    const decoyPool = ['a potion of healing', 'a ring of warmth'];
    for (const n of decoyPool) ContainmentApi.move(makeItem(n), room);

    const scroll = makeScroll('identify');
    ContainmentApi.move(scroll, room);
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(
      reader,
    );

    // Fire the CURSED branch — `identify.yaml` authors
    // `sense: [misidentify, identify-item, identify-item]`.
    const out = await MagicApi.discharge(scroll, subject, {
      source: reader,
      band: 'cursed',
    });
    expect(out.ok).toBe(true);

    const rec = reader.recall(IDENTIFICATION, subject.getTemplatePath()!);
    const believed = rec?.payload.believedName;
    expect(believed).toBeTruthy();
    // ⚠ The assertion that can tell a working query from a broken one.
    expect(believed).not.toBe('something entirely harmless');
    expect(decoyPool).toContain(believed);
    // …and never the truth, which would make the curse a free identify.
    expect(believed).not.toBe('a wand of firebolt');
  });

  it('falls back to the canned name when the world offers no decoy', async () => {
    // The honest degradation: an empty pool must still plant SOMETHING,
    // or a cursed scroll would silently do nothing at all.
    const room = makeStuff(() => new SingletonCartesianLocation());
    stampTemplatePathForTest(room, `/obj/test/mi-room-${seq++}`);
    const reader = makeActor();
    ContainmentApi.move(reader, room);
    const subject = makeItem('a wand of firebolt');
    ContainmentApi.move(subject, room);
    const scroll = makeScroll('identify');
    ContainmentApi.move(scroll, room);
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(
      reader,
    );

    await MagicApi.discharge(scroll, subject, {
      source: reader,
      band: 'cursed',
    });
    const believed = reader.recall(
      IDENTIFICATION,
      subject.getTemplatePath()!,
    )?.payload.believedName;
    expect(believed).toBe('something entirely harmless');
  });
});
