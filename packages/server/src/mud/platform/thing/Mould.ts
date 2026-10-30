/**
 * Mould — the instanceable twin of {@link MouldMixin}: a made, wearing
 * vessel that decides the shape of what sets in it and keeps it until it
 * is taken out (dairy D9). An ingot mould, an ice pan — rows over this
 * class, each authoring its `castTemplate`.
 *
 * ⭐ No `Placing` (a weight is a DRAIN mould's fact — the cheese hoop
 * composes it itself), no `Contaminable` (an ingot mould is not food
 * equipment). `Crafted` so a mould can be washed and carries a maker;
 * `Durable` so a reusable mould wears per cast and cracks.
 *
 * ⭐ `Assembled` (ceramics D23): a mould of TWO HALVES is a row with a
 * `bill` — an assembly, worn and mended at its joint like any other — and
 * only it takes an impression of a shape with an undercut. No bill is one
 * piece, which every shipped mould row is, and its look says so.
 */
import Good from '../../lib/stuff/Good';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin } from '../../lib/craft/Assembled';
import { MouldMixin } from '../../lib/mould/Mould';

const MouldBase = MouldMixin(
  AssembledMixin(
    DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))),
  ),
);

export default class Mould extends MouldBase {}
