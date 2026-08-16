/**
 * ⭐ **A card's identity is its normalized command** (decision 6, AC 3).
 *
 * The table below is decision 6 read literally:
 *
 * | Sequence | Result |
 * |---|---|
 * | `who`, `who` | one card, brought forward |
 * | `who`, `who --wizards` | two cards |
 * | `look a`, `look b`, `look a` | two, with `a` back in front |
 * | `examine a`, `look a` | one — `examine` is a `look` SYNONYM |
 *
 * ⚠ Every expected key is composed **through the parser**, never
 * written as a literal. A literal would be a second, hand-maintained
 * definition of normalization, and the two would disagree silently.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { CommandLineApi } from '../command-line';
import { MqlSubscriptionApi } from '../mql-subscription';
import { makeHarness, makeContext, type Harness } from './card-harness';
import { CARDS } from '../../lib/connection/Cards';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/** The canonical text the parser round-trips `input` to. */
function canonical(input: string, canonicalVerb: string): string {
  const parsed = CommandLineApi.parsePipeline(input).commands[0]!;
  const formatted = CommandLineApi.format(parsed);
  const space = formatted.indexOf(' ');
  return space === -1 ? canonicalVerb : `${canonicalVerb}${formatted.slice(space)}`;
}

/**
 * ⭐⭐ **The normalized command is the card's REFRESH, not its identity.**
 *
 * It was the identity: two opens with the same key were one card,
 * touched and moved. That is an index, and the feed is a **log** — a
 * transcript does not dedupe, and neither does this. Asking twice gives
 * you two cards because you asked twice.
 *
 * The key still matters, and the canonicalisation with it: it is what a
 * card's refresh control re-issues, so `examine a` and `look a` must
 * both compose to `look a`.
 */
describe('the normalized command is what a card re-issues', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  it('composes the key through the parser, canonicalising the verb', async () => {
    const h = await makeHarness();
    const ctx = makeContext(h, {
      commandText: 'examine   brass lamp',
      verbs: ['look', 'l', 'examine', 'exa'],
      opensCard: 'subject',
    });
    expect(CardApi.keyFor(ctx, 'subject')).toBe(
      canonical('examine   brass lamp', 'look'),
    );
  });

  it('⭐ `who` twice is TWO cards — you asked twice', async () => {
    const h = await makeHarness();
    const ctx = makeContext(h, {
      commandText: 'who',
      verbs: ['who'],
      opensCard: 'who',
    });
    const first = CardApi.open(ctx, 'who');
    const second = CardApi.open(ctx, 'who');
    expect(first).not.toBeNull();
    expect(second).not.toBe(first);
    expect(CardApi.list(h.interactive).length).toBe(2);
    // Two opens on the wire, and nothing touched.
    expect(h.ofType('card-opened').length).toBe(2);
    expect(h.ofType('card-touched').length).toBe(0);
  });

  /**
   * ⚠ **The exception, and it is about what a surface IS.** An editor, a
   * git panel and a composer are one application each — a second Monaco
   * with its own unsaved buffer is not a second reading. Those declare
   * `singleton` and are the only cards that still dedupe.
   */
  it('⚠ an authoring surface is a SINGLETON — `cms` twice is one editor', async () => {
    const h = await makeHarness();
    const ctx = makeContext(h, {
      commandText: 'cms',
      verbs: ['cms'],
      opensCard: 'cms',
    });
    const first = CardApi.open(ctx, 'cms');
    const second = CardApi.open(ctx, 'cms');
    expect(second).toBe(first);
    expect(CardApi.list(h.interactive).length).toBe(1);
    expect(h.ofType('card-touched').length).toBe(1);
  });

  it('`who` and `who --wizards` are TWO cards', async () => {
    const h = await makeHarness();
    CardApi.open(
      makeContext(h, { commandText: 'who', verbs: ['who'], opensCard: 'who' }),
      'who',
    );
    CardApi.open(
      makeContext(h, {
        commandText: 'who --wizards',
        verbs: ['who'],
        opensCard: 'who',
      }),
      'who',
    );
    const open = CardApi.list(h.interactive);
    expect(open.length).toBe(2);
    expect(new Set(open.map((c) => c.key)).size).toBe(2);
  });

  it('⭐ `look a` / `look b` / `look a` is THREE cards — the feed is a LOG', async () => {
    const h = await makeHarness();
    const look = (text: string): string | null =>
      CardApi.open(
        makeContext(h, {
          commandText: text,
          verbs: ['look', 'l', 'examine', 'exa'],
          opensCard: 'subject',
        }),
        'subject',
      );
    const a1 = look('look a');
    const b = look('look b');
    const a2 = look('look a');

    expect(new Set([a1, b, a2]).size).toBe(3);
    expect(CardApi.list(h.interactive).length).toBe(3);
    // ⚠ Nothing is TOUCHED: stacking cards never dedupe.
    expect(h.ofType('card-touched').length).toBe(0);
    // …and the re-looked card carries the same refresh command.
    const keys = CardApi.list(h.interactive).map((c) => c.key);
    expect(keys.filter((k) => k === 'look a').length).toBe(2);
  });

  it('⭐ `examine a` and `look a` compose the SAME key — the synonym rung', async () => {
    const h = await makeHarness();
    const first = CardApi.open(
      makeContext(h, {
        commandText: 'examine a',
        verbs: ['look', 'l', 'examine', 'exa'],
        opensCard: 'subject',
      }),
      'subject',
    );
    const second = CardApi.open(
      makeContext(h, {
        commandText: 'look a',
        verbs: ['look', 'l', 'examine', 'exa'],
        opensCard: 'subject',
      }),
      'subject',
    );
    // Two cards (the log), one refresh command (the canonicalisation).
    expect(second).not.toBe(first);
    const keys = CardApi.list(h.interactive).map((c) => c.key);
    expect(keys).toEqual(['look a', 'look a']);
  });

  it('⚠ `look lamp` and `look brass lamp` are TWO cards — the knowing cost', async () => {
    const h = await makeHarness();
    const look = (text: string): string | null =>
      CardApi.open(
        makeContext(h, {
          commandText: text,
          verbs: ['look', 'l', 'examine', 'exa'],
          opensCard: 'subject',
        }),
        'subject',
      );
    look('look lamp');
    look('look brass lamp');
    expect(CardApi.list(h.interactive).length).toBe(2);
  });

  /**
   * ⭐ The gate. `opens_card:` is a DECLARATION the call is checked
   * against — so the vocabulary stays greppable while the call site
   * stays where the resolved operand is known.
   */
  it('refuses a card the running command did not declare', async () => {
    const h: Harness = await makeHarness();
    const ctx = makeContext(h, {
      commandText: 'who',
      verbs: ['who'],
      opensCard: 'who',
    });
    expect(() => CardApi.open(ctx, 'news')).toThrow(/did not declare/);
    const undeclared = makeContext(h, {
      commandText: 'who',
      verbs: ['who'],
    });
    expect(() => CardApi.open(undeclared, 'who')).toThrow(/it declares none/);
  });
});

