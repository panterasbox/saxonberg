/**
 * ⭐⭐ The glued joint takes a real glue, and the GLUE decides (paint D11):
 * weak until it has set; a line disturbed before it sets loses what it had
 * not gained; the damp parts a hide line and not a casein one; past its
 * softening heat a glue lets go.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Assembly from '../../../platform/thing/Assembly';
import Material from '../../material/Material';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { BiomeApi } from '../../../api/biome';
import { Template } from '../../stuff/Template';
import { TemplatePaths } from '../../paths';
import { Evaporation } from '../../material/Evaporation';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import Location from '../../location/Location';
import { ContainmentApi } from '../../../api/containment';
import type { PartLine } from '../Assembled';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import type { Containable } from '../../spatial/Containable';
import { rememberJoint } from './joint-fixtures';

const HIDE = '/stuff/idea/material/_glue/hide-glue';
const CASEIN = '/stuff/idea/material/_glue/casein-glue';
const WOOD = '/stuff/idea/material/_glue/oak';

const glued = {
  key: 'glued', portability: 'hand', competence: null, reversible: 'never', strength: 0.7,
  structuralRecovery: 0, fastenerRecovery: 0, tightenable: false, needsFlat: true, failure: 'parted',
  takes: 'glue',
};

function line(part: string): PartLine {
  return {
    part, template: `/x/thing/${part}`, count: 1, role: 'structural', material: WOOD,
    grade: 'fair', condition: 1, failed: 0, makers: [],
  };
}

function glue(path: string, resistsDamp: number): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setAdhesive({ strength: 0.8, reversible: 'never', resistsDamp, softensAtK: 340 });
    m.setKinetics([{ key: 'set', sets: 'drying', order: 0, rate: [[273, 0.01], [293, 0.1]] }]);
    return m;
  }, path);
}

let nowS = 1_000_000;
let rh = 50;

function box(g: string): Assembly {
  const room = makeStuff(() => new Location());
  const a = makeStuff(() => new Assembly());
  ContainmentApi.move(a as unknown as Stuff & Containable, room as unknown as Stuff & Container);
  a.recordAssembly(
    [line('side'), line('end')],
    [{ key: 'corner', method: '/platform/joints/glued', members: ['side', 'end'], tension: 1, maker: '' }],
  );
  expect(a.glueJoints(g)).toBe(1);
  return a;
}

beforeEach(async () => {
  nowS = 1_000_000;
  rh = 50;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's'));
  for (const r of [{ path: '/platform/joints/glued', data: glued }] as unknown as Array<{ path: string; data: Record<string, unknown> }>) rememberJoint(r.path, r.data);
  vi.spyOn(BiomeApi, 'airSegmentsFor').mockImplementation((_s, t0, t1) => [
    { air: new Evaporation(rh, 0, 293), durationS: t1 - t0, rainMmPerH: 0 },
  ]);
  glue(HIDE, 0.1);
  glue(CASEIN, 0.7);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the glue line', () => {
  it('starts wet and sets over the hours in dry air', () => {
    const a = box(HIDE);
    expect(a.getJoints()[0]!.setProgress).toBe(0);
    nowS += 24 * 3600;
    expect(a.getJoints()[0]!.setProgress).toBeCloseTo(1, 5);
    expect(a.getJoints()[0]!.tension).toBe(1);
  });

  it('a line knocked before it has set loses more than a set one', () => {
    const wet = box(HIDE);
    const set = box(HIDE);
    nowS += 24 * 3600;
    set.getJoints();
    // `wet` was made now and never walked — still at its first stamp.
    (wet.getJoints()[0] as { setProgress?: number }).setProgress = 0;
    wet.wear(0.2, 'blunt' as never);
    set.wear(0.2, 'blunt' as never);
    expect(wet.getJoints()[0]!.tension).toBeLessThan(set.getJoints()[0]!.tension);
  });

  it('a wet cellar parts a hide line and not a casein one', () => {
    const hide = box(HIDE);
    const casein = box(CASEIN);
    nowS += 24 * 3600;
    hide.getJoints();
    casein.getJoints();
    rh = 95;
    nowS += 3 * 86_400;
    expect(hide.getJoints()[0]!.tension).toBeLessThan(0.2);
    expect(casein.getJoints()[0]!.tension).toBeGreaterThan(0.5);
    expect(hide.slackJoints().length).toBe(1);
  });
});
