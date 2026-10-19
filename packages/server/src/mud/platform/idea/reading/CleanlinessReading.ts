/**
 * CleanlinessReading — `analyze cleanliness <thing>`: how clean a thing is,
 * where it is not, and what would make it so (cleanliness B57).
 *
 * ⭐ **Competence resolves DETAIL, never ACCESS.** Anyone reads what `look`
 * already prints (*soiled, muddy and greasy*); the `domestic-services` band
 * unfolds the rest:
 *
 *   - untrained — the band and its kinds, and whether it is wet;
 *   - novice — where: site by site; and which stains have SET;
 *   - competent — what will lift each kind, read off the dirt's own row
 *     (`Soilable.liftedBy`): derivable, so a player who learns that soap
 *     answers a film and only a bleach a set stain can predict it;
 *   - proficient — what was DONE to it: the last wash and the last heat
 *     hold, as the evidence a nurse reads (*boiled, and not handled since —
 *     fit to dress a wound*);
 *   - expert — how long ago.
 *
 * ⛔ Never the microbes. Contamination is silent by doctrine (spoilage.md:
 * no sense reports it), and `cleanTier()` consults it — so this reading
 * speaks only from the PROCESS record (`getHeatStamp` / `getWashStamp`),
 * which a touch clears. An eye rung only: no instrument tells you a cloth
 * was boiled.
 *
 * See [docs/subsystems/instrumentation.md] and [docs/subsystems/cleanliness.md].
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tooled';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Soilable } from '../../../lib/cleanliness/Soilable';
import type { CleanserAction } from '../Cleanser';
import { MixinApi } from '../../../api/mixin';
import { GrammarApi } from '../../../api/grammar';
import { WorldClockApi } from '../../../api/worldclock';
import { Mml } from '../../../api/mml';

/** A cleanser mechanism, as a person who does the washing would say it. */
const ACTION_WORDS: Record<CleanserAction, string> = {
  surfactant: 'soap',
  'alkali-mild': 'washing soda',
  'alkali-strong': 'lye',
  'acid-mild': 'vinegar',
  'acid-strong': 'a strong acid',
  solvent: 'a spirit',
  absorbent: "chalk or fuller's earth",
  abrasive: 'a scrub with sand',
  'oxidiser-slow': 'the sun, on the grass',
  oxidiser: 'a bleach',
};

export default class CleanlinessReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    if (!subject || !MixinApi.isSoilable(subject)) {
      this.decline(context, Mml.compose`That isn't anything that gets dirty.`, 'not-soilable');
      return;
    }
    const thing: Stuff & Soilable = subject;
    const at = (b: CompetenceBandName): boolean => CompetenceBand.atOrAbove(band, b);
    const lines: Mml[] = [];

    // untrained — what anyone sees: the band, its kinds, and the wet.
    const phrase = thing.soilPhrase();
    lines.push(Mml.compose`${GrammarApi.cap(phrase ? `it is ${phrase}.` : 'it is clean to look at.')}`);
    if (MixinApi.isWet(thing) && thing.getWetnessBand() !== 'dry') {
      lines.push(Mml.compose`${GrammarApi.cap(`it is ${thing.getWetnessBand()}.`)}`);
    }

    // novice — where, and what has set.
    const sites = thing.soilSites().filter((s) => thing.soilPhrase(s) !== '');
    if (at('novice') && sites.length > 0 && !(sites.length === 1 && sites[0] === '')) {
      for (const site of sites) {
        lines.push(Mml.compose`  ${GrammarApi.cap(this.siteWord(site))}: ${thing.soilPhrase(site)}.`);
      }
    }
    if (at('novice')) {
      for (const site of sites) {
        for (const kind of thing.soilKinds(site)) {
          if (thing.liftedBy(kind, site).set) {
            lines.push(Mml.compose`The ${kind} has set${site ? ` on the ${this.siteWord(site)}` : ''}.`);
          }
        }
      }
    }

    // competent — what will lift each kind (the dirt row's own answer).
    if (at('competent')) {
      const said = new Set<string>();
      for (const site of sites) {
        for (const kind of thing.soilKinds(site)) {
          const lift = thing.liftedBy(kind, site);
          const key = `${kind}|${lift.set}`;
          if (said.has(key)) continue;
          said.add(key);
          lines.push(Mml.compose`${this.liftLine(kind, lift.set, lift.waterAlone, lift.actions)}`);
        }
      }
    }

    // proficient — what was DONE to it, as evidence (never the microbes).
    if (at('proficient')) {
      const heat = thing.getHeatStamp();
      const wash = thing.getWashStamp();
      if (heat && heat.peakK >= 433 && heat.heldS >= 60) {
        lines.push(Mml.compose`It has been through the flame and not handled since — fit for a wound.`);
      } else if (heat && heat.peakK >= 373 && heat.heldS >= 300) {
        lines.push(Mml.compose`It has been boiled and not handled since — fit to dress a wound.`);
      } else if (wash && wash.waterK >= 333 && wash.action !== null) {
        lines.push(Mml.compose`It was washed hot, with ${ACTION_WORDS[wash.action] ?? 'a cleanser'} — fit for a kitchen.`);
      } else if (wash) {
        lines.push(Mml.compose`It has been washed, but not hot enough to trust with food or a wound.`);
      } else {
        lines.push(Mml.compose`Nothing says it has ever been washed.`);
      }

      // expert — how long ago.
      if (at('expert')) {
        const last = Math.max(heat?.atS ?? 0, wash?.atS ?? 0);
        if (last > 0) {
          const hours = (WorldClockApi.getNow().rawValue() - last) / 3600;
          lines.push(Mml.compose`That was ${this.agoWord(hours)}.`);
        }
      }
    }

    let body = Mml.compose``;
    for (const line of lines) body = Mml.compose`${body}${line}\n`;
    this.report(context, body);
  }

  /** `body.arm.left.hand` → `left hand`; `''` → `the whole of it`. */
  private siteWord(site: string): string {
    if (site === '') return 'all over';
    const parts = site.split('.');
    const leaf = parts[parts.length - 1] ?? site;
    const side = parts[parts.length - 2];
    return side === 'left' || side === 'right' ? `${side} ${leaf}` : leaf;
  }

  private liftLine(
    kind: string,
    set: boolean,
    waterAlone: boolean,
    actions: readonly CleanserAction[],
  ): string {
    const words = [...new Set(actions.map((a) => ACTION_WORDS[a]))];
    const what = set ? `The set ${kind}` : `The ${kind}`;
    if (words.length === 0) {
      return `${what} will not come out with anything you have.`;
    }
    const list = this.orList(words);
    if (waterAlone) return `${what} will mostly come out in water; ${list} will take the rest.`;
    return set ? `${what} answers only to ${list}.` : `${what} wants ${list}; water alone will not shift it.`;
  }

  /** `soap`, `soap or lye`, `soap, soda or lye`. */
  private orList(words: readonly string[]): string {
    if (words.length <= 1) return words[0] ?? '';
    return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
  }

  private agoWord(hours: number): string {
    if (hours < 1) return 'within the hour';
    if (hours < 24) return `about ${GrammarApi.inWords(Math.round(hours))} hours ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'about a day ago' : `about ${GrammarApi.inWords(days)} days ago`;
  }
}
