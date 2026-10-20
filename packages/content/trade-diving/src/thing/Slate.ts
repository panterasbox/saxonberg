/**
 * Slate — ⭐ **writing under the water** (underwater C5): a white slate
 * with a grease pencil on a string, the way divers talk below where no
 * voice carries. `write <words> on slate` scratches them on (the kernel's
 * `write`, over `MarkedMixin` — the slate authors its room and its form);
 * anyone can `read slate`. Scratched, not inked: the water does not wash
 * it out.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';

export default class Slate extends MarkedMixin(Good) {}
