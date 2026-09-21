/**
 * The gym archetype (nutrition-and-fitness W5 / D11): one archetype,
 * no industry; a `LoadDevice` dropped in any room satisfies `load`, a
 * surface satisfies `mat`, and a room with neither is a room, not an
 * error. Read straight off the shipped row.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Archetype } from '../Archetype';
import LoadDevice from '../../../platform/thing/LoadDevice';
import Surface from '../../../platform/thing/Surface';
import Thing from '../../../platform/thing/Thing';
import { ContainerMixin } from '../../spatial/Container';
import { Idea } from '../../stuff/Idea';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';

const ROW = new URL(
  '../../../../../../content/generic-objects/content/archetypes/gym.yaml',
  import.meta.url,
);

class Room extends ContainerMixin(Idea) {}

describe('the gym archetype', () => {
  afterEach(() => StuffApi.clearAll());

  const gym = (): Archetype =>
    Archetype.fromData(YAML.parse(readFileSync(fileURLToPath(ROW), 'utf-8')));
  const room = (): Room => makeStuff(() => new Room());
  const fit = (a: Archetype, r: Room) => a.satisfies(r as unknown as Stuff & Container);

  it('is a ROOM archetype — no industry, so survey reports it anywhere', () => {
    const a = gym();
    expect(a.getIndustry()).toBeNull();
    expect(a.getCapabilities().map((c) => c.key)).toEqual(['load', 'mat']);
  });

  it('⭐ a bar dropped on any floor meets the load slot — no code, no second archetype', () => {
    const r = room();
    const bar = makeStuff(() => new LoadDevice());
    bar.setCapabilities(['load']);
    ContainmentApi.move(bar, r);
    const s = fit(gym(), r);
    expect(s.rows.find((x) => x.key === 'load')?.satisfied).toBe(true);
    expect(s.rows.find((x) => x.key === 'mat')?.satisfied).toBe(false);
    expect(s.satisfied).toBe(false);
  });

  it('a surface meets the mat slot; a plain thing meets nothing', () => {
    const r = room();
    ContainmentApi.move(makeStuff(() => new Surface()), r);
    ContainmentApi.move(makeStuff(() => new Thing()), r);
    const s = fit(gym(), r);
    expect(s.rows.find((x) => x.key === 'mat')?.satisfied).toBe(true);
    expect(s.rows.find((x) => x.key === 'load')?.satisfied).toBe(false);
  });

  it('a room with neither is a room, not an error — reported, never enforced', () => {
    const s = fit(gym(), room());
    expect(s.satisfied).toBe(false);
    expect(s.rows.every((x) => !x.satisfied)).toBe(true);
  });
});
