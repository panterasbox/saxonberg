/**
 * TideAlmanac — ⭐ **the tide, printed** (underwater D25): a pocket book of
 * high and low waters for a sea, the next few days of them. `read
 * almanac` prints the table; the shore agrees with it, because both read
 * the same tide.
 *
 * Its pages are not authored text: they are the sea's own tide, worked
 * out for the days ahead at the moment you open it — a printed book that
 * is always this week's, which is the one liberty taken.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { DefaultCalendar } from '@saxonberg/server/mud/lib/time/DefaultCalendar';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type WaterExpanse from '@saxonberg/content-water/src/idea/WaterExpanse';

/** How many turns of the tide a page prints (three days). */
const TURNS = 12;

export default class TideAlmanac extends MarkedMixin(Good) {
  static fieldMeta: FieldMeta = {
    of: { persistent: true, authorable: true },
  };

  /** The sea whose tide this almanac prints (a `WaterExpanse` path). */
  public of = '';

  public getOf(): string {
    return this.of;
  }

  public setOf(value: string): void {
    this.of = typeof value === 'string' ? value.trim() : '';
  }

  /** ⭐ The table: the next high and low waters, by the calendar. */
  public override getMarkText(): string {
    const sea = this.of ? StuffApi.findByTemplatePath<WaterExpanse>(this.of) : undefined;
    let nowS = 0;
    try {
      nowS = WorldClockApi.getNow().rawValue();
    } catch {
      nowS = 0;
    }
    const first = sea?.tideAt(nowS) ?? null;
    if (!sea || first === null) return super.getMarkText();
    const calendar = new DefaultCalendar();
    const when = (s: number): string => calendar.formatDate(Quantity.of(s, 's'), '{weekday} {day} {month}, {hh}:{mm}');
    const rows: string[] = [];
    let t = nowS;
    for (let i = 0; i < TURNS; i++) {
      const tide = sea.tideAt(t);
      if (tide === null) break;
      const high = tide.tide.nextHighS < tide.tide.nextLowS;
      const at = high ? tide.tide.nextHighS : tide.tide.nextLowS;
      const level = sea.tideAt(at)?.levelM ?? 0;
      rows.push(`${high ? 'HIGH' : 'low '}  ${when(at)}  ${level >= 0 ? '+' : ''}${level.toFixed(1)} m`);
      t = at + 60;
    }
    const head = super.getMarkText().trim();
    return `${head === '' ? '' : `${head}\n`}${rows.join('\n')}`;
  }
}
