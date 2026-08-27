/**
 * The lounge parks its cast off-shift through the one Offstage mechanism
 * (content packs wave 4b, AC 7): every rostered cast member's `shifts`
 * brain names the venue's own `offstage` row, that row is a
 * `/platform/location/Offstage`, and driving the brain over the authored
 * config moves the NPC into it at shift end and back to its post at shift
 * start. Beside the content, over the pack's files.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { brain as shifts } from '../../../lib/behavior/shifts';
import { Idea } from '../../../lib/stuff/Idea';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainmentApi } from '../../../api/containment';
import { EmploymentApi } from '../../../api/employment';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { BrainContext } from '../../../lib/behavior/brain';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import Offstage from '../../../platform/location/Offstage';

const VENUE = fileURLToPath(new URL('../../../../../../content/saxonberg-lounge/content/world/lounge/', import.meta.url));
const OFFSTAGE = '/world/lounge/location/offstage';

interface Spec { brain: string; config?: { behindBar?: string; offstage?: string } }
interface Row { class: string; data: { name?: string; behaviors?: Spec[] } }
const load = (rel: string): Row => YAML.parse(readFileSync(`${VENUE}${rel}`, 'utf8')) as Row;
const cast = () => readdirSync(`${VENUE}agent/`).filter((f) => f.endsWith('.yaml')).map((f) => [f, load(`agent/${f}`)] as const);
const shiftsOf = (row: Row) => row.data.behaviors?.find((b) => b.brain === '/lib/behavior/shifts');

class Post extends ContainerMixin(ContainableMixin(Idea)) { static _mixinName = 'Post'; }
class Mover extends MobileMixin(ContainableMixin(Idea)) { static _mixinName = 'Mover'; }

describe('the lounge parks its cast through Offstage', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it("the venue's offstage row is a platform Offstage", () => {
    expect(load('location/offstage.yaml').class).toBe('/platform/location/Offstage');
  });

  it('every rostered cast member parks in it', () => {
    const shifted = cast().filter(([, row]) => shiftsOf(row));
    expect(shifted.map(([f]) => f).sort()).toEqual(['augie.yaml', 'mara.yaml', 'remy.yaml', 'sloane.yaml']);
    for (const [f, row] of shifted) {
      const cfg = shiftsOf(row)!.config!;
      expect(cfg.offstage, f).toBe(OFFSTAGE);
      expect(cfg.behindBar, f).toMatch(/^\/world\/lounge\/location\//);
    }
  });

  it('shift end moves each cast member offstage; shift start returns it to its post', async () => {
    const offstage = makeStuff(() => new Offstage());
    expect(MixinApi.isOffstage(offstage)).toBe(true);
    const posts = new Map<string, Stuff>();
    vi.spyOn(StuffApi, 'singletonOrClone').mockImplementation(async (path: string) => {
      if (path === OFFSTAGE) return offstage as unknown as Stuff;
      if (!posts.has(path)) posts.set(path, makeStuff(() => new Post()) as unknown as Stuff);
      return posts.get(path)!;
    });
    const members = cast()
      .filter(([, row]) => shiftsOf(row))
      .map(([f, row]) => ({ f, cfg: shiftsOf(row)!.config!, npc: makeStuff(() => new Mover()) }));
    const ctx = (m: (typeof members)[number]): BrainContext =>
      ({ host: m.npc, config: m.cfg, state: {}, trigger: { source: 'cadence', raw: 'cadence:30s' } } as unknown as BrainContext);

    vi.spyOn(EmploymentApi, 'shiftStateOf').mockReturnValue('on-shift');
    for (const m of members) await shifts.act(ctx(m));
    for (const m of members) expect(m.npc.getContainer()?.stuffId, m.f).toBe(posts.get(m.cfg.behindBar!)!.stuffId);

    vi.spyOn(EmploymentApi, 'shiftStateOf').mockReturnValue('off-shift');
    for (const m of members) await shifts.act(ctx(m));
    for (const m of members) expect(m.npc.getContainer()?.stuffId, m.f).toBe(offstage.stuffId);
    expect(offstage.getContents()).toHaveLength(members.length);

    vi.spyOn(EmploymentApi, 'shiftStateOf').mockReturnValue('on-shift');
    for (const m of members) await shifts.act(ctx(m));
    expect(offstage.getContents()).toEqual([]);
    for (const m of members) expect(m.npc.getContainer()?.stuffId, m.f).toBe(posts.get(m.cfg.behindBar!)!.stuffId);
  });
});
