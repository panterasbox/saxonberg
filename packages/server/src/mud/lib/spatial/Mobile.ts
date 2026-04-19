/**
 * MobileMixin - Locomotion for creatures and vehicles.
 *
 * Provides two locomotion primitives:
 *
 * - `traverse(exit)` — movement THROUGH an `Exit`. Announces departure at
 *   the exit's source, calls `ContainmentApi.move()` to update containment,
 *   announces arrival at the destination. This is the path `go` takes.
 *   Contract: the caller has already validated the traversal with
 *   `exit.canTraverse(this)` — `traverse()` does not re-check. That matches
 *   how `Exit.canTraverse()` is documented: scripted / inter-server / admin
 *   movement can bypass the gate on purpose.
 *
 * - `teleport(destination)` — silent instant movement to a container.
 *   No exit, no messaging. Used for login spawning, admin placement, and
 *   anything else that needs to put the mover somewhere without narrating
 *   it.
 *
 * Base-class constraint: the Base must already produce `Stuff & Containable`
 * instances. A mobile thing that cannot be contained is nonsensical — there
 * is nothing for `ContainmentApi.move()` to update. Composing MobileMixin
 * onto a Base that hasn't been through ContainableMixin is a compile error.
 */

import type { MixinConstructor } from '../mixin-types';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Containable } from './Containable';
import type { Exit } from './Exit';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { NavigationApi } from '../../api/navigation';

/**
 * Public shape provided by MobileMixin.
 */
export interface Mobile {
  traverse(exit: Exit): void;
  teleport(destination: Stuff & Container): void;
}

/**
 * Fallback broadcast for traversals whose endpoint isn't an `Exitable` —
 * covered for completeness; in practice every Exit endpoint is Exitable.
 */
function broadcastRawMovement(
  mover: Stuff & Containable,
  container: Stuff & Container,
  customMessage: string | null,
  fallbackTail: () => string
): void {
  const moverName = DescribeApi.getDisplayName(mover, 'Someone');
  const text =
    customMessage !== null
      ? customMessage.replace(/\{mover\}/g, moverName)
      : `<name>${moverName}</name> ${fallbackTail()}`;
  MessageApi.messageContents(
    container,
    { type: 'output', payload: { text } },
    { exclude: mover }
  );
}

export function MobileMixin<TBase extends MixinConstructor<Stuff & Containable>>(Base: TBase) {
  return class MobileMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'MobileMixin';

    /**
     * Commands the mover itself supplies — locomotion and door interaction.
     * Anything with MobileMixin (Avatar today; NPCs, vehicles in future)
     * automatically gains `go`, `open`, and `close`.
     */
    static commandProvider = {
      self: ['go.yaml', 'open.yaml', 'close.yaml'],
      environment: [],
      inventory: [],
      colocated: [],
    };

    /**
     * Traverse an `Exit`: announce departure at source, move, announce
     * arrival at destination. Mover is excluded from both broadcasts.
     *
     * By construction every `Exit` endpoint is an `Exitable` (rooms and
     * vessels), so announce/arrive always flow through `ExitableMixin`'s
     * helpers. If a caller ever hands us a non-Exitable endpoint we fall
     * through to raw `MessageApi.messageContents()` with the exit's
     * `messageOut`/`messageIn` rather than dropping the broadcast.
     *
     * The `this: Stuff & Containable` parameter turns the mixin's base
     * constraint into in-body narrowing — no `as unknown as` hop is needed
     * to hand `this` to APIs that want a Containable mover.
     */
    traverse(this: Stuff & Containable, exit: Exit): void {
      if (MixinApi.isExitable(exit.source)) {
        exit.source.announceDeparture(this, {
          direction: exit.direction,
          message: exit.messageOut,
        });
      } else {
        broadcastRawMovement(this, exit.source, exit.messageOut, () =>
          `leaves to the <direction>${exit.direction}</direction>.`
        );
      }

      ContainmentApi.move(this, exit.destination);

      const fromDirection = NavigationApi.invertDirection(exit.direction);
      if (MixinApi.isExitable(exit.destination)) {
        exit.destination.announceArrival(this, {
          direction: fromDirection,
          message: exit.messageIn,
        });
      } else {
        broadcastRawMovement(this, exit.destination, exit.messageIn, () =>
          fromDirection
            ? `arrives from the <direction>${fromDirection}</direction>.`
            : `arrives.`
        );
      }
    }

    /**
     * Instantly move to a container. No exit, no messaging. Used for
     * login spawning, admin placement, and anything else that should not
     * be narrated.
     */
    teleport(this: Stuff & Containable, destination: Stuff & Container): void {
      ContainmentApi.move(this, destination);
    }
  };
}
