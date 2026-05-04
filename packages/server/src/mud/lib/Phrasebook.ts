/**
 * Phrasebook — user-configurable movement-message defaults.
 *
 * Lives at the top of `mud/lib/` rather than in a subsystem folder
 * deliberately: it's a placeholder for future user-settings work.
 * When players can configure their own default departure / arrival
 * prose ("My character always says 'Off I go!' when leaving"), those
 * configured strings load through this module — the room-level
 * override hooks already in MobileMixin take precedence over what's
 * here.
 *
 * Override precedence inside MobileMixin (highest first):
 *   1. `Exit.messageOut` / `Exit.messageIn` (room-author per-exit)
 *   2. Room hooks: `getDepartureMessage` / `getArrivalMessage` /
 *      teleport equivalents
 *   3. Phrasebook (this file) — configurable defaults
 *
 * Today's templates are static strings. Tomorrow they're the user's
 * preference, looked up by viewer/actor identity. The accessor
 * signatures stay the same; only this file's internals change.
 *
 * Out of scope: prose for one-shot controller output (look,
 * inventory, get/drop, open/close, etc.) lives where the controller
 * composes it. Most controller prose has no use for configuration —
 * inline `Mml.compose` is fine.
 */

import type { Stuff } from './stuff/Stuff';
import type { Exit } from './spatial/Exit';
import { Mml } from '../api/mml';
import { NavigationApi } from '../api/navigation';

const templates = {
  movement: {
    departSelf:        'You leave to the {direction}.',
    departPeers:       '{mover} leaves to the {direction}.',
    arriveSelf:        'You arrive from the {direction}.',
    arrivePeers:       '{mover} arrives from the {direction}.',
    arriveSelfBland:   'You arrive.',
    arrivePeersBland:  '{mover} arrives.',
    teleportOutSelf:   'The world dissolves around you.',
    teleportOutPeers:  '{mover} vanishes.',
    teleportInSelf:    'You materialize.',
    teleportInPeers:   '{mover} appears out of nowhere.',
  },
} as const;

function arriveDirection(exit: Exit): string | undefined {
  return exit.inverse?.direction ?? NavigationApi.invertDirection(exit.direction);
}

export const Phrasebook = {
  movement: {
    departSelf(_mover: Stuff, exit: Exit): Mml {
      return Mml.format(templates.movement.departSelf, {
        direction: Mml.direction(exit.direction),
      });
    },
    departPeers(mover: Stuff, exit: Exit): Mml {
      return Mml.format(templates.movement.departPeers, {
        mover: Mml.name(mover),
        direction: Mml.direction(exit.direction),
      });
    },
    arriveSelf(_mover: Stuff, exit: Exit): Mml {
      const dir = arriveDirection(exit);
      if (!dir) {
        return Mml.format(templates.movement.arriveSelfBland, {});
      }
      return Mml.format(templates.movement.arriveSelf, {
        direction: Mml.direction(dir),
      });
    },
    arrivePeers(mover: Stuff, exit: Exit): Mml {
      const dir = arriveDirection(exit);
      if (!dir) {
        return Mml.format(templates.movement.arrivePeersBland, {
          mover: Mml.name(mover),
        });
      }
      return Mml.format(templates.movement.arrivePeers, {
        mover: Mml.name(mover),
        direction: Mml.direction(dir),
      });
    },
    teleportOutSelf(_mover: Stuff): Mml {
      return Mml.format(templates.movement.teleportOutSelf, {});
    },
    teleportOutPeers(mover: Stuff): Mml {
      return Mml.format(templates.movement.teleportOutPeers, {
        mover: Mml.name(mover),
      });
    },
    teleportInSelf(): Mml {
      return Mml.format(templates.movement.teleportInSelf, {});
    },
    teleportInPeers(mover: Stuff): Mml {
      return Mml.format(templates.movement.teleportInPeers, {
        mover: Mml.name(mover),
      });
    },
  },
} as const;
