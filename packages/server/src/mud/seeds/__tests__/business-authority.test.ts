/**
 * ⚠ **The shipped Businesses still author `proprietorPath`, and that has
 * to keep resolving.**
 *
 * The organizations build generalized the proprietor edge into a
 * polymorphic appointing authority and claimed, as a design goal, that
 * **no seed needed editing**: `Authority.fromData` reads a bare string as
 * `{kind: 'entity', path}`, the same value under the new type.
 *
 * That claim was tested only against hand-built fixtures. Nothing read
 * the real seed files — so a typo, a half-port, or a future seed that
 * authors *both* spellings would pass every suite. This is the missing
 * half: the eight shipped Business seeds, checked as authored.
 *
 * It is a **seed-shape** test rather than a runtime one on purpose. These
 * are authored facts; the thing most likely to break them is somebody
 * editing a seed, and that is what should turn it red.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { Authority } from '../../lib/employment/Authority';

const SEEDS = fileURLToPath(new URL('..', import.meta.url));

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

/** Every `.yaml` under `seeds/`, recursively. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.yaml')) out.push(full);
  }
  return out;
}

/** Every seed whose `class:` is the concrete Business. */
const businesses = walk(SEEDS)
  .map((path) => ({ path, seed: parse(readFileSync(path, 'utf8')) as Seed }))
  .filter((e) => e.seed?.class === '/obj/Business')
  .map((e) => ({ rel: e.path.slice(SEEDS.length), data: e.seed.data ?? {} }));

describe('the shipped Business seeds', () => {
  it('finds them all — the sweep is not silently empty', () => {
    // A walk that matches nothing would make every assertion below vacuous.
    expect(businesses.length).toBeGreaterThanOrEqual(8);
  });

  it('⚠ every authored authority resolves, whichever spelling it uses', () => {
    for (const { rel, data } of businesses) {
      const authored = data.appointingAuthority ?? data.proprietorPath;
      // A proprietor-absent business (a municipal budget, a registry)
      // authors `''` — no authority, which is a fact rather than a fault.
      if (authored === '' || authored === undefined) continue;
      expect(Authority.fromData(authored), rel).not.toBeNull();
    }
  });

  it('⚠ resolves a legacy bare `proprietorPath` to an entity ref', () => {
    const daves = businesses.find((b) => b.rel.includes('lounge'));
    expect(daves).toBeDefined();
    expect(Authority.fromData(daves!.data.proprietorPath)).toEqual({
      kind: 'entity',
      path: '/domain/lounge/npc/dave',
    });
  });

  it('⚠ no seed authors BOTH spellings', () => {
    // `appointingAuthority` wins when both are present, so a seed carrying
    // both has a silently-ignored field — the shape of a half-finished
    // port, and invisible at runtime.
    for (const { rel, data } of businesses) {
      const both =
        data.appointingAuthority !== undefined &&
        data.proprietorPath !== undefined &&
        data.proprietorPath !== '';
      expect(both, `${rel} authors both spellings`).toBe(false);
    }
  });

  it('keeps the trading half on every Business', () => {
    // `banksAt` is a Business concern, not an organization one — it stayed
    // put through the split, and a Business without it cannot open an
    // operating account.
    for (const { rel, data } of businesses) {
      expect(typeof data.banksAt, rel).toBe('string');
      expect((data.banksAt as string).length, rel).toBeGreaterThan(0);
    }
  });

  it('records which ones actually name a proprietor', () => {
    // Three of the eight have one; the rest are proprietor-absent by
    // design (municipal budgets, the registry, the transit desk). Stated
    // so that a seed quietly losing its proprietor is visible.
    const withProprietor = businesses
      .filter((b) => {
        const p = b.data.proprietorPath;
        return typeof p === 'string' && p.length > 0;
      })
      .map((b) => b.data.proprietorPath)
      .sort();
    expect(withProprietor).toEqual([
      '/domain/hearthworks/npc/smith',
      '/domain/lounge/npc/dave',
      '/domain/terminus/general-store/npc/keeper',
    ]);
  });
});
