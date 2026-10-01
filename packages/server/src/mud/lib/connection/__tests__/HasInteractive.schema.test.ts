/**
 * ⭐ The client-state schema, pinned by name — and by WHICH MIXIN
 * declares it.
 *
 * Written at W0 against the single `HasInteractiveMixin` array; after
 * W1 the same fifteen keys live on `SaxonbergClientMixin` and the
 * lookup is a chain walk. ⚠ The failure modes are silent in both
 * directions: a key that stops being declared makes `getClientState`
 * **throw** at the reader (not return a default), and a key that
 * silently stops being `transient` starts persisting a per-session
 * value onto the character.
 *
 * ⭐⭐ The half that matters most is the last one: the mechanism
 * declares NOTHING. If the keys ever drift back down onto
 * `ClientStateMixin` or `HasInteractiveMixin`, the split has quietly
 * undone itself and the sentence in `connection.md` about what a
 * second client implements becomes false — with every test still
 * green, because the keys would still resolve.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { HasInteractiveMixin } from '../HasInteractive';
import { ClientStateMixin } from '../ClientState';
import type { ClientStateSchemaEntry } from '../ClientState';
import { SaxonbergClientMixin } from '../SaxonbergClient';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

/** The host our client renders — the whole tower. */
class ClientHostFixture extends SaxonbergClientMixin(
  ClientStateMixin(HasInteractiveMixin(Idea)),
) {}

/** A host with the mechanism and no client. */
class BareStateHost extends ClientStateMixin(HasInteractiveMixin(Idea)) {}

/** Every key our client declares. */
const DECLARED = [
  'console.tabs',
  'cards.views',
  'cards.activeView',
  'console.routing',
  'console.seededViews',
  'console.activeTab',
  'style.overlay',
  'cockpit.layout',
  'cockpit.mode',
  'cockpit.arrangements',
  'cockpit.savedArrangements',
  'cockpit.inputModes',
  'cockpit.watch',
  'cockpit.tuned',
  'cockpit.shelf',
];

/** Keys that live with the session, never with the character. */
const TRANSIENT = ['cockpit.inputModes', 'cockpit.watch', 'cockpit.tuned'];

/**
 * Read the schema the way the engine does — through the walk, not off
 * the static. ⚠ Reading the static directly is the trap the walk
 * exists for: the outermost declaration SHADOWS the inner ones on
 * plain property access while the walk unions them.
 */
const walked = (ctor: object): ClientStateSchemaEntry[] =>
  (
    makeStuff(
      () => new (ctor as new () => object)(),
    ) as unknown as {
      clientStateSchemaFor(): ClientStateSchemaEntry[];
    }
  ).clientStateSchemaFor();

describe('⭐ the client-state schema', () => {
  it('our client declares exactly the fifteen keys', () => {
    expect(walked(ClientHostFixture).map((e) => e.key).sort()).toEqual(
      [...DECLARED].sort(),
    );
  });

  it('three keys are transient and the rest persist', () => {
    const transient = walked(ClientHostFixture)
      .filter((e) => e.transient === true)
      .map((e) => e.key)
      .sort();
    expect(transient).toEqual([...TRANSIENT].sort());
  });

  it('every declared key carries a default', () => {
    for (const entry of walked(ClientHostFixture)) {
      expect(entry).toHaveProperty('defaultValue');
    }
  });

  it('no key is declared twice', () => {
    const keys = walked(ClientHostFixture).map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('⭐⭐ the MECHANISM declares nothing — the vocabulary is the client\'s', () => {
    expect(walked(BareStateHost)).toEqual([]);
  });

  it('a host with no client cannot read a client key — it throws, it does not default', () => {
    const bare = makeStuff(() => new BareStateHost());
    expect(() => bare.getClientState('cockpit.mode')).toThrow(/unknown key/);
  });
});
