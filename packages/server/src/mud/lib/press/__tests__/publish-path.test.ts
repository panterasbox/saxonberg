/**
 * The publish path (Wave 7) — the new behaviour, on a store that settled
 * in Wave 6.
 *
 * Four things, each of which fails silently and expensively if it drifts:
 *
 *   - **The entitlement runs before anything is minted**, so a refusal
 *     leaves the tree unchanged rather than merely throwing.
 *   - **`realm` derives from the publisher** and is caller-proof.
 *   - ⭐ **The clamp's non-widening direction.** An inverted comparison
 *     would serve members-only releases publicly, and both directions look
 *     equally plausible in the source, so the table asserts the direction
 *     rather than a single case.
 *   - **`requiresPublisher` admits a position-holder who is NOT an
 *     author** (AC 17). That is the whole point of the swap: on a fresh
 *     box `core` is empty, so `requiresAuthor` refused everyone including
 *     the founder.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OrganizationEntity from '../../../platform/idea/Organization';
import PressBoard from '../../../platform/idea/PressBoard';
import { Idea } from '../../stuff/Idea';
import { PressApi } from '../../../api/press';
import { DocumentApi } from '../../../api/document';
import { AccessApi } from '../../../api/access';
import { StuffApi } from '../../../api/stuff';
import { ExecutionContextApi } from '../../../api/execution-context';
import { CommandApi, type CommandContext } from '../../../api/command';
import { CommandDefinition } from '../../command/CommandDefinition';
import requiresPublisher from '../../command/validators/requiresPublisher';
import { RELEASE_DOCUMENT_KIND } from '../Release';
import type { ReleaseVisibility } from '../Publisher';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

class TestAuthor extends Idea {
  static _mixinName = 'TestAuthor';
}

const PRESS = '/compact/press';
const PRESS_FEED = '/compact/press/feed';
const EXEC = '/compact/executive';
const EXEC_FEED = '/compact/executive/feed';
const DIRECTOR = 'communications-director';
const STAFFER = '/platform/agent/Avatar/staffer';
const OUTSIDER = '/platform/agent/Avatar/outsider';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col === 'app_settings') return [] as never;
      return [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never;
    },
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    },
  );
}

/** A publisher with `holder` in its one publishing position. */
function publisher(
  path: string,
  feed: string,
  realm: 'ooc' | 'world',
  visibility: ReleaseVisibility,
  holder: string,
): OrganizationEntity {
  const org = makeStuffAtPath(() => new OrganizationEntity(), path);
  org.realm = realm;
  org.visibility = visibility;
  org.feedPath = feed;
  org.positions = [
    { key: DIRECTOR, label: 'speaking', wageRate: 0, confers: [] },
  ];
  org.publishingPositions = [DIRECTOR];
  org.rosterSlots = [
    { positionKey: DIRECTOR, assignee: holder, schedule: [] },
  ];
  return org;
}

function actor(path: string): TestAuthor {
  return (
    StuffApi.findByTemplatePath<TestAuthor>(path) ??
    makeStuffAtPath(() => new TestAuthor(), path)
  );
}

async function asActor<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const acting = actor(path);
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(acting);
    return fn();
  }) as Promise<T>;
}

function contextFor(giver: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: null,
    commandText: 'press',
    executionId: 'test',
    commandId: 'test',
    verb: 'press',
    command: CommandDefinition.fromYaml(
      'verbs: [press]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

async function gate(giverPath: string): Promise<string | undefined> {
  const ctx = contextFor(actor(giverPath) as unknown as Stuff);
  const allowed = await requiresPublisher.preload!(ctx);
  return requiresPublisher(ctx, allowed);
}

beforeEach(() => {
  StuffApi.clearAll();
  installStore();
  void makeStuffAtPath(() => new PressBoard(), '/platform/idea/PressBoard');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the entitlement gates the write', () => {
  it('a refusal leaves the tree unchanged, not merely throws', async () => {
    publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    await expect(
      asActor(OUTSIDER, () =>
        PressApi.publish({ publisher: PRESS, headline: 'not yours' }),
      ),
    ).rejects.toThrow(/no publishing position/);
    expect(await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND)).toHaveLength(
      0,
    );
  });

  it('admits the position-holder — so the refusal is not vacuous', async () => {
    publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    await asActor(STAFFER, () =>
      PressApi.publish({ publisher: PRESS, headline: 'yours' }),
    );
    expect(await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND)).toHaveLength(
      1,
    );
  });
});

