/**
 * AppSettingsSeeder — seeds the `app_settings` row from the real
 * `mud/config/app-settings.yaml`. Insert / merge-missing / idempotent;
 * operator-changed keys survive. PersistenceManager is stubbed (no Mongo).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppSettingsSeeder } from "../AppSettingsSeeder";
import { AppSettingKeys } from "../../mud/lib/config/AppSettings";
import { PersistenceManager } from "../PersistenceManager";

function stubPM() {
  const saves: Array<{ collection: string; doc: Record<string, unknown> }> = [];
  let findResult: Record<string, unknown>[] = [];
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "save").mockImplementation(async (collection, doc) => {
    saves.push({ collection, doc: doc as Record<string, unknown> });
    return "inserted-id";
  });
  vi.spyOn(pm, "find").mockImplementation(async () => findResult);
  return { saves, setFindResult: (d: Record<string, unknown>[]) => (findResult = d) };
}

function savedValues(
  pm: ReturnType<typeof stubPM>,
): Record<string, string> {
  return (pm.saves.at(-1)!.doc as { values: Record<string, string> }).values;
}

describe("AppSettingsSeeder", () => {
  let pm: ReturnType<typeof stubPM>;

  beforeEach(() => {
    vi.restoreAllMocks();
    pm = stubPM();
  });

  afterEach(() => vi.restoreAllMocks());

  it("seeds the YAML values into a fresh app_settings row", async () => {
    pm.setFindResult([]);
    const added = await AppSettingsSeeder.run();

    expect(added).toBe(107);
    expect(pm.saves).toHaveLength(1);
    expect(pm.saves[0]!.collection).toBe("app_settings");
    const values = savedValues(pm);
    expect(values[AppSettingKeys.defaultStartLocation]).toBe(
      "/domain/lounge/warren",
    );
    expect(values[AppSettingKeys.evacuationFallback]).toBe("/domain/void");
    expect(values[AppSettingKeys.reactionsThreshold]).toBe("10");
    expect(values[AppSettingKeys.reactionsCadenceMs]).toBe("200");
    expect(values[AppSettingKeys.reactionsSampleCap]).toBe("5");
    expect(values[AppSettingKeys.forumsAntiSnowballMinVotes]).toBe("5");
    expect(values[AppSettingKeys.forumsAntiSnowballMinMinutes]).toBe("30");
    expect(values[AppSettingKeys.renownQualityWeight]).toBe("1");
  });

  it("is idempotent — a fully-populated row is left alone (no save)", async () => {
    pm.setFindResult([
      {
        _id: "r",
        values: {
          [AppSettingKeys.defaultStartLocation]: "/domain/lounge/warren",
          [AppSettingKeys.evacuationFallback]: "/domain/void",
          [AppSettingKeys.reactionsThreshold]: "10",
          [AppSettingKeys.reactionsCadenceMs]: "200",
          [AppSettingKeys.reactionsSampleCap]: "5",
          [AppSettingKeys.forumsAntiSnowballMinVotes]: "5",
          [AppSettingKeys.forumsAntiSnowballMinMinutes]: "30",
          [AppSettingKeys.renownDecayHalfLives]: "{}",
          [AppSettingKeys.renownContextMultipliers]: "{}",
          [AppSettingKeys.renownQualityWeight]: "1",
          [AppSettingKeys.renownReceptionValence]: "0.1",
          [AppSettingKeys.renownReceptionWindowS]: "300",
          [AppSettingKeys.participationBucketSeconds]: "600",
          [AppSettingKeys.participationDecayHalfLife]: "1209600",
          [AppSettingKeys.producerBucketSeconds]: "600",
          [AppSettingKeys.producerDecayHalfLife]: "1209600",
          [AppSettingKeys.influenceBandThresholds]: "[]",
          [AppSettingKeys.convictionBuildPeriodSeconds]: "604800",
          [AppSettingKeys.traitsDecayHalfLifeDays]: "180",
          [AppSettingKeys.traitsDefinedThreshold]: "20",
          [AppSettingKeys.traitsEntrenchedThreshold]: "60",
          [AppSettingKeys.traitsPronouncedThreshold]: "25",
          [AppSettingKeys.traitsCompatibilityScale]: "100",
          [AppSettingKeys.chatHistoryCap]: "200",
          [AppSettingKeys.chargenNameMinLength]: "2",
          [AppSettingKeys.chargenNameMaxLength]: "24",
          [AppSettingKeys.statusMaxLength]: "100",
          [AppSettingKeys.scriptSliceSteps]: "1000",
          [AppSettingKeys.scriptMaxStepsPlayer]: "10000",
          [AppSettingKeys.scriptMaxStepsPlatform]: "1000000",
          [AppSettingKeys.scriptMaxDispatchPlayer]: "500",
          [AppSettingKeys.scriptMaxDispatchPlatform]: "50000",
          [AppSettingKeys.scriptMaxDepthPlayer]: "64",
          [AppSettingKeys.scriptMaxDepthPlatform]: "256",
          [AppSettingKeys.bankingSalesTaxRate]: "0.08",
          [AppSettingKeys.bankingTreasuryAccount]: "treasury",
          // Banking onboarding coin + the three fast-travel fare keys.
          [AppSettingKeys.bankingOnboardingStipend]: "20",
          [AppSettingKeys.fasttravelNetworkFeeRate]: "0.15",
          [AppSettingKeys.fasttravelNetworkFeeBase]: "1",
          [AppSettingKeys.fasttravelTpaAccount]: "tpa",
          // The two social-graph baseline keys (Phase 1 additions).
          [AppSettingKeys.socialBaselineRules]: "{}",
          [AppSettingKeys.socialDefaultColor]: "neutral",
          // Social idle threshold (social-inspection).
          [AppSettingKeys.socialIdleAfter]: "300",
          // The two YouTube-relay (read-only) dials.
          [AppSettingKeys.youtubePollIntervalMs]: "5000",
          [AppSettingKeys.youtubeOverlayPollIntervalMs]: "900000",
          // The four news-ticker (bulletin) keys.
          [AppSettingKeys.bulletinTickerWindow]: "30",
          [AppSettingKeys.bulletinMaxPins]: "3",
          [AppSettingKeys.bulletinHeadlineMaxLength]: "120",
          [AppSettingKeys.bulletinBodyMaxLength]: "4000",
          // The three residency (self-eviction) keys.
          [AppSettingKeys.residencyEvictionMode]: "observe",
          [AppSettingKeys.residencyEvictionIntervalMs]: "60000",
          [AppSettingKeys.residencyEvictionIdleThresholdMs]: "1800000",
          // The 21 materials-response tuning keys.
          [AppSettingKeys.responseAttenuationDeflect]: "0.98",
          [AppSettingKeys.responseAttenuationResist]: "0.7",
          [AppSettingKeys.responseAttenuationAbsorb]: "0.75",
          [AppSettingKeys.responseAttenuationModerate]: "0.5",
          [AppSettingKeys.responseAttenuationPoor]: "0.2",
          [AppSettingKeys.responseAttenuationTransmit]: "0.1",
          [AppSettingKeys.responseAttenuationFail]: "0",
          [AppSettingKeys.responseMaterialHardnessRef]: "600",
          [AppSettingKeys.responseMaterialToughnessRef]: "200",
          [AppSettingKeys.responseMaterialScaleMax]: "1.5",
          [AppSettingKeys.responseMaterialHeightFloor]: "0.6",
          [AppSettingKeys.responseGradeMin]: "0.85",
          [AppSettingKeys.responseGradeMax]: "1.15",
          [AppSettingKeys.responseConditionMin]: "0.5",
          [AppSettingKeys.responseBluntFractureThreshold]: "1.5",
          [AppSettingKeys.responseNoWoundThreshold]: "0.25",
          [AppSettingKeys.responseSeverityPerResidual]: "1",
          [AppSettingKeys.responsePreviewReferenceEnergy]: "2",
          [AppSettingKeys.responseDeliverySecondaryFactor]: "0.6",
          [AppSettingKeys.responseBandGrazeMax]: "0.5",
          [AppSettingKeys.responseBandBiteMax]: "1.5",
          // The two behavior ambient-pacing keys.
          [AppSettingKeys.behaviorAmbientCadenceScale]: "1",
          [AppSettingKeys.behaviorAmbientCadenceFloorMs]: "60000",
          // The 20 combat (core 1v1) + 3 combat (Build 2) tuning keys.
          [AppSettingKeys.combatTickSeconds]: "3",
          [AppSettingKeys.combatPoisePressedBelow]: "0.75",
          [AppSettingKeys.combatPoiseReelingBelow]: "0.5",
          [AppSettingKeys.combatPoiseBrokenAt]: "0.25",
          [AppSettingKeys.combatPoiseOpeningTicks]: "2",
          [AppSettingKeys.combatPoiseErodePerExchange]: "0.12",
          [AppSettingKeys.combatPoiseOverextendCost]: "0.2",
          [AppSettingKeys.combatPoiseRestorePerDefense]: "0.15",
          [AppSettingKeys.combatPoiseWhiffPenalty]: "0.25",
          [AppSettingKeys.combatTempoBase]: "1",
          [AppSettingKeys.combatTempoEncumbrancePenalty]: "0.5",
          [AppSettingKeys.combatTempoEnduranceFloor]: "0.4",
          [AppSettingKeys.combatTempoMinRate]: "0.1",
          [AppSettingKeys.combatTempoMaxRate]: "3",
          [AppSettingKeys.combatEnergySteady]: "1.2",
          [AppSettingKeys.combatEnergyPressed]: "1.6",
          [AppSettingKeys.combatEnergyReeling]: "2.2",
          [AppSettingKeys.combatEnergyBroken]: "3",
          [AppSettingKeys.combatEnergyOpen]: "4.5",
          [AppSettingKeys.combatMaxBeats]: "200",
          [AppSettingKeys.combatCoupSeconds]: "6",
          [AppSettingKeys.combatRegardDuelWin]: "2",
          [AppSettingKeys.combatRegardUnlawfulKill]: "-20",
          // The 3 cycle-2 multi-party combat tuning keys.
          [AppSettingKeys.combatFocusFireErosionPerEdge]: "0.5",
          [AppSettingKeys.combatFocusFireSuppressRecoveryAt]: "2",
          [AppSettingKeys.combatFleePartingShotEnergy]: "1.6",
          // The 6 experience-pass combat tuning keys (feint + fog + sharpness).
          [AppSettingKeys.combatPoiseFeintCost]: "0.08",
          [AppSettingKeys.combatPoiseFeintBitPenalty]: "0.8",
          [AppSettingKeys.combatFogReadSharpness]: "0.7",
          [AppSettingKeys.combatFogClearSharpness]: "0.7",
          [AppSettingKeys.combatSharpnessMin]: "0.35",
          [AppSettingKeys.combatSharpnessMax]: "1",
        },
      },
    ]);
    const added = await AppSettingsSeeder.run();
    expect(added).toBe(0);
    expect(pm.saves).toHaveLength(0);
  });

  it("merges a missing key while preserving an operator-changed one", async () => {
    // Operator moved the spawn; the evac key predates the YAML / was wiped.
    pm.setFindResult([
      {
        _id: "r",
        values: { [AppSettingKeys.defaultStartLocation]: "/domain/custom" },
      },
    ]);
    const added = await AppSettingsSeeder.run();

    // Missing keys seeded: evacuationFallback + 3 reaction + 2 forum
    // anti-snowball + 5 renown + 2 participation + 2 producer + 1 influence
    // + 1 conviction + 5 traits + 1 chat + 2 chargen + 1 status + 7 script
    // + 2 banking + 2 youtube (pollIntervalMs, overlayPollIntervalMs)
    // + 3 social (social.baselineRules, social.defaultColor, social.idleAfter)
    // + 4 bulletin (tickerWindow, maxPins, headlineMaxLength, bodyMaxLength)
    // + 3 residency (eviction.mode, .intervalMs, .idleThresholdMs)
    // + 4 transit (banking.onboardingStipend + 3 fasttravel fare keys)
    // + 21 materials-response (7 attenuation + 4 material + 2 grade
    //   + condition + fracture + noWound + severityPerResidual
    //   + referenceEnergy + secondaryFactor + 2 band)
    // + 2 behavior (ambientCadenceScale, ambientCadenceFloorMs)
    // + 23 combat (20 core 1v1 + 3 Build 2)
    // + 3 multi-party combat (2 focus-fire + 1 flee)
    // + 6 experience combat (2 feint poise + 2 fog + 2 sharpness).
    expect(added).toBe(106);
    expect(pm.saves).toHaveLength(1);
    const values = savedValues(pm);
    // operator value preserved, missing keys seeded
    expect(values[AppSettingKeys.defaultStartLocation]).toBe("/domain/custom");
    expect(values[AppSettingKeys.evacuationFallback]).toBe("/domain/void");
    expect(values[AppSettingKeys.reactionsThreshold]).toBe("10");
  });
});
