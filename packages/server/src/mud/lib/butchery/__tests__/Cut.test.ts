/**
 * A cut claims muscles, and its texture DERIVES — nobody can author a
 * tender shank.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Cut from '../../../platform/thing/Cut';
import Muscle from '../../../platform/idea/material/Muscle';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Material from '../../material/Material';
import { Texture } from '../Texture';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

afterEach(() => StuffApi.clearAll());

const SHANK = '/stuff/idea/material/tissue/muscles/shank';
const LOIN = '/stuff/idea/material/tissue/muscles/loin';
const TENDER = '/stuff/idea/material/tissue/muscles/tenderloin';
const BONE = '/stuff/idea/material/tissue/bone';

function muscle(path: string, work: number): void {
  const m = makeStuffAtPath(() => new Muscle(), path);
  m.setWork(work);
}

function cut(tissues: string[]): Cut {
  const c = makeStuff(() => new Cut());
  c.tissues = tissues;
  return c;
}

describe('CutMixin — the claim', () => {
  it('⭐ narrows a Cut', () => {
    expect(MixinApi.isCut(cut([]))).toBe(true);
  });

  it('⭐⭐ derives toughness from the muscle it claims', () => {
    muscle(SHANK, 0.95);
    muscle(LOIN, 0.25);
    expect(cut([SHANK]).getToughness()).toBeCloseTo(0.95, 9);
    expect(cut([LOIN]).getToughness()).toBeCloseTo(0.25, 9);
    // ⭐ And the bands follow, which is the player-facing half.
    expect(cut([SHANK]).textureBand()).toBe('tough');
    expect(cut([LOIN]).textureBand()).toBe('tender');
  });

  it('⭐⭐⭐ a PORTERHOUSE is two entries and nothing special-cases it', () => {
    muscle(LOIN, 0.25);
    muscle(TENDER, 0.05);
    const porterhouse = cut([LOIN, TENDER]);
    // With no species stamped the weights are equal — the mean of the two.
    expect(porterhouse.getToughness()).toBeCloseTo(0.15, 9);
    expect(porterhouse.textureBand()).toBe('tender');
  });

  it('⭐⭐ weights by how much of the animal each muscle IS, once a species is stamped', () => {
    muscle(LOIN, 0.25);
    muscle(TENDER, 0.05);
    const plan = makeStuffAtPath(
      () => new BodyPlan(),
      '/stuff/idea/species/BodyPlan/test-weights',
    );
    plan.setName('test-weights');
    // A loin is nine times the tenderloin, as on a real carcass.
    plan.setBodyParts([
      {
        key: 'body.torso',
        parent: null,
        tissues: [
          { tissuePath: LOIN, share: 0.9 },
          { tissuePath: TENDER, share: 0.1 },
        ],
      },
    ]);
    const sp = makeStuffAtPath(() => new Species(), '/stuff/idea/species/test-beast');
    sp._bodyPlanPath = '/stuff/idea/species/BodyPlan/test-weights';
    const porterhouse = cut([LOIN, TENDER]);
    porterhouse._speciesPath = '/stuff/idea/species/test-beast';
    // 0.25·0.9 + 0.05·0.1, over 1.0 of claimed share.
    expect(porterhouse.getToughness()).toBeCloseTo(0.23, 9);
  });

  it('⚠ answers NULL when nothing claimed is a muscle', () => {
    makeStuffAtPath(() => new Material(), BONE);
    // A bone heap and a hide have no texture. Answering 0 would make them
    // read as the most tender things in the game.
    expect(cut([BONE]).getToughness()).toBeNull();
    expect(cut([BONE]).textureBand()).toBeNull();
    expect(cut([]).getToughness()).toBeNull();
  });

  it('⚠ ignores a claim that resolves to nothing', () => {
    muscle(LOIN, 0.25);
    expect(cut([LOIN, '/nope']).getToughness()).toBeCloseTo(0.25, 9);
  });
});

describe('Texture — the law', () => {
  it('⭐⭐⭐ a tough cut wants long moist heat; a tender one wants it fast and dry', () => {
    const shank = new Texture(0.95);
    const tenderloin = new Texture(0.05);
    expect(shank.wants()).toBe('long-moist');
    expect(tenderloin.wants()).toBe('fast-dry');
    expect(shank.fit('long-moist')).toBe(1);
    expect(tenderloin.fit('fast-dry')).toBe(1);
  });

  it('⭐⭐ and the mistakes are ASYMMETRIC — inedible vs merely wasted', () => {
    // A tough cut cooked fast has all its collagen and none of it
    // dissolved. A tender cut braised is still dinner; you have only
    // destroyed the best thing on the carcass.
    expect(new Texture(0.95).fit('fast-dry')).toBe(-1);
    expect(new Texture(0.05).fit('long-moist')).toBe(-0.5);
  });

  it('a middling cut forgives either and excels at neither', () => {
    const rib = new Texture(0.4);
    expect(rib.band()).toBe('middling');
    expect(rib.wants()).toBeNull();
    expect(rib.fit('long-moist')).toBe(0);
    expect(rib.fit('fast-dry')).toBe(0);
  });

  it('bands the shipped quadruped ladder the way the prose claims', () => {
    expect(new Texture(0.05).band()).toBe('tender');   // tenderloin
    expect(new Texture(0.25).band()).toBe('tender');   // loin
    expect(new Texture(0.35).band()).toBe('middling'); // rib
    expect(new Texture(0.5).band()).toBe('middling');  // belly
    expect(new Texture(0.6).band()).toBe('tough');     // leg
    expect(new Texture(0.8).band()).toBe('tough');     // shoulder
    expect(new Texture(0.95).band()).toBe('tough');    // shank
  });

  it('clamps rather than throwing — it is a READING, not a validator', () => {
    expect(new Texture(5).band()).toBe('tough');
    expect(new Texture(-1).band()).toBe('tender');
    expect(new Texture(Number.NaN).band()).toBe('tender');
  });
});
