/**
 * ⚠ **A greedy positional must not swallow trailing options.**
 *
 * Both defects here were found by driving the `press` verb in a real
 * browser, and neither was reachable from a controller suite — those
 * construct a bound model directly and never run the binder.
 *
 * 1. **The greedy slice ran to end-of-source.** Option tokens are bound
 *    and skipped in the binder's Phase 3, but they are still *present* in
 *    the raw source line, and the greedy field sliced the source from its
 *    first positional to the end. So `press post Saxonberg is open --as
 *    /compact/press` bound the publisher correctly **and** published a
 *    headline reading `"Saxonberg is open --as /compact/press"`.
 *    `bulletin post Server maintenance --pin` had the same defect for as
 *    long as that verb has shipped.
 *
 * 2. **Verb-scoped options did not reach a subcommand's scope** — covered
 *    in `CommandDefinition.optionScope.test.ts`; asserted end-to-end here
 *    because the two together are what made the publish form unusable.
 *
 * The slice is taken from the *source* rather than by joining tokens so
 * that a headline's internal whitespace survives; the fix is to bound its
 * end at the last positional rather than at end-of-line.
 */

import { describe, it, expect } from 'vitest';
import { CommandApi } from '../command';
import { CommandLineApi } from '../command-line';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Location from '../../lib/stuff/Location';
import type { CommandGiver } from '../../lib/command/CommandGiver';

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

const YAML = `
verbs: [publish]
controller: NoopController
description: stub
fallthrough: true
options:
  as:
    type: string
    field: as
    description: "the publisher"
  pin:
    type: boolean
    field: pin
    description: "pin it"
subcommands:
  post:
    description: "publish"
    args:
      - name: headline
        type: string
        required: true
        greedy: true
args:
  - name: headline
    type: string
    required: true
    greedy: true
`;

const def = CommandDefinition.fromYaml(YAML, '<test>');

function bind(text: string) {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, def, ctx);
  if (!('model' in r)) throw new Error(`bind failed: ${JSON.stringify(r)}`);
  return r.model as Record<string, unknown>;
}

describe('a greedy positional with trailing options', () => {
  it('⚠ does not swallow a trailing option into the text', () => {
    const m = bind('publish post Saxonberg is open --as /compact/press');
    expect(m.headline).toBe('Saxonberg is open');
    expect(m.as).toBe('/compact/press');
  });

  it('does not swallow several, of either shape', () => {
    const m = bind('publish post Saxonberg is open --as /compact/press --pin');
    expect(m.headline).toBe('Saxonberg is open');
    expect(m.as).toBe('/compact/press');
    expect(m.pin).toBe(true);
  });

  it('handles the `--opt=value` form too', () => {
    const m = bind('publish post Saxonberg is open --as=/compact/press');
    expect(m.headline).toBe('Saxonberg is open');
    expect(m.as).toBe('/compact/press');
  });

  it('still binds options placed BEFORE the greedy text', () => {
    const m = bind('publish --as /compact/press post Saxonberg is open');
    expect(m.headline).toBe('Saxonberg is open');
    expect(m.as).toBe('/compact/press');
  });

  it('preserves the text verbatim when there are no options', () => {
    const m = bind('publish post Saxonberg   is open');
    // Sliced from source, so internal spacing survives — which is why
    // the slice is taken from the line rather than by joining tokens.
    expect(m.headline).toBe('Saxonberg   is open');
  });

  it('works on the bare fallthrough form as well', () => {
    const m = bind('publish Saxonberg is open --as /compact/press');
    expect(m.headline).toBe('Saxonberg is open');
    expect(m.as).toBe('/compact/press');
  });

  it('trims nothing off a headline that legitimately contains a dash', () => {
    const m = bind('publish post Patch 1.2 — the long-awaited one --pin');
    expect(m.headline).toBe('Patch 1.2 — the long-awaited one');
    expect(m.pin).toBe(true);
  });
});
