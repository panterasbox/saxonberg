/**
 * Pack-declared topics: leaves yes, roots never.
 *
 * The vocabulary is deliberately **open** — a pack ships a
 * `/platform/idea/Topic/<key>` row like any other content and it just works, with
 * no new mechanism. What is *not* open is the root set: a pack-minted
 * root means a player's mute of `sense` stops catching everything
 * sense-shaped, and subtree-mute integrity is the only reason topics
 * form a tree rather than flat tags.
 *
 * ⚠ This is the install-time third of the totality gate, and the only
 * third that can **refuse**. `lint:topics` runs at build time and is
 * blind to a third-party pack; the `topic.unauthored` diagnostic only
 * reports after a frame has already gone out.
 *
 * Driven through `PackApi.install` on a fixture pack — reaching the
 * private validator directly would prove the function works without
 * proving it is wired into the install path, which is the half that
 * actually matters.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import YAML from 'yaml';
import { PackApi } from '../../../../api/pack';
import { stubRegistries } from './pack-harness';
import { PersistApi } from '../../../../api/persist';
import { StuffApi } from '../../../../api/stuff';

const TOPIC_CLASS = '/platform/idea/Topic';
const HYDRATOR = '/platform/idea/persistence/PersistentHydrator';

interface Row extends Record<string, unknown> {
  _id?: string;
  path?: string;
  sourcePack?: string;
  __col?: string;
}

let rows: Row[];
let nextId: number;
const tmpRoots: string[] = [];

function stubPersist(): void {
  rows = [];
  nextId = 1;
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      rows
        .filter((r) => (r.__col ?? 'content') === col)
        .filter((r) =>
          Object.entries(query).every(([k, v]) => {
            if (v !== null && typeof v === 'object' && '$in' in v) {
              return (v.$in as unknown[]).includes(r[k]);
            }
            return r[k] === v;
          })
        )
        .map((r) => ({ ...r })) as never
  );
  vi.spyOn(PersistApi, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const d = doc as Row;
      if (d._id) {
        const i = rows.findIndex((r) => r._id === d._id);
        const { _id, ...rest } = d;
        rows[i] = { ...rows[i]!, ...rest, _id, __col: col };
        return String(d._id);
      }
      const id = `id-${nextId++}`;
      rows.push({ ...d, _id: id, __col: col });
      return id;
    }
  );
  vi.spyOn(PersistApi, 'delete').mockImplementation(async () => {});
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
    async () => class {} as never
  );
}

/** Write a fixture pack declaring one topic at `topicKey`. */
function writeTopicPack(id: string, topicKey: string): string {
  const root = mkdtempSync(join(tmpdir(), `pack-${id}-`));
  tmpRoots.push(root);
  writeFileSync(
    join(root, 'pack.yaml'),
    YAML.stringify({ id, version: '0.1.0', dependsOn: [] })
  );
  const file = join(root, 'content', 'platform', 'idea', 'Topic', `${topicKey}.yaml`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    YAML.stringify({
      class: TOPIC_CLASS,
      hydratorClass: HYDRATOR,
      data: {
        topic: topicKey,
        family: topicKey.split('.').slice(0, -1).join('.'),
        label: 'Pollen',
        description: 'Pollen counts, for the allergic.',
        address: 'ambient',
        actor: 'world',
        weight: 'chatter',
        audience: 'player',
        durable: false,
        affordance: 'decays',
      },
    })
  );
  return root;
}

/** Topic rows currently in the stubbed store. */
function topicRows(): Row[] {
  return rows.filter((r) => String(r.path ?? '').startsWith('/platform/idea/Topic/'));
}

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubRegistries();
});

afterEach(() => {
  vi.restoreAllMocks();
  while (tmpRoots.length) {
    rmSync(tmpRoots.pop()!, { recursive: true, force: true });
  }
});

describe('pack-declared topics', () => {
  it('accepts a leaf under a core root', async () => {
    const root = writeTopicPack('herbalism', 'sense.pollen');

    await expect(PackApi.install([root])).resolves.toBeDefined();
    expect(topicRows().map((r) => r.path)).toEqual(['/platform/idea/Topic/sense.pollen']);
  });

  it('refuses a pack that mints a new root', async () => {
    const root = writeTopicPack('herbalism', 'botany.pollen');

    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('topics');
    expect(r!.failure?.error).toMatch(/root/i);
    // Nothing written before the refusal — a half-applied pack would
    // leave the vocabulary in a state no gate can see.
    expect(topicRows()).toEqual([]);
  });

  it('refuses a bare root even under a legal name', async () => {
    const root = writeTopicPack('herbalism', 'sense');

    const [r] = await PackApi.install([root]);
    expect(r!.failure?.error).toMatch(/leaves only/i);
    expect(topicRows()).toEqual([]);
  });

  it('pack zero ships the root descriptors — the platform may declare a bare root', async () => {
    const root = writeTopicPack('platform', 'sense');
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(topicRows().map((t) => t.path)).toEqual(['/platform/idea/Topic/sense']);
  });

  // Not a topic-specific gate: `reconcileKind` refuses cross-pack
  // path collision for EVERY path. Asserted here so the guarantee is
  // visibly true for topics too, and so a future topic-specific
  // shortcut cannot quietly bypass it.
  it("refuses a key another pack already owns (generic path rule)", async () => {
    rows.push({
      _id: 'pre',
      path: '/platform/idea/Topic/sense.pollen',
      sourcePack: 'flora',
      __col: 'content',
    });
    const root = writeTopicPack('herbalism', 'sense.pollen');

    // Named so the author knows who to talk to, not just that it failed.
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.error).toMatch(/flora/);
  });
});
