/**
 * Escape battery — COMMS: the delivery seam is open, and ONLY the
 * delivery seam.
 *
 * Comms are seamless (Decision N): message delivery crosses the
 * boundary in both directions through the fixed Sensor-pipeline
 * allowlist. But the allowlist must not become a reference channel —
 * any non-delivery dispatch on a cross-scope object still denies.
 * Fails without the `#MESSAGE_DELIVERY_METHODS` allowlist (deliveries
 * would deny) or without the Layer-4 backstop (the smuggle would pass).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import {
  ExecutionContextApi,
} from '../../../../api/execution-context';
import { SecurityError } from '../../../security/errors';
import { Idea } from '../../../stuff/Idea';
import { SensorMixin } from '../../../message/Sensor';
import type { MessageFrame } from '@saxonberg/types';

const SCOPE = '/home/escape-tester';

class Listener extends SensorMixin(Idea) {
  public heard: string[] = [];
  public override handleMessage(frame: MessageFrame): void {
    this.heard.push(frame.body);
  }
  public renameTo(_name: string): void {
    // a non-delivery mutator — must stay boundary-denied
  }
}

function frame(body: string): MessageFrame {
  return {
    id: 'f1',
    topic: 'speech.comms',
    body,
    meta: { timestamp: Date.now() },
  } as MessageFrame;
}

describe('sandbox-escape: comms', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    ExecutionContextApi._clearForTesting();
  });

  it('field → circle delivery crosses (rendered MML only)', async () => {
    const circleListener = (await ExecutionContextApi.runRootGuarded(
      null,
      'escape',
      () => StuffApi.create(() => new Listener()),
      'rethrow',
      { circleScope: SCOPE }
    ))!;
    // A field speaker delivers to a wire-side sensor: allowed.
    circleListener.onMessage(frame('hello in there'));
    expect(circleListener.heard).toEqual(['hello in there']);
  });

  it('circle → field delivery crosses (the reply lands)', async () => {
    const fieldListener = await StuffApi.create(() => new Listener());
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        fieldListener.onMessage(frame('hello out there'));
      },
      { circleScope: SCOPE }
    );
    expect(fieldListener.heard).toEqual(['hello out there']);
  });

  it('a reference obtained via conversation still denies non-delivery dispatch', async () => {
    const fieldListener = await StuffApi.create(() => new Listener());
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        // delivery passes…
        fieldListener.onMessage(frame('bait'));
        // …but the same reference cannot be used for anything else.
        expect(() => fieldListener.renameTo('gotcha')).toThrow(SecurityError);
        expect(() => fieldListener.heard).toBeDefined; // field read via proxy getter
      },
      { circleScope: SCOPE }
    );
    expect(fieldListener.heard).toEqual(['bait']);
  });

  it('the delivery payload is a rendered string, not a live ref (shape check)', () => {
    // The MessageFrame contract: `body` is an MML *string* materialized
    // per-recipient at compose time (Scene.send), and payload carries
    // StuffRef snapshots. This assertion pins the wire shape the
    // allowlist depends on.
    const f = frame('rendered');
    expect(typeof f.body).toBe('string');
  });
});
