/**
 * Scroll — a single-use **focus** you read, and reading it is the
 * trigger.
 *
 * D5's consumable class in its purest form: it supplies one packaged
 * act, and the endpoint is the reader. A scroll is a focus rather than a
 * battery — **it costs the reader's own reserve** — which is why a
 * scroll of a working beyond you is a gamble and a wand of the same
 * working is not.
 *
 * ⚠ **A scroll affords `read`, and nothing else** (requirements D34).
 * That is not tidiness — it is the whole unidentified-consumable
 * mechanic. If an identify scroll afforded an `identify` verb, the verb
 * appearing in your list would tell you what you are holding, and the
 * scroll would identify itself for free. Verbs key on the **kind**
 * (which is visible); effects key on the **class** (which is not). So
 * every scroll in the world affords exactly `read`, and what happens
 * when you read it is the effect.
 *
 * The composition says the same thing three ways: `Marked` makes it
 * readable (and gives it a modality, so an embossed scroll reads in the
 * dark), `Arcane` says which cell it sits in, `Consumable` spends it.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';
import { ArcaneMixin } from '@saxonberg/server/mud/lib/magic/Arcane';
import { ConsumableMixin } from '@saxonberg/server/mud/lib/magic/Consumable';
import { IdentifiableMixin } from '@saxonberg/server/mud/lib/identification/Identifiable';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { LabelledMixin } from '@saxonberg/server/mud/lib/description/Labelled';
import { CirculatingMixin } from '@saxonberg/server/mud/lib/residency/Circulating';
import { BlessableMixin } from '@saxonberg/server/mud/lib/magic/Blessable';

// `Blessable` because a scroll HAS an effect axis, which is the only
// thing BUC is defined against. It was left off while BUC's only
// consumer was the cursed-sticks release gate — meaningless for
// something you read once and destroy. Now that a band selects the
// working's own low/high branch, a scroll is the ARCHETYPE: NetHack's
// cursed scroll of remove curse lays curses instead of lifting them,
// and that is the one demonstration the whole model rests on.
// `Detailed`: an item you cannot name is exactly the one you want to look
// at closely, so these three classes are examinable in parts. Safe only
// because `Identifiable` lenses the tree — a detail key is a parser
// token, so an unidentified item shows its CLASS's parts (`grip`, `seal`)
// and never its own. See `Detailed.detailRoot`.
const ScrollBase = CirculatingMixin(
  BlessableMixin(
    IdentifiableMixin(
      LabelledMixin(
        ConsumableMixin(ArcaneMixin(MarkedMixin(DetailedMixin(Thing)))),
      ),
    ),
  ),
);

export default class Scroll extends ScrollBase {}
