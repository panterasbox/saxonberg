/**
 * ⭐ "Drop what?" — a line that names a verb and not its required object
 * is unfinished, not wrong. The dispatcher asks, offering what fits the
 * field's own scope, and the answer goes where the object goes as
 * `#<id>`: the line runs again exactly as if it had been typed.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Place from '../../stuff/Place';
import { CommandGiverMixin } from '../CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';
import { VisibleMixin } from '../../description/Visible';
import { PerceptibleMixin } from '../../description/Perceptible';
import { TangibleMixin } from '../../material/Tangible';
import { NamedMixin } from '../../description/Named';

const TestGiverBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
    peers: [],
    self: ['platform/cmd/inventory/drop.yaml'],
    environment: [],
  };
  protected override handleMessage(): void {}
  protected override handleEnvelope(): void {}
}

class Pebble extends PerceptibleMixin(VisibleMixin(TangibleMixin(NamedMixin(ContainableMixin(Idea))))) {}

describe('the dispatcher asks for a missing object', () => {
  let giver: TestGiver;
  let pebble: Pebble;

  beforeEach(() => {
    CommandApi.clearCache();
    const room = makeStuff(() => new Place());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, room);
    pebble = makeStuff(() => new Pebble());
    pebble.setName('a pebble');
    pebble.setKeywords(['pebble']);
    ContainmentApi.move(pebble, giver);
  });

  afterEach(() => vi.restoreAllMocks());

  it('⭐ `drop` alone asks "Drop what?" and runs `drop #<id>` with the answer', async () => {
    const asked: { label: string; ids: string[] }[] = [];
    const interactive = {
      touchInput: vi.fn(),
      promptMqlObject: vi.fn(async (label: string, matches: { stuffId: string }[]) => {
        asked.push({ label, ids: matches.map((m) => m.stuffId) });
        return pebble;
      }),
    };
    // Capture the line the answer completes; stop there (the controller
    // itself is not under test).
    const lines: string[] = [];
    const real = giver._runChain.bind(giver);
    vi.spyOn(giver, '_runChain').mockImplementation(async (parsed, outer) => {
      lines.push(CommandLineApi.format(parsed));
      return lines.length === 1 ? real(parsed, outer) : outer;
    });

    await giver.executeCommand('drop', { interactive: interactive as never });

    // (What the prompt OFFERS goes through the perception gate, and this
    // bare giver perceives nothing — the candidate list is checked in the
    // live world. Here: it asked, once, in words.)
    expect(asked.map((a) => a.label)).toEqual(['Drop what?']);
    expect(lines).toEqual(['drop', `drop #${pebble.stuffId}`]);
  });

  it('without a session to ask (an NPC), the line is refused as before', async () => {
    const lines: string[] = [];
    let last: { getNotes(): { kind: string; reason?: string }[] } | undefined;
    const real = giver._runChain.bind(giver);
    vi.spyOn(giver, '_runChain').mockImplementation(async (parsed, outer) => {
      lines.push(CommandLineApi.format(parsed));
      const ctx = await real(parsed, outer);
      last = ctx as never;
      return ctx;
    });
    await giver.executeCommand('drop');
    expect(lines).toEqual(['drop']);
    expect(last!.getNotes().some((n) => n.kind === 'command-rejected' && n.reason === 'shape-fall-through')).toBe(true);
  });
});
