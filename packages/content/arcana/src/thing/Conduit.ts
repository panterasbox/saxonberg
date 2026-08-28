/**
 * Conduit — the instanceable coupling. Substrate lives in
 * `lib/magic/Conduit`; this is what a template's `class:` names.
 *
 * A tool, not a magic item in the D5 sense: it stores no energy, holds
 * no working, and has nothing to recharge. It only makes a transfer
 * *possible*, and how well it does that is its whole spec.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ConduitMixin } from '@saxonberg/server/mud/lib/magic/Conduit';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';

// `Durable`: a conduit is a tool and tools wear — the shipped condition
// axis, not a second clock of its own (the resource the implements
// slate exists to avoid).
const ConduitBase = DurableMixin(ConduitMixin(Thing));

export default class Conduit extends ConduitBase {}
