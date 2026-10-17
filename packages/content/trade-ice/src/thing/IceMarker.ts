/**
 * IceMarker — the marker that scores a grid across the ice so it can be
 * cut into blocks of one size (storage-and-ice D19). ⭐ ONE class, two
 * rungs, both rows: a hand marker (a 30 cm grid, a person pushing it) and
 * an ice plough (a 56 cm grid, a horse in the traces — refused unless a
 * draft animal is out on the ice with you). Affords `mark`.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

const MARK = ['trade/ice/cmd/ice/mark.yaml'];

export default class IceMarker extends Tool {
  static fieldMeta: FieldMeta = {
    gridM: { persistent: true, authorable: true },
    draught: { persistent: true, authorable: true },
  };

  static commandContributions: CommandContributions = {
    environment: MARK,
    peers: MARK,
  };

  /** The grid's spacing, m: the side of the block it marks out. */
  public gridM = 0.3;
  /** Who pulls it: a person, or a horse. */
  public draught: 'hand' | 'horse' = 'hand';

  public getGridM(): number {
    return this.gridM > 0 ? this.gridM : 0.3;
  }

  public getDraught(): 'hand' | 'horse' {
    return this.draught === 'horse' ? 'horse' : 'hand';
  }
}
