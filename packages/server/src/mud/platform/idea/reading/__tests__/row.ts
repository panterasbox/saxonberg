/**
 * The shipped ROW, applied to a hand-built Reading.
 *
 * ⭐⭐ A reading's behaviour is half class and half row — the class holds
 * the rung and the row holds which Discipline bands it, which capability
 * its instrument declares, and how far the naked eye gets. A test that
 * hand-set those fields would be testing a channel nobody ships; this
 * reads the real yaml, so a row that stops agreeing with its class fails
 * here rather than in a browser.
 *
 * ⚠ It assigns fields by name, which is the Hydrator's carve-out and
 * nobody else's. That is exactly what this is standing in for.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import type Reading from '../../../../lib/instrument/Reading';

const ROWS = join(
  __dirname,
  '..', '..', '..', '..', '..', '..', '..',
  'content', 'platform', 'content', 'platform', 'idea', 'reading',
);

/** Apply `<channel>.yaml`'s `data:` block to `reading`, and return it. */
export function withRow<T extends Reading>(reading: T, channel: string): T {
  return applyRowFrom(reading, join(ROWS, `${channel}.yaml`));
}

/** The same, for a pack's own row directory. */
export function applyRowFrom<T extends Reading>(reading: T, file: string): T {
  const doc = YAML.parse(readFileSync(file, 'utf8')) as {
    data?: Record<string, unknown>;
  };
  for (const [key, value] of Object.entries(doc.data ?? {})) {
    (reading as unknown as Record<string, unknown>)[key] = value;
  }
  return reading;
}
