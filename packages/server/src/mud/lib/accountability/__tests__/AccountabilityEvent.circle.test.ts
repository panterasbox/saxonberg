/**
 * A killing staged inside a private circle is not evidence about anyone.
 *
 * This closes a hole that PREDATES the mortality build but that mortality
 * makes matter. The write-path policy table classifies
 * `accountability_events` as PASS(mark): a row written from circle context
 * persists carrying its `circleScope`, and readers "may lens the mark".
 * Nothing did. `deriveBlame` had no notion of it at all.
 *
 * So anyone who could open a circle — which is anyone with their own
 * sandbox — could stage a killing and mint a real crime row against a real
 * identity, because the mark was recorded and never consulted. Death
 * becoming the ledger's biggest producer, wired to nine drivers, is what
 * turns that from a curiosity into something worth fixing.
 *
 * Derive-on-read is exactly the right place for the fix: one predicate
 * re-legislates every row ever written, without rewriting one.
 */

import { describe, it, expect } from 'vitest';
import AccountabilityEvent from '../AccountabilityEvent';
import type { AccountabilityFields } from '../AccountabilityEvent';

function row(overrides: Partial<AccountabilityFields> = {}): AccountabilityEvent {
  const ev = new AccountabilityEvent();
  Object.assign(
    ev,
    {
      kind: 'death',
      sessionId: 'fight-1',
      initiator: '/obj/Avatar/killer',
      opponent: '/obj/Avatar/killer',
      victim: '/obj/Avatar/victim',
      killer: '/obj/Avatar/killer',
      lethality: 'lethal',
      consented: false,
      sentient: true,
      realAt: 1,
    },
    overrides,
  );
  return ev;
}

describe('circle-marked rows produce no crime', () => {
  it('an unmarked (field) killing still derives as a crime', () => {
    // The control. If this ever stops being true, the fix below has gone
    // too far and real crimes stopped counting.
    const verdict = AccountabilityEvent.deriveBlame([row()]);
    expect(verdict).not.toBeNull();
    expect(verdict!.crime).toBe(true);
    expect(verdict!.killer).toBe('/obj/Avatar/killer');
  });

  it('the SAME killing, staged in a circle, derives nothing', () => {
    const verdict = AccountabilityEvent.deriveBlame([
      row({ circleScope: '/home/forger' } as Partial<AccountabilityFields>),
    ]);
    expect(verdict).toBeNull();
  });

  it('a circle row cannot hide a real one — the field row still convicts', () => {
    // Mixed history: staged rows are ignored, genuine ones are not, and
    // the earliest-terminal-row rule still picks from the real ones.
    const verdict = AccountabilityEvent.deriveBlame([
      row({
        circleScope: '/home/forger',
        realAt: 1,
        killer: '/obj/Avatar/framed',
      } as Partial<AccountabilityFields>),
      row({ realAt: 2, killer: '/obj/Avatar/actual' }),
    ]);
    expect(verdict).not.toBeNull();
    expect(verdict!.killer).toBe('/obj/Avatar/actual');
    expect(verdict!.crime).toBe(true);
  });

  it('the mark is never emitted on a field row — no schema drift', () => {
    // The persistence layer stamps the mark itself; this class never
    // sets it, and an ordinary row's document has to stay byte-identical
    // to what it always was.
    const doc = (
      row() as unknown as { toDocument(): Record<string, unknown> }
    ).toDocument();
    expect('circleScope' in doc).toBe(false);
  });

  it('the mark round-trips when it IS set — declared, not dropped', () => {
    // Why the field is declared at all: `Document.fromDocument` only reads
    // DECLARED persistent fields, so without the declaration the mark was
    // written to Mongo and silently dropped on the way back — recorded,
    // and unreadable by the one consumer that needs it.
    const marked = row({
      circleScope: '/home/forger',
    } as Partial<AccountabilityFields>);
    const doc = (
      marked as unknown as { toDocument(): Record<string, unknown> }
    ).toDocument();
    expect(doc.circleScope).toBe('/home/forger');
  });
});
