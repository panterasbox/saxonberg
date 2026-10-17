/**
 * Test-local: stand up SHIPPED rows from the YAML on disk, hydrated by the
 * kernel's own `TemplateApplier` — so these tests prove the rows, not a
 * hand-written copy of them.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import TemplateApplier from '@saxonberg/server/mud/platform/idea/TemplateApplier';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { ConsumableMaterial } from '@saxonberg/server/mud/platform/idea/material/ConsumableMaterial';
import MaturationProfile from '@saxonberg/server/mud/platform/idea/maturation/MaturationProfile';
import FractionSchedule from '@saxonberg/server/mud/platform/idea/fractionation/FractionSchedule';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

/** `packages/content`. */
export const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
/** This pack's root. */
export const PACK = join(CONTENT, 'trade-dairying');

const CLASSES: Record<string, () => Stuff> = {
  '/platform/idea/material/Material': () => new Material(),
  '/platform/idea/material/ConsumableMaterial': () => new ConsumableMaterial(),
  '/platform/idea/maturation/MaturationProfile': () => new MaturationProfile(),
  '/platform/idea/fractionation/FractionSchedule': () => new FractionSchedule(),
};

/** The YAML file a template path is authored in, in any pack. */
export function rowFile(path: string): string | null {
  for (const pack of readdirSync(CONTENT)) {
    const f = join(CONTENT, pack, 'content', `${path}.yaml`);
    if (existsSync(f)) return f;
  }
  return null;
}

/** A row's parsed `{ class, data }`. */
export function readRow(path: string): { class: string; data: Record<string, unknown> } {
  const f = rowFile(path);
  if (!f) throw new Error(`no row on disk for ${path}`);
  return YAML.parse(readFileSync(f, 'utf8'));
}

/** Hydrate an idea row (material / profile / schedule) at its path. */
export async function hydrate<T extends Stuff>(path: string): Promise<T> {
  const found = StuffApi.findByTemplatePath<T>(path);
  if (found) return found;
  const row = readRow(path);
  const make = CLASSES[row.class];
  if (!make) throw new Error(`rows.ts: no class for ${row.class}`);
  const s = makeStuffAtPath(make, path) as unknown as T;
  // ⚠ `composition` and `electricalConductivity` reach the clone pipeline
  // at apply time, which a unit test has no store behind; neither is read
  // by anything these tests prove.
  const { composition: _c, electricalConductivity: _e, ...data } = row.data;
  await makeStuff(() => new TemplateApplier()).apply(s, data, { mode: 'mint' });
  return s;
}

/** Every row under a pack-relative dir (e.g. `trade/dairying/idea/material`). */
export function pathsUnder(dir: string): string[] {
  const abs = join(PACK, 'content', dir);
  return readdirSync(abs)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => `/${dir}/${f.replace(/\.yaml$/, '')}`);
}

const M = '/trade/dairying/idea/material/';
export const MAT = {
  milk: '/stuff/idea/material/food/milk',
  eweMilk: '/stuff/idea/material/food/ewe-milk',
  goatMilk: '/stuff/idea/material/food/goat-milk',
  skim: `${M}skim-milk`,
  cream: `${M}cream`,
  churned: `${M}churned-cream`,
  buttermilk: `${M}buttermilk`,
  butter: `${M}butter`,
  whey: `${M}whey`,
  renneted: `${M}renneted-milk`,
  softCurd: `${M}soft-curd`,
  firmCurd: `${M}firm-curd`,
  softCheese: `${M}soft-cheese`,
  hardCheese: `${M}hard-cheese`,
  rennet: `${M}rennet`,
};

/** Every dairying material, profile and schedule, plus the three milks. */
export async function standUpTheTrade(): Promise<void> {
  for (const p of [MAT.milk, MAT.eweMilk, MAT.goatMilk]) await hydrate(p);
  for (const dir of [
    'trade/dairying/idea/material',
    'trade/dairying/idea/maturation',
    'trade/dairying/idea/fractionation',
  ]) {
    for (const p of pathsUnder(dir)) await hydrate(p);
  }
}
