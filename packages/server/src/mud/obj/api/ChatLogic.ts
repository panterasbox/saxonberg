// ChatLogic — the hot-reloadable logic singleton behind ChatApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Channel } from '../../lib/social/Channel';
import type { AdHocChannel } from '../../lib/social/AdHocChannel';
import type ChannelCatalogue from '../ChannelCatalogue';
import type { ChannelSubscription } from '../ChannelCatalogue';
import type { MessageFrame } from '@saxonberg/types';
import { TemplatePaths } from '../../lib/paths';

const CATALOGUE_PATH = TemplatePaths.channelCatalogue;

const ChatApiCallers = SecurityPolicies.FromModule('mud/api/chat#ChatApi');

/**
 * ChatLogic — the hot-reloadable logic singleton behind {@link ChatApi}.
 *
 * Lives at `/obj/api/chat` (a stateless `Stuff` singleton, no backing
 * `Template`); `ChatApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). Every public
 * method resolves the `ChannelCatalogue` through the module-private
 * `requireCatalogue` free function (off-class, ungated, un-callable from
 * outside) which holds the memoised catalogue ref — so there are no
 * intra-singleton self-calls and the plain `FromModule` gate suffices
 * per method.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
export class ChatLogic extends Idea {
  /** See {@link ChatApi.resolveByName}. */
  @CallSecurity(ChatApiCallers)
  public async resolveByName(name: string): Promise<Channel | null> {
    return (await requireCatalogue()).resolveByName(name);
  }

  /** See {@link ChatApi.resolveHandleForActor}. */
  @CallSecurity(ChatApiCallers)
  public async resolveHandleForActor(
    actor: Stuff,
    handle: string
  ): Promise<AdHocChannel | null> {
    return (await requireCatalogue()).resolveHandleForActor(actor, handle);
  }

  /** See {@link ChatApi.openAdHoc}. */
  @CallSecurity(ChatApiCallers)
  public async openAdHoc(
    creator: Stuff,
    members: Iterable<Stuff>
  ): Promise<AdHocChannel> {
    return (await requireCatalogue()).openAdHoc(creator, members);
  }

  /** See {@link ChatApi.postToChannel}. */
  @CallSecurity(ChatApiCallers)
  public async postToChannel(
    speaker: Stuff,
    channel: Channel,
    body: string
  ): Promise<void> {
    return (await requireCatalogue()).postToChannel(speaker, channel, body);
  }

  /** See {@link ChatApi.createPlayerChannel}. */
  @CallSecurity(ChatApiCallers)
  public async createPlayerChannel(
    owner: Stuff,
    name: string
  ): Promise<Channel> {
    return (await requireCatalogue()).createPlayerChannel(owner, name);
  }

  /** See {@link ChatApi.disbandPlayerChannel}. */
  @CallSecurity(ChatApiCallers)
  public async disbandPlayerChannel(name: string): Promise<boolean> {
    return (await requireCatalogue()).disbandPlayerChannel(name);
  }

  /** See {@link ChatApi.renamePlayerChannel}. */
  @CallSecurity(ChatApiCallers)
  public async renamePlayerChannel(
    oldName: string,
    newName: string
  ): Promise<Channel> {
    return (await requireCatalogue()).renamePlayerChannel(oldName, newName);
  }

  /** See {@link ChatApi.historyFor}. */
  @CallSecurity(ChatApiCallers)
  public async historyFor(
    channelId: string
  ): Promise<readonly MessageFrame[]> {
    return (await requireCatalogue()).historyFor(channelId);
  }

  /** See {@link ChatApi.visibleChannels}. */
  @CallSecurity(ChatApiCallers)
  public async visibleChannels(
    actor: Stuff
  ): Promise<{ persistent: Channel[]; adHoc: AdHocChannel[] }> {
    return (await requireCatalogue()).visibleChannels(actor);
  }

  /** See {@link ChatApi.getSubscription}. */
  @CallSecurity(ChatApiCallers)
  public async getSubscription(
    avatar: Parameters<ChannelCatalogue['getSubscription']>[0],
    channel: Channel
  ): Promise<ChannelSubscription> {
    return (await requireCatalogue()).getSubscription(avatar, channel);
  }

  /** See {@link ChatApi.setSubscription}. */
  @CallSecurity(ChatApiCallers)
  public async setSubscription(
    avatar: Parameters<ChannelCatalogue['setSubscription']>[0],
    channel: Channel,
    next: Partial<ChannelSubscription>
  ): Promise<ChannelSubscription> {
    return (await requireCatalogue()).setSubscription(avatar, channel, next);
  }

  /** See {@link ChatApi.promoteAdHocToManaged}. */
  @CallSecurity(ChatApiCallers)
  public async promoteAdHocToManaged(
    handle: string,
    newName: string,
    promoter: Stuff
  ): Promise<Channel> {
    return (await requireCatalogue()).promoteAdHocToManaged(
      handle,
      newName,
      promoter
    );
  }

  /** See {@link ChatApi.catalogue}. */
  @CallSecurity(ChatApiCallers)
  public async catalogue(): Promise<ChannelCatalogue> {
    return requireCatalogue();
  }

  /** See {@link ChatApi.getBackingGroupIds}. */
  @CallSecurity(ChatApiCallers)
  public async getBackingGroupIds(): Promise<ReadonlySet<string>> {
    return (await requireCatalogue()).getBackingGroupIds();
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private, off-class, not part of the public surface).
// ---------------------------------------------------------------------------

/**
 * Memoised catalogue ref. The logic singleton itself is HMR-reloaded as
 * a whole (`dest /obj/api/chat`); this cache lives at module scope and
 * resets with the module on reload.
 */
let catalogueRef: ChannelCatalogue | null = null;

async function requireCatalogue(): Promise<ChannelCatalogue> {
  if (catalogueRef) return catalogueRef;
  const cat = StuffApi.findByTemplatePath<ChannelCatalogue>(CATALOGUE_PATH);
  if (cat) {
    catalogueRef = cat;
    return cat;
  }
  const lazy = await StuffApi.singleton<ChannelCatalogue>(CATALOGUE_PATH);
  catalogueRef = lazy;
  return lazy;
}
