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

import Thing from '../../lib/stuff/Thing';
import { MarkedMixin } from '../../lib/description/Marked';
import { ArcaneMixin } from '../../lib/magic/Arcane';
import { ConsumableMixin } from '../../lib/magic/Consumable';

const ScrollBase = ConsumableMixin(ArcaneMixin(MarkedMixin(Thing)));

export default class Scroll extends ScrollBase {}
