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
import { ContainerMixin } from '../../spatial/Container';
import { ContainmentApi } from '../../../api/containment';
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

class Room extends ContainerMixin(Idea) {}

afterEach(() => vi.restoreAllMocks());

describe('Scene — a frame body renders under one light hold', () => {
  it('⭐⭐ a Scene to a whole room takes ONE hold, released before anyone hears it', () => {
    const order: string[] = [];
    const hold = vi.spyOn(PerceptionApi, 'holdLightSteady').mockImplementation(() => {
      order.push('hold');
      return () => order.push('release');
    });
    class Listener extends Ear {
      override onMessage(f: MessageFrame): void {
        order.push('deliver');
        super.onMessage(f);
      }
    }
    const room = makeStuff(() => new Room());
    const speaker = makeStuff(() => new Listener());
    const others = [0, 1, 2].map(() => makeStuff(() => new Listener()));
    for (const e of [speaker, ...others]) ContainmentApi.move(e as never, room as never);
    MessageApi.scene(speaker)
      .topic('act.deed')
      .toSelf(Mml.compose`You speak.`)
      .toPeers(Mml.compose`Somebody speaks.`)
      .send();
    expect(hold).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['hold', 'release', 'deliver', 'deliver', 'deliver', 'deliver']);
    for (const e of others) expect(e.heard).toHaveLength(1);
  });

  it('⭐ a frame delivered mid-send can change what the NEXT Scene renders', () => {
    // The hold did not outlive delivery: a brain that lights a lamp on hearing
    // a line is seen by the next Scene (VisionModality's own warning).
    const room = makeStuff(() => new Room());
    let held = 0;
    vi.spyOn(PerceptionApi, 'holdLightSteady').mockImplementation(() => {
      held += 1;
      return () => {
        held -= 1;
      };
    });
    const during: number[] = [];
    class Witness extends Ear {
      override onMessage(f: MessageFrame): void {
        during.push(held);
        super.onMessage(f);
      }
    }
    const speaker = makeStuff(() => new Witness());
    const other = makeStuff(() => new Witness());
    for (const e of [speaker, other]) ContainmentApi.move(e as never, room as never);
    MessageApi.scene(speaker).topic('act.deed').toPeers(Mml.compose`A line.`).send();
    expect(during).toEqual([0]);
  });

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
