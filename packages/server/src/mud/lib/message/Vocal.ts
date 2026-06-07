/**
 * VocalMixin — speech for sentient beings.
 *
 * `say(text)` composes a Scene at `world.speech.say` with a self
 * frame ("You say, ...") and a peers frame ("<name>X</name> says,
 * ..."). Scope follows the Containable-wins rule (§7.3): a
 * Containable speaker addresses peers in its environment; a pure-
 * Container speaker (a haunted room) addresses its own contents; a
 * walking-house defers to peers.
 *
 * Scene.send() auto-stamps `commandId` / `causingCommandId` from the
 * active ExecutionContext, so command-attribution flows through
 * speech automatically.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import type { CommandContributions } from '../../api/command';

export interface Vocal {
  say(text: string): void;
}

export function VocalMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class VocalMixin extends Base {
    static _mixinName = 'VocalMixin';

    static commandContributions: CommandContributions = {
      self: ['say.yaml', 'tell.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    say(text: string): void {
      const speaker = this as unknown as Stuff;
      // Run user-supplied speech through the markdown→MML pipeline
      // so `**bold**`, `*italic*`, `` `code` ``, `@name`, and
      // `[label](mudcmd:…)` all work in player chat. Mention scope
      // = the speaker's perceivable neighbors (same room).
      const parsed = Mml.markdownToMml(
        text,
        Mml.perceiverMentionResolver(speaker),
      );
      const speechFragment = Mml.speech(parsed);
      const selfBody = Mml.compose`You say, ${speechFragment}`;
      const peersBody = Mml.compose`${Mml.name(speaker)} says, ${speechFragment}`;

      const scene = MessageApi.scene(speaker)
        .topic(MessageApi.Topics.world.speech.say)
        .toSelf(selfBody)
        .payload({
          speaker: MessageApi.refOf(speaker),
          text,
        });

      if (MixinApi.isContainable(speaker)) {
        scene.toPeers(peersBody);
      } else if (MixinApi.isContainer(speaker)) {
        scene.toContents(peersBody);
      } else {
        throw new Error(
          'VocalMixin requires composition with Container or Containable'
        );
      }

      scene.send();
    }
  };
}
