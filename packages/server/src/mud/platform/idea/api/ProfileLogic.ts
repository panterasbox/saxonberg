// ProfileLogic — the hot-reloadable logic singleton behind SocialApi.
// The single viewer-aware redaction seam for player inspection. (Doc
// comment on the class so @internal lands on the reflection, not the
// module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { PlayerApi } from '../../../api/player';
import { MixinApi } from '../../../api/mixin';
import { RecognitionApi } from '../../../api/recognition';
import { ConnectionApi } from '../../../api/connection';
import { RenownApi } from '../../../api/renown';
import { InfluenceApi } from '../../../api/influence';
import { AdvancementApi } from '../../../api/advancement';
import { TraitApi } from '../../../api/trait';
import { ChronicleApi } from '../../../api/chronicle';
import { ShellApi } from '../../../api/shell';
import { SocialApi } from '../../../api/social';
import type { PresenceStatus } from '@saxonberg/types';
import { Band } from '../../../lib/standing/Band';
import type {
  ProfileCard,
  ProfileDigest,
  ProfileNameSurface,
  RosterRow,
} from '../../../api/social';

// Gated to the SocialApi facade — presence/profile reads fold into
// SocialApi (one navigable surface); this logic singleton stays separate
// for file size + HMR but is @internal.
const SocialApiCallers = SecurityPolicies.FromModule('/api/social#SocialApi'
);

/** A connected account younger than this reads as a "new arrival". */
const NEW_ARRIVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Recent deeds shown on another player's recognized card. */
const CARD_DEED_LIMIT = 5;

/** The durable standing key — the template path the faucets re-key to. */
function subjectIdOf(target: Stuff): string {
  return target.getIdentityPath() ?? target.stuffId;
}

/** The stable per-target roster/card key. */
function handleOf(target: Stuff): string {
  return target.getIdentityPath() ?? target.stuffId;
}

/** Map a regard scalar to a qualitative line, or undefined when neutral. */
function regardWord(regard: number): string | undefined {
  if (regard > 0) return 'You regard them warmly.';
  if (regard < 0) return 'You regard them coldly.';
  return undefined;
}

/** Does `holder` carry `person` (avatar or npc) in its contacts? */
function contactEntryFor(
  holder: Stuff,
  person: Stuff
): { label: string } | undefined {
  if (!MixinApi.isContacts(holder)) return undefined;
  const isAvatar = PlayerApi.isAvatarStuff(person);
  const personPlayerId = isAvatar ? person.getPlayerId() : undefined;
  const personTemplate = person.getIdentityPath() ?? undefined;
  for (const entry of holder.allContacts()) {
    if (
      isAvatar &&
      entry.kind === 'avatar' &&
      entry.playerId === personPlayerId
    ) {
      return { label: entry.label };
    }
    if (
      !isAvatar &&
      entry.kind === 'npc' &&
      entry.templatePath === personTemplate
    ) {
      return { label: entry.label };
    }
  }
  return undefined;
}

/**
 * ProfileLogic — the hot-reloadable logic singleton behind
 * {@link SocialApi}.
 *
 * Lives at `/platform/idea/api/profile` (a stateless `Stuff` singleton, no backing
 * `Template`); `SocialApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Stateless by construction — every method is
 * derive-on-read over the substrate Apis.
 *
 * @internal
 */
@Unshadowable
export class ProfileLogic extends ApiLogic {
  /** See {@link SocialApi.composeRow}. */
  @CallSecurity(SocialApiCallers)
  public async composeRow(viewer: Stuff, target: Stuff): Promise<RosterRow> {
    const self = viewer.stuffId === target.stuffId;
    const recognized = self || RecognitionApi.recognizes(viewer, target);
    const row: RosterRow = {
      handle: handleOf(target),
      header: self ? target.getPresentation() : RecognitionApi.describe(viewer, target),
      recognized,
    };
    if (PlayerApi.isAvatarStuff(target)) {
      const country = ConnectionApi.originOf(target.getPlayerId()).country;
      if (country) row.country = country;
    }
    // Omit the unremarkable `active` default from a row; surface only a
    // notable (idle / engaged / reconnecting) status, gated by disclosure.
    const status = this.statusForViewer(viewer, target);
    if (status && status !== 'active') row.status = status;
    return row;
  }

