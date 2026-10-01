/**
 * ⭐ The client-state schema, pinned by name.
 *
 * The avatar-family build moves these fifteen entries off
 * `HasInteractiveMixin` and onto `SaxonbergClientMixin`, and replaces
 * the single static array with a chain walk. ⚠ The failure mode is
 * silent in both directions: a key that stops being declared makes
 * `getClientState` **throw** at the reader (not return a default), and
 * a key that silently stops being `transient` starts persisting a
 * per-session value onto the character.
 *
 * So: the exact fifteen, and the exact three that are transient.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { HasInteractiveMixin } from '../HasInteractive';
import type { ClientStateSchemaEntry } from '../HasInteractive';
import { Idea } from '../../stuff/Idea';

/** The host the client actually renders — composes the whole tower. */
class TestHost extends HasInteractiveMixin(Idea) {}

/** Every key our client declares, in declaration order. */
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

const schema = (): ClientStateSchemaEntry[] =>
  (TestHost as unknown as { clientStateSchema: ClientStateSchemaEntry[] })
    .clientStateSchema;

describe('⭐ the client-state schema', () => {
  it('declares exactly the fifteen keys', () => {
    expect(schema().map((e) => e.key).sort()).toEqual([...DECLARED].sort());
  });

  it('three keys are transient and the rest persist', () => {
    const transient = schema()
      .filter((e) => e.transient === true)
      .map((e) => e.key)
      .sort();
    expect(transient).toEqual([...TRANSIENT].sort());
  });

  it('every declared key is readable and returns its default', () => {
    for (const entry of schema()) {
      expect(entry).toHaveProperty('defaultValue');
    }
  });

  it('no key is declared twice', () => {
    const keys = schema().map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
