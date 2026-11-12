/**
 * ⚠ Every recipe slot's `minGrade` is a real band word.
 *
 * `Grade.of` throws on anything else, and it throws at the reverse-match
 * every `quench` runs over the WHOLE catalogue — so one recipe reading
 * `minGrade: good` (there is no such band: poor · fair · fine ·
 * exceptional · masterful) broke the smithing finish for every recipe in
 * the game, logged and silent (controller-liquidity W9).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { GRADE_BANDS } from '@saxonberg/server/mud/lib/craft/Grade';

const RECIPES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'recipes');

describe('recipe grade floors', () => {
  it('⭐ every minGrade names one of the five bands', () => {
    const bad: string[] = [];
    for (const file of readdirSync(RECIPES).filter((f) => f.endsWith('.yaml'))) {
      const doc = YAML.parse(readFileSync(join(RECIPES, file), 'utf8')) as {
        inputSlots?: { slot: string; minGrade?: string }[];
      };
      for (const s of doc.inputSlots ?? []) {
        if (s.minGrade !== undefined && !(GRADE_BANDS as readonly string[]).includes(s.minGrade)) {
          bad.push(`${file} ${s.slot}: ${s.minGrade}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
