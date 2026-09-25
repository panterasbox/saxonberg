/**
 * ⚠⚠⚠ **A greedy field that consumed NOTHING must not end the bind.**
 *
 * `validateArgOrder` allows exactly one thing after a greedy arg:
 * *prepositional* args — precisely so a verb can read
 * `<subject...> with <instrument>`. The binder did not honour its own
 * invariant: when the greedy field found no positionals it `return`ed,
 * and every later arg's `default:` was skipped.
 *
 * ⭐ **Found by driving `measure light`** — the commonest sentence the
 * verb has. It bound the channel, skipped the tool entirely, and told a
 * player holding a photometer *"you have nothing in reach that could
 * read that"*. `measure light the lamp` worked, because the greedy field
 * had something to eat.
 *
 * ⚠ Invisible below a live dispatch: a controller test builds its own
 * model and a view test parses YAML. The binder is the seam between
 * them, and only a real sentence walks it — the same shape as `hammer
 * ingot` sitting refused for a year behind a fallback walk.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { Stuff } from '../../stuff/Stuff';
import type Location from '../../stuff/Location';
import type { CommandGiver } from '../CommandGiver';

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

/** `probe <channel> [<subject...>] [with <tool>]` — the shape `measure` has. */
const VIEW = `
verbs: [probe]
description: a greedy optional followed by a defaulted prepositional
controller: NoopController
args:
  - name: channel
    type: string
    required: true
  - name: subject
    type: object
    required: false
    greedy: true
    scope: ["reachable"]
    requires: any
  - name: tool
    type: objects
    required: false
    greedy: true
    prepositions: [with, using]
    default: "reachable:[mixin.ToolMixin]"
    scope: ["reachable"]
    requires: [ToolMixin]
`;

function bind(text: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(
    parsed,
    CommandDefinition.fromYaml(VIEW, '<test>'),
    ctx,
  );
  if (!('model' in r)) {
    throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  }
  return r.model as Record<string, unknown>;
}

describe('a greedy optional does not eat the args after it', () => {
  it('⭐⭐ the BARE form still gets the later arg’s default', () => {
    const model = bind('probe light');
    expect(model['channel']).toBe('light');
    expect(model['subject']).toBeUndefined();
    // The whole defect: this was absent.
    expect(model['tool']).toBe('reachable:[mixin.ToolMixin]');
  });

  it('the fed form always worked, and still does', () => {
    const model = bind('probe temperature the kettle');
    expect(model['subject']).toBe('the kettle');
    expect(model['tool']).toBe('reachable:[mixin.ToolMixin]');
  });

  it('an explicit preposition overrides the default, bare or fed', () => {
    expect(bind('probe light with photometer')['tool']).toBe('photometer');
    const fed = bind('probe light the lamp with photometer');
    expect(fed['subject']).toBe('the lamp');
    expect(fed['tool']).toBe('photometer');
  });

  it('⭐ and the ARTICLE survives — `greedy` is what makes that true', () => {
    // Without `greedy: true` the article and the noun bind as two
    // positionals, the binder answers "too many arguments", the chain
    // falls through and the verb dies as an unknown shape.
    expect(bind('probe ground the north face')['subject']).toBe(
      'the north face',
    );
  });

  it('⭐⭐ an OPTIONAL greedy tail may follow an optional greedy one', () => {
    // ⚠⚠ The view above declares TWO optional greedy args, and it used
    // to be unloadable: `validateArgOrdering` counted `greedy: true` as
    // `required: true` unconditionally, so the trailing one "required"
    // after an optional one threw at load. That contradicted the rule
    // directly above it, which was deliberately relaxed so a greedy arg
    // MAY be followed by prepositional args.
    //
    // ⭐ Found by driving `measure light with the photometer`: the whole
    // reading ladder is `<channel> [<subject…>] [with <tool…>]`, and
    // both tails need `greedy` or an article eats a positional. The
    // view says `required: false` and means it.
    expect(() => bind('probe light')).not.toThrow();
  });

  it('⭐ …and the article survives after the PREPOSITION too', () => {
    expect(bind('probe light with the photometer')['tool']).toBe(
      'the photometer',
    );
    const both = bind('probe light the lamp with the photometer');
    expect(both['subject']).toBe('the lamp');
    expect(both['tool']).toBe('the photometer');
  });
});
