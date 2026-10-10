/**
 * ⭐ The venues are ROWS (dairy D14) — the dairy farm and the co-op
 * creamery at Heart's Delight, and three nannies at Rejection. These pins
 * prove the rows resolve and the herds seed what the drive relies on:
 * the dairy book's head 0 is a COW and some head is a BULL, and the drive
 * names those indices from THIS computation so its assumption cannot rot.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { HeadSeed } from '@saxonberg/content-trade-ranching/src/lib/HeadSeed';
import { CONTENT, rowFile, readRow } from './rows';

const DELIGHT = '/world/terminus/hearts-delight';
const REJECTION = '/world/terminus/rejection';

/** Every YAML file under a directory, recursively. */
function yamls(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...yamls(p));
    else if (name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

/** The template a `props:` entry names. */
function templateOf(entry: unknown): string {
  return typeof entry === 'string' ? entry : String((entry as { template: string }).template);
}

/** The first `n` indices of a herd whose seeded sex is `sex`. */
function headsOf(herdId: string, femaleFraction: number, sex: string, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64 && out.length < n; i++) {
    if (HeadSeed.sample({ herdId, meanAgeDays: 1000, femaleFraction }, i).sex === sex) out.push(i);
  }
  return out;
}

describe('the venues are rows', () => {
  const venueFiles = [
    ...yamls(join(CONTENT, 'hearts-delight', 'content', 'world', 'terminus', 'hearts-delight', 'dairy')),
    ...yamls(join(CONTENT, 'hearts-delight', 'content', 'world', 'terminus', 'hearts-delight', 'creamery')),
    join(CONTENT, 'rejection', 'content', 'world', 'terminus', 'rejection', 'kestrel-road', 'goat-pen.yaml'),
  ];

  it('every template a dairy venue props resolves to a row on disk', () => {
    let checked = 0;
    for (const f of venueFiles) {
      const doc = YAML.parse(readFileSync(f, 'utf8')) as { data?: { props?: unknown[]; cast?: unknown[] } };
      for (const entry of [...(doc.data?.props ?? []), ...(doc.data?.cast ?? [])]) {
        const path = templateOf(entry);
        expect(rowFile(path), `${f} props ${path}`).not.toBeNull();
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('⭐ Rejection still ships no TypeScript — the goats are rows', () => {
    expect(existsSync(join(CONTENT, 'rejection', 'src'))).toBe(false);
  });

  it('⭐ the dairy book seeds cows, with a bull among them; the ox register none', () => {
    const book = readRow(`${DELIGHT}/dairy/thing/dairy-book`).data;
    expect(book.femaleFraction).toBe(0.95);
    // The drive milks head 0 and refuses head BULL — computed, not assumed.
    expect(HeadSeed.sample({ herdId: 'delight-dairy', meanAgeDays: 1000, femaleFraction: 0.95 }, 0).sex)
      .toBe('female');
    const ox = readRow(`${DELIGHT}/thing/ox-book`).data;
    expect(ox.femaleFraction).toBe(0);
    expect(headsOf('delight-oxen', 0, 'male', 2)).toEqual([0, 1]);
  });

  it('the calf register is young stock, and the goat book is all nannies', () => {
    const calves = readRow(`${DELIGHT}/dairy/thing/calf-register`).data;
    expect(calves.foundingMeanAgeDays as number).toBeLessThan(60);
    // ⭐ The drive's BULL is calf 1: male, and young enough for a vell
    // (the dairy book's six are all cows at 0.95). Computed here so the
    // drive's index cannot rot.
    expect(headsOf('delight-calves', 0.5, 'male', 1)).toEqual([1]);
    expect(
      HeadSeed.sample({ herdId: 'delight-calves', meanAgeDays: 45, femaleFraction: 0.5 }, 1).ageDays,
    ).toBeLessThan(60);
    const goats = readRow(`${REJECTION}/thing/goat-book`).data;
    expect(goats.femaleFraction).toBe(1);
    expect(headsOf('rejection-nannies', 1, 'male', 1)).toEqual([]);
  });

  it('the cheese room is cold enough to ripen, and the creamery hearth is lit', () => {
    expect(readRow(`${DELIGHT}/creamery/location/cheese-room`).data._temperature).toBe(284);
    expect(readRow(`${DELIGHT}/creamery/thing/hearth`).data.lit).toBe(true);
  });
});
