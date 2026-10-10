/**
 * AssembledMixin — a thing made of parts that keep their identity
 * (assembly D3, D7). The record, the routes wear takes, and the two
 * different ways a thing stops being whole: a member FAILS, or a joint
 * goes SLACK with every member sound.
 */
import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Tool from '../../../platform/thing/Tool';
import Assembly from '../../../platform/thing/Assembly';
import Material from '../../material/Material';
import { MaterialApi } from '../../../api/material';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { Construction } from '../../material/Construction';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import type { PartLine } from '../Assembled';

function material(path: string, hardness: number, toughness: number): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, 'MPa'));
  m.setToughness(Quantity.of(toughness, 'MJ/m³'));
  stampTemplatePathForTest(m, path);
  return m;
}

const IRON = '/stuff/idea/material/test/iron';
const ASH = '/stuff/idea/material/test/ash';

function line(part: string, mat: string, over: Partial<PartLine> = {}): PartLine {
  return {
    part,
    template: `/x/thing/${part}`,
    count: 1,
    role: 'structural',
    material: mat,
    grade: 'fair',
    condition: 1,
    failed: 0,
    makers: [],
    ...over,
  };
}

function pick(): Tool {
  const t = makeStuff(() => new Tool());
  t.recordAssembly(
    [line('head', IRON), line('haft', ASH)],
    [{ key: 'hafting', method: 'wedged', members: ['head', 'haft'], tension: 1, maker: '' }],
  );
  return t;
}

beforeEach(() => {
  StuffApi.clearAll();
  material(IRON, 600, 200);
  material(ASH, 40, 60);
});
afterEach(() => StuffApi.clearAll());

