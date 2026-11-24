/**
 * TurnBackController — `turn back <thing>`: the turn that slackens it
 * right off (over {@link TurnController}). A subcommand has its own
 * controller rather than a word test in the shared one (lint:multi-act).
 */

import TurnController from './TurnController';

export default class TurnBackController extends TurnController {
  protected override turnsBack(): boolean {
    return true;
  }
}
