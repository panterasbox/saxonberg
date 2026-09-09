/**
 * ⭐⭐ **The one exception to "nobody may read the world."**
 *
 * `world:` is refused for every typed input on every surface. The
 * executive is the exception, and the shape of that exception is the
 * decision this build took five attempts to get right, so it is pinned
 * here rather than described:
 *
 *  - **The permission is a fact about the PERSON, not about the call.**
 *    There is no second resolve method and no gate on who called: the
 *    engine asks the executive about whoever is at the helm, and the
 *    answer rides the execution environment the query runs in. Which
 *    door you knocked on says nothing about who you are.
 *  - **Derived at the moment of asking.** Not a stored grant, not a
 *    flag, not a tier — so authority follows a handoff in BOTH
 *    directions with no restart, which is what makes it an office
 *    rather than a permission bit.
 *  - **Catch-and-retry, in the BINDER.** The refusal is thrown by the
 *    resolver wherever `world` actually appears, and the binder — the
 *    one place a player's raw MQL enters the engine — is the one place
 *    that can ask *who typed this*.
 *  - **Told what it cost.** A grant to read the whole realm is only
 *    defensible if the holder sees the price, so the answer arrives with
 *    a `registry-scan` note beside it.
 *  - **An ordinary command pays nothing** — the executive is asked only
 *    once a query has actually been refused.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommandApi, type CommandContext } from '../command';
import { CompactApi } from '../compact';
import { ExecutionContextApi } from '../execution-context';
import { StuffApi } from '../stuff';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ShadowApi } from '../shadow';
import { EventApi } from '../event';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';
import Thing from '../../lib/stuff/Thing';
import Location from '../../lib/stuff/Location';
import { ContainmentApi } from '../containment';
import { NamedMixin } from '../../lib/description/Named';

class TestSword extends NamedMixin(Thing) {
  static _mixinName = 'TestSword';
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function setup(): Promise<{ avatar: Avatar; location: Location }> {
  await bootRegistry();
  const location = await StuffApi.create(() => new Location());
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, location);
  const sword = await StuffApi.create(() => {
    const s = new TestSword();
    s.setName('rusty sword');
    return s;
  });
  ContainmentApi.move(sword, location);
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  interactive.transferTo(avatar);
  vi.spyOn(avatar, 'onEnvelope').mockImplementation(() => {});
  return { avatar, location };
}

/** A verb with one query-typed argument — the shape 154 shipped views have. */
const SPEC = CommandDefinition.fromYaml(
  `verbs: [poke]
controller: PokeController
description: stub
args:
  - name: target
    type: objects
    scope: "reachable"
`,
  '<test>',
);

/** …and one that binds TWO, to count the office lookups. */
const TWO_FIELD_SPEC = CommandDefinition.fromYaml(
  `verbs: [pair]
controller: PairController
description: stub
args:
  - name: first
    type: objects
    scope: "reachable"
  - name: second
    type: objects
    scope: "reachable"
`,
  '<test>',
);

function contextFor(
  giver: Stuff,
  location: Stuff,
  cmd: CommandDefinition,
  verb: string,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: `${verb} world:[mixin.NamedMixin]`,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: cmd,
  });
}

/**
 * The row a person's world query lands on in the registry's cost table.
 * ⭐ The key is DERIVED from the call stack, not passed in — so it names
 * the ordinary resolve entry (`…/api/mql#resolveMany`), which is the
 * point: the entitled read and the refused one go through the same
 * door.
 */
function seatStat(): { calls: number; maxReturned: number } | undefined {
  return StuffApi.registryReadStats().find((r) =>
    r.reader.includes('/api/mql#resolveMany'),
  );
}

/** The notes a dispatch accumulated, by kind. */
function notesOf(ctx: CommandContext): Array<{ kind: string; [k: string]: unknown }> {
  return (ctx as unknown as { getNotes(): Array<{ kind: string }> }).getNotes() as Array<{
    kind: string;
    [k: string]: unknown;
  }>;
}

