/**
 * `drain <vessel>` — the BINDER, not the controller.
 *
 * ⭐⭐⭐ The live drive found `drain` refusing *"You have nothing that
 * would hold it."* for a player carrying two gas bladders, and the
 * refusal was reached two different ways at once. This file pins the
 * half a controller test cannot see: whether the view's `vessel` arg
 * BINDS at all. A controller test constructs the model by hand and so
 * asserts nothing about the shape that produced it — which is why this
 * verb shipped with a checkpoint that passed while the act was
 * impossible.
 *
 * ⚠ The wire drive could not see it either: its checkpoint accepted
 * `no-vessel` as one of the reasons the refusal was allowed to carry.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { CommandLineApi } from '@saxonberg/server/mud/api/command-line';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Location from '@saxonberg/server/mud/lib/stuff/Location';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';

const VIEW = fileURLToPath(
  new URL(
    '../../../../../content/trade/mining/cmd/mining/drain.yaml',
    import.meta.url,
  ),
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

function def(): CommandDefinition {
  return CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), VIEW);
}

describe('drain — the view loads and its vessel arg binds', () => {
  it('the view LOADS (an arg-gate defect fails closed and silent)', () => {
    expect(() => def()).not.toThrow();
  });

  it('declares exactly one optional `vessel` arg with a default', () => {
    const d = def();
    expect(d.args.map((a) => a.name)).toEqual(['vessel']);
    const vessel = d.args[0]!;
    expect(vessel.required).toBe(false);
    // Bare `drain` has to mean something: the default is what makes
    // "drain, with the obvious vessel" an act rather than a refusal.
    expect(vessel.default).toBeTruthy();
  });

  it('⭐ `drain bladder` BINDS the word to `vessel`', () => {
    const parsed = CommandLineApi.parsePipeline('drain bladder').commands[0]!;
    const r = CommandApi.assemble(parsed, def(), ctx);
    expect('error' in r, `assemble errored: ${JSON.stringify(r)}`).toBe(false);
    if (!('error' in r)) {
      expect(r.model.vessel).toBeDefined();
    }
  });

  it('⭐ bare `drain` fills the vessel from the arg default', () => {
    const parsed = CommandLineApi.parsePipeline('drain').commands[0]!;
    const r = CommandApi.assemble(parsed, def(), ctx);
    expect('error' in r, `assemble errored: ${JSON.stringify(r)}`).toBe(false);
    if (!('error' in r)) {
      expect(r.model.vessel).toBeDefined();
    }
  });
});
