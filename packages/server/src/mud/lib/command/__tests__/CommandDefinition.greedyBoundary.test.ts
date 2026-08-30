/**
 * ⭐ A greedy arg may be followed by PREPOSITIONAL args — and the binder
 * stops at their preposition.
 *
 * The binder always implemented this (`collectLaterPrepositions` plus
 * the boundary-lookahead slice in `CommandLogic`), but the load-time
 * invariant forbade the only shape that could reach it, so the lookahead
 * was dead code and a natural command shape was inexpressible:
 *
 *     order <cocktail…> with <brand>
 *
 * ⚠ The libations build shipped exactly that shape. Without a greedy
 * cocktail, `order old fashioned` bound only "old", and a live drive
 * found FOURTEEN of the bar's twenty-six menu items unorderable — "Gin
 * & tonic", "Tom Collins", "Moscow mule", "Glass of red"…
 *
 * The relaxation stays narrow: a trailing field with no preposition has
 * no boundary token, so the greedy field would swallow it and the shape
 * really would be ambiguous. That still throws.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CommandDefinition } from '../CommandDefinition';

const spec = (argsYaml: string) =>
  CommandDefinition.fromYaml(
    `verbs: [probe]\ncontroller: NoopController\ndescription: stub\nargs:\n${argsYaml}`,
    '<test>',
  );

describe('greedy args and their boundary', () => {
  it('allows a greedy arg followed by a prepositional one', () => {
    expect(() =>
      spec(
        '  - name: cocktail\n    type: string\n    required: true\n    greedy: true\n' +
          '  - name: brand\n    type: string\n    required: false\n    prepositions: [with]\n',
      ),
    ).not.toThrow();
  });

  it('still refuses a greedy arg followed by an UNBOUNDED one', () => {
    expect(() =>
      spec(
        '  - name: text\n    type: string\n    required: true\n    greedy: true\n' +
          '  - name: tail\n    type: string\n    required: false\n',
      ),
    ).toThrow(/greedy arg must be last/);
  });

  it('still allows the ordinary greedy-is-last shape', () => {
    expect(() =>
      spec('  - name: text\n    type: string\n    required: true\n    greedy: true\n'),
    ).not.toThrow();
  });
});
