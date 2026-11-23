/**
 * ⭐ Stand every SHIPPED body-module document in the catalogue's memory
 * (organism-biology W1) — for a test that hydrates a real body plan from
 * disk (a plan is a list of modules; without them it cannot build its
 * body). The documents are read straight from the packs' `body-modules/`
 * directories at the paths a pack installs them under.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { BodyModule } from '../BodyModule';
import { SpeciesApi } from '../../../api/species';

const CONTENT = fileURLToPath(new URL('../../../../../../content/', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? walk(full) : e.endsWith('.yaml') ? [full] : [];
  });
}

function rootOf(pack: string): string {
  const manifest = join(CONTENT, pack, 'pack.yaml');
  if (!existsSync(manifest)) return `/${pack}`;
  const m = YAML.parse(readFileSync(manifest, 'utf8')) as { id?: string; root?: string } | null;
  return m?.root ?? `/${m?.id ?? pack}`;
}

export function standShippedModules(): void {
  for (const pack of readdirSync(CONTENT)) {
    const dir = join(CONTENT, pack, 'content', 'body-modules');
    if (!existsSync(dir)) continue;
    const root = rootOf(pack);
    for (const file of walk(dir)) {
      const path = `${root}/body-modules/${relative(dir, file).replace(/\.yaml$/, '')}`;
      SpeciesApi.modules().remember(path, new BodyModule(path, YAML.parse(readFileSync(file, 'utf8')) ?? {}));
    }
  }
}
