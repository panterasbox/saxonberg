/**
 * AudibleMixin — the discrete-event sound emitter.
 *
 * Where `SoundSourceMixin` models steady-state sound (a stored dB level
 * the field-read `SoundModality` walk gathers on `listen`), `Audible`
 * models a one-shot event: a whistle blast, a bell, an alarm, a chime.
 * `emit(...)` pushes one attenuated, directional frame — unbidden — to
 * every hearing sensor the sound reaches, same room and adjacent rooms,
 * over the shipped acoustic graph.
 *
 * It is a thin facade: `emit` composes a `Scene` and delegates all the
 * physics to `Scene.toAudible` (the audience-gather walk +
 * `acousticDb` source level + per-recipient threshold). The mixin
 * carries no state; the source level is a per-call argument.
 *
 * Hosts: Things that make a discrete sound (a whistle, a hand-bell), or
 * Locations that chime (a clock tower). Compose over any
 * `Container`/`Containable` Stuff — `Scene.toAudible` resolves the
 * emitter up to its enclosing room, so a carried whistle propagates
 * from the room, not the hand.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

/**
 * A discrete sound event.
 *   - `db` — source sound-pressure level, stamped as `acousticDb` and
 *     consumed by the audience-gather walk (drives reach).
 *   - `character` — short noun phrase ("whistle") used for the faint
 *     directional line in reached-but-farther rooms.
 *   - `description` — optional fuller same-room phrase ("a sharp
 *     whistle"); defaults to `a ${character}`.
 *   - `timbreHook` — optional texture appended to the same-room line
 *     ("rough trill").
 */
export interface AudibleEmitOptions {
  db: number;
  character: string;
  description?: string;
  timbreHook?: string;
}

/** Public shape added by AudibleMixin. */
export interface Audible {
  emit(opts: AudibleEmitOptions): void;
}

/** Topic for unbidden discrete auditory events pushed cross-room. */
const AUDIBLE_TOPIC = 'world.perception.ambient.sound';

function capitalizeFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

export function AudibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AudibleMixin extends Base {
    static _mixinName = 'AudibleMixin';

    emit(opts: AudibleEmitOptions): void {
      const phrase =
        opts.description && opts.description.length > 0
          ? opts.description
          : `a ${opts.character}`;
      const line = opts.timbreHook
        ? `${phrase} — ${opts.timbreHook}`
        : phrase;
      const fullBody = Mml.compose`${capitalizeFirst(line)}.`;
      MessageApi.scene(this as unknown as Stuff)
        .topic(AUDIBLE_TOPIC)
        .modality('hearing')
        .meta({ acousticDb: opts.db })
        .toAudible(fullBody, { descriptor: opts.character })
        .send();
    }
  };
}
