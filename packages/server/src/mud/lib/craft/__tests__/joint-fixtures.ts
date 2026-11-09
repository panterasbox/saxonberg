/**
 * Test-only: the shipped `joint` documents, kept in the joint cache as a
 * bill (or a rope) citing them would have loaded them — so a unit test that
 * has no store behind it reads the real joint figures by path.
 *
 * Lives under `__tests__/`, which the export-discipline lint exempts.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Joint, type JointDescriptor } from '../Joint';

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../../content');

function rootOf(pack: string): string {
  const m = (YAML.parse(readFileSync(join(CONTENT, pack, 'pack.yaml'), 'utf8')) ?? {}) as {
    id?: string;
    root?: string;
  };
  return m.root ?? `/${m.id ?? pack}`;
}

/** Remember every joint document any pack ships, by its path. Returns the paths. */
export function rememberShippedJoints(): string[] {
  const out: string[] = [];
  for (const pack of readdirSync(CONTENT)) {
    const dir = join(CONTENT, pack, 'content', 'joints');
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const root = rootOf(pack);
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.yaml')) continue;
      const path = `${root}/joints/${f.slice(0, -'.yaml'.length)}`;
      const data = (YAML.parse(readFileSync(join(dir, f), 'utf8')) ?? {}) as Record<string, unknown>;
      Joint.remember(path, Joint.fromData(data, path));
      out.push(path);
    }
  }
  return out;
}

/** Remember one joint built from `data` at `path` (a test's own joint). */
export function rememberJoint(path: string, data: Partial<JointDescriptor> & Record<string, unknown>): JointDescriptor {
  return Joint.remember(path, Joint.fromData(data, path));
}
