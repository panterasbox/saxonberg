/**
 * LivestockTapController — ⭐ a take from a head of stock, in the animal's
 * own voice (controllers-are-io D4): `milk`, `shear` and `gather` differ by
 * the tap they name, and what is said about the animal is said here, once.
 * The animal answers facts (`Livestock`); it never spoke.
 *
 * ⚠ Her refusals carry **no digit**, because a shut tap is something you
 * read off the animal rather than a figure you are quoted. ⭐ The numbers
 * belong to the landing — you WEIGH a fleece and you MEASURE milk, so a
 * figure is honest at the moment of the act in a way it never is in a
 * refusal. ⚠ And milk reports **completeness**: a pail too small is the
 * player's own information, and it is the one line in the build that
 * teaches what a vessel is for.
 *
 * Not referenced by any YAML — a base class only.
 */

import { TapActController, type TapWords } from '@saxonberg/server/mud/platform/idea/cmd/inventory/TapActController';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Producing } from '@saxonberg/server/mud/lib/husbandry/Producing';
import Livestock from '../agent/Livestock';

export abstract class LivestockTapController extends TapActController {
  /** One decimal place — you weigh a fleece; you do not assay it. */
  protected static round1(v: number): string {
    return String(Math.round(v * 10) / 10);
  }

  protected override tapWords(giver: Stuff, subject: Stuff & Producing): TapWords {
    const base = super.tapWords(giver, subject);
    /** How she stood for it — read as the take lands. */
    const handling = (): string =>
      subject instanceof Livestock ? GrammarApi.cap(subject.handlingPhrase()) : '';
    return {
      ...base,
      beginSelf: (b) => {
        switch (b.key) {
          case 'milk':
            return Mml.compose`You set the pail under her, settle in against her flank, and start.`;
          case 'wool':
            return Mml.compose`You get her off her feet and set to with the shears.`;
          case 'eggs':
            return Mml.compose`You start feeling under the straw.`;
          default:
            return base.beginSelf(b);
        }
      },
      onRefused: (out) => {
        switch (out.reason) {
          case 'season-dried-off':
            return Mml.compose`She has dried off for this season. Nothing will come of it until she freshens again.`;
          case 'wrong-sex':
          case 'season-wrong-sex':
            // ⭐ (dairy D12) The other sex's tap, in the animal's own terms.
            if (out.facts.key === 'milk') return Mml.compose`He has nothing to give you — a male does not milk.`;
            if (out.facts.key === 'eggs') return Mml.compose`A cockerel lays nothing, however long you feel under him.`;
            return base.onRefused(out);
          case 'season-brooding':
            return Mml.compose`She is sitting tight on the clutch and will not be shifted. Take the eggs and she will start again.`;
          case 'season-before-season':
            return out.facts.key === 'eggs'
              ? Mml.compose`The days are too short for laying. There is nothing wrong with the bird.`
              : base.onRefused(out);
          case 'season-after-season':
            return out.facts.key === 'eggs'
              ? Mml.compose`The laying season is over. She will come back to it as the days lengthen.`
              : base.onRefused(out);
          case 'nothing-standing':
            if (out.facts.key === 'milk') {
              // ⚠ Dried off is not "not yet": nobody milked her through her
              // window and she stopped for this lactation (taps: an absence
              // costs a season). Telling the player to come back later sends
              // them back to an udder that will not fill until she calves.
              return out.facts.driedOff
                ? Mml.compose`She has dried off — nobody milked her, and she has stopped. She will not come back into milk until she calves again.`
                : Mml.compose`There is nothing in her yet. Come back later.`;
            }
            if (out.facts.key === 'wool') return Mml.compose`There is nothing on it worth the shears yet.`;
            if (out.facts.key === 'eggs') return Mml.compose`Nothing in the nest.`;
            return base.onRefused(out);
          default:
            return base.onRefused(out);
        }
      },
      onDone: (d) => {
        if (d.kind !== 'drawn') return base.onDone?.(d) ?? null;
        if (d.key === 'milk') {
          if (d.kept <= 0) {
            return { self: Mml.compose`She stands for it, and it all goes on the floor — you had nothing to catch it in.` };
          }
          if (d.kept < d.drawn - 0.05) {
            return {
              self: Mml.compose`You milk her out and the pail fills before she is done; ${LivestockTapController.round1(d.drawn - d.kept)} litres go on the straw. ${handling()}.`,
            };
          }
          return { self: Mml.compose`You milk her right out — ${LivestockTapController.round1(d.kept)} litres, and she stands for it. ${handling()}.` };
        }
        if (d.key === 'wool') {
          return {
            self: d.overgrown === true
              ? Mml.compose`It comes off in one heavy matted piece — ${LivestockTapController.round1(d.drawn)} kilos of it, and half of that is second cuts and dung. It should have come off a year ago.`
              : Mml.compose`The fleece comes off clean in a single piece, ${LivestockTapController.round1(d.drawn)} kilos, and the animal walks away looking half the size.`,
          };
        }
        if (d.key === 'eggs') {
          const n = d.minted.length;
          if (n <= 0) return { self: Mml.compose`Nothing comes of it.` };
          return {
            self: n === 1
              ? Mml.compose`You come away with one egg, still warm.`
              : Mml.compose`You come away with ${String(n)} eggs, still warm.`,
          };
        }
        return base.onDone?.(d) ?? null;
      },
    };
  }
}
