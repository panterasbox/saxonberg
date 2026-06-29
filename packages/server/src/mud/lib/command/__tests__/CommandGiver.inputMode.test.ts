/**
 * executeCommand input-mode integration — the per-bar prepend on the
 * command-entry hot path.
 *
 * Asserts the rewrite end-to-end: with a bar's prefix set in
 * `cockpit.inputModes`, a bare line from that bar is dispatched with the
 * prefix prepended (observed on the input-echo frame, whose `rawText` is
 * the dispatched text). Forced / non-interactive dispatch bypasses the
 * prepend entirely (the regression guard) — scripts and NPCs carry no
 * bar and must never be rewritten.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Location from '../../stuff/Location';
import { CommandGiverMixin } from '../CommandGiver';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from '../../stuff/Idea';
import type Interactive from '../../../obj/Interactive';

class TestGiver extends HasInteractiveMixin(
  CommandGiverMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestGiver';
  static override commandContributions = {
    self: [],
    environment: [],
    inventory: [],
    peers: [],
  };

  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

/** The dispatched text on the input-echo frame (parse-fail → warn). */
function echoedText(giver: TestGiver): string | undefined {
  const echo = giver.received.find((f) =>
    f.topic.startsWith('system.log.command'),
  );
  return echo?.body;
}

// A minimal stand-in for the originating connection — executeCommand only
// reads `.stuffId` off it for echo attribution.
const fakeInteractive = { stuffId: 'i1' } as unknown as Interactive;

describe('executeCommand per-bar input mode', () => {
  let giver: TestGiver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    location = makeStuff(() => new Location());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prepends the submitting bar’s prefix to a bare line', async () => {
    giver.setClientState('cockpit.inputModes', { main: 'chat' });
    await giver.executeCommand('hello', {
      interactive: fakeInteractive,
      barId: 'main',
    });
    expect(echoedText(giver)).toContain('chat hello');
  });

  it('leaves a command from a different, un-moded bar unaffected', async () => {
    giver.setClientState('cockpit.inputModes', { main: 'chat' });
    await giver.executeCommand('hello', {
      interactive: fakeInteractive,
      barId: 'other',
    });
    const body = echoedText(giver);
    expect(body).toContain('hello');
    expect(body).not.toContain('chat hello');
  });

  it('does not prefix forced (programmatic) dispatch', async () => {
    giver.setClientState('cockpit.inputModes', { main: 'chat' });
    await giver.executeCommand('hello', {
      interactive: fakeInteractive,
      barId: 'main',
      forced: true,
    });
    expect(echoedText(giver)).not.toContain('chat hello');
  });

  it('does not prefix non-interactive (script / NPC) dispatch', async () => {
    giver.setClientState('cockpit.inputModes', { main: 'chat' });
    await giver.executeCommand('hello', { barId: 'main' });
    expect(echoedText(giver)).not.toContain('chat hello');
  });

  it('is a verbatim no-op when the bar has no mode', async () => {
    await giver.executeCommand('hello', {
      interactive: fakeInteractive,
      barId: 'main',
    });
    expect(echoedText(giver)).toContain('hello');
    expect(echoedText(giver)).not.toContain('chat');
  });
});
