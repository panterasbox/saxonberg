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
import { ReactionApi } from '../../api/reaction';
import { ExecutionContextApi } from '../../api/execution-context';
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
  /**
   * The `commandId` of a prior act this emote is reacting to. When set,
   * the emote rides the reaction layer: it is tallied against that act,
   * may toggle, and — at/above the volume threshold — has its diegetic
   * fan-out suppressed in favour of the batched counter. Absent for an
   * ordinary emote. See docs/subsystems/reactions.md.
   */
  inReactionTo?: string;
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
  emoteFree(text: string, target?: Stuff, inReactionTo?: string): void;
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
      // Per-user reaction display controls. Read client-side from the
      // settings sync and applied to the rendered widget. In v1 these
      // are client-render preferences: the server always emits both the
      // below-threshold line and the above-threshold delta; honoring
      // `muteChannels`/`alwaysAggregate` server-side is a later
      // refinement. See docs/subsystems/reactions.md § Per-user controls.
      {
        key: 'social.react.intensity',
        type: SettingTypes.Enum,
        default: 'normal',
        enumValues: ['off', 'subtle', 'normal', 'vivid'],
        description:
          'Animation intensity for reaction counters/trains. `off` ' +
          'renders a static count; `vivid` plays the full train.',
      },
      {
        key: 'social.react.muteChannels',
        type: SettingTypes.Boolean,
        default: false,
        description:
          'Suppress the reaction counter widget on chat-channel ' +
          'messages (client-side render preference in v1).',
      },
      {
        key: 'social.react.alwaysAggregate',
        type: SettingTypes.Boolean,
        default: false,
        description:
          'Always show the compact counter instead of individual ' +
          'reaction prose lines, even below the volume threshold.',
      },
      {
        key: 'social.react.tagGroup',
        type: SettingTypes.Boolean,
        default: true,
        description:
          'Group reactions into tag buckets (e.g. approval) rather ' +
          'than per-verb buckets in the counter widget.',
      },
      {
        key: 'social.react.collapseThreshold',
        type: SettingTypes.Number,
        default: 25,
        description:
          'Client-side count at which the reaction sample collapses ' +
          'behind a single expandable summary.',
      },
    ];

    static commandContributions: CommandContributions = {
      // `introduce` rides Soul (social expression on every Character),
      // NOT Vocal — you can introduce yourself by sign, gesture, or any
      // modality the audience perceives, not only speech. `react` rides
      // Soul too: a reaction dispatches an emote, so it requires Soul.
      self: ['social/emote.yaml', 'social/introduce.yaml', 'social/react.yaml'],
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
      const parsed = Mml.markdownToMml(
        text.trim(),
        Mml.perceiverMentionResolver(actor),
      );
      const actorName = Mml.name(actor);
      // Single peer body covers BOTH peers and the explicit target —
      // the target's cockpit substitutes "you" for its own `<name>` /
      // `<mention>` match (per-viewer rendering rule). The actor's
      // self body uses the literal "You" prefix because the actor
      // isn't tagged in the body and so doesn't trigger the
      // substitution.
      const selfBody = Mml.compose`You ${parsed}.`;
      const peerBody = Mml.compose`${actorName} ${parsed}.`;
      const out: EmoteBodies = { self: selfBody, peer: peerBody };
      if (target) out.target = peerBody;
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

      // Reaction layer: a scoped emote is tallied against the prior act
      // and — at/above threshold — has its diegetic line suppressed. A
      // NON-reaction emote is itself a reactable act (the else branch);
      // a reaction's own frame is NEVER noted reactable — the
      // regress-stopper.
      if (opts?.inReactionTo !== undefined) {
        const decision = ReactionApi.onScopedEmote({
          reactor: actor,
          inReactionTo: opts.inReactionTo,
          verb: emote.verb,
          ...(emote.emoji !== undefined ? { emoji: emote.emoji } : {}),
          tags: emote.tags,
        });
        if (decision.suppressFanOut) return; // counter only, no line
        scene.meta({ inReactionTo: opts.inReactionTo });
      } else {
        noteEmoteReactable(actor);
      }
      scene.send();
    }

    emoteFree(text: string, target?: Stuff, inReactionTo?: string): void {
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

      if (inReactionTo !== undefined) {
        const decision = ReactionApi.onScopedEmote({
          reactor: actor,
          inReactionTo,
          verb: 'free-form',
          tags: [],
          customText: text,
        });
        if (decision.suppressFanOut) return;
        scene.meta({ inReactionTo });
      } else {
        noteEmoteReactable(actor);
      }
      scene.send();
    }
  };
}

/**
 * Note a non-reaction emote as a reactable act, keyed by the active
 * command's `commandId` and scoped to the actor's co-present circle.
 * Skips command-less background emotes. A reaction's own frame never
 * reaches here — that's the regress-stopper.
 */
function noteEmoteReactable(actor: Stuff): void {
  const commandId = ExecutionContextApi.getCurrentCommandContext()?.commandId;
  if (!commandId) return;
  const scope = ReactionApi.locationScopeFor(actor);
  if (scope) {
    ReactionApi.noteReactableAct({ commandId, subject: actor, scope });
  }
}

// Suppress unused-imports / no-unused-vars for symbols the runtime
// path uses behind narrowing predicates the linter doesn't see.
void Mml;