  /** See {@link SocialApi.composeCard}. */
  @CallSecurity(SocialApiCallers)
  public async composeCard(viewer: Stuff, target: Stuff): Promise<ProfileCard> {
    const self = viewer.stuffId === target.stuffId;
    const recognized = self || RecognitionApi.recognizes(viewer, target);
    const card: ProfileCard = {
      handle: handleOf(target),
      header: self
        ? target.getPresentation()
        : RecognitionApi.describe(viewer, target),
      isSelf: self,
      recognized,
    };

    // --- Account / world facts — always shown (Avatar-only) ---
    if (PlayerApi.isAvatarStuff(target)) {
      const country = ConnectionApi.originOf(target.getPlayerId()).country;
      if (country) card.country = country;
      const createdAt = target.getUser()?.createdAt;
      if (createdAt && Date.now() - createdAt.getTime() < NEW_ARRIVAL_WINDOW_MS) {
        card.newness = 'new-arrival';
      }
    }
    const status = this.statusForViewer(viewer, target);
    if (status) card.status = status;

    // --- Physical / observable — disguise-aware, NOT raw getters when a
    // disguise masks the body (the header / salient string carries it). ---
    const disguise = MixinApi.isDisguisable(target)
      ? target.getDisguise()
      : null;
    const masked = !self && !!disguise?.masksIdentity;
    if (!masked) {
      if (MixinApi.isOrganism(target)) {
        const common = target.getSpecies()?.getCommonNames()[0];
        if (common) card.species = common;
        const stage = target.getLifecycleState();
        if (stage) card.ageStage = stage;
      }
      if (MixinApi.isSexed(target)) {
        const sex = target.getSex();
        if (sex) card.sex = sex;
      }
      if (MixinApi.isGendered(target)) {
        card.pronouns = String(target.getPronouns());
      }
    }
    if (MixinApi.isStatus(target)) {
      const flavor = target.getStatus();
      if (flavor) card.flavor = flavor;
    }

    // --- Persona — recognition-gated (omitted entirely for a stranger) ---
    if (recognized) {
      if (MixinApi.isNamed(target)) {
        const name = target.getName();
        if (name) {
          const ns: ProfileNameSurface = { name };
          const honorific = target.getHonorific();
          if (honorific) ns.honorific = honorific;
          const surname = target.getSurname();
          if (surname) ns.surname = surname;
          const suffix = target.getNameSuffix();
          if (suffix) ns.suffix = suffix;
          const alternates = target
            .getAlternateNames()
            .map((a) => a.value)
            .filter((v) => v.length > 0);
          if (alternates.length) ns.alternates = alternates;
          card.nameSurface = ns;
        }
      }
      if (MixinApi.isPersona(target)) {
        const aspiration = target.getAspiration();
        if (aspiration) card.aspiration = aspiration;
        const bio = target.getBio();
        if (bio) card.bio = bio;
      }
      const chronicle = await this.chronicleFor(target);
      if (chronicle) card.chronicle = chronicle;
    }

    // --- Always-outward standing (renown + competence) ---
    const subjectId = subjectIdOf(target);
    card.renownBand = Band.fromScalar(RenownApi.renownOf(subjectId)).name;
    const competence = await AdvancementApi.bandsFor(target);
    if (competence.length) {
      card.competenceBands = competence.map((b) => ({
        discipline: b.discipline,
        band: b.band,
      }));
    }

    // --- Self-only digest, or observer-owned annotations ---
    if (self) {
      card.digest = await this.selfDigest(target, subjectId);
    } else {
      const contact = contactEntryFor(viewer, target);
      if (contact) card.yourLabel = contact.label;
      const word = regardWord(
        MixinApi.isBeliefStore(viewer) ? viewer.regardFor(target) : 0,
      );
      if (word) card.yourRegard = word;
    }
    return card;
  }

  /**
   * The granular presence status a viewer may see for a target, gated by
   * the target's `privacy.showStatus`. Bare online is always public (the
   * card/row existing); the word is the gated detail. Self always sees it.
   * Non-avatar targets carry no session status.
   */
  private statusForViewer(
    viewer: Stuff,
    target: Stuff
  ): PresenceStatus | undefined {
    if (!PlayerApi.isAvatarStuff(target)) return undefined;
    const status = SocialApi.statusOf(target);
    if (viewer.stuffId === target.stuffId) return status;
    const pref =
      ShellApi.resolveSetting<string>(target, 'privacy.showStatus') ?? 'anyone';
    if (pref === 'anyone') return status;
    // `contacts+`: only viewers the target keeps as a contact see the word.
    if (contactEntryFor(target, viewer)) return status;
    return undefined;
  }

  /** Chronicle prologue (claims) + recent deeds for a recognized card. */
  private async chronicleFor(
    target: Stuff
  ): Promise<{ prologue?: string; deeds: string[] } | undefined> {
    const entries = await ChronicleApi.entriesFor(target);
    if (!entries.length) return undefined;
    const claims = entries.filter((e) => e.kind === 'claim');
    const deeds = entries.filter((e) => e.kind === 'deed');
    const prologue = claims.map((c) => c.text).join(' ') || undefined;
    const deedLines = deeds
      .slice(-CARD_DEED_LIMIT)
      .map((d) => d.text)
      .filter((t) => t.length > 0);
    if (!prologue && !deedLines.length) return undefined;
    return { ...(prologue ? { prologue } : {}), deeds: deedLines };
  }

  /** The four-measure standing digest, empty lines hidden. */
  private async selfDigest(
    target: Stuff,
    subjectId: string
  ): Promise<ProfileDigest> {
    // ⚠ Through the shared host seam — see StandingController. It
    // returns `undefined` when the account cannot be resolved; the
    // digest then OMITS make rather than reporting the per-character
    // figure under an account-level label.
    const make = InfluenceApi.standingForHost(target, 'producer');
    const digest: ProfileDigest = {
      renown: Band.fromScalar(RenownApi.renownOf(subjectId)).name,
      influence: {
        play: InfluenceApi.bandOf(subjectId, 'consumer').name,
        ...(make ? { make: make.band.name } : {}),
      },
    };
    const competence = await AdvancementApi.bandsFor(target);
    if (competence.length) {
      digest.competence = competence.map((b) => ({
        discipline: b.discipline,
        band: b.band,
      }));
    }
    const traits = await TraitApi.pronouncedFor(target);
    if (traits.length) {
      digest.traits = traits.map((t) => ({
        axis: t.disposition,
        band: t.band,
      }));
    }
    return digest;
  }
}
