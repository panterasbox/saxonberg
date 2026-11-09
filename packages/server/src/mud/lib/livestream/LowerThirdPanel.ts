/**
 * LowerThirdPanel — one row of the overlay's lower-third rotation, read off
 * a `lower-third-panel` pack document (broadcast-ready D2, D14).
 *
 * ⭐ A panel is a ROW: its weight, how long it holds, WHEN it is eligible
 * (a closed vocabulary the overlay evaluates against its own show) and,
 * for a copy-only panel, its title and body. Rodney keeps a bespoke
 * renderer per key where one exists and renders every other row as title
 * + body — so a new copy-only panel is a pack file and nothing else.
 *
 * Listed once per broadcast socket when it connects (P7) — never at boot
 * — by `StreamApi.lowerThirdPanels`; this module is the row's shape.
 *
 * @internal
 */

import type { StreamPanelRow, StreamPanelWhen } from '@saxonberg/types';
import { STREAM_PANEL_WHENS } from '@saxonberg/types';

/** The row's shape and its validation. @internal */
export class LowerThirdPanel {
  /**
   * Validate a row's data into the wire shape. Throws naming the key on a
   * malformed row — the installer fails the pack; the feed skips the row.
   */
  public static fromData(key: string, data: Record<string, unknown>): StreamPanelRow {
    const { weight, seconds, when, title, body } = data;
    if (typeof weight !== 'number' || !(weight > 0)) {
      throw new Error(`lower-third panel '${key}': 'weight' must be a positive number`);
    }
    if (typeof seconds !== 'number' || !(seconds > 0)) {
      throw new Error(`lower-third panel '${key}': 'seconds' must be a positive number`);
    }
    if (!(STREAM_PANEL_WHENS as readonly unknown[]).includes(when)) {
      throw new Error(
        `lower-third panel '${key}': 'when' must be one of ${STREAM_PANEL_WHENS.join(', ')}`,
      );
    }
    if (title !== undefined && typeof title !== 'string') {
      throw new Error(`lower-third panel '${key}': 'title' must be a string`);
    }
    if (body !== undefined && typeof body !== 'string') {
      throw new Error(`lower-third panel '${key}': 'body' must be a string`);
    }
    const row: StreamPanelRow = { key, weight, seconds, when: when as StreamPanelWhen };
    if (typeof title === 'string') row.title = title;
    if (typeof body === 'string') row.body = body;
    return row;
  }
}
