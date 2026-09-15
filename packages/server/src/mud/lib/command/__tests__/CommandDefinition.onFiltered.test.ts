/**
 * `onFiltered` — the **kind** axis of ambiguity, made declarable.
 *
 * ⭐ Two questions arise at exactly the same moment, when a player's word
 * matches more than one thing: *how many matched* and *how many are the
 * right kind*. The count axis has been declared and configurable since
 * the affordance build (`cardinality` / `onExcess`). The kind axis just
 * **happened** — the scope chain silently kept whatever satisfied
 * `requires:` and said nothing about what it threw away.
 *
 * These tests pin the load-time half: the policy is declarable, its
 * vocabulary is closed, and ⚠ **it is refused on a slot that can never
 * discard anything**, which is the authoring mistake the asymmetry
 * invites.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CommandDefinition } from '../CommandDefinition';

const yaml = (argBody: string): string => `
verbs: [poke]
controller: PokeController
description: onFiltered fixture
args:
  - name: target
    type: object
${argBody}
`;

describe('onFiltered — the declared policy on a discarded candidate', () => {
  it('⭐ defaults to absent, which the resolver reads as `take`', () => {
    const def = CommandDefinition.fromYaml(
      yaml('    requires: SealableMixin'),
      '<test>',
    );
    expect(def.args[0]?.onFiltered).toBeUndefined();
  });

  it('accepts each arm of the closed vocabulary', () => {
    for (const policy of ['take', 'warn', 'error']) {
      const def = CommandDefinition.fromYaml(
        yaml(`    requires: SealableMixin\n    onFiltered: ${policy}`),
        '<test>',
      );
      expect(def.args[0]?.onFiltered).toBe(policy);
    }
  });

  /**
   * ⭐ The SCHEMA refuses the value, not a hand-written check — and
   * `prompt` is the right thing to try, because it is `onExcess`'s
   * fourth arm. It is deliberately absent here: prompting between a
   * targetable and a non-targetable candidate asks the player to choose
   * something that will then be refused.
   */
  it('refuses a policy outside the vocabulary — at the schema', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        yaml('    requires: SealableMixin\n    onFiltered: prompt'),
        '<test>',
      ),
    ).toThrow(/onFiltered must be equal to one of the allowed values/);
  });

  /**
   * ⚠ The mistake the asymmetry invites: asking for a voice on a slot
   * that filters nothing. Without a `requires:` there is no discard, so
   * the policy could never fire — and an author would reasonably believe
   * they had asked for something.
   */
  it('⭐ refuses `onFiltered` with no `requires:` to filter by', () => {
    expect(() =>
      CommandDefinition.fromYaml(yaml('    onFiltered: warn'), '<test>'),
    ).toThrow(/needs a `requires:` to filter by/);
  });

  it('refuses it against `requires: any`, which admits everything', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        yaml('    requires: any\n    onFiltered: warn'),
        '<test>',
      ),
    ).toThrow(/needs a `requires:` to filter by/);
  });

  it('refuses it on a non-object slot, as its cardinality siblings are', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `
verbs: [poke]
controller: PokeController
description: onFiltered fixture
args:
  - name: word
    type: string
    onFiltered: warn
`,
        '<test>',
      ),
    ).toThrow(/only valid on object \/ objects fields/);
  });
});
