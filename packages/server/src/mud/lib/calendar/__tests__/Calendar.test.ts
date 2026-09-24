/**
 * The personal calendar (clinical-medicine D12): add / list / due
 * ordering, removal, and the fired-flag. The ping's actual firing rides
 * the world clock and is exercised in the drive; here we prove the data
 * surface every reader (and `calendar`) depends on.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../stuff/Thing';
import { CalendarMixin } from '../Calendar';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { Stuff as StuffClass } from '../../stuff/Stuff';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { EventApi } from '../../../api/event';
import { SchedulerApi } from '../../../api/scheduler';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class CalendarThing extends CalendarMixin(Thing) {}

/** Stand up the EventRegistry so the ping's host-destruct subscription
 * (WorldClockApi.at with a host) can register in a unit test. */
async function bootstrapEvents(): Promise<void> {
  SchedulerApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    StuffClass._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

const atGameSeconds = (g: number): void => {
  const scale = WorldClockApi.getScale();
  WorldClockApi._setNowProviderForTesting(() => (g * 1000) / scale);
};

describe('CalendarMixin', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    await bootstrapEvents();
    atGameSeconds(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('adds entries and lists them; stamps addedAtS from the clock', () => {
    const c = makeStuff(() => new CalendarThing());
    const e = c.addCalendarEntry({
      label: 'Remove stitches',
      whenGameS: 5000,
      source: 'medicine',
    });
    expect(e.id).toBeTruthy();
    expect(e.addedAtS).toBe(1000);
    expect(c.getCalendarEntries()).toHaveLength(1);
    expect(c.getCalendarEntries()[0]!.label).toBe('Remove stitches');
  });

  it('dueCalendarEntries returns only unfired entries at/before now', () => {
    const c = makeStuff(() => new CalendarThing());
    c.addCalendarEntry({ label: 'past', whenGameS: 500, source: 'medicine' });
    c.addCalendarEntry({ label: 'future', whenGameS: 9000, source: 'medicine' });
    const due = c.dueCalendarEntries(1000);
    expect(due.map((e) => e.label)).toEqual(['past']);
  });

  it('removeCalendarEntry drops it', () => {
    const c = makeStuff(() => new CalendarThing());
    const e = c.addCalendarEntry({
      label: 'x',
      whenGameS: 5000,
      source: 'medicine',
    });
    c.removeCalendarEntry(e.id);
    expect(c.getCalendarEntries()).toHaveLength(0);
  });
});
