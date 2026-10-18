/**
 * The heirloom (repair W5, D18) — a sword whose name lives in its BLADE,
 * and the sword it extends, in four parts that weigh what the whole does.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const PACKS = fileURLToPath(new URL('../../../', import.meta.url));
type Part = { part: string; template: string; count: number; role: string; name?: string; form?: string };
type Row = { class?: string; extends?: string; data: Record<string, unknown> & { bill?: { parts: Part[] }; mass?: number } };
const load = (rel: string): Row => parse(readFileSync(`${PACKS}${rel}`, 'utf8')) as Row;
const rowAt = (path: string): Row => {
  const [, root, ...rest] = path.split('/');
  const pack =
    root === 'trade' ? `trade-${rest[0]}/content/trade/${rest.join('/')}` : `generic-objects/content/stuff/${rest.join('/')}`;
  return load(`${pack}.yaml`);
};

describe('the heirloom over the hearth', () => {
  const heirloom = load('hearthworks/content/world/terminus/hearthworks/thing/heirloom.yaml');
  const sword = load('generic-objects/content/stuff/thing/arms/sword.yaml');

  it('⭐⭐ the name is the BLADE\'s — and nowhere else', () => {
    const parts = heirloom.data.bill!.parts;
    expect(parts.find((p) => p.part === 'blade')!.name).toBe('Hollin');
    expect(parts.filter((p) => p.name)).toHaveLength(1);
    expect(heirloom.extends).toBe('/stuff/thing/arms/sword');
  });

  it('⭐ AC 12: a sword is blade, guard, grip and pommel — and its parts weigh what it does', () => {
    const parts = sword.data.bill!.parts;
    expect(parts.map((p) => p.part)).toEqual(['blade', 'guard', 'grip', 'pommel']);
    expect(parts.find((p) => p.part === 'blade')!.form).toBe('bladed');
    const kg = parts.reduce((n, p) => n + Number(rowAt(p.template).data.mass) * p.count, 0);
    expect(kg).toBeLessThanOrEqual(Number(sword.data.mass) + 1e-9);
  });

  it('is propped in the smithy', () => {
    const smithy = load('hearthworks/content/world/terminus/hearthworks/location/smithy.yaml');
    expect(JSON.stringify(smithy.data.props)).toMatch(/hearthworks\/thing\/heirloom/);
  });
});
