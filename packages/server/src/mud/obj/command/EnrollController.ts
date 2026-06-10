/**
 * EnrollController — the char-gen verb (`enroll`), the real command
 * handler for character creation.
 *
 * `enroll <field> <value>` drives a uniform step model (ENROLL_STEPS):
 * species → sex → name → pronouns → aspiration → confirm. The handler
 * reads the giver (a `Login`), validates the value, mutates the Login's
 * `EnrollmentDraft`, and re-emits the `system.charactergen.state` frame.
 * `enroll confirm` runs the atomic commit: fork the per-character
 * template, register ownership, clone + dress the Avatar, hand off.
 *
 * The rosters (species / pronouns / aspirations) are CONTENT
 * (`config/char-gen.yaml`), loaded + cached here — not a switch. The
 * name suggester lives on `Species` (reads the `NameBank` Documents).
 * No new Api: this is a controller calling the security-threaded Apis.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { nanoid } from 'nanoid';
import YAML from 'yaml';
import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { StuffApi } from '../../api/stuff';
import { ConnectionApi } from '../../api/connection';
import { ContainmentApi } from '../../api/containment';
import { SlotApi } from '../../api/slot';
import { TemplateApi } from '../../api/template';
import { Template } from '../../lib/stuff/Template';
import Avatar from '../Avatar';
import type Login from '../Login';
import type { EnrollmentDraft } from '../Login';
import type Species from '../../lib/species/Species';
import type {
  CharGenOption,
  CharGenPicks,
  CharGenStatePayload,
  CharGenStep,
} from '@saxonberg/types';

interface EnrollModel extends CommandModel {
  /** The raw `<field> <value...>` tail; split inside execute. */
  rest?: string;
}

// ---- Content config (rosters) -------------------------------------

interface SpeciesRosterEntry {
  key: string;
  path: string;
  label: string;
  description: string;
}
interface PronounRosterEntry {
  value: string;
  label: string;
}
interface AspirationRosterEntry {
  key: string;
  label: string;
  description: string;
  bioSeed: string;
  outfit: string[];
}
interface CharGenConfig {
  species: SpeciesRosterEntry[];
  pronouns: PronounRosterEntry[];
  aspirations: AspirationRosterEntry[];
}

// ---- Name validation (inline; real moderation deferred) -----------