/**
 * ⚠⚠ **The room card is NOT a singleton any more.**
 *
 * It was, and the reason was sound under the old model: `look dave's
 * bar` resolves to the ROOM, and keyed on the sentence it minted a
 * second `place` card — pinned by default, outliving every sweep,
 * sitting under the first. The fix was to force the room's own key.
 *
 * The log model removes the premise. Two looks at the room are two
 * cards because you looked twice, exactly as two looks at a lamp are.
 * What survives from that episode is the KEY: the room card's refresh
 * must still re-issue `look`, not the sentence you happened to type.
 */
describe('the room card', () => {
  it('⭐ stacks like everything else, and keeps `look` as its refresh', async () => {
    const h = await makeHarness();
    const lookRoom = (text: string): string | null =>
      CardApi.open(
        makeContext(h, {
          commandText: text,
          verbs: ['look', 'l', 'examine', 'exa'],
          opensCard: 'place',
        }),
        'place',
        { key: CARDS.place.command },
      );
    const first = lookRoom('look');
    const second = lookRoom("look dave's bar");

    expect(second).not.toBe(first);
    const cards = CardApi.list(h.interactive).filter(
      (c) => c.cardId === 'place',
    );
    expect(cards.length).toBe(2);
    // ⚠ Both re-issue the room's own command, not the typed sentence.
    expect(cards.map((c) => c.key)).toEqual(['look', 'look']);
  });

  /**
   * ⚠ The guard that keeps the call site honest — a `key` dropped from
   * `LookController` puts the typed sentence on the refresh control,
   * and it comes back silently.
   */
  it('⚠ `LookController` passes `place`s catalogue command as the key', () => {
    const src = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        'obj',
        'command',
        'perception',
        'LookController.ts',
      ),
      'utf8',
    );
    expect(src).toContain("CardApi.open(context, 'place'");
    expect(src).toMatch(/key:\s*CARDS\.place\.command/);
  });
});
