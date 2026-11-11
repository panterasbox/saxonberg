/**
 * Profile and schedule fixtures — a maturation profile and a fraction
 * schedule are DOCUMENTS (load-on-use W4), so a suite that wants one
 * remembers the value in its catalogue at the path a vessel will cite. The
 * signature mirrors `makeStuffAtPath(factory, path)`, which is what these
 * fixtures used when the two were Ideas.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { BulkableApi } from '../../../api/bulk';
import type MaturationProfile from '../MaturationProfile';
import type FractionSchedule from '../../fractionation/FractionSchedule';

/** Remember the profile `factory` builds, at `path`; returns it. */
export function rememberProfile(factory: () => MaturationProfile, path: string): MaturationProfile {
  const p = factory();
  p.setPath(path);
  return BulkableApi.maturationProfiles().remember(path, p);
}

/** Remember the schedule `factory` builds, at `path`; returns it. */
export function rememberSchedule(factory: () => FractionSchedule, path: string): FractionSchedule {
  const s = factory();
  s.setPath(path);
  return BulkableApi.fractionSchedules().remember(path, s);
}

/** Forget every profile and schedule — a suite's clean slate. */
export function forgetProfiles(): void {
  BulkableApi.maturationProfiles().forget();
  BulkableApi.fractionSchedules().forget();
}

/** `packages/content`. */
const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..', 'content');

/**
 * ⭐ Remember a SHIPPED profile or schedule, read from its document file on
 * disk and parsed through its catalogue — so a suite proves the shipped
 * document, not a hand-written copy. `path` is the document's path
 * (`/trade/winemaking/maturation-profiles/mead`).
 */
export function rememberShipped<T extends MaturationProfile | FractionSchedule>(path: string): T {
  for (const pack of readdirSync(CONTENT)) {
    const manifest = join(CONTENT, pack, 'pack.yaml');
    if (!existsSync(manifest)) continue;
    const m = (YAML.parse(readFileSync(manifest, 'utf8')) ?? {}) as { id?: string; root?: string };
    const root = m.root ?? `/${m.id ?? pack}`;
    if (!path.startsWith(`${root}/`)) continue;
    const file = join(CONTENT, pack, 'content', `${path.slice(root.length + 1)}.yaml`);
    if (!existsSync(file)) continue;
    const data = (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as Record<string, unknown>;
    const cat = path.includes('/fraction-schedules/')
      ? BulkableApi.fractionSchedules()
      : BulkableApi.maturationProfiles();
    return (cat as unknown as { remember(p: string, v: T): T; parse(d: Record<string, unknown>, p: string): T })
      .remember(path, (cat as unknown as { parse(d: Record<string, unknown>, p: string): T }).parse(data, path));
  }
  throw new Error(`rememberShipped: no shipped document at ${path}`);
}
