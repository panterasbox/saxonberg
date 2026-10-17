/**
 * Hoop — a cheese hoop: an open wooden ring with a slatted bottom, the
 * first consumer of the kernel's MOULD system (dairy D9).
 *
 * ⭐ Curd poured into it SETS by draining its whey (the curd material's
 * own `drainSetting`), takes the hoop's shape and stays in it until you
 * `get wheel from hoop`. A weight put ON the hoop (`put stone on hoop`)
 * drives the whey out faster and further, so a pressed wheel is drier and
 * keeps longer — nothing enumerates "hard cheese keeps"; the press drove
 * the water out. There is no verb and no recipe: the fill decides the
 * size, the weight decides the dryness, and the time you take it out
 * decides whether it set.
 *
 * Composition: food equipment (`CraftVessel` — washed, a surface load),
 * `Durable` (a reusable mould wears per cast and `repair` mends it),
 * `MouldMixin` (the shape), `PlacingMixin` outermost (a drain mould takes a
 * press; an ingot mould does not, so the weight is the hoop's fact and not
 * the mould's).
 */
import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { MouldMixin } from '@saxonberg/server/mud/lib/mould/Mould';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';

const HoopBase = PlacingMixin(MouldMixin(DurableMixin(CraftVessel)));

export default class Hoop extends HoopBase {}
