/**
 * ⭐⭐ `unreachable:` on a command view is **inert at runtime** — the
 * reachability sweep's carrier, pinned.
 *
 * `lint:reachability` needs somewhere to write *why* a shipped verb is
 * deliberately unafforded (`lock`/`unlock` wait on the base-class
 * narrowing; `fly` waits on a flying species). A `# comment` was the old
 * answer and nothing could gate it, so the disposition is a top-level
 * YAML key — a sibling of `verbs:`/`controller:`.
 *
 * ⚠ A declaration only a lint reads is only safe while it stays
 * invisible to everything else. This test is what makes that a fact
 * rather than a belief: a view carrying the key parses, keeps its verbs,
 * its controller and its args, and binds exactly as it did before. The
 * installer side of the same claim is `PackLogic`'s — it reads only
 * `class`/`extends`/`data` off a row and hashes only those three, so the
 * key never reaches Mongo and never changes a row's content hash.
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

const BARE = `
verbs: [frob, frobnicate]
controller: /platform/idea/cmd/system/FrobController
description: "Frob a thing"
args:
  - name: target
    type: string
    required: true
`;

const HELD = `
# The disposition, where the next person looks.
unreachable: awaiting:some-slate
verbs: [frob, frobnicate]
controller: /platform/idea/cmd/system/FrobController
description: "Frob a thing"
args:
  - name: target
    type: string
    required: true
`;

const def = (yaml: string): CommandDefinition =>
  CommandDefinition.fromYaml(yaml, 'frob.yaml');

describe('a view carrying unreachable: is unchanged at runtime', () => {
  it('parses, and keeps every verb including the alias', () => {
    const held = def(HELD);
    expect(held.hasVerb('frob')).toBe(true);
    expect(held.hasVerb('frobnicate')).toBe(true);
  });

  it('keeps its controller and description', () => {
    const bare = def(BARE);
    const held = def(HELD);
    expect(held.controller).toBe(bare.controller);
    expect(held.description).toBe(bare.description);
  });

  it('binds its args identically to the same view without the key', () => {
    const parsed = CommandLineApi.parsePipeline('frob widget').commands[0]!;
    const withKey = CommandApi.assemble(parsed, def(HELD), ctx);
    const without = CommandApi.assemble(parsed, def(BARE), ctx);
    expect('model' in withKey).toBe(true);
    expect('model' in without).toBe(true);
    if ('model' in withKey && 'model' in without) {
      expect(withKey.model.target).toBe('widget');
      expect(withKey.model).toEqual(without.model);
    }
  });

  it('⚠ the key is not mistaken for an option or an arg', () => {
    const held = def(HELD);
    expect(held.args.map((a) => a.name)).toEqual(['target']);
    expect(Object.keys(held.verbOptions)).not.toContain('unreachable');
    expect(Object.keys(held.payload)).not.toContain('unreachable');
  });
});
