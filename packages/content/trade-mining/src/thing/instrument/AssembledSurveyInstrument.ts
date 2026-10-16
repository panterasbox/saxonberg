/**
 * AssembledSurveyInstrument — a survey instrument made of parts — a housing, a card, a needle and a crystal (the compass); a cracked crystal is replaced alone.
 *
 * ⭐ Its own class, not `AssembledMixin` on `SurveyInstrument`: the other SurveyInstrument rows
 * have no parts (`lint:bills` holds both directions).
 *
 * ⚠ A class's own `commandContributions` is read up the prototype chain,
 * so the mixin's (fit · repair · salvage) would SHADOW SurveyInstrument's own verbs
 * here — restated, the Blank/Billet pattern. The mixin's are collected
 * from the mixin chain regardless.
 */

import SurveyInstrument from './SurveyInstrument';
import { AssembledMixin } from '@saxonberg/server/mud/lib/craft/Assembled';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const AssembledSurveyInstrumentBase = AssembledMixin(SurveyInstrument);

export default class AssembledSurveyInstrument extends AssembledSurveyInstrumentBase {
  static commandContributions: CommandContributions = SurveyInstrument.commandContributions as CommandContributions;
}
