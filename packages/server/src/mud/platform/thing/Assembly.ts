/**
 * Assembly — a made thing of parts with no other capability: a cask head,
 * a bellows, a chair frame, a cushion, a wheel (assembly D8).
 *
 * The twin of {@link Good} on the assembly axis: a row that is a part of
 * something bigger (and is itself made of parts) names this class, so the
 * part keeps its own record when it is fitted — the cushion you stitched
 * is still your cushion inside the armchair, and a new one is fitted
 * without the frame's joints being touched. A NOUN, not an adjective: it is
 * what such a thing IS.
 *
 * Durable beneath Assembled (the mixin requires it); Crafted so the mint
 * stamps it like any other made good.
 */

import Good from './Good';
import { DurableMixin } from '../../lib/material/Durable';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { AssembledMixin } from '../../lib/craft/Assembled';

const AssemblyBase = AssembledMixin(CraftedMixin(DurableMixin(Good)));

export default class Assembly extends AssemblyBase {}