describe('AssembledMixin', () => {
  it('is vacuous on a one-material thing — every Durable read is unchanged', () => {
    const knife = makeStuff(() => new Tool());
    expect(knife.isAssembly()).toBe(false);
    knife.wear(0.25, 'shock');
    expect(knife.getCondition()).toBeCloseTo(0.75, 6);
    expect(knife.leaks()).toBe(false);
  });

  it('⭐ routes a jar to the part that gives first — the haft, never the head', () => {
    const p = pick();
    p.wear(0.3, 'shock');
    expect(p.getLine('haft')!.condition).toBeCloseTo(0.7, 6);
    expect(p.getLine('head')!.condition).toBe(1);
    expect(p.getCondition()).toBeCloseTo(0.7, 6);
  });

  it('⭐ a member that wears through FAILS, names itself, and breaks the whole', () => {
    const p = pick();
    for (let i = 0; i < 10; i++) p.wear(0.1, 'shock');
    const haft = p.getLine('haft')!;
    expect(haft.failed).toBe(1);
    expect(p.failedLines().map((l) => l.part)).toEqual(['haft']);
    expect(p.isBroken()).toBe(true);
    expect(p.getCondition()).toBe(0);
    // The head was never touched.
    expect(p.getLine('head')!.failed).toBe(0);
  });

  it('⭐⭐ a joint can go slack with every member sound — and that is a leak', () => {
    const p = pick();
    p.slackenJoint('hafting', 0.6);
    expect(p.failedLines()).toEqual([]);
    expect(p.slackJoints().map((j) => j.key)).toEqual(['hafting']);
    expect(p.leaks()).toBe(true);
    p.tightenJoint('hafting', '/someone');
    expect(p.leaks()).toBe(false);
    expect(p.getJoints()[0]!.maker).toBe('/someone');
  });

  it('replaces ONE member of a set by arithmetic, and re-makes its joints under the new hand', () => {
    const cask = makeStuff(() => new Assembly());
    cask.recordAssembly(
      [line('stave', ASH, { count: 30, failed: 2, condition: 0.8, plural: 'staves' })],
      [{ key: 'hooping', method: 'hooped', members: ['stave'], tension: 0.4, maker: '/cooper' }],
    );
    cask.replaceMembers('stave', 2, { material: ASH, grade: 'poor', maker: '/me' });
    const staves = cask.getLine('stave')!;
    expect(staves.failed).toBe(0);
    // (0.8 × 28 + 2) / 30
    expect(staves.condition).toBeCloseTo((0.8 * 28 + 2) / 30, 6);
    expect(staves.grade).toBe('poor'); // weakest link
    expect(staves.makers).toEqual(['/me']);
    expect(cask.getJoints()[0]!.tension).toBe(1);
    expect(cask.getJoints()[0]!.maker).toBe('/me');
  });

  it('a count-1 line becomes what was fitted', () => {
    const p = pick();
    for (let i = 0; i < 10; i++) p.wear(0.1, 'shock');
    p.replaceMembers('haft', 1, { material: IRON, grade: 'fine', maker: '/me' });
    const haft = p.getLine('haft')!;
    expect(haft).toMatchObject({ failed: 0, condition: 1, material: IRON, grade: 'fine' });
    expect(p.isBroken()).toBe(false);
  });

  it('a FOUND thing reads its bill at defaults and materializes it on first use', () => {
    const t = makeStuff(() => new Tool());
    t.setBill({
      parts: [
        { part: 'head', template: '/x/thing/head', count: 1, role: 'structural', material: IRON },
        { part: 'haft', template: '/x/thing/haft', count: 1, role: 'structural', material: ASH },
      ],
      joints: [{ key: 'hafting', method: 'wedged', members: ['head', 'haft'] }],
    });
    expect(t.isAssembly()).toBe(true);
    expect(t.getParts().map((l) => l.part)).toEqual(['head', 'haft']);
    t.wear(0.2, 'shock');
    expect(t.getLine('haft')!.condition).toBeCloseTo(0.8, 6);
    expect(t.getLine('head')!.material).toBe(IRON);
  });

  it('refuses a malformed bill on the setter', () => {
    const t = makeStuff(() => new Tool());
    expect(() => t.setBill({ parts: [{ part: 'x', template: '/x', count: 1, role: 'decorative' }] })).toThrow();
  });

  it('⭐ the part that ANSWERS a blow is the best resister — a hide face to an edge', () => {
    // A riven board against a sawn one under a blow: the construction axis
    // decides, through the stock form's integrity, not a special case.
    const scores = MaterialApi.resistanceTo('blunt', [
      { material: StuffApi.findByTemplatePath<Material>(ASH)!, construction: Construction.of('riven') },
      { material: StuffApi.findByTemplatePath<Material>(ASH)!, construction: Construction.of('sawn') },
    ]);
    expect(scores[1]! / scores[0]!).toBeCloseTo(0.7, 6);
    const shield = makeStuff(() => new Assembly());
    shield.recordAssembly(
      [
        line('board', ASH, { form: 'riven' }),
        line('face', IRON, { role: 'facing', form: 'hide' }),
      ],
      [],
    );
    expect(shield.partAnswering('edge')!.part).toBe('face');
  });

  it('⭐ green work WARPS once it has dried in place — a member fails and says so', () => {
    const oak = StuffApi.findByTemplatePath<Material>(ASH)!;
    oak.seasoningDays = 100;
    oak.greenShrinkage = 0.1;
    let nowS = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => nowS);
    const t0 = WorldClockApi.getNow().rawValue();
    const cask = makeStuff(() => new Assembly());
    cask.recordAssembly(
      [line('stave', ASH, { count: 30, plural: 'staves', green: true, greenAt: t0 })],
      [{ key: 'hooping', method: 'hooped', members: ['stave'], tension: 1, maker: '' }],
    );
    expect(cask.failedLines()).toEqual([]);
    // Push the game clock well past a tenth of the seasoning time.
    while (WorldClockApi.getNow().rawValue() - t0 < 11 * 86_400) nowS += 10_000_000;
    const staves = cask.getLine('stave')!;
    expect(staves.warped).toBe(true);
    expect(staves.failed).toBe(1);
    expect(cask.getJoints()[0]!.tension).toBeLessThan(0.5);
    expect(cask.leaks()).toBe(true);
    WorldClockApi._resetForTesting();
  });

  it('composes on Tool and is registered', () => {
    expect(MixinApi.isAssembled(makeStuff(() => new Tool()))).toBe(true);
    expect(MixinApi.isAssembled(makeStuff(() => new Assembly()))).toBe(true);
  });
});
