/**
 * ⭐ A probe never stands a sleeping ship up (navigation-server D8): her
 * way aboard answers *as far as you know* (`unseen`) and nothing is
 * materialized; the real crossing still stands her up.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import BerthExit from '../BerthExit';
import { ExpanseApi } from '../../../api/expanse';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('BerthExit under a probe', () => {
  it('a sleeping ship is not stood up: the way is unseen', async () => {
    const way = makeStuffAtPath(() => new BerthExit(), '/platform/idea/exits/berth');
    way.configureBerth({
      getDurableHandle: () => '/test/ship/smack/k1',
      getTemplatePath: () => '/test/ship/smack',
      getName: () => 'the smack',
      getGangwayKeyway: () => '',
      isGangwayLocked: () => false,
    } as never);
    const standUp = vi.spyOn(ExpanseApi, 'standUpCraft').mockResolvedValue(null as never);
    const verdict = await way.canTraverse({} as Stuff as never, 'walk', { probe: true });
    expect(verdict).toEqual({ ok: true, unseen: true });
    expect(standUp).not.toHaveBeenCalled();
  });
});
