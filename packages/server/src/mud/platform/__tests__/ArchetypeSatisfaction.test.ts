/**
 * `Archetype.satisfies` — the third derived read, and the one a person
 * asks (residences D15).
 *
 * Three things are being pinned, and the third is the design:
 *
 *   1. **The read is the CAPABILITY, never the furniture.** A studio
 *      corner with a hotplate, a board and a cold box reads as a
 *      kitchen, and the report names the hotplate. Nothing in the
 *      checker knows what a range is — the volcano-vent rule, domestic.
 *   2. **A holding answers as a whole.** Satisfaction unions the rooms,
 *      so a bed in one room and two chairs in another are one home.
 *   3. **Nothing consumes it.** An unrecognized room provisions,
 *      persists and functions identically, and no code anywhere reads a
 *      satisfaction to decide anything — asserted by a source walk, the
 *      same shape `FurnishableRoom`'s room-designation field uses,
 *      because a habit is not a guarantee.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { DocumentApi } from '../../api/document';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import ArchetypeCatalogue from '../idea/ArchetypeCatalogue';
import SingletonCartesianLocation from '../location/SingletonCartesianLocation';
import Chair from '../thing/Chair';
import Oven from '../thing/Oven';
import Prop from '../thing/Prop';
import UnboundedReceptacle from '../thing/UnboundedReceptacle';
import Thing from '../../lib/stuff/Thing';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';
import { AdornmentMixin } from '../../lib/boundary/Adornment';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { ContainerMixin } from '../../lib/spatial/Container';
import type { StoredDocument } from '../../lib/document/StoredDocument';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';

class Board extends SurfacedMixin(Thing) {}
/** The same surface, made to go on a wall. */
class WallShelf extends AdornmentMixin(SurfacedMixin(Thing)) {}
/** A cold box: insulated AND closable — the two halves of cold storage. */
class ColdBox extends ThermalMixin(SealableMixin(ContainerMixin(Thing))) {}

/** The four shipped ROOM archetypes, read off the generic-objects pack. */
const ARCHETYPE_DIR = fileURLToPath(
  new URL(
    '../../../../../content/generic-objects/content/archetypes/',
    import.meta.url,
  ),
);

function roomArchetypeDocs(): StoredDocument[] {
  return readdirSync(ARCHETYPE_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const raw = readFileSync(join(ARCHETYPE_DIR, f), 'utf8');
      // Hand-parsed rather than YAML-loaded: these rows are flat, and the
      // point of reading the REAL files is that the shipped archetypes are
      // what is under test, not a fixture that agrees with them.
      return raw;
    })
    .map((raw) => parseArchetype(raw));
}

/** A deliberately tiny reader for the four flat archetype rows. */
function parseArchetype(raw: string): StoredDocument {
  const lines = raw.split('\n').filter((l) => !l.trimStart().startsWith('#'));
  const idLine = lines.find((l) => l.startsWith('archetypeId:'))!;
  const labelLine = lines.find((l) => l.startsWith('label:'))!;
  const capabilities = lines
    .filter((l) => l.trimStart().startsWith('- { key:'))
    .map((l) => {
      const key = /key:\s*([\w-]+)/.exec(l)![1]!;
      const needs = /needs:\s*\{([^}]*)\}/.exec(l)![1]!;
      const [nk, nvRaw] = needs.split(':').map((s) => s.trim());
      const nv =
        nvRaw === 'true'
          ? true
          : Number.isFinite(Number(nvRaw))
            ? Number(nvRaw)
            : nvRaw;
      const dflt = /default:\s*(\/[\w/-]+)/.exec(l)?.[1] ?? null;
      return { key, needs: { [nk!]: nv }, default: dflt };
    });
  const data = {
    archetypeId: idLine.slice('archetypeId:'.length).trim(),
    label: labelLine.slice('label:'.length).trim(),
    capabilities,
  };
  return {
    getPath: () => `/generic-objects/archetypes/${data.archetypeId}`,
    getData: () => data as Record<string, unknown>,
    getKind: () => 'archetype',
  } as unknown as StoredDocument;
}

let catalogue: ArchetypeCatalogue;

