/**
 * `:mine` — the ownership predicate, and the constraint it lives under.
 *
 * ⭐⭐ Two rungs answer (the explicit chattel stamp; title over a parcel
 * extent) and two deliberately do not (authorship; group-held title).
 *
 * ⚠⚠ And the hard one: **ownership must never locate.** `:mine` says
 * WHAT is yours. It must never become a way to ask WHERE your things
 * are — that would turn a companion into a tracking device and a thief
 * into a bloodhound. The last test pins the field sets that carry the
 * answer, because the leak would arrive by someone helpfully adding a
 * `container` field to a row set, not by editing this predicate.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MQL_PREDICATES } from '../predicates';
import { REF_FIELDS, DETAIL_FIELDS } from '../../mql-subscription';
import { ParcelApi } from '../../parcel';
import { ChattelMixin } from '../../../lib/chattel/Chattel';
import type { ChattelOwner } from '../../../lib/chattel/ChattelRecord';
import { Idea } from '../../../lib/stuff/Idea';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { CommandGiver } from '../../../lib/command/CommandGiver';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

const ME = '/platform/agent/Avatar/me';
const YOU = '/platform/agent/Avatar/you';

/**
 * A chattel-composing good whose stamp is settable. ⭐ The predicate asks
 * the GOOD who is stamped on it (verbs on objects), so the fixture is a
 * good, not a mocked Api.
 */
class TestGood extends ChattelMixin(Idea) {
  public testOwner: ChattelOwner | null = null;
  public override stampedOwner(): ChattelOwner | null {
    return this.testOwner;
  }
}

let n = 0;
function giverWithIdentity(identity: string): Stuff & CommandGiver {
  return makeStuffAtPath(
    () => new Idea(),
    '/platform/agent/Avatar',
    identity,
  ) as unknown as Stuff & CommandGiver;
}
function target(owner: ChattelOwner | null = null): Stuff {
  const g = makeStuffAtPath(() => new TestGood(), `/stuff/thing/widget-${n++}`);
  g.testOwner = owner;
  return g as unknown as Stuff;
}

const mine = (t: Stuff, g: Stuff & CommandGiver): boolean =>
  MQL_PREDICATES.mine!.check(t, g, {} as never);

afterEach(() => vi.restoreAllMocks());

describe(':mine — the chattel rung', () => {
  it('a good stamped to me is mine, and to nobody else', () => {
    const item = target({ kind: 'player', templatePath: ME });
    vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue(null);

    expect(mine(item, giverWithIdentity(ME))).toBe(true);
    expect(mine(item, giverWithIdentity(YOU))).toBe(false);
  });

  it('an unstamped good is nobody’s', () => {
    vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue(null);
    expect(mine(target(), giverWithIdentity(ME))).toBe(false);
  });

  it('GROUP-held title is not mine — :mine is first person SINGULAR', () => {
    const item = target({ kind: 'group', name: 'the watch' });
    vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue(null);
    expect(mine(item, giverWithIdentity(ME))).toBe(false);
  });
});

describe(':mine — the parcel rung', () => {
  it('a thing under an extent I hold title to is mine', () => {
    vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue({
      owner: { kind: 'player', templatePath: ME },
    } as never);
    expect(mine(target(), giverWithIdentity(ME))).toBe(true);
    expect(mine(target(), giverWithIdentity(YOU))).toBe(false);
  });

  it('answers false before the registries warm', () => {
    vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue(null);
    // The honest answer while nothing is known: nothing is yours YET.
    expect(mine(target(), giverWithIdentity(ME))).toBe(false);
  });
});

describe('⚠⚠ ownership must never locate', () => {
  it('neither row set carries a container or a location field', () => {
    // ⭐ `find world:mine` renders these fields and no others. A pet is
    // findable BY ITS PERSON only by walking the world, exactly like
    // anyone else's — which is what makes losing one mean something.
    for (const set of [REF_FIELDS, DETAIL_FIELDS]) {
      for (const banned of [
        'container',
        'location',
        'room',
        'place',
        'coords',
        'zone',
      ]) {
        expect(set).not.toContain(banned);
      }
    }
  });
});
