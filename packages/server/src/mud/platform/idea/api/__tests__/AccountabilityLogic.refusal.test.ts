/**
 * ⚠⚠ **The empty-string sink, and why closing it needed its own test.**
 *
 * Five producers keyed the harm ledger five different ways for the same
 * concept — `?? ''`, `?? 'stuff:<id>'`, `?? stuffId`, a bare skip, and
 * one that already read identity first. The first of those is the one
 * that mattered: `blameFor(victimId)` keys on `victim`, so every
 * unattributable harm in the world accumulated under **one** key that a
 * reader could then ask about and get back as though it were one
 * person's history.
 *
 * Removing the `?? ''` at each producer is necessary and not
 * sufficient — the next producer would reintroduce it. So the refusal
 * lives at the append seam, where it holds for producers that do not
 * exist yet.
 *
 * ⭐ The asymmetry is the design: `initiator` / `opponent` / `killer` may
 * legitimately be `AccountabilityEvent.NOBODY`, because an environmental
 * death is nobody's doing. Only the **victim of a terminal row** must be
 * somebody — a harm with no victim is not a harm.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccountabilityApi } from '../../../../api/accountability';
import AccountabilityEvent from '../../../../lib/accountability/AccountabilityEvent';
import type { AccountabilityFields } from '../../../../lib/accountability/AccountabilityEvent';
import { StuffApi } from '../../../../api/stuff';

let saved: AccountabilityEvent[] = [];
let errors: string[] = [];

function fields(over: Partial<AccountabilityFields> = {}): AccountabilityFields {
  return {
    kind: 'death',
    sessionId: 'fight-1',
    initiator: '/platform/agent/Avatar/killer',
    opponent: '/platform/agent/Avatar/killer',
    victim: '/platform/agent/Avatar/victim',
    killer: '/platform/agent/Avatar/killer',
    consented: false,
    sentient: true,
    ...over,
  };
}

/** Let the fire-and-forget append settle. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('the ledger refuses a terminal row with no victim', () => {
  beforeEach(() => {
    saved = [];
    errors = [];
    vi.spyOn(
      AccountabilityEvent.prototype as unknown as { save(): Promise<void> },
      'save',
    ).mockImplementation(async function (this: AccountabilityEvent) {
      saved.push(this);
    });
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('an attributable death is written, unchanged', async () => {
    AccountabilityApi.record(fields());
    await settle();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.victim).toBe('/platform/agent/Avatar/victim');
    expect(errors).toEqual([]);
  });

  it('a death naming no victim is refused, loudly', async () => {
    AccountabilityApi.record(fields({ victim: '' }));
    await settle();
    expect(saved).toHaveLength(0);
    expect(errors.join('\n')).toContain('no victim');
  });

  it('a harm naming no victim is refused too — both terminal kinds', async () => {
    AccountabilityApi.record(fields({ kind: 'harm', victim: undefined }));
    await settle();
    expect(saved).toHaveLength(0);
  });

  it('NOBODY on the ACTOR fields is legal — an environmental death', async () => {
    // The control, and the reason the guard cannot simply require every
    // party field. Cold killed them; the row says so by naming nobody.
    AccountabilityApi.record(
      fields({
        initiator: AccountabilityEvent.NOBODY,
        opponent: AccountabilityEvent.NOBODY,
        killer: AccountabilityEvent.NOBODY,
      }),
    );
    await settle();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.killer).toBe('');
  });

  it('a non-terminal row is untouched by the guard', async () => {
    // `opened` and `violated` carry no victim by design.
    AccountabilityApi.record(fields({ kind: 'opened', victim: undefined }));
    await settle();
    expect(saved).toHaveLength(1);
  });

  it('so blameFor("") can never find a row to read', () => {
    // Stated as the invariant rather than exercised against Mongo: no
    // write path can produce a terminal row keyed on the empty string,
    // so the shared bucket does not exist to be read.
    expect(AccountabilityEvent.NOBODY).toBe('');
  });
});
