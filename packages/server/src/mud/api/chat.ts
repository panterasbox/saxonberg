/**
 * ChatApi — thin facade over the ChannelCatalogue singleton.
 *
 * Stable caller-facing surface for the chat controllers, the DM
 * handle-forwarding path (`resolveHandleForActor`), and the
 * promotion flow.
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link ChatLogic} singleton at `/platform/idea/api/chat`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /platform/idea/api/chat`
 * reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Channel } from '../lib/social/Channel';
import type Subject from '../lib/forum/Subject';
import type { AdHocChannel } from '../lib/social/AdHocChannel';
import type ChannelCatalogue from '../platform/idea/ChannelCatalogue';
import type { ChannelSubscription } from '../platform/idea/ChannelCatalogue';
import type { MessageFrame } from '@saxonberg/types';
import { ChatLogic } from '../platform/idea/api/ChatLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/chat';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ChatLogic', import.meta.url)
);

/** Resolve the HMR-able ChatLogic singleton (sync). */
function logic(): ChatLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ChatLogic'
      ) as typeof ChatLogic | null) ?? ChatLogic)()
  );
}

export class ChatApi {
  static async resolveByName(name: string): Promise<Channel | null> {
    return logic().resolveByName(name);
  }

  static async resolveHandleForActor(
    actor: Stuff,
    handle: string,
  ): Promise<AdHocChannel | null> {
    return logic().resolveHandleForActor(actor, handle);
  }

  static async openAdHoc(
    creator: Stuff,
    members: Iterable<Stuff>,
  ): Promise<AdHocChannel> {
    return logic().openAdHoc(creator, members);
  }

  static async postToChannel(
    speaker: Stuff,
    channel: Channel,
    body: string,
  ): Promise<void> {
    return logic().postToChannel(speaker, channel, body);
  }

  static async createPlayerChannel(
    owner: Stuff,
    name: string,
  ): Promise<Channel> {
    return logic().createPlayerChannel(owner, name);
  }

  static async createBoundChannel(
    owner: Stuff,
    name: string,
    groupRef: string,
  ): Promise<Channel> {
    return logic().createBoundChannel(owner, name, groupRef);
  }

  static async attachChatToSubject(
    subject: Subject,
    procedure?: 'open' | 'ordered',
  ): Promise<Channel> {
    return logic().attachChatToSubject(subject, procedure);
  }

  static async disbandPlayerChannel(name: string): Promise<boolean> {
    return logic().disbandPlayerChannel(name);
  }

  static async renamePlayerChannel(
    oldName: string,
    newName: string,
  ): Promise<Channel> {
    return logic().renamePlayerChannel(oldName, newName);
  }

  static async historyFor(channelId: string): Promise<readonly MessageFrame[]> {
    return logic().historyFor(channelId);
  }

  static async visibleChannels(
    actor: Stuff,
  ): Promise<{ persistent: Channel[]; adHoc: AdHocChannel[] }> {
    return logic().visibleChannels(actor);
  }

  static async getSubscription(
    avatar: Parameters<ChannelCatalogue['getSubscription']>[0],
    channel: Channel,
  ): Promise<ChannelSubscription> {
    return logic().getSubscription(avatar, channel);
  }

  static async setSubscription(
    avatar: Parameters<ChannelCatalogue['setSubscription']>[0],
    channel: Channel,
    next: Partial<ChannelSubscription>,
  ): Promise<ChannelSubscription> {
    return logic().setSubscription(avatar, channel, next);
  }

  static async promoteAdHocToManaged(
    handle: string,
    newName: string,
    promoter: Stuff,
  ): Promise<Channel> {
    return logic().promoteAdHocToManaged(handle, newName, promoter);
  }

  static async catalogue(): Promise<ChannelCatalogue> {
    return logic().catalogue();
  }

  /**
   * Set of Group `_id`s that back chat channels. Consumed by
   * `GroupController.executeList` to filter channel-backing Groups
   * out of the user-facing `group list` view. Groups themselves know
   * nothing about chat; ownership of this bookkeeping lives here.
   */
  static async getBackingGroupIds(): Promise<ReadonlySet<string>> {
    return logic().getBackingGroupIds();
  }
}

SecurityApi.decorateApiClass(ChatApi);
