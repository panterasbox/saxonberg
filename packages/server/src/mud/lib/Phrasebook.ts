/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                        ⚠ TEMPORARY ⚠                              ║
 * ║                                                                  ║
 * ║  Every prose string in the messaging system, in one place. This  ║
 * ║  file deliberately stands out — it sits at the top of `mud/lib/` ║
 * ║  rather than in a subsystem folder so it's grep-obvious and      ║
 * ║  gets replaced as soon as we have a real template store.         ║
 * ║                                                                  ║
 * ║  Eventual plan:                                                  ║
 * ║    • templates move to a database collection (or YAML files);    ║
 * ║    • `Phrasebook.<topic>.<key>(...)` accessors stay put;         ║
 * ║    • `PhrasebookApi.format` switches its input source from the   ║
 * ║      inline `templates` constant below to a registry lookup;     ║
 * ║    • locale dispatch slots in at the same point.                 ║
 * ║                                                                  ║
 * ║  Until then, this is the single "edit prose here" file.          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Conventions:
 *   - Template placeholders are `{name}` and substitute via
 *     `PhrasebookApi.format`.
 *   - Mml fragments emit verbatim; raw strings/numbers/booleans are
 *     escaped. Same rules `Mml.compose` applies.
 *   - Each accessor returns a single `Mml`. Callers pass the result
 *     into `Scene.toSelf` / `toPeers` / `toContents` directly.
 */

import type { Stuff } from './stuff/Stuff';
import type { Exit } from './spatial/Exit';
import { Mml } from '../api/mml';
import { PhrasebookApi } from '../api/phrasebook';
import { NavigationApi } from '../api/navigation';

// ───────────────────── Templates ─────────────────────

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
  speech: {
    saySelf:    'You say, {speech}',
    sayPeers:   '{speaker} says, {speech}',
    tellSelf:   'You tell {target}, {speech}',
    tellTarget: '{speaker} tells you, {speech}',
  },
  inventory: {
    pickUpSelf:   'You pick up {item}.',
    pickUpPeers:  '{actor} picks up {item}.',
    dropSelf:     'You drop {item}.',
    dropPeers:    '{actor} drops {item}.',
    listEmpty:    '\nYou are not carrying anything.\n',
    listSome:     '\nYou are carrying: {list}.\n',
  },
  sealable: {
    openSelf:    'You open {object}.',
    openPeers:   '{actor} opens {object}.',
    closeSelf:   'You close {object}.',
    closePeers:  '{actor} closes {object}.',
  },
  perception: {
    locationWithExits:   '\n{location}\n\n{description}\n\n{exits}\n',
    locationBare:        '\n{location}\n\n{description}\n',
    target:              '\n{name}\n\n{description}\n',
    exitsLine:           '<exits>Obvious exits: {list}.</exits>',
    nothingSpecial:      'You see nothing special.',
  },
  connection: {
    welcome:       'Welcome back, {name}!',
    nowhere:       'You are nowhere.',
  },
  player: {
    nameSet:       '\nYour name is now {name}.\n',
    pronounsSet:   '\nYour pronouns are now {pronouns}.\n',
    settingsBlock: '\nPlayer Character Settings:\n\n  Name:     {name}\n  Pronouns: {pronouns}\n\n',
    notAPlayer:    'only a player character can use the player command',
    invalidPronouns: 'invalid pronouns. valid: {options}',
  },
} as const;

// ───────────────────── Accessors ─────────────────────

function arriveDirection(exit: Exit): string | undefined {
  return exit.inverse?.direction ?? NavigationApi.invertDirection(exit.direction);
}