function room(): SingletonCartesianLocation {
  return makeStuff(() => new SingletonCartesianLocation());
}
function put(item: Stuff, where: Stuff): void {
  ContainmentApi.move(
    item as Stuff & Containable,
    where as unknown as Stuff & Container,
  );
}
function bed(quality = 2.0): Chair {
  const b = makeStuff(() => new Chair());
  b.setStaticSlots([
    { name: 'lie:1', accepts: 'SlottableMixin', capacity: 1, postures: ['lie', 'sit'] },
  ]);
  b.setRestQuality(quality);
  b.setShortDescription('a bed');
  return b;
}
function seat(): Chair {
  const c = makeStuff(() => new Chair());
  c.setStaticSlots([
    { name: 'sit:1', accepts: 'SlottableMixin', capacity: 1, postures: ['sit'] },
  ]);
  c.setShortDescription('an armchair');
  return c;
}
function hotplate(k = 500): Oven {
  const o = makeStuff(() => new Oven());
  o.setBurnTemperatureK(k);
  o.setShortDescription('a hotplate');
  return o;
}
function tap(): UnboundedReceptacle {
  const t = makeStuff(() => new UnboundedReceptacle());
  // The two authored bulk flags have no setters — the Hydrator writes
  // them by name off the row (`interiorBulk: true`), which is exactly
  // what this stands in for.
  const authored = t as unknown as {
    interiorBulk: boolean;
    interiorMaterial: string;
  };
  authored.interiorBulk = true;
  authored.interiorMaterial = '/stuff/idea/material/bulk/water';
  t.setShortDescription('a cold tap');
  return t;
}
function toilet(): Prop {
  const p = makeStuff(() => new Prop());
  p.setShortDescription('a toilet');
  p.setPrimaryKeyword('toilet');
  p.setKeywords(['toilet', 'lavatory']);
  return p;
}

function verdict(id: string, spaces: (Stuff & Container)[] | Stuff & Container) {
  return catalogue.getArchetype(id)!.satisfies(spaces as never);
}

