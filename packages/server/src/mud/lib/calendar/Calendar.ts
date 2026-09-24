/**
 * CalendarMixin — a played person's **personal calendar** (clinical-medicine
 * D12, the first slice of `personal-calendar-slate`).
 *
 * Dated entries a person keeps and reads on demand — the honest home for
 * *"come back in two weeks"*, which is a clinician's PROGNOSIS communicated
 * to you, not something a wound reveals. Composed on `Avatar` (a played
 * person keeps a calendar; an NPC does not); the aether-implant surface is
 * the `CalendarUpdate` hosted app (`CalendarAppMixin`), which reads its
 * host's entries through the hosted-update `getOperator` seam.
 *
 * ⚠ **`addCalendarEntry` is the author seam — `@Final @Unshadowable` and
 * UNGATED** (the `creditDeed` precedent). The writer set is every acting
 * controller (medicine now; contract/employment/banking later); who may
 * write is the calendar slate's open question, deferred.
 *
 * The ping is TIMELINESS, never VALIDITY: `calendar` lists overdue entries
 * regardless of whether the one-shot fired, so correctness never depends on
 * it. A world calendar (`lib/time`) is a different thing — that is the
 * shared game date; this is your own diary.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Final, Unshadowable } from '../security/decorators';
import { WorldClockApi } from '../../api/worldclock';
import type { ClockHandle } from '../../api/worldclock';
import { SecurityApi } from '../../api/security';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { Quantity } from '../quantity';

/** A dated entry as it persists on the host. */
export interface CalendarEntryStored {
  id: string;
  /** Game-time (seconds) the entry is FOR. */
  whenGameS: number;
  /** What to show ("Remove stitches", "Follow-up: extraction"). */
  label: string;
  /** Who/what wrote it (`'medicine'` …) — a provenance tag, not a gate. */
  source: string;
  /** Game-time (seconds) it was added. */
  addedAtS: number;
  /** Game-time (seconds) the ping fired, if it has. */
  firedAtS?: number;
}

export interface CalendarKeeping {
  addCalendarEntry(spec: {
    label: string;
    whenGameS: number;
    source: string;
  }): CalendarEntryStored;
  getCalendarEntries(): readonly CalendarEntryStored[];
  removeCalendarEntry(id: string): void;
  /** Entries due at/before `nowS` that have not yet pinged. */
  dueCalendarEntries(nowS: number): CalendarEntryStored[];
  /** (Re)book the one-shot ping at the next unfired entry. Idempotent. */
  rescheduleCalendarPing(): void;
}

const TOPIC = 'session.notice';

export function CalendarMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class CalendarMixin extends Base implements CalendarKeeping {
    static _mixinName = 'CalendarMixin';

    static fieldMeta: FieldMeta = {
      calendarEntries: { persistent: true, runtimeState: true },
    };

    /** The dated entries. Persisted; rides the Avatar snapshot. */
    public calendarEntries: CalendarEntryStored[] = [];

    /** The live one-shot ping handle — transient, re-armed in postRegister. */
    private calendarPingHandle: ClockHandle | null = null;

    @Final
    @Unshadowable
    public addCalendarEntry(spec: {
      label: string;
      whenGameS: number;
      source: string;
    }): CalendarEntryStored {
      const entry: CalendarEntryStored = {
        id: SecurityApi.uuid(),
        whenGameS: spec.whenGameS,
        label: spec.label,
        source: spec.source,
        addedAtS: WorldClockApi.getNow().rawValue(),
      };
      this.calendarEntries.push(entry);
      this.rescheduleCalendarPing();
      return entry;
    }

    public getCalendarEntries(): readonly CalendarEntryStored[] {
      return this.calendarEntries;
    }

    public removeCalendarEntry(id: string): void {
      this.calendarEntries = this.calendarEntries.filter((e) => e.id !== id);
      this.rescheduleCalendarPing();
    }

    public dueCalendarEntries(nowS: number): CalendarEntryStored[] {
      return this.calendarEntries.filter(
        (e) => e.firedAtS === undefined && e.whenGameS <= nowS,
      );
    }

    public rescheduleCalendarPing(): void {
      this.calendarPingHandle?.cancel();
      this.calendarPingHandle = null;
      const pending = this.calendarEntries
        .filter((e) => e.firedAtS === undefined)
        .sort((a, b) => a.whenGameS - b.whenGameS);
      const next = pending[0];
      if (!next) return;
      const self = this as unknown as Stuff;
      this.calendarPingHandle = WorldClockApi.at(
        Quantity.of(next.whenGameS, 's'),
        () => this.onCalendarPing(),
        { host: self },
      );
    }

    /** The ping fired (or a re-arm found overdue entries): stamp and tell. */
    private onCalendarPing(): void {
      const self = this as unknown as Stuff;
      const nowS = WorldClockApi.getNow().rawValue();
      for (const e of this.dueCalendarEntries(nowS)) {
        e.firedAtS = nowS;
        MessageApi.scene(self)
          .topic(TOPIC)
          .toSelf(Mml.fromMarkup(`Your calendar: ${Mml.escape(e.label)}.`))
          .send();
      }
      this.rescheduleCalendarPing();
    }
  }
  return CalendarMixin;
}
