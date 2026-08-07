/**
 * The five standing-ledger append events — that each ledger fires one,
 * naming the right subject, and that it fires **after** the row is
 * persisted.
 *
 * ⚠ The ordering assertion is the one worth having. "Fires an event" is
 * easy to get right and easy to get subtly wrong: firing before
 * `save()` resolves hands every listener a ledger that does not yet
 * contain the row it was just told about, and the resulting bug reads
 * as a flaky off-by-one in a derived figure rather than as an ordering
 * mistake. So the tests observe the event from a real subscriber and
 * assert the save had already completed when it arrived.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { RenownApi } from '../../../api/renown';
import RenownEvent from '../../standing/RenownEvent';
import { PersistApi } from '../../../api/persist';
import {
  RenownAppendedEvent,
  ParticipationAppendedEvent,
  ProducerAppendedEvent,
  TranscriptAppendedEvent,
  DispositionAppendedEvent,
} from '../StandingAppendedEvents';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const ALL = [
  RenownAppendedEvent,
  ParticipationAppendedEvent,
  ProducerAppendedEvent,
  TranscriptAppendedEvent,
  DispositionAppendedEvent,
];

describe('standing append events — the vocabulary', () => {
  it('all five declare a distinct KIND', () => {
    const kinds = ALL.map((c) => c.KIND);
    expect(new Set(kinds).size).toBe(5);
  });

  it('each instance carries its class KIND', () => {
    const ev = new RenownAppendedEvent({
      subject: 's',
      kind: 'reaction',
      locality: null,
      groups: [],
    });
    expect(ev.kind).toBe(RenownAppendedEvent.KIND);
  });

  it('every KIND is namespaced under its ledger', () => {
    for (const c of ALL) expect(c.KIND).toMatch(/^[a-z]+\.appended$/);
  });
});

describe('standing append events — firing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('renown fires after the row is saved, naming the subject', async () => {
    await bootRegistry();

    let savedBeforeFire = false;
    let saved = false;
    vi.spyOn(RenownEvent.prototype, 'save').mockImplementation(async () => {
      // Resolve on a later turn so "fired before the save finished"
      // is actually observable rather than accidentally sequential.
      await Promise.resolve();
      saved = true;
    });
    // ⚠ Without this the ledger short-circuits on `PersistApi
    // .isConnected()` and the whole test passes vacuously — it was
    // asserting nothing until this line was added.
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);

    const seen: { subject: string }[] = [];
    EventApi.on<{ subject: string }>(RenownAppendedEvent.KIND, (p) => {
      savedBeforeFire = saved;
      seen.push(p);
    });

    await RenownApi.append({
      subject: '/obj/Avatar/tester',
      source: '/obj/Avatar/other',
      kind: 'reaction',
    });
    await flushMicrotasks();

    expect(
      seen.length,
      'no event fired — is the persistence gate mocked?'
    ).toBe(1);
    expect(seen[0]!.subject).toBe('/obj/Avatar/tester');
    expect(
      savedBeforeFire,
      'the event fired before save() completed — a listener would read a ledger missing the row'
    ).toBe(true);
  });

  it('a subscriber sees the payload shape the ledger promised', async () => {
    await bootRegistry();
    const seen: unknown[] = [];
    EventApi.on(TranscriptAppendedEvent.KIND, (p) => {
      seen.push(p);
    });

    EventApi.fire(
      new TranscriptAppendedEvent({
        subject: '/obj/Avatar/tester',
        discipline: 'metalwork',
        kind: 'deed',
      })
    );
    await flushMicrotasks();

    expect(seen).toEqual([
      { subject: '/obj/Avatar/tester', discipline: 'metalwork', kind: 'deed' },
    ]);
  });
});
