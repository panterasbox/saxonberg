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

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Location from '../../stuff/Location';
import { CommandGiverMixin } from '../CommandGiver';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { Collections } from '../../persistence/Collections';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from '../../stuff/Idea';
import type Interactive from '../../../obj/Interactive';

class TestGiver extends HasInteractiveMixin(
  CommandGiverMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestGiver';
  static override commandContributions = {
    peers: [],
    // ⚠ `cockpit` is needed by the round-trip case at the bottom: it is
    // the verb that WRITES a prefix, and the seam that test guards is
    // between that write and the read the other cases cover.
    self: ['shell/cockpit.yaml'],
    environment: [],
  };

  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

/** The dispatched text on the input-echo frame (parse-fail → warn). */
function echoedText(giver: TestGiver): string | undefined {
  const echo = giver.received.find((f) =>
    f.topic.startsWith('shell.diagnostic'),
  );
  return echo?.body;
}

// A minimal stand-in for the originating connection — executeCommand only
// reads `.stuffId` off it for echo attribution.
const fakeInteractive = {
  stuffId: 'i1',
  touchInput: () => {},
} as unknown as Interactive;

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

  /*
   * ⚠⚠ THE ROUND TRIP, and the seam every test above misses.
   *
   * The five cases above all drive the READ side — the prepend, which
   * reads `opts.barId` and always worked. The WRITE side lives in
   * `CliController`, whose own tests hand it a context with `barId`
   * already set. So both halves were green while the seam between them
   * was broken: the per-attempt `CommandContext` that a controller
   * actually receives copied nine fields from the outer context and
   * dropped `barId`.
   *
   * The consequence was total. A controller saw `context.barId ===
   * undefined`, fell back to `'main'`, and wrote the prefix there —
   * while the reader looked up the REAL bar. `cockpit cli` set a
   * prefix that could never apply, and the whole input-mode feature was
   * inert through any client that sends a barId other than `main`. The
   * shipped client sends `world`.
   *
   * ⚠ Found by DRIVING a browser, not by the suite. This test is the
   * guard: it goes in one end (a real `executeCommand` carrying a
   * barId) and asserts out the other (that same bar's prefix applies).
   */
  it('⭐ a prefix SET from a bar applies to the next line from that bar', async () => {
    // Dispatch clones the controller via `StuffApi.clone`, which reads
    // the template from PM. Mock the one row so it resolves without a
    // live MongoDB (the `CommandGiver.test.ts` PingController pattern).
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        if (
          collection === Collections.Domain &&
          query.path === '/obj/command/shell/CliController'
        ) {
          return [
            {
              path: '/obj/command/shell/CliController',
              class: '/obj/command/shell/CliController',
              data: {},
            },
          ];
        }
        return [];
      },
    );
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      save: vi.fn(),
      find,
      findById: vi.fn(),
    } as unknown as PersistenceManager);

    await CommandApi.preloadAll();

    // Set it the way a player does — through dispatch, from `world`.
    await giver.executeCommand('cockpit cli --prefix "chat"', {
      interactive: fakeInteractive,
      barId: 'world',
    });

    // It landed under the REAL bar, not the `'main'` fallback.
    const modes = giver.getClientState<Record<string, string>>(
      'cockpit.inputModes',
    );
    expect(modes).toEqual({ world: 'chat' });

    // …and therefore applies to the next bare line from that bar.
    // (Drop the frames from the setting command so `echoedText` reads
    // this dispatch's echo rather than the previous one's.)
    giver.received.length = 0;
    await giver.executeCommand('hello', {
      interactive: fakeInteractive,
      barId: 'world',
    });
    expect(echoedText(giver)).toContain('chat hello');
  });
});
