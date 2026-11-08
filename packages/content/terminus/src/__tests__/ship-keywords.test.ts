/**
 * A ship's words are hers, read off the rows. From the landing the ship and
 * her deck are both candidates (the ship by `landedStructuresNow`, the deck
 * by `isSeenAcrossExit`), so a word both rows carry makes `look hesper` ask
 * which. Names are keywords like any others (D22), so the rows are what keep
 * them apart.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';

const ROOT = fileURLToPath(new URL('../../content/', import.meta.url));

interface Row {
  class?: string;
  data?: { keywords?: string[]; entrance?: string; name?: string };
}

function rowsUnder(dir: string): Array<{ file: string; row: Row }> {
  const out: Array<{ file: string; row: Row }> = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...rowsUnder(full));
    else if (name.endsWith('.yaml')) out.push({ file: full, row: YAML.parse(readFileSync(full, 'utf8')) as Row });
  }
  return out;
}

const ships = rowsUnder(ROOT).filter(({ row }) => row?.class === '/platform/idea/Ship');

describe('a ship and her deck answer to different words', () => {
  it('finds the ships', () => {
    expect(ships.length).toBeGreaterThanOrEqual(4);
  });

  it('no authored ship shares a keyword with her entrance row', () => {
    const shared: string[] = [];
    for (const { file, row } of ships) {
      const entrance = row.data?.entrance;
      if (!entrance) continue;
      const path = join(ROOT, `${entrance.replace(/^\//, '')}.yaml`);
      if (!existsSync(path)) throw new Error(`${file}: no entrance row at ${entrance}`);
      const deck = YAML.parse(readFileSync(path, 'utf8')) as Row;
      for (const word of row.data?.keywords ?? []) {
        if ((deck.data?.keywords ?? []).includes(word)) shared.push(`${entrance}: ${word}`);
      }
    }
    expect(shared).toEqual([]);
  });

  it('a smack of a kind and her deck row too', () => {
    const smack = YAML.parse(readFileSync(join(ROOT, 'stuff/idea/Ship/smack.yaml'), 'utf8')) as Row;
    const deck = YAML.parse(readFileSync(join(ROOT, 'stuff/location/ship/smack/deck.yaml'), 'utf8')) as Row;
    const words = new Set(deck.data?.keywords ?? []);
    expect((smack.data?.keywords ?? []).filter((w) => words.has(w))).toEqual([]);
  });
});
