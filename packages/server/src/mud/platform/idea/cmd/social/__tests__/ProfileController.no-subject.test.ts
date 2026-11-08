/**
 * A name that binds nobody is a refusal, never your own card. `profile`'s target is
 * optional, so a name the binder could not place arrives with no stuff: it read back
 * the viewer's own card as if it were the person asked about, which since D30 is what
 * asking after anyone signed out did.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ProfileController from '../ProfileController';
import Avatar from '../../../../agent/PrimaryAvatar';
import { CommandApi, type CommandModel } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';

afterEach(() => vi.restoreAllMocks());

describe('profile <a name nobody answers to>', () => {
  it('refuses in words and composes no card', async () => {
    const viewer = makeStuff(() => new Avatar());
    const compose = vi.spyOn(viewer, 'composeProfileCard');
    const controller = makeStuff(() => new ProfileController());
    const context = CommandApi.createCommandContext({ commandGiver: viewer } as never);
    await controller.execute(
      { target: { stuff: null, raw: 'odile' } as unknown as MqlOneResult } as CommandModel,
      context,
    );
    expect(compose).not.toHaveBeenCalled();
    expect(context.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'profile-no-subject' }),
    );
  });
});
