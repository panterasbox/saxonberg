/**
 * DemoItem — generic showcase Tangible Thing.
 *
 * The `obj/demo/` namespace is a **deliberately temporary holding
 * area** for hodgepodge templates that demonstrate substrate
 * features (Quantity authoring shapes, material binding, future
 * mixin compositions) without committing to a polished content
 * world. Everything here gets reorganized when the proper proving-
 * ground area lands.
 *
 * `DemoItem` is the simplest Tangible Stuff: just a Thing with a
 * name and a material reference. Authors who want sittable chairs,
 * wieldable swords, or carryable cushions compose those mixins on
 * top once the corresponding subsystems ship; for now,
 * `weigh <item>` and `analyze chemistry of <item>` are the verbs
 * that exercise this surface.
 */

import { Thing } from '../../lib/stuff/Thing';
import { TangibleMixin } from '../../lib/material/Tangible';
import { NamedMixin } from '../../lib/description/Named';

export class DemoItem extends TangibleMixin(NamedMixin(Thing)) {}
