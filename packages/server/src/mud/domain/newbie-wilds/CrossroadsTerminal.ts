/**
 * CrossroadsTerminal — the newbie-wilds crossroads TPA node ("the Line").
 *
 * The generic `TpaTerminal` plus one thing: it stands up the frontier
 * settlement's municipal operating budget (the `Bar.postRegister` /
 * `TicketClerk.postRegister` guarded-`singletonOrClone` precedent), so the
 * crossroads' **arrival surcharge** has an operator to collect it
 * (`businessAt(the crossroads hub)`). The Business is loaded with the
 * crossroads content, not the boot manifest; idempotent on HMR, live before
 * any traveller settles a fare (the terminal cascade-loads as Gate A's route
 * target at boot).
 */

import TpaTerminal from "../common/tpa/TpaTerminal";
import { StuffApi } from "../../api/stuff";
import { Template } from "../../lib/stuff/Template";

/** The frontier settlement's operating budget (collects the arrival toll). */
const BUDGET_PATH = "/domain/newbie-wilds/budget";

export default class CrossroadsTerminal extends TpaTerminal {
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context); // seatSelf + armNetwork + armTimetable
    if (await Template.findByPath(BUDGET_PATH)) {
      await StuffApi.singletonOrClone(BUDGET_PATH);
    }
  }
}
