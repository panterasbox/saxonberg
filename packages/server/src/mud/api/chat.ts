/**
 * ChatApi — thin facade over the ChannelCatalogue singleton.
 *
 * Stable caller-facing surface for the chat controllers, the DM
 * handle-forwarding path (`resolveHandleForActor`), and the
 * promotion flow.
 */

import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Channel } from '../lib/social/Channel';
import type { AdHocChannel } from '../lib/social/AdHocChannel';
import type ChannelCatalogue from '../obj/ChannelCatalogue';
import type { ChannelSubscription } from '../obj/ChannelCatalogue';
import type { MessageFrame } from '@saxonberg/types';
import { TemplatePaths } from '../lib/paths';

const CATALOGUE_PATH = TemplatePaths.channelCatalogue;

export class ChatApi {
  static #catalogueRef: ChannelCatalogue | null = null;

  static async resolveByName(name: string): Promise<Channel | null> {
    return (await ChatApi.#requireCatalogue()).resolveByName(name);
  }

  static async resolveHandleForActor(
    actor: Stuff,
    handle: string,
  ): Promise<AdHocChannel | null> {
    return (await ChatApi.#requireCatalogue()).resolveHandleForActor(actor, handle);
  }

  static async openAdHoc(
    creator: Stuff,
    members: Iterable<Stuff>,
  ): Promise<AdHocChannel> {
    return (await ChatApi.#requireCatalogue()).openAdHoc(creator, members);
  }

  static async postToChannel(
    speaker: Stuff,
    channel: Channel,
    body: string,
  ): Promise<void> {
    return (await ChatApi.#requireCatalogue()).postToChannel(speaker, channel, body);
  }

  static async createPlayerChannel(
    owner: Stuff,
    name: string,
  ): Promise<Channel> {
    return (await ChatApi.#requireCatalogue()).createPlayerChannel(owner, name);
  }

  static async disbandPlayerChannel(name: string): Promise<boolean> {
    return (await ChatApi.#requireCatalogue()).disbandPlayerChannel(name);
  }

  static async renamePlayerChannel(
    oldName: string,
    newName: string,
  ): Promise<Channel> {
    return (await ChatApi.#requireCatalogue()).renamePlayerChannel(oldName, newName);
  }

  static async historyFor(channelId: string): Promise<readonly MessageFrame[]> {
    return (await ChatApi.#requireCatalogue()).historyFor(channelId);
  }

  static async visibleChannels(
    actor: Stuff,
  ): Promise<{ persistent: Channel[]; adHoc: AdHocChannel[] }> {
    return (await ChatApi.#requireCatalogue()).visibleChannels(actor);
  }

  static async getSubscription(
    avatar: Parameters<ChannelCatalogue['getSubscription']>[0],
    channel: Channel,
  ): Promise<ChannelSubscription> {
    return (await ChatApi.#requireCatalogue()).getSubscription(avatar, channel);
  }

  static async setSubscription(
    avatar: Parameters<ChannelCatalogue['setSubscription']>[0],
    channel: Channel,
    next: Partial<ChannelSubscription>,
  ): Promise<ChannelSubscription> {
    return (await ChatApi.#requireCatalogue()).setSubscription(avatar, channel, next);
  }

  static async promoteAdHocToManaged(
    handle: string,
    newName: string,
    promoter: Stuff,
  ): Promise<Channel> {
    return (await ChatApi.#requireCatalogue()).promoteAdHocToManaged(
      handle,
      newName,
      promoter,
    );
  }

  static async catalogue(): Promise<ChannelCatalogue> {
    return ChatApi.#requireCatalogue();
  }

  /**
   * Set of Group `_id`s that back chat channels. Consumed by
   * `GroupController.executeList` to filter channel-backing Groups
   * out of the user-facing `group list` view. Groups themselves know
   * nothing about chat; ownership of this bookkeeping lives here.
   */
  static async getBackingGroupIds(): Promise<ReadonlySet<string>> {
    return (await ChatApi.#requireCatalogue()).getBackingGroupIds();
  }

  static async #requireCatalogue(): Promise<ChannelCatalogue> {
    if (ChatApi.#catalogueRef) return ChatApi.#catalogueRef;
    const cat = StuffApi.findByTemplatePath<ChannelCatalogue>(CATALOGUE_PATH);
    if (cat) {
      ChatApi.#catalogueRef = cat;
      return cat;
    }
    const lazy = await StuffApi.singleton<ChannelCatalogue>(CATALOGUE_PATH);
    ChatApi.#catalogueRef = lazy;
    return lazy;
  }
}

SecurityApi.decorateApiClass(ChatApi);
