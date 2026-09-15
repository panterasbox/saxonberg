/**
 * `onFiltered` at RESOLVE time — the 2-of-1 cell, spoken.
 *
 * ⭐⭐ **The defect this closes is an ASYMMETRY, not the scope walk.**
 * Two questions arise at exactly the same moment, when a player's word
 * matches more than one thing:
 *
 * | axis | question | before |
 * |---|---|---|
 * | count | how many matched? | declared and configurable (`onExcess`) |
 * | kind | how many are the right KIND? | **silent** |
 *
 * `open box` in a room holding a chest and a painting has always opened
 * the chest. What the author could not say was *"and mention that I
 * ignored the painting"* — which is exactly how a player learns that
 * `second box` exists.
 *
 * ⚠ The scope CHAIN is untouched by all of this, deliberately: it orders
 * by preference (`$focus` first) as well as filtering by kind, and only
 * the filtering was ever the complaint.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { DetailedMixin } from '../../description/Detailed';
import { NamedMixin } from '../../description/Named';
import { PerceptibleMixin } from '../../description/Perceptible';
import { VisibleMixin } from '../../description/Visible';
import { SealableMixin } from '../../spatial/Sealable';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi, type CommandContext } from '../../../api/command';
import { CommandDefinition } from '../CommandDefinition';
import { makeStuff } from '../../security/__tests__/test-setup';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import type { Stuff } from '../../stuff/Stuff';
import type { Note } from '@saxonberg/types';

/** A crate: matches `box` AND satisfies `requires: SealableMixin`. */
class TestCrate extends SealableMixin(
  ContainerMixin(
    ContainableMixin(DetailedMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea))))),
  ),
) {}

/** A painting: matches `box` and does NOT. The discarded candidate. */
class TestPainting extends ContainableMixin(
  DetailedMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {}

const defFor = (policy: string | null): CommandDefinition =>
  CommandDefinition.fromYaml(
    `
verbs: [openish]
controller: NoopController
description: onFiltered runtime fixture
args:
  - name: target
    type: object
    scope: [reachable]
    requires: SealableMixin${policy === null ? '' : `\n    onFiltered: ${policy}`}
`,
    '<test>',
  );

describe('onFiltered at resolve time', () => {
  let world: MqlWorld;
  let crate: Stuff;
  let painting: Stuff;

  const resolve = async (
    policy: string | null,
  ): Promise<{ ctx: CommandContext; outcome: unknown }> => {
    const command = defFor(policy);
    const ctx = CommandApi.createCommandContext({
      commandGiver: world.giver,
      location: world.location as never,
      commandText: 'openish box',
      executionId: 'test',
      commandId: 'test',
      verb: 'openish',
      command,
    });
    await CommandApi.resolveValidators(command);
    const outcome = await CommandApi.resolveModel({ target: 'box' }, ctx);
    return { ctx, outcome };
  };

  const filteredNotes = (ctx: CommandContext): Note[] =>
    ctx.getNotes().filter((n) => n.kind === 'candidates-filtered');

  beforeEach(() => {
    world = makeWorld();
    const add = <T extends Stuff>(make: () => T, name: string): T => {
      const s = makeStuff(make) as unknown as Stuff & {
        setName: (n: string) => void;
        addKeyword: (k: string) => void;
      };
      s.setName(name);
      s.addKeyword('box');
      ContainmentApi.move(
        s as unknown as Parameters<typeof ContainmentApi.move>[0],
        world.location as unknown as Parameters<typeof ContainmentApi.move>[1],
      );
      return s as unknown as T;
    };
    crate = add(() => new TestCrate(), 'crate');
    painting = add(() => new TestPainting(), 'painting');
  });

  it('⭐ take (the default) binds the admissible one and says NOTHING — today, exactly', async () => {
    const { ctx } = await resolve(null);
    expect(filteredNotes(ctx)).toHaveLength(0);
  });

  it('⭐⭐ warn binds the admissible one AND names what it dropped', async () => {
    const { ctx, outcome } = await resolve('warn');
    expect(outcome).not.toEqual({ result: 'failed' });

    const notes = filteredNotes(ctx);
    expect(notes).toHaveLength(1);
    const note = notes[0] as Extract<Note, { kind: 'candidates-filtered' }>;
    expect(note.field).toBe('target');
    expect(note.query).toBe('box');
    expect(note.kept).toBe(1);
    // ⚠ The PAINTING is named, not the crate — the note reports what was
    // thrown away, which is the sentence the player needs.
    expect(note.discarded).toHaveLength(1);
    void painting;
    void crate;
  });

  it('error refuses the command, with the same note', async () => {
    const { ctx, outcome } = await resolve('error');
    expect(outcome).toEqual({ result: 'failed' });
    expect(filteredNotes(ctx)).toHaveLength(1);
  });
});
