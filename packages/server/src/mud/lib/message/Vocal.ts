/**
 * VocalMixin — speech for sentient beings.
 *
 * `say(text, target?)` composes a Scene at `speech.vocal`. Default
 * shape (no target): self frame "You say, ...", peers frame "<name>X</name>
 * says, ...". With `--to <target>`: self "You say to <name>Y</name>,
 * ...", peers "<name>X</name> says to <name>Y</name>, ...", and a
 * target frame "<name>X</name> says to you, ...".
 *
 * `whisper(text, target?)` rides the same Scene scaffolding but stamps
 * a lower `meta.acousticDb` for short-reach acoustic propagation. The
 * topic is `speech.vocal`. Always-directed: a bare `whisper hi`
 * with no target falls back to the room (rare; the verb's target arg is
 * optional but expected).
 *
 * `shout(text, target?)` is the loud cousin — `speech.vocal` topic,
 * high `meta.acousticDb` so the sound walk can propagate across rooms.
 *
 * All three stamp `meta.modality = 'hearing'` for sensorium gating.
 *
 * Scope follows the Containable-wins rule (§7.3): a Containable speaker
 * addresses peers in its environment; a pure-Container speaker (a
 * haunted room) addresses its own contents; a walking-house defers to
 * peers.
 *
 * Scene.send() auto-stamps `commandId` / `causingCommandId` from the
 * active ExecutionContext, so command-attribution flows through speech
 * automatically.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { ReactionApi } from '../../api/reaction';
import { ExecutionContextApi } from '../../api/execution-context';
import type { CommandContributions } from '../../api/command';

export interface Vocal {
  say(text: string, target?: Stuff): void;
  whisper(text: string, target?: Stuff): void;
  shout(text: string, target?: Stuff): void;
}

/**
 * Per-verb acoustic amplitude in decibels, stamped on the frame's
 * `meta.acousticDb` for the sound-propagation walk's reach computation.
 * Reach is determined elsewhere (the senses substrate); this is just
 * the source level.
 *
 * v1 ceiling: these are flat per-verb scalars — every speaker shouts
 * at the same volume regardless of size, condition, or skill. The
 * vitals substrate (deferred) is the natural seam to vary them per-
 * speaker (constitution / oratory / projection / current hp / fatigue);
 * when vitals lands, `meta.acousticDb` becomes a computed value rather
 * than a constant lookup. Until then, the same volume curve applies
 * to everyone.
 */
const DB = {
  whisper: 30,
  say: 60,
  shout: 90,
} as const;

export function VocalMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class VocalMixin extends Base {
    static _mixinName = 'VocalMixin';

    static commandContributions: CommandContributions = {
      // `tell` moved to `AetherMixin` — non-acoustic comms ride
      // the Aether network, not the vocal apparatus. Vocal stays
      // the acoustic transport (say + whisper + shout).
      self: ['social/say.yaml', 'social/whisper.yaml', 'social/shout.yaml'],
      peers: [],
      environment: [],
    };

    say(text: string, target?: Stuff): void {
      vocalEmit(this as unknown as Stuff, text, {
        topic: 'speech.vocal',
        verb: 'say',
        acousticDb: DB.say,
        target,
      });
    }

    whisper(text: string, target?: Stuff): void {
      vocalEmit(this as unknown as Stuff, text, {
        topic: 'speech.vocal',
        verb: 'whisper',
        acousticDb: DB.whisper,
        target,
      });
    }

    shout(text: string, target?: Stuff): void {
      vocalEmit(this as unknown as Stuff, text, {
        topic: 'speech.vocal',
        verb: 'shout',
        acousticDb: DB.shout,
        target,
      });
    }
  };
}

interface VocalEmitOptions {
  topic: string;
  verb: 'say' | 'whisper' | 'shout';
  acousticDb: number;
  target?: Stuff;
}

/**
 * Shared body composition + Scene send for the three acoustic verbs.
 * The verb's word ("say" / "whisper" / "shout") drives the prose; the
 * dB and topic come from the calling method.
 */
function vocalEmit(
  speaker: Stuff,
  text: string,
  opts: VocalEmitOptions,
): void {
  const parsed = Mml.markdownToMml(
    text,
    Mml.perceiverMentionResolver(speaker),
  );
  const speechFragment = Mml.speech(parsed);
  const verbSelf = opts.verb;
  const verbThird = opts.verb === 'say' ? 'says' : `${opts.verb}s`;

  const target = opts.target;
  let selfBody: Mml;
  let peersBody: Mml;
  let targetBody: Mml | undefined;
  if (target) {
    const targetName = Mml.name(target);
    selfBody = Mml.compose`You ${verbSelf} to ${targetName}, ${speechFragment}`;
    peersBody = Mml.compose`${Mml.name(speaker)} ${verbThird} to ${targetName}, ${speechFragment}`;
    targetBody = Mml.compose`${Mml.name(speaker)} ${verbThird} to you, ${speechFragment}`;
  } else {
    selfBody = Mml.compose`You ${verbSelf}, ${speechFragment}`;
    peersBody = Mml.compose`${Mml.name(speaker)} ${verbThird}, ${speechFragment}`;
  }

  const scene = MessageApi.scene(speaker)
    .topic(opts.topic)
    .modality('hearing')
    .toSelf(selfBody)
    .meta({ acousticDb: opts.acousticDb })
    .payload({
      speaker: MessageApi.refOf(speaker),
      text,
      ...(target ? { target: MessageApi.refOf(target) } : {}),
    });

  if (target && targetBody) {
    scene.toTarget(target, targetBody);
  }

  if (MixinApi.isContainable(speaker)) {
    scene.toPeers(peersBody);
  } else if (MixinApi.isContainer(speaker)) {
    scene.toContents(peersBody);
  } else {
    throw new Error(
      'VocalMixin requires composition with Container or Containable'
    );
  }

  // Reactability capture: say/whisper/shout are reactable acts. A
  // whisper is just as reactable as a say/shout — it fans a peers frame
  // to in-range overhearers who share the one commandId. Skip
  // command-less background speech (no commandId → not reactable).
  const commandId = ExecutionContextApi.getCurrentCommandContext()?.commandId;
  if (commandId) {
    const scope = ReactionApi.locationScopeFor(speaker);
    if (scope) {
      ReactionApi.noteReactableAct({ commandId, subject: speaker, scope });
    }
  }

  scene.send();
}
