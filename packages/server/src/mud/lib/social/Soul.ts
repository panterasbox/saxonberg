/**
 * SoulMixin — expressive (emote) capability for sentient beings.
 *
 * Parallel to `VocalMixin` but for the emote channel: speech rides
 * acoustic propagation; emotes ride the ESP modality (`'emotive-esp'`).
 * `SoulMixin` composes onto every `Character` (Avatar + NPC) — emoting
 * is innate, not augment-gated.
 *
 * The mixin owns rendering AND verb-side send for the in-room cases.
 * Channel-routed and DM-handle-routed emotes call `renderEmote` /
 * `renderFreeForm` to get per-audience Mml triples, then compose their
 * own Scene — same rendering, different audience routing. The mixin is
 * NOT a router; the controllers / router branches decide where the
 * frames go.
 *
 * NOT for: speech (use `VocalMixin`); aether comms (use `AetherMixin`);
 * sensorium gating (the `'emotive-esp'` modality stamp + the shipped
 * `SensorMixin.filterMessage` do that automatically — implantless
 * recipients drop the frame).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { DescribeApi } from '../../api/describe';
import type {
  CommandContributions,
} from '../../api/command';
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from '../shell/Environment';
import type { Emote } from './Emote';
import { EmoteGrammarRunner } from './EmoteGrammar';

export interface EmoteOptions {
  target?: Stuff;
  fills?: Record<string, string>;
}

export interface EmoteBodies {
  self: Mml;
  peer: Mml;
  target?: Mml;
}

export interface Soul {
  /** Per-audience prose for a catalog emote. */
  renderEmote(emote: Emote, opts?: EmoteOptions): EmoteBodies;
  /** Per-audience prose for a free-form emote body. */
  renderFreeForm(text: string, target?: Stuff): EmoteBodies;
  /** In-room catalog emote: render + compose Scene + send. */
  emote(emote: Emote, opts?: EmoteOptions): void;
  /** In-room free-form emote: render + compose Scene + send. */
  emoteFree(text: string, target?: Stuff): void;
}

export function SoulMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SoulMixin extends Base implements Soul {
    static _mixinName = 'SoulMixin';

    /**
     * Schema entry for the Layer-2 emoji-render preference. Server emits
     * both the glyph (if any) AND the prose body; client decides per
     * setting. Per-channel granularity is reserved (`text | emoji | both`
     * applies globally in v1; per-channel tuning lands when the chat
     * styling surface grows).
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'social.emote.render',
        type: SettingTypes.Enum,
        default: 'both',
        enumValues: ['text', 'emoji', 'both'],
        description:
          'How emote frames render in the client. `text` = prose only; ' +
          '`emoji` = glyph only (with prose fallback if no glyph); ' +
          '`both` = glyph alongside prose. The server emits both shapes ' +
          'on every frame; the client picks.',
      },
    ];

    static commandContributions: CommandContributions = {
      self: ['emote.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    renderEmote(emote: Emote, opts?: EmoteOptions): EmoteBodies {
      const actor = this as unknown as Stuff;
      const bound = {
        target: opts?.target ?? null,
        fills: opts?.fills ?? {},
      };
      const out: EmoteBodies = {
        self: EmoteGrammarRunner.render(emote, bound, 'self', actor),
        peer: EmoteGrammarRunner.render(emote, bound, 'peer', actor),
      };
      if (bound.target) {
        out.target = EmoteGrammarRunner.render(emote, bound, 'target', actor);
      }
      return out;
    }

    renderFreeForm(text: string, target?: Stuff): EmoteBodies {
      const actor = this as unknown as Stuff;
      const safe = text.trim();
      const actorName = Mml.name(actor);
      const selfBody = target
        ? Mml.compose`You ${safe} (at ${Mml.name(target)}).`
        : Mml.compose`You ${safe}.`;
      const peerBody = target
        ? Mml.compose`${actorName} ${safe} (at ${Mml.name(target)}).`
        : Mml.compose`${actorName} ${safe}.`;
      const out: EmoteBodies = { self: selfBody, peer: peerBody };
      if (target) {
        out.target = Mml.compose`${actorName} ${safe} at you.`;
      }
      return out;
    }

    emote(emote: Emote, opts?: EmoteOptions): void {
      const actor = this as unknown as Stuff;
      const bodies = this.renderEmote(emote, opts);
      const scene = MessageApi.scene(actor)
        .topic('world.expression.emote')
        .modality('emotive-esp')
        .toSelf(bodies.self)
        .payload({
          verb: emote.verb,
          emoji: emote.emoji,
          tags: emote.tags,
        });

      if (opts?.target && bodies.target) {
        scene.toTarget(opts.target, bodies.target);
      }

      if (MixinApi.isContainable(actor)) {
        scene.toPeers(bodies.peer);
      } else if (MixinApi.isContainer(actor)) {
        scene.toContents(bodies.peer);
      } else {
        throw new Error(
          'SoulMixin requires composition with Container or Containable for in-room emote',
        );
      }
      scene.send();
    }

    emoteFree(text: string, target?: Stuff): void {
      const actor = this as unknown as Stuff;
      const bodies = this.renderFreeForm(text, target);
      const scene = MessageApi.scene(actor)
        .topic('world.expression.emote')
        .modality('emotive-esp')
        .toSelf(bodies.self)
        .payload({ freeForm: true, text });

      if (target && bodies.target) {
        scene.toTarget(target, bodies.target);
      }

      if (MixinApi.isContainable(actor)) {
        scene.toPeers(bodies.peer);
      } else if (MixinApi.isContainer(actor)) {
        scene.toContents(bodies.peer);
      } else {
        throw new Error(
          'SoulMixin requires composition with Container or Containable for in-room emote',
        );
      }
      scene.send();
    }
  };
}

// Suppress unused-imports / no-unused-vars for symbols the runtime
// path uses behind narrowing predicates the linter doesn't see.
void DescribeApi;
void Mml;
