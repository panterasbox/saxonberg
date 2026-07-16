/**
 * Ticket — a take-a-number claim on a place in a service order.
 *
 * The functional difference between a *line* and *take-a-number* is one thing:
 * **must you stay present to hold your place?** A line holds your place by your
 * presence (leave the room, lose your spot); a ticket holds it as a carried
 * object (wander off, come back — the number is your claim). This is that
 * object: a plain carried `Thing` stamped with the point it belongs to and its
 * number. It **expires** on idle (the queue is griefable too), reaped by the
 * same anti-grief sweep that evicts a stale lease.
 */

import Thing from "../stuff/Thing";
import { VisibleMixin } from "../description/Visible";
import { DetailedMixin } from "../description/Detailed";

const TicketBase = DetailedMixin(VisibleMixin(Thing));

export default class Ticket extends TicketBase {
  static persistentFields = ["pointPath", "number"];

  /** The service point this ticket claims a place at (its templatePath). */
  public pointPath = "";
  /** The drawn number (the "now serving N" board counts up to it). */
  public number = 0;

  public getPointPath(): string {
    return this.pointPath;
  }

  public getNumber(): number {
    return this.number;
  }
}
