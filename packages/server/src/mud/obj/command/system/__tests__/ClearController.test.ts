/**
 * ClearController — the `clear` verb. The controller's whole job is to
 * emit one signal frame on `shell.control` with an empty body
 * (so it renders no scrollback line); the client handler empties the
 * buffer. The scene emit is captured here; the buffer-clearing is a
 * client concern.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ClearController from '../ClearController';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';

describe('ClearController', () => {
  let topic: string | undefined;
  let selfBody: unknown;

  beforeEach(() => {
    vi.restoreAllMocks();
    topic = undefined;
    selfBody = undefined;
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = (t: string) => {
        topic = t;
        return b;
      };
      b.toSelf = (body: unknown) => {
        selfBody = body;
        return b;
      };
      b.send = () => {};
      return b as never;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('emits an empty-body signal frame on shell.control', () => {
    const ctrl = makeStuff(() => new ClearController());
    const ctx = { commandGiver: {} } as unknown as CommandContext;

    ctrl.execute({} as CommandModel, ctx);

    expect(topic).toBe('shell.control');
    // Empty body → the client's frame buffer skips it (no scrollback
    // line); the clear is delivered purely by the topic handler.
    expect(selfBody).toBeInstanceOf(Mml);
    expect((selfBody as Mml).toString()).toBe('');
  });
});
