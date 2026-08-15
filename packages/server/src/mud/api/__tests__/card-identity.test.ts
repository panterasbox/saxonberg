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

/** The canonical text the parser round-trips `input` to. */
function canonical(input: string, canonicalVerb: string): string {
  const parsed = CommandLineApi.parsePipeline(input).commands[0]!;
  const formatted = CommandLineApi.format(parsed);
  const space = formatted.indexOf(' ');
  return space === -1 ? canonicalVerb : `${canonicalVerb}${formatted.slice(space)}`;
}

describe('a card is identified by its normalized command', () => {
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

  it('`who` twice is ONE card, brought forward', async () => {
    const h = await makeHarness();
    const ctx = makeContext(h, {
      commandText: 'who',
      verbs: ['who'],
      opensCard: 'who',
    });
    const first = CardApi.open(ctx, 'who');
    const second = CardApi.open(ctx, 'who');
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(CardApi.list(h.interactive).length).toBe(1);
    // The second open is a TOUCH, and says so on the wire.
    expect(h.ofType('card-opened').length).toBe(1);
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

  it('`look a` / `look b` / `look a` is TWO cards, with `a` in front', async () => {
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

    expect(a2).toBe(a1);
    expect(b).not.toBe(a1);
    expect(CardApi.list(h.interactive).length).toBe(2);

    /*
     * ⚠ "In front" is asserted on the TOUCH, not on a list order the
     * server does not own. Ordering is the feed's rendering of
     * `openedAt`, and what the server guarantees is that re-issuing
     * brings the card forward — which is exactly the touch envelope.
     */
    const touched = h.ofType('card-touched');
    expect(touched.length).toBe(1);
    expect(touched[0]!.instanceId).toBe(a1);
  });

  it('⭐ `examine a` and `look a` are ONE card — the synonym rung', async () => {
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
    expect(second).toBe(first);
    expect(CardApi.list(h.interactive).length).toBe(1);
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
