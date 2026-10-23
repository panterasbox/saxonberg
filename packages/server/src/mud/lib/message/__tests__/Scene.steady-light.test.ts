/**
 * ⭐ A frame's body is rendered under a steady-light hold: one synchronous
 * read, so the room's light is walked once rather than once per thing the
 * body describes. An NPC's `look` over a full room re-walked the light
 * graph per object, and a long clock advance stopped the world answering
 * for minutes (the ceramics drives, runs 29–30).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MessageApi } from '../../../api/message';
import { PerceptionApi } from '../../../api/perception';
import { Mml } from '../../../api/mml';
import { SensorMixin } from '../Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';

class Ear extends SensorMixin(ContainableMixin(Idea)) {
  static _mixinName = 'SteadyLightEar';
  public heard: MessageFrame[] = [];
  override onMessage(f: MessageFrame): void {
    this.heard.push(f);
  }
}

afterEach(() => vi.restoreAllMocks());

describe('Scene — a frame body renders under one light hold', () => {
  it('⭐ an Mml body takes and releases the hold once per frame', () => {
    const released = vi.fn();
    const hold = vi.spyOn(PerceptionApi, 'holdLightSteady').mockReturnValue(released);
    const ear = makeStuff(() => new Ear());
    MessageApi.scene(ear).topic('act.deed').toSelf(Mml.compose`You look around.`).send();
    expect(ear.heard).toHaveLength(1);
    expect(hold).toHaveBeenCalledTimes(1);
    expect(released).toHaveBeenCalledTimes(1);
  });

  it('a plain-string body needs no hold', () => {
    const hold = vi.spyOn(PerceptionApi, 'holdLightSteady');
    const ear = makeStuff(() => new Ear());
    MessageApi.scene(ear).topic('act.deed').toSelf('plain words').send();
    expect(ear.heard).toHaveLength(1);
    expect(hold).not.toHaveBeenCalled();
  });
});