describe('realm derives from the publisher', () => {
  it('is the publisher’s realm, and there is no way to supply one', async () => {
    publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    publisher(EXEC, EXEC_FEED, 'world', 'members', STAFFER);

    const ooc = await asActor(STAFFER, () =>
      PressApi.publish({ publisher: PRESS, headline: 'operator speaking' }),
    );
    const world = await asActor(STAFFER, () =>
      PressApi.publish({ publisher: EXEC, headline: 'the Minister said' }),
    );
    expect(ooc.getRealm()).toBe('ooc');
    expect(world.getRealm()).toBe('world');

    // Caller-proof: `realm` is not a field on the request at all, so the
    // only way to change it is to change the publisher.
    expect(
      'realm' in (ooc.serialize() as unknown as Record<string, unknown>),
    ).toBe(false);
  });

  it('follows the publisher if the publisher changes its mind', async () => {
    const org = publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    const release = await asActor(STAFFER, () =>
      PressApi.publish({ publisher: PRESS, headline: 'x' }),
    );
    expect(release.getRealm()).toBe('ooc');
    org.realm = 'world';
    // Derived on read, so there is no stale copy to migrate.
    expect(release.getRealm()).toBe('world');
  });
});

describe('⭐ the visibility clamp', () => {
  /** publisher default × declared narrowing → effective reach. */
  const TABLE: Array<{
    declared: ReleaseVisibility;
    asked: ReleaseVisibility | undefined;
    effective: ReleaseVisibility;
    why: string;
  }> = [
    {
      declared: 'public',
      asked: undefined,
      effective: 'public',
      why: 'inherits',
    },
    {
      declared: 'public',
      asked: 'members',
      effective: 'members',
      why: 'narrows',
    },
    {
      declared: 'members',
      asked: undefined,
      effective: 'members',
      why: 'inherits',
    },
    {
      // ⭐ THE non-widening direction. An inverted comparison here serves
      // a members-only publisher's release to the open internet.
      declared: 'members',
      asked: 'public',
      effective: 'members',
      why: 'CANNOT widen',
    },
  ];

  for (const row of TABLE) {
    it(`${row.declared} publisher + ${row.asked ?? '(none)'} → ${row.effective} (${row.why})`, async () => {
      publisher(PRESS, PRESS_FEED, 'ooc', row.declared, STAFFER);
      const release = await asActor(STAFFER, () =>
        PressApi.publish({
          publisher: PRESS,
          headline: 'x',
          ...(row.asked ? { visibility: row.asked } : {}),
        }),
      );
      expect(release.getVisibility()).toBe(row.effective);
      // The declared narrowing is stored verbatim; the clamp is on read,
      // so a publisher that later opens up does not retroactively widen a
      // release that asked to be narrow.
      expect(release.getDeclaredVisibility()).toBe(row.asked ?? null);
    });
  }

  it('re-clamps when the publisher narrows after the fact', async () => {
    const org = publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    const release = await asActor(STAFFER, () =>
      PressApi.publish({ publisher: PRESS, headline: 'x' }),
    );
    expect(release.getVisibility()).toBe('public');
    org.visibility = 'members';
    expect(release.getVisibility()).toBe('members');
  });
});

describe('repost', () => {
  it('round-trips its source through the store', async () => {
    publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    const release = await asActor(STAFFER, () =>
      PressApi.publish({
        publisher: PRESS,
        headline: 'What the Ministry said',
        kind: 'repost',
        source: EXEC,
      }),
    );
    expect(release.getKind()).toBe('repost');
    expect(release.getSource()).toBe(EXEC);

    const board = StuffApi.findByTemplatePath<PressBoard>('/platform/idea/PressBoard')!;
    await board.warm();
    const reloaded = board.getRelease(release.getReleaseId())!;
    expect(reloaded.getKind()).toBe('repost');
    expect(reloaded.getSource()).toBe(EXEC);
    expect(PressApi.toRow(reloaded).source).toBe(EXEC);
  });

  it('leaves source absent on an original', async () => {
    publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    const release = await asActor(STAFFER, () =>
      PressApi.publish({ publisher: PRESS, headline: 'ours' }),
    );
    expect(release.getSource()).toBe('');
    expect(PressApi.toRow(release).source).toBeUndefined();
  });
});

describe('requiresPublisher (AC 17)', () => {
  it('⭐ admits a position-holder who is NOT an author', async () => {
    publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    // The break this swap existed to fix: the (now retired) author tier
    // was membership of a group that seeded EMPTY, so on a fresh box nobody
    // was an author — the founder included — and the shipped
    // `requiresAuthor` gate refused the verb outright. Publishing is a
    // position, never a tier.
    await expect(gate(STAFFER)).resolves.toBeUndefined();
  });

  it('refuses an actor holding no publishing position anywhere', async () => {
    publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    await expect(gate(OUTSIDER)).resolves.toMatch(/no publishing position/);
  });

  it('is coarse: any publisher will do, and it selects none of them', async () => {
    // Holding a position at the executive admits the verb even though the
    // press office would refuse them — the per-publisher `mayPublishAs`
    // check stays authoritative, and this gate can only be coarser.
    publisher(PRESS, PRESS_FEED, 'ooc', 'public', STAFFER);
    publisher(EXEC, EXEC_FEED, 'world', 'members', OUTSIDER);
    await expect(gate(OUTSIDER)).resolves.toBeUndefined();
    await expect(
      asActor(OUTSIDER, () =>
        PressApi.publish({ publisher: PRESS, headline: 'wrong masthead' }),
      ),
    ).rejects.toThrow(/no publishing position/);
  });
});
