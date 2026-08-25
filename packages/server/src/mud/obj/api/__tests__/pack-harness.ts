/**
 * The shared in-memory harness for the PackLogic test files: a
 * collection-aware store behind the PersistApi chokepoint (the
 * lint:pm-locked surface PackLogic writes through), stubbed class
 * resolution, and fixture-pack writers. Test-only.
 */

import { vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import YAML from 'yaml';
import { PersistApi } from '../../../api/persist';
import { StuffApi } from '../../../api/stuff';
import type { PackInstallRecord } from '../../../api/pack';

export const MATERIAL = '/obj/material/Material';
export const HYDRATOR = '/obj/persistence/PersistentHydrator';

export interface Row extends Record<string, unknown> {
  _id?: string;
  path?: string;
  class?: string;
  hydratorClass?: string;
  data?: Record<string, unknown>;
  sourcePack?: string;
  __col?: string;
}

export const store: { rows: Row[]; nextId: number } = { rows: [], nextId: 1 };
const tmpRoots: string[] = [];

/** A dotted-key read (`'data.verb'`) over a plain row, Mongo-style. */
function getPath(row: Record<string, unknown>, key: string): unknown {
  let cur: unknown = row;
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** An in-memory, collection-aware store behind PersistApi (dotted keys ok). */
export function stubPersist(): void {
  store.rows = [];
  store.nextId = 1;
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      store.rows
        .filter(
          (r) =>
            (r.__col ?? 'content') === col &&
            Object.entries(query).every(([k, v]) => getPath(r, k) === v),
        )
        .map((r) => structuredClone(r)) as never,
  );
  vi.spyOn(PersistApi, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const d = structuredClone(doc) as Row;
      if (d._id) {
        const i = store.rows.findIndex((r) => r._id === d._id);
        const { _id, ...rest } = d;
        store.rows[i] = { ...store.rows[i]!, ...rest, _id, __col: col };
        return String(d._id);
      }
      const id = `id-${store.nextId++}`;
      store.rows.push({ ...d, _id: id, __col: col });
      return id;
    },
  );
  vi.spyOn(PersistApi, 'delete').mockImplementation(
    async (_col: string, id: string) => {
      const i = store.rows.findIndex((r) => r._id === id);
      if (i >= 0) store.rows.splice(i, 1);
    },
  );
}

/** Stub class-resolution: resolve anything but a `DoesNotExist` sentinel. */
export function stubClassResolution(): void {
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(async (p: string) => {
    if (p.includes('DoesNotExist')) throw new Error(`no blueprint at '${p}'`);
    return class {} as never;
  });
}

/** The installer is loud by design; keep the test output quiet. */
export function quietConsole(): {
  warn: ReturnType<typeof vi.spyOn>;
  error: ReturnType<typeof vi.spyOn>;
} {
  return {
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  };
}

export function rowsIn(col: string): Row[] {
  return store.rows.filter((r) => r.__col === col);
}
export const contentRows = (): Row[] => rowsIn('content');
export const documentRows = (): Row[] => rowsIn('documents');
export const rowsOfKind = (kind: string): Row[] =>
  documentRows().filter((r) => r.kind === kind);
/** Name banks are the `name-bank` document kind: `data.{key,given,surname,style}`. */
export const nameBankRows = (): Row[] => rowsOfKind('name-bank');
export const bankData = (key: string): { given: string[]; surname: string[]; style?: string } =>
  nameBankRows().find((r) => (r.data as { key: string }).key === key)!.data as never;
export function recordOf(packId: string): (PackInstallRecord & Row) | undefined {
  return rowsIn('pack_installs').find((r) => r.packId === packId) as
    | (PackInstallRecord & Row)
    | undefined;
}

export interface FixtureFile {
  /** content-relative path, e.g. `obj/material/spirit/gin.yaml`. */
  rel: string;
  class?: string;
  hydratorClass?: string;
  data?: Record<string, unknown>;
}
export interface NameBankFixture {
  key: string;
  given: string[];
  surname: string[];
  style?: string;
  /** Subdir under `content/name-banks/` (for the within-pack collision case). */
  dir?: string;
}

/** Write a fixture pack to a temp dir; returns its root. */
export function writePack(
  id: string,
  files: FixtureFile[],
  opts: {
    dependsOn?: string[];
    nameBanks?: NameBankFixture[];
    version?: string;
    /** The manifest `root` (document paths derive from it); omitted = `/<id>`. */
    root?: string;
  } = {},
): string {
  const root = mkdtempSync(join(tmpdir(), `pack-${id}-`));
  tmpRoots.push(root);
  const manifest: Record<string, unknown> = {
    id,
    version: opts.version ?? '0.1.0',
    dependsOn: opts.dependsOn ?? [],
  };
  if (opts.root !== undefined) manifest.root = opts.root;
  writeFileSync(join(root, 'pack.yaml'), YAML.stringify(manifest));
  for (const f of files) writeDomainFile(root, f);
  for (const nb of opts.nameBanks ?? []) writeBankFile(root, nb);
  return root;
}

export function writeDomainFile(root: string, f: FixtureFile): void {
  const file = join(root, 'content', f.rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    YAML.stringify({
      class: f.class ?? MATERIAL,
      hydratorClass: f.hydratorClass ?? HYDRATOR,
      data: f.data ?? { name: f.rel },
    }),
  );
}

export function writeBankFile(root: string, nb: NameBankFixture): void {
  const file = join(root, 'content', 'name-banks', nb.dir ?? '', `${nb.key}.yaml`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    YAML.stringify({ style: nb.style, given: nb.given, surname: nb.surname }),
  );
}

/** A document-kind yaml fixture: `content/<dir>/<name>.yaml` holding `data`. */
export function writeDocumentFile(
  root: string,
  dir: string,
  name: string,
  data: Record<string, unknown>,
): void {
  const file = join(root, 'content', dir, `${name}.yaml`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, YAML.stringify(data));
}

/** An `msh` script fixture: `content/msh/<name>.msh` holding `source` verbatim. */
export function writeScriptFile(root: string, name: string, source: string): void {
  const file = join(root, 'content', 'msh', `${name}.msh`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
}

export function cleanupPacks(): void {
  while (tmpRoots.length) rmSync(tmpRoots.pop()!, { recursive: true, force: true });
}
