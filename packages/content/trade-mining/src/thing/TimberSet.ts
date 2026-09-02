/**
 * TimberSet — a set of timber, standing in a working and holding the
 * back up.
 *
 * ⭐⭐ **A placed `Durable` OBJECT, and not a flag on the room.** That is
 * the whole design of ground support in one sentence, and everything
 * follows from it:
 *
 *  - it **decays**, so `analyze` reads its condition and `repair`
 *    restores it — the shipped repair economy, with no new mechanism;
 *  - it can be **carried, bought, made and stolen**, because it is a
 *    thing;
 *  - the support a working has is a **sum over what is actually
 *    standing in it** (`Working.supportHere`, condition-weighted), so a
 *    rotten set is worth less than a sound one and the room does not
 *    need to be told;
 *  - and a mine that runs out of timber has a **supply problem**, which
 *    is what makes the coppice a real second customer of the wood the
 *    fuel yard cuts.
 *
 * A flag would have given none of that. The capability string is
 * `timber-set` and nothing else in the engine knows what a prop is —
 * the volcano-vent rule, underground.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';

export default class TimberSet extends ToolItem {
  constructor() {
    super();
    // Host-internal writes — the constructor IS the class body. A row's
    // `data:` overrides any of these through the ordinary hydrator.
    this.capabilities = ['timber-set'];
    this.setKeywords(['timber', 'set', 'prop', 'stull']);
    this.setPrimaryKeyword('timber');
  }
}
