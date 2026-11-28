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
import { TestHarnessApi } from '../../../../../api/test-harness';
import { MessageApi } from '../../../../../api/message';
import type { ProfileCard } from '../../../../../api/social';

afterEach(() => vi.restoreAllMocks());

describe('profile <a name nobody answers to>', () => {
  it('refuses in words and composes no card', async () => {
    const viewer = makeStuff(() => new Avatar());
    const compose = vi.spyOn(viewer, 'composeProfileCard');
    const controller = makeStuff(() => new ProfileController());
    const context = CommandApi.createCommandContext({ commandGiver: viewer } as never);
    await TestHarnessApi.actAs(context.commandGiver, () => controller.execute(
      { target: { stuff: null, raw: 'odile' } as unknown as MqlOneResult } as CommandModel,
      context,
    ));
    expect(compose).not.toHaveBeenCalled();
    expect(context.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'profile-no-subject' }),
    );
  });
});

describe('your own profile on a character that is not your Compact character', () => {
  it('says where your account’s Make and Fund are shown (front-page-sources D13)', async () => {
    const viewer = makeStuff(() => new Avatar());
    const card: ProfileCard = {
      handle: 'second',
      header: 'Tamsin Reed',
      isSelf: true,
      recognized: true,
      digest: { influence: { play: 'dormant' }, accountShownOn: 'Odile Marsh' },
    };
    vi.spyOn(viewer, 'composeProfileCard').mockResolvedValue(card);
    let said = '';
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = (m: unknown) => {
        said += String(m);
        return b;
      };
      b.send = () => {};
      return b as never;
    });
    const controller = makeStuff(() => new ProfileController());
    const context = CommandApi.createCommandContext({ commandGiver: viewer } as never);
    await TestHarnessApi.actAs(context.commandGiver, () => controller.execute({} as CommandModel, context));
    expect(said).toContain('shown on Odile Marsh, your Compact character');
    expect(said).not.toContain('Make:');
  });
});