describe('archetype satisfaction', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
      kind === 'archetype' ? roomArchetypeDocs() : [],
    );
    catalogue = makeStuffAtPath(
      () => new ArchetypeCatalogue(),
      '/platform/idea/ArchetypeCatalogue',
    );
    await catalogue.warm();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('ships four ROOM archetypes — industry-less, deriving nothing', () => {
    const ids = catalogue
      .allArchetypes()
      .map((a) => a.getArchetypeId())
      .sort();
    expect(ids).toEqual(['bathroom', 'bedroom', 'kitchen', 'living']);
    for (const a of catalogue.allArchetypes()) {
      // The distinguishing fact: no recipe makes a bedroom.
      expect(a.getIndustry()).toBeNull();
      expect(a.describe().rows.every((r) => r.derivedFrom.length === 0)).toBe(true);
    }
  });

  it('a bare room answers none of them, and that is a legal room', () => {
    const r = room();
    for (const id of ['bedroom', 'kitchen', 'bathroom', 'living']) {
      expect(verdict(id, r as unknown as Stuff & Container).satisfied).toBe(false);
    }
    // …and it still works: things go in it and stay in it.
    const t = toilet();
    put(t, r);
    expect((r as unknown as Container).getContents()).toContain(t);
  });

  it('a bed makes a bedroom, and the report names the bed', () => {
    const r = room();
    const b = bed();
    put(b, r);
    const v = verdict('bedroom', r as unknown as Stuff & Container);
    expect(v.satisfied).toBe(true);
    expect(v.rows[0]!.by).toContain('bed');
  });

  it('a bed too poor to sleep on does NOT — the read is the quality, not the furniture', () => {
    const r = room();
    // `rest: 1` is "better than the open floor". A `restQuality` of 1.0
    // IS the open floor, so a pallet at 0.9 is worse than lying down here.
    const pallet = bed(0.9);
    put(pallet, r);
    expect(verdict('bedroom', r as unknown as Stuff & Container).satisfied).toBe(false);
  });

  it('a studio corner reads as a kitchen — whatever objects satisfied it', () => {
    const r = room();
    put(hotplate(), r);
    put(makeStuff(() => new Board()), r);
    put(tap(), r);
    const cold = makeStuff(() => new ColdBox());
    put(cold, r);

    const v = verdict('kitchen', r as unknown as Stuff & Container);
    expect(v.satisfied).toBe(true);
    const by = new Map(v.rows.map((row) => [row.key, row.by]));
    expect(by.get('heat')).toContain('hotplate');
    expect(by.get('water')).toContain('tap');
    expect(by.get('surface')).not.toBeNull();
    expect(by.get('cold')).not.toBeNull();
  });

  it('names what is MISSING when a room is close but short', () => {
    const r = room();
    put(hotplate(), r);
    put(tap(), r);
    const v = verdict('kitchen', r as unknown as Stuff & Container);
    expect(v.satisfied).toBe(false);
    const short = v.rows.filter((row) => !row.satisfied).map((row) => row.key);
    expect(short.sort()).toEqual(['cold', 'surface']);
  });

  it('a bathroom needs water AND the fixture everybody looks for', () => {
    const r = room();
    put(tap(), r);
    expect(verdict('bathroom', r as unknown as Stuff & Container).satisfied).toBe(false);
    put(toilet(), r);
    const v = verdict('bathroom', r as unknown as Stuff & Container);
    expect(v.satisfied).toBe(true);
    expect(v.rows.find((row) => row.key === 'relief')!.by).toContain('toilet');
  });

  it('a living room wants TWO seats — one chair is a chair in a room', () => {
    const r = room();
    put(seat(), r);
    expect(verdict('living', r as unknown as Stuff & Container).satisfied).toBe(false);
    put(seat(), r);
    expect(verdict('living', r as unknown as Stuff & Container).satisfied).toBe(true);
  });

  it('a HOLDING answers as a whole — the bed in one room, the seats in another', () => {
    const bedroom = room();
    const parlour = room();
    put(bed(), bedroom);
    put(seat(), parlour);
    put(seat(), parlour);
    const holding = [bedroom, parlour] as unknown as (Stuff & Container)[];

    expect(verdict('bedroom', holding).satisfied).toBe(true);
    expect(verdict('living', holding).satisfied).toBe(true);
    // …and neither room answers both on its own.
    expect(verdict('living', bedroom as unknown as Stuff & Container).satisfied).toBe(false);
    expect(verdict('bedroom', parlour as unknown as Stuff & Container).satisfied).toBe(false);
  });

  it('counts what is HUNG as readily as what is standing (D11)', () => {
    const r = room();
    const hung = makeStuff(() => new WallShelf());
    // A surface bolted to the wall is a surface. Fixtures ride
    // `getFixtures()`, so a checker that walked contents only would
    // silently miss every mounted thing in the game.
    (r as unknown as { addFixture(f: unknown, s?: string): boolean }).addFixture(
      hung as unknown as never,
      'mounted:test',
    );
    const v = verdict('kitchen', r as unknown as Stuff & Container);
    expect(v.rows.find((row) => row.key === 'surface')!.satisfied).toBe(true);
  });

  it('has NO consumer that DECIDES anything — satisfaction is reported, never spent', () => {
    // The D15 grep, as a test. `satisfies` may be called by the value
    // object that defines it, by the one verb that reports it, and by
    // tests — and nowhere else. The moment a multiplier, a gate or a
    // price reads it, this fails and the conversation happens.
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        // Keyed on the RESULT TYPE, not on the method name: `satisfies`
        // is an ordinary English word (and a TypeScript operator), while
        // nothing can consume a satisfaction without naming `Satisfaction`.
        else if (
          e.name.endsWith('.ts') &&
          /\bSatisfaction\b/.test(readFileSync(full, 'utf8'))
        ) {
          hits.push(full.slice(root.length));
        }
      }
    };
    walk(root);
    expect(hits.sort()).toEqual([
      'lib/archetype/Archetype.ts',
      'platform/__tests__/ArchetypeSatisfaction.test.ts',
      'platform/idea/cmd/perception/SurveyController.ts',
    ]);
  });
});
