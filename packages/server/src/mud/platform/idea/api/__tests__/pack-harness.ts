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
import { PersistApi } from '../../../../api/persist';
import { StuffApi } from '../../../../api/stuff';
import { GroupApi } from '../../../../api/group';
import { ParcelApi } from '../../../../api/parcel';
import type { PackInstallRecord } from '../../../../api/pack';
import type { ParcelOwner, TitleClaim } from '../../../../lib/parcel/ParcelRecord';
import type { GroupOwner } from '../../../../lib/social/Group';

export const MATERIAL = '/platform/idea/material/Material';
export const HYDRATOR = '/platform/idea/persistence/PersistentHydrator';

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

/** The in-memory group registry behind the GroupApi seams the installer uses. */
export interface FakeGroup {
  name: string;
  owner: GroupOwner;
  members: Array<{ id: string; role: string }>;
}
export const groups: FakeGroup[] = [];
/** The in-memory title registry behind the ParcelApi seams the installer uses. */
export const parcels: Array<{ extent: string; owner: ParcelOwner }> = [];

export function groupRefOf(name: string): string {
  return `managed:${name}`;
}

/**
 * The registries the requires phase (wave 3) reaches: groups through
 * `GroupApi.ensureGroup` / `ensureMember` / `registry().managed().findByName`,
 * titles through `ParcelApi.grant` / `coveringParcelOf` / `ownerOf`. Every
 * pack install now ensures its maintainers group, so every pack suite
 * needs these; `stubPersist` installs them.
 */
export function stubRegistries(): void {
  groups.length = 0;
  parcels.length = 0;
  vi.spyOn(GroupApi, 'ensureGroup').mockImplementation(async (name, owner) => {
    const found = groups.find((g) => g.name === name);
    if (found) return { ref: groupRefOf(name), created: false };
    groups.push({ name, owner, members: [] });
    return { ref: groupRefOf(name), created: true };
  });
  vi.spyOn(GroupApi, 'ensureMember').mockImplementation(async (ref, id, role) => {
    const g = groups.find((x) => groupRefOf(x.name) === ref);
    if (!g) return false;
    if (g.members.some((m) => m.id === id)) return false;
    g.members.push({ id, role });
    return true;
  });
  vi.spyOn(GroupApi, 'registry').mockResolvedValue({
    managed: () => ({
      findByName: async (name: string) => {
        const g = groups.find((x) => x.name === name);
        return g ? { name, memberIds: g.members.map((m) => m.id), _id: name } : null;
      },
    }),
  } as never);
  vi.spyOn(ParcelApi, 'grant').mockImplementation(async (claim: TitleClaim) => {
    const row = parcels.find((p) => p.extent === claim.extent);
    if (!row) {
      parcels.push({ extent: claim.extent, owner: claim.holder });
      return { outcome: 'granted', holder: claim.holder };
    }
    const same =
      row.owner.kind === claim.holder.kind &&
      (row.owner.kind === 'group'
        ? row.owner.name === (claim.holder as { name?: string }).name
        : (row.owner as { templatePath: string }).templatePath ===
          (claim.holder as { templatePath: string }).templatePath);
    if (same) return { outcome: 'kept', holder: row.owner };
    return { outcome: 'conflict', holder: row.owner };
  });
  const covering = (path: string): { extent: string; owner: ParcelOwner } | null => {
    let best: { extent: string; owner: ParcelOwner } | null = null;
    for (const p of parcels) {
      if (
        (path === p.extent || path.startsWith(p.extent + '/')) &&
        (!best || p.extent.length > best.extent.length)
      ) {
        best = p;
      }
    }
    return best;
  };
  vi.spyOn(ParcelApi, 'coveringParcelOf').mockImplementation(async (path: string) => {
    const c = covering(path);
    return c ? ({ getExtent: () => c.extent, getOwner: () => c.owner } as never) : null;
  });
  vi.spyOn(ParcelApi, 'ownerOf').mockImplementation(
    async (path: string) => covering(path)?.owner ?? null,
  );
}

/** An in-memory, collection-aware store behind PersistApi (dotted keys ok). */
export function stubPersist(): void {
  store.rows = [];
  store.nextId = 1;
  stubRegistries();
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
  vi.spyOn(PersistApi, 'findById').mockImplementation(
    async (col: string, id: string) => {
      const r = store.rows.find((x) => (x.__col ?? 'content') === col && x._id === id);
      return r ? (structuredClone(r) as never) : null;
    },
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
    /** Extra manifest keys (`requires`, `boot`, `maintainers`, or a typo under test). */
    manifest?: Record<string, unknown>;
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
  Object.assign(manifest, opts.manifest ?? {});
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

/** A settings section fixture: `content/settings/<section>.yaml` `{ settings: [...] }`. */
export function writeSettingsFile(
  root: string,
  section: string,
  entries: Array<{ key: string; value: string }>,
): void {
  const file = join(root, 'content', 'settings', `${section}.yaml`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, YAML.stringify({ settings: entries }));
}

/** A subject fixture: `content/subjects/<name>.yaml` (the D6 shape). */
export function writeSubjectFile(root: string, name: string, body: Record<string, unknown>): void {
  const file = join(root, 'content', 'subjects', `${name}.yaml`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, YAML.stringify(body));
}

/** The `app_settings` singleton (the harness store holds at most one). */
export function settingsSingleton(): (Row & { values: Record<string, string> }) | undefined {
  return rowsIn('app_settings')[0] as (Row & { values: Record<string, string> }) | undefined;
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