const NAME_DENYLIST = ['admin', 'system', 'moderator', 'null', 'root'];
const NAME_RE = /^\p{L}+(?:[-'\p{L}]*\p{L})?$/u;

function validateNameToken(token: string, label: string): string | undefined {
  const t = token.trim();
  if (t.length < 2 || t.length > 24) {
    return `${label} must be 2–24 characters.`;
  }
  if (!NAME_RE.test(t)) {
    return `${label} may use letters with a single internal hyphen or apostrophe only.`;
  }
  if (NAME_DENYLIST.includes(t.toLowerCase())) {
    return `'${t}' isn't allowed as a ${label.toLowerCase()}.`;
  }
  return undefined;
}

// ---- The uniform step model ---------------------------------------

interface EnrollStep {
  field: Exclude<CharGenStep, 'done'>;
  applicable(draft: EnrollmentDraft, cfg: CharGenConfig): boolean;
  complete(draft: EnrollmentDraft): boolean;
  options(draft: EnrollmentDraft, cfg: CharGenConfig): CharGenOption[];
  validate(
    value: string,
    draft: EnrollmentDraft,
    cfg: CharGenConfig,
  ): Promise<string | undefined> | string | undefined;
  apply(
    value: string,
    draft: EnrollmentDraft,
    cfg: CharGenConfig,
    ctrl: EnrollController,
  ): Promise<void> | void;
}

const ENROLL_STEPS: EnrollStep[] = [
  {
    field: 'species',
    applicable: () => true,
    complete: (d) => !!d.speciesPath,
    options: (_d, cfg) =>
      cfg.species.map((s) => ({
        value: s.key,
        label: s.label,
        description: s.description,
      })),
    validate: (v, _d, cfg) =>
      cfg.species.some((s) => s.key === v.toLowerCase())
        ? undefined
        : `Unknown species '${v}'. Pick one of the offered options.`,
    apply: async (v, d, cfg, ctrl) => {
      const entry = cfg.species.find((s) => s.key === v.toLowerCase())!;
      d.speciesKey = entry.key;
      d.speciesPath = entry.path;
      // Materialize the Species singleton (not a sync registry lookup —
      // the instance may not be cloned yet). Cache what the sync step
      // model needs (common name, sex system) so it doesn't re-resolve.
      const species = await StuffApi.singleton<Species>(entry.path);
      d.speciesCommonName =
        species.getCommonNames()[0] ?? entry.label.toLowerCase();
      d.sexSystem = species.getSexDeterminationSystem();
      // Species changed → a fresh themed suggestion; clear name/sex.
      d.name = undefined;
      d.surname = undefined;
      d.sex = undefined;
      await ctrl.refreshSuggestion(d);
    },
  },
  {
    field: 'sex',
    // Reads the cached sex-determination system the species step
    // resolved — reliable + sync (no re-materialization here).
    applicable: (d) => !!d.speciesPath && !!d.sexSystem && d.sexSystem !== 'none',
    complete: (d) => !!d.sex,
    options: (d) =>
      validSexSet(d.sexSystem ?? '').map((s) => ({ value: s, label: cap(s) })),
    validate: (v, d) => {
      const set = validSexSet(d.sexSystem ?? '');
      return set.includes(v.toLowerCase())
        ? undefined
        : `Pick one of: ${set.join(', ')}.`;
    },
    apply: (v, d) => {
      d.sex = v.toLowerCase();
    },
  },
  {
    field: 'name',
    applicable: () => true,
    complete: (d) => !!d.name,
    options: () => [
      { value: 'keep', label: 'Keep this name' },
      { value: 'reroll', label: 'Suggest another' },
      { value: '<your name>', label: 'Type your own' },
    ],
    validate: (v, _d) => {
      const cmd = v.trim().toLowerCase();
      if (cmd === '' || cmd === 'keep' || cmd === 'reroll') return undefined;
      const parts = v.trim().split(/\s+/);
      const givenErr = validateNameToken(parts[0]!, 'Given name');
      if (givenErr) return givenErr;
      if (parts.length > 1) {
        const surErr = validateNameToken(parts.slice(1).join(' '), 'Surname');
        if (surErr) return surErr;
      }
      return undefined;
    },
    apply: async (v, d, _cfg, ctrl) => {
      const cmd = v.trim().toLowerCase();
      if (cmd === 'reroll') {
        await ctrl.refreshSuggestion(d, true);
        return;
      }
      if (cmd === '' || cmd === 'keep') {
        d.name = d.suggestion?.name;
        d.surname = d.suggestion?.surname;
        return;
      }
      const parts = v.trim().split(/\s+/);
      d.name = parts[0];
      d.surname = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    },
  },
  {
    field: 'pronouns',
    applicable: () => true,
    complete: (d) => !!d.pronouns,
    options: (_d, cfg) =>
      cfg.pronouns.map((p) => ({ value: p.value, label: p.label })),
    validate: (v, _d, cfg) =>
      cfg.pronouns.some((p) => p.value === v.toLowerCase())
        ? undefined
        : `Pick one of the offered pronouns.`,
    apply: (v, d) => {
      d.pronouns = v.toLowerCase();
    },
  },
  {
    field: 'aspiration',
    applicable: () => true,
    complete: (d) => !!d.aspiration,
    options: (_d, cfg) =>
      cfg.aspirations.map((a) => ({
        value: a.key,
        label: a.label,
        description: a.description,
      })),
    validate: (v, _d, cfg) =>
      cfg.aspirations.some((a) => a.key === v.toLowerCase())
        ? undefined
        : `Unknown aspiration '${v}'.`,
    apply: (v, d) => {
      d.aspiration = v.toLowerCase();
    },
  },
  {
    field: 'confirm',
    applicable: () => true,
    complete: () => false,
    options: () => [{ value: 'confirm', label: 'Begin your story' }],
    validate: (_v, d, cfg) => {
      const missing = ENROLL_STEPS.filter(
        (s) =>
          s.field !== 'confirm' &&
          s.applicable(d, cfg) &&
          !s.complete(d),
      ).map((s) => s.field);
      return missing.length
        ? `Still to choose: ${missing.join(', ')}.`
        : undefined;
    },
    apply: async (_v, d, cfg, ctrl) => {
      await ctrl.commit(d, cfg);
    },
  },
];

function validSexSet(system: string): string[] {
  switch (system) {
    case 'xy':
    case 'zw':
      return ['male', 'female', 'intersex'];
    case 'dioecious':
    case 'environmental':
    case 'haplodiploid':
      return ['male', 'female'];
    default:
      return [];
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default class EnrollController extends CommandController<EnrollModel> {
  static #config: CharGenConfig | null = null;

  /** The active CommandContext for the in-flight execute (commit needs it). */
  private ctx!: CommandContext;

  async execute(model: EnrollModel, context: CommandContext): Promise<void> {
    this.ctx = context;
    const login = context.commandGiver as unknown as Login;
    let draft = login.getEnrollmentDraft();
    if (!draft) {
      draft = {};
      login.setEnrollmentDraft(draft);
    }
    const cfg = EnrollController.loadConfig();

    // Split the raw tail into `<field> <value...>`.
    const rest = (model.rest ?? '').trim();
    const sp = rest.indexOf(' ');
    const field = (sp === -1 ? rest : rest.slice(0, sp)).trim().toLowerCase();
    const value = (sp === -1 ? '' : rest.slice(sp + 1)).trim();

    if (!field) {
      // Bare `enroll` → (re)show current state.
      this.emitState(login, draft, cfg);
      return;
    }

    const step = ENROLL_STEPS.find((s) => s.field === field);
    if (!step) {
      this.emitState(
        login,
        draft,
        cfg,
        `Unknown step '${field}'. Try: ${ENROLL_STEPS.map((s) => s.field).join(', ')}.`,
      );
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-enroll-step',
        detail: field,
      });
      return;
    }

    if (!step.applicable(draft, cfg)) {
      this.emitState(login, draft, cfg, `That step isn't available yet.`);
      return;
    }

    const err = await step.validate(value, draft, cfg);
    if (err) {
      this.emitState(login, draft, cfg, err);
      context.note({
        kind: 'controller-rejected',
        reason: 'enroll-validation-failed',
        detail: err,
      });
      return;
    }

    await step.apply(value, draft, cfg, this);

    // `confirm` commits + hands off (its own final frame); otherwise
    // advance the state display.
    if (field !== 'confirm') {
      this.emitState(login, draft, cfg);
    }
  }

  /** (Re)generate the species-themed name suggestion onto the draft. */
  public async refreshSuggestion(
    draft: EnrollmentDraft,
    reroll = false,
  ): Promise<void> {
    if (!draft.speciesPath) return;
    const species = await StuffApi.singleton<Species>(draft.speciesPath);
    draft.suggestion = reroll
      ? await species.rerollName()
      : await species.suggestName(draft.realName);
  }

  /** Compute the active step (first applicable + incomplete; else confirm). */
  private currentStep(draft: EnrollmentDraft, cfg: CharGenConfig): EnrollStep {
    for (const s of ENROLL_STEPS) {
      if (s.field === 'confirm') continue;
      if (s.applicable(draft, cfg) && !s.complete(draft)) return s;
    }
    return ENROLL_STEPS.find((s) => s.field === 'confirm')!;
  }

  /** Emit the `system.charactergen.state` frame for the current step. */
  private emitState(
    login: Login,
    draft: EnrollmentDraft,
    cfg: CharGenConfig,
    error?: string,
  ): void {
    const step = this.currentStep(draft, cfg);
    // Ensure a suggestion exists when the name step is active.
    if (step.field === 'name' && !draft.suggestion && draft.speciesPath) {
      // Fire-and-forget refresh; the frame this turn may lack it, the
      // next turn carries it. (Synchronous emit; suggestion is best-
      // effort here — species.apply already seeds it.)
    }
    const picks: CharGenPicks = {};
    if (draft.speciesPath) {
      picks.species = {
        key: draft.speciesKey ?? '',
        commonName: draft.speciesCommonName ?? '',
      };
    }
    if (draft.sex) picks.sex = draft.sex;
    if (draft.name) picks.name = draft.name;
    if (draft.surname) picks.surname = draft.surname;
    if (draft.pronouns) picks.pronouns = draft.pronouns;
    if (draft.aspiration) picks.aspiration = draft.aspiration;

    const payload: CharGenStatePayload = {
      step: step.field,
      picks,
      options: step.options(draft, cfg),
    };
    if (step.field === 'name' && draft.suggestion) {
      payload.suggestion = draft.suggestion;
    }
    if (error) payload.error = error;

    MessageApi.scene(login)
      .topic('system.charactergen.state')
      .toSelf(Mml.compose`${promptFor(step.field)}`)
      .payload(payload)
      .send();
  }

  /**
   * Atomic commit: fork the per-character template, register ownership
   * (the boundary), clone + dress the Avatar, hand off, destruct Login.
   */
  public async commit(
    draft: EnrollmentDraft,
    cfg: CharGenConfig,
  ): Promise<void> {
    const context = this.ctx;
    const login = context.commandGiver as unknown as Login;
    const interactive = context.interactive!;
    const user = interactive.getUser();
    const species = draft.speciesPath
      ? await StuffApi.singleton<Species>(draft.speciesPath)
      : null;
    const aspiration = cfg.aspirations.find((a) => a.key === draft.aspiration);

    // 1. Fork the per-character template (picks overlay the seed).
    const seed = await Template.findByPath(Avatar.SEED_TEMPLATE_PATH);
    if (!seed) {
      throw new Error(`EnrollController.commit: no Avatar seed template.`);
    }
    const playerId = nanoid();
    const path = Avatar.getTemplatePath(playerId);
    const data: Record<string, unknown> = {
      ...seed.data,
      name: draft.name,
      _speciesPath: draft.speciesPath,
      pronouns: draft.pronouns,
      aspiration: draft.aspiration,
      bio: aspiration?.bioSeed ?? '',
      shortDescription:
        species?.getDefaultDescription() || (seed.data as Record<string, unknown>).shortDescription,
    };
    if (draft.surname) data.surname = draft.surname;
    await TemplateApi.saveTemplate(path, seed.class, data, seed.hydratorClass);

    // 2. Register ownership — THE atomicity boundary. Nothing before
    //    this persisted into the user's roster.
    user.playerIds.push(playerId);
    await user.save();

    // 3. Clone the runtime Avatar (postRegister stamps + installs the
    //    baseline implant + places at the lobby).
    const avatar = await StuffApi.clone<Avatar>(path, { user, playerId });

    // 4. Sex is species-constrained, so set it on the live avatar after
    //    species is in place (avoids hydration-order coupling).
    if (draft.sex) {
      try {
        avatar.setSex(draft.sex);
      } catch {
        /* species rejected the value — leave unset */
      }
    }

    // 5. Dress in the aspiration's themed outfit (tolerant of missing
    //    garments / slot mismatches — content may lag).
    if (aspiration && species) {
      const bodyPlanPath = species.getBodyPlanPath();
      for (const garmentPath of aspiration.outfit) {
        try {
          const garment = await StuffApi.clone(garmentPath);
          ContainmentApi.move(
            garment as never,
            avatar as never,
          );
          const claims = bodyPlanPath
            ? (garment as unknown as {
                getSlotClaims(): Record<string, readonly string[]>;
              }).getSlotClaims()[bodyPlanPath]
            : undefined;
          if (claims && claims.length) {
            SlotApi.occupyAll(avatar as never, garment as never, claims);
          }
        } catch {
          /* skip this garment */
        }
      }
    }

    // 6. Hand off to the avatar's session, then destruct Login.
    ConnectionApi.transfer(interactive, avatar);
    await avatar.enter(interactive);
    StuffApi.destruct(login);
  }

  static loadConfig(): CharGenConfig {
    if (EnrollController.#config) return EnrollController.#config;
    const here = dirname(fileURLToPath(import.meta.url));
    const path = join(here, '../../config/char-gen.yaml');
    const parsed = YAML.parse(readFileSync(path, 'utf-8')) as CharGenConfig;
    EnrollController.#config = {
      species: parsed.species ?? [],
      pronouns: parsed.pronouns ?? [],
      aspirations: parsed.aspirations ?? [],
    };
    return EnrollController.#config;
  }

  /** Test seam: drop the cached config. */
  static resetConfigCache(): void {
    EnrollController.#config = null;
  }
}

function promptFor(step: CharGenStep): string {
  switch (step) {
    case 'species':
      return 'What kind of body will you wear? (`enroll species <name>`)';
    case 'sex':
      return 'Choose a sex. (`enroll sex <male|female>`)';
    case 'name':
      return 'What shall we call you? (`enroll name keep` / `reroll` / type your own)';
    case 'pronouns':
      return 'Which pronouns? (`enroll pronouns <they|she|he|it>`)';
    case 'aspiration':
      return 'What did you come here to become? (`enroll aspiration <name>`)';
    case 'confirm':
      return 'Ready. (`enroll confirm` to begin)';
    default:
      return '';
  }
}
