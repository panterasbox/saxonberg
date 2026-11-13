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
import type { ChannelAnonymity } from '../lib/social/Channel';
import type Subject from '../lib/forum/Subject';
import type { AdHocChannel } from '../lib/social/AdHocChannel';
import type ChannelCatalogue from '../platform/idea/ChannelCatalogue';
import type {
  ChannelActResult,
  ChannelHistoryResult,
  ChannelSubscription,
} from '../platform/idea/ChannelCatalogue';
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

  /** `actor` lights a chat surface on a Subject it owns. */
  static async attachChatToSubject(
    actor: Stuff,
    subject: Subject,
    procedure?: 'open' | 'ordered',
  ): Promise<ChannelActResult> {
    return logic().attachChatToSubject(actor, subject, procedure);
  }

  /**
   * `actor` ends a player-created channel it governs — the Subject's
   * owner, or the owner of its audience group (a party's captain). The
   * gate is the catalogue's (controller-liquidity D9).
   */
  static async disbandPlayerChannel(
    actor: Stuff,
    name: string,
  ): Promise<ChannelActResult> {
    return logic().disbandPlayerChannel(actor, name);
  }

  /**
   * Set whether a channel permits anonymous posts. ⭐ The owner's call
   * about their own space — a values question a community gets to
   * answer. Refused unless `actor` governs the channel.
   */
  static async setAnonymity(
    actor: Stuff,
    name: string,
    anonymity: ChannelAnonymity,
  ): Promise<ChannelActResult> {
    return logic().setAnonymity(actor, name, anonymity);
  }

  /** `actor` renames a channel it governs. */
  static async renamePlayerChannel(
    actor: Stuff,
    oldName: string,
    newName: string,
  ): Promise<ChannelActResult> {
    return logic().renamePlayerChannel(actor, oldName, newName);
  }

  /**
   * A channel's history ring, for `reader` — refused unless the reader
   * is in its audience (an ad-hoc handle's members).
   */
  static async historyFor(
    reader: Stuff,
    channelId: string,
  ): Promise<ChannelHistoryResult> {
    return logic().historyFor(reader, channelId);
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
   * `GroupListController` to filter channel-backing Groups
   * out of the user-facing `group list` view. Groups themselves know
   * nothing about chat; ownership of this bookkeeping lives here.
   */
  static async getBackingGroupIds(): Promise<ReadonlySet<string>> {
    return logic().getBackingGroupIds();
  }
}

SecurityApi.decorateApiClass(ChatApi);
