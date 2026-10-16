/**
 * Barrel — a made CONTAINER of staves for dry goods: the slack cooper's
 * product (assembly D10, AC 22).
 *
 * Cooperage has always been two trades sharing a shop. *Slack* cooperage
 * made barrels for things — nails, apples, flour in its sack, salt fish —
 * and its staves need not meet: nobody is keeping liquor in. *Tight*
 * cooperage made casks, which hold liquor and are a different and harder
 * object. So the capability ladder is a ladder of PRODUCTS: a hand that
 * cannot yet make a tight cask makes a barrel, which is not a worse cask
 * but a different thing, and the refusal to pour beer into one is a fact
 * about what it is (it is not a vessel at all).
 *
 * A container you put things IN (the `Chest` shape: Sealable for the head
 * you knock in), made of parts (Assembled, so a sprung stave is mended and
 * the hoops tightened), and durable beneath that.
 */

import Good from './Good';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin } from '../../lib/craft/Assembled';

const BarrelBase = AssembledMixin(
  DurableMixin(CraftedMixin(SealableMixin(ContainerMixin(Good)))),
);

export default class Barrel extends BarrelBase {}