export const Phrasebook = {
  movement: {
    departSelf(_mover: Stuff, exit: Exit): Mml {
      return PhrasebookApi.format(templates.movement.departSelf, {
        direction: Mml.direction(exit.direction),
      });
    },
    departPeers(mover: Stuff, exit: Exit): Mml {
      return PhrasebookApi.format(templates.movement.departPeers, {
        mover: Mml.name(mover),
        direction: Mml.direction(exit.direction),
      });
    },
    arriveSelf(_mover: Stuff, exit: Exit): Mml {
      const dir = arriveDirection(exit);
      if (!dir) {
        return PhrasebookApi.format(templates.movement.arriveSelfBland, {});
      }
      return PhrasebookApi.format(templates.movement.arriveSelf, {
        direction: Mml.direction(dir),
      });
    },
    arrivePeers(mover: Stuff, exit: Exit): Mml {
      const dir = arriveDirection(exit);
      if (!dir) {
        return PhrasebookApi.format(templates.movement.arrivePeersBland, {
          mover: Mml.name(mover),
        });
      }
      return PhrasebookApi.format(templates.movement.arrivePeers, {
        mover: Mml.name(mover),
        direction: Mml.direction(dir),
      });
    },
    teleportOutSelf(_mover: Stuff): Mml {
      return PhrasebookApi.format(templates.movement.teleportOutSelf, {});
    },
    teleportOutPeers(mover: Stuff): Mml {
      return PhrasebookApi.format(templates.movement.teleportOutPeers, {
        mover: Mml.name(mover),
      });
    },
    teleportInSelf(): Mml {
      return PhrasebookApi.format(templates.movement.teleportInSelf, {});
    },
    teleportInPeers(mover: Stuff): Mml {
      return PhrasebookApi.format(templates.movement.teleportInPeers, {
        mover: Mml.name(mover),
      });
    },
  },

  speech: {
    saySelf(text: string): Mml {
      return PhrasebookApi.format(templates.speech.saySelf, {
        speech: Mml.speech(text),
      });
    },
    sayPeers(speaker: Stuff, text: string): Mml {
      return PhrasebookApi.format(templates.speech.sayPeers, {
        speaker: Mml.name(speaker),
        speech: Mml.speech(text),
      });
    },
    tellSelf(target: Stuff, text: string): Mml {
      return PhrasebookApi.format(templates.speech.tellSelf, {
        target: Mml.name(target),
        speech: Mml.speech(text),
      });
    },
    tellTarget(speaker: Stuff, text: string): Mml {
      return PhrasebookApi.format(templates.speech.tellTarget, {
        speaker: Mml.name(speaker),
        speech: Mml.speech(text),
      });
    },
  },

  inventory: {
    pickUpSelf(item: Stuff): Mml {
      return PhrasebookApi.format(templates.inventory.pickUpSelf, {
        item: Mml.item(item),
      });
    },
    pickUpPeers(actor: Stuff, item: Stuff): Mml {
      return PhrasebookApi.format(templates.inventory.pickUpPeers, {
        actor: Mml.name(actor),
        item: Mml.item(item),
      });
    },
    dropSelf(item: Stuff): Mml {
      return PhrasebookApi.format(templates.inventory.dropSelf, {
        item: Mml.item(item),
      });
    },
    dropPeers(actor: Stuff, item: Stuff): Mml {
      return PhrasebookApi.format(templates.inventory.dropPeers, {
        actor: Mml.name(actor),
        item: Mml.item(item),
      });
    },
    listEmpty(): Mml {
      return PhrasebookApi.format(templates.inventory.listEmpty, {});
    },
    listSome(items: Mml[]): Mml {
      return PhrasebookApi.format(templates.inventory.listSome, {
        list: Mml.list(items),
      });
    },
  },

  sealable: {
    openSelf(target: Stuff): Mml {
      return PhrasebookApi.format(templates.sealable.openSelf, {
        object: Mml.object(target),
      });
    },
    openPeers(actor: Stuff, target: Stuff): Mml {
      return PhrasebookApi.format(templates.sealable.openPeers, {
        actor: Mml.name(actor),
        object: Mml.object(target),
      });
    },
    closeSelf(target: Stuff): Mml {
      return PhrasebookApi.format(templates.sealable.closeSelf, {
        object: Mml.object(target),
      });
    },
    closePeers(actor: Stuff, target: Stuff): Mml {
      return PhrasebookApi.format(templates.sealable.closePeers, {
        actor: Mml.name(actor),
        object: Mml.object(target),
      });
    },
  },

  perception: {
    location(location: Stuff, description: string, exitsLine: Mml | null): Mml {
      const tpl = exitsLine
        ? templates.perception.locationWithExits
        : templates.perception.locationBare;
      return PhrasebookApi.format(tpl, {
        location: Mml.location(location),
        description: Mml.fromMarkup(description),
        exits: exitsLine ?? '',
      });
    },
    target(target: Stuff, description: string): Mml {
      return PhrasebookApi.format(templates.perception.target, {
        name: Mml.name(target),
        description: Mml.fromMarkup(description),
      });
    },
    exitsLine(items: Mml[]): Mml {
      return PhrasebookApi.format(templates.perception.exitsLine, {
        list: Mml.list(items),
      });
    },
    nothingSpecial(): string {
      // Plain string — used by callers that need to feed a description
      // string into `perception.location` / `perception.target`.
      return templates.perception.nothingSpecial;
    },
  },

  connection: {
    welcome(actor: Stuff): Mml {
      return PhrasebookApi.format(templates.connection.welcome, {
        name: Mml.name(actor),
      });
    },
    nowhere(): Mml {
      return PhrasebookApi.format(templates.connection.nowhere, {});
    },
  },

  player: {
    nameSet(actor: Stuff): Mml {
      return PhrasebookApi.format(templates.player.nameSet, {
        name: Mml.name(actor),
      });
    },
    pronounsSet(pronouns: string): Mml {
      return PhrasebookApi.format(templates.player.pronounsSet, {
        pronouns,
      });
    },
    settingsBlock(actor: Stuff & { fullName: string; pronouns: string }): Mml {
      return PhrasebookApi.format(templates.player.settingsBlock, {
        name: actor.fullName,
        pronouns: actor.pronouns,
      });
    },
    notAPlayer(): string {
      return templates.player.notAPlayer;
    },
    invalidPronouns(options: string[]): string {
      // Returns a plain string for the `summary` field on
      // CommandResult; auto-emit handles delivery to the actor.
      return templates.player.invalidPronouns.replace(
        '{options}',
        options.join(', ')
      );
    },
  },
} as const;