describe("the Prime Minister's typed world query", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('an ordinary character is refused, and told the alternatives', async () => {
    const { avatar, location } = await setup();
    vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(false);
    const ctx = contextFor(avatar, location, SPEC, 'poke');

    const out = await CommandApi.resolveModel(
      { target: 'world:[mixin.NamedMixin]' },
      ctx,
    );

    expect(out).toEqual({ result: 'failed' });
    const notes = notesOf(ctx);
    const err = notes.find((n) => n.kind === 'mql-error');
    expect(err).toBeDefined();
    expect(String(err!.detail)).toMatch(/not available here/);
    // ⚠ The refusal has to name a way forward.
    expect(String(err!.detail)).toMatch(/reachable, here, person/);
    expect(notes.some((n) => n.kind === 'registry-scan')).toBe(false);
  });

  it('⭐ the seat holder resolves it, and is told what it cost', async () => {
    const { avatar, location } = await setup();
    vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(true);
    const ctx = contextFor(avatar, location, SPEC, 'poke');

    const out = await CommandApi.resolveModel(
      { target: 'world:[mixin.NamedMixin]' },
      ctx,
    );

    expect('resolved' in out).toBe(true);
    const scan = notesOf(ctx).find((n) => n.kind === 'registry-scan');
    expect(scan).toBeDefined();
    expect(scan).toMatchObject({
      field: 'target',
      indexed: true,
      shape: 'world:[mixin.namedmixin]',
    });
    expect(Number(scan!.scanned)).toBeGreaterThan(0);
  });

  it('⚠ an UNINDEXED shape still resolves for the seat — and says so', async () => {
    // This is the number that grows with the realm, and the whole reason
    // the note exists: `indexed: false` beside a big `scanned` is the
    // holder being shown the cost of what they just typed.
    const { avatar, location } = await setup();
    vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(true);
    const ctx = contextFor(avatar, location, SPEC, 'poke');

    await CommandApi.resolveModel({ target: 'world' }, ctx);

    const scan = notesOf(ctx).find((n) => n.kind === 'registry-scan');
    expect(scan).toMatchObject({ indexed: false, shape: 'world' });
  });

  it('asks the EXECUTIVE — about the person, once per refused field', async () => {
    const { avatar, location } = await setup();
    const holds = vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(true);
    const ctx = contextFor(avatar, location, TWO_FIELD_SPEC, 'pair');

    await CommandApi.resolveModel(
      { first: 'world:[mixin.NamedMixin]', second: 'world' },
      ctx,
    );

    // ⭐ The subject is the giver, and the question is the executive's
    // — the head of it today. Both fields were refused, so both asked.
    expect(holds).toHaveBeenCalledTimes(2);
    expect(holds).toHaveBeenCalledWith(avatar, 'prime-minister');
  });

  it('⛔ the grant does not outlive the query that earned it', async () => {
    // The environment carries the permission, so the one thing that
    // must never happen is it leaking past the retry into the rest of
    // the dispatch — or into the next one.
    const { avatar, location } = await setup();
    vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(true);
    await CommandApi.resolveModel(
      { target: 'world' },
      contextFor(avatar, location, SPEC, 'poke'),
    );

    expect(ExecutionContextApi.getWorldReadGrant()).toBeNull();

    vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(false);
    const ctx = contextFor(avatar, location, SPEC, 'poke');
    const out = await CommandApi.resolveModel({ target: 'world' }, ctx);
    expect(out).toEqual({ result: 'failed' });
  });

  it('costs an ordinary command nothing — the executive is asked only on a refusal', async () => {
    const { avatar, location } = await setup();
    const holds = vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(false);
    const ctx = contextFor(avatar, location, SPEC, 'poke');

    await CommandApi.resolveModel({ target: 'sword' }, ctx);

    expect(holds).not.toHaveBeenCalled();
  });

  it('⭐ every admitted read lands in the cost table, keyed by its reader', async () => {
    const { avatar, location } = await setup();
    vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(true);
    const ctx = contextFor(avatar, location, SPEC, 'poke');

    const before = seatStat();
    await CommandApi.resolveModel({ target: 'world' }, ctx);
    const after = seatStat();

    expect(after).toBeDefined();
    // ⚠ A snapshot, not a live row — `registryReadStats` copies, and
    // this comparison is what proved it must.
    expect(after!.calls).toBe((before?.calls ?? 0) + 1);
    expect(after!.maxReturned).toBeGreaterThan(0);
    // A person's costly queries sit in the SAME table as the engine's,
    // rather than only in their own response — the registry counts
    // every wide read of itself, whoever asked.
  });

  it('a DENIED read is not counted — a gate failure is not a cost', async () => {
    const { avatar, location } = await setup();
    vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(false);
    const before = seatStat();
    const ctx = contextFor(avatar, location, SPEC, 'poke');

    await CommandApi.resolveModel({ target: 'world' }, ctx);

    const after = seatStat();
    expect(after?.calls ?? 0).toBe(before?.calls ?? 0);
  });
});
