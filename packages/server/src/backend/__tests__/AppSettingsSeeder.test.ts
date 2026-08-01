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

    expect(added).toBe(285); // 146 base + 7 Attendant+Goodkin + 19 storms-and-wetness + 17 concealment/detection/hazard/movement + 12 stealth-deployables + 2 residency reset + 2 retail consignment + 15 fire (3 heat-channel + 4 combustion + 3 tick/spread + 5 chemistry) + 20 magic (3 cast + 7 faculty pool/recovery + 4 composure + 1 potency + 2 overchannel + 3 effect magnitudes) + 3 combat formations + 4 work-contracts (banking.defaultCustodianBank + 3 contract.*) + 4 combat-hooks (3 influence + combat.natural.largeBodyMassKg) + 4 kick relay (replayWindowSec + dedupTtlSec + dedupMaxSize + resolveCacheTtlMs) + 11 crafting (broken + delivery floors, wear-per-use, 3 keenness, repair pricing/heat, salvageRate) + 13 husbandry (step/maxSteps, vigor tau, goodAt, deathAt, rootFloor, 3 bands, 2 warmth, 2 soil nutrient, 4 grade ladder) + 2 sandbox (sweeper.intervalMs + session.graceMs)
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
    expect(values[AppSettingKeys.concealmentPassiveBaseline]).toBe("0");
    expect(values[AppSettingKeys.detectionCapacityPerBand]).toBe("3");
    expect(values[AppSettingKeys.concealmentSearchBonus]).toBe("4");
    expect(values[AppSettingKeys.concealmentHintCutoff]).toBe("4");
    expect(values[AppSettingKeys.concealmentExamineBonus]).toBe("2");
    expect(values[AppSettingKeys.movementAttentionSneak]).toBe("2");
    expect(values[AppSettingKeys.movementAttentionRun]).toBe("-2");
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
          [AppSettingKeys.fasttravelTpaBusinessPath]:
            "/domain/terminus/terminal/tpa",
          // The two social-graph baseline keys (Phase 1 additions).
          [AppSettingKeys.socialBaselineRules]: "{}",
          [AppSettingKeys.socialDefaultColor]: "neutral",
          // Social idle threshold (social-inspection).
          [AppSettingKeys.socialIdleAfter]: "300",
          // The two YouTube-relay (read-only) dials.
          [AppSettingKeys.youtubePollIntervalMs]: "5000",
          [AppSettingKeys.youtubeOverlayPollIntervalMs]: "900000",
          [AppSettingKeys.kickReplayWindowSec]: "300",
          [AppSettingKeys.kickDedupTtlSec]: "900",
          [AppSettingKeys.kickDedupMaxSize]: "4096",
          [AppSettingKeys.kickResolveCacheTtlMs]: "3600000",
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
          // The 4 Attendant+Goodkin banking keys (withdrawal quota ×2,
          // corpo royalty, opening float).
          [AppSettingKeys.bankingWithdrawalDailyCap]: "500",
          [AppSettingKeys.bankingWithdrawalDailyCapCircle]: "2000",
          [AppSettingKeys.bankingCorpoRoyaltyRate]: "0.1",
          [AppSettingKeys.bankingOpeningFloat]: "500",
          // The 3 Attendant lease/queue idle-eviction keys.
          [AppSettingKeys.attendantLeaseSweepIntervalMs]: "15000",
          [AppSettingKeys.attendantLeaseIdleThresholdMs]: "120000",
          [AppSettingKeys.attendantQueueIdleThresholdMs]: "180000",
          // The 6 experience-pass combat tuning keys (feint + fog + sharpness).
          [AppSettingKeys.combatPoiseFeintCost]: "0.08",
          [AppSettingKeys.combatPoiseFeintBitPenalty]: "0.8",
          [AppSettingKeys.combatFogReadSharpness]: "0.7",
          [AppSettingKeys.combatFogClearSharpness]: "0.7",
          [AppSettingKeys.combatSharpnessMin]: "0.35",
          [AppSettingKeys.combatSharpnessMax]: "1",
          // The 23 weapon-playstyle combat tuning keys (15 weapon-profile
          // + 3 reach + 5 hand-slot).
          [AppSettingKeys.combatWeaponBalanceRefMass]: "0.9",
          [AppSettingKeys.combatWeaponTempoExponent]: "0.35",
          [AppSettingKeys.combatWeaponTempoMin]: "0.5",
          [AppSettingKeys.combatWeaponTempoMax]: "1.6",
          [AppSettingKeys.combatWeaponPoiseDamageExponent]: "0.4",
          [AppSettingKeys.combatWeaponPoiseDamageMin]: "0.6",
          [AppSettingKeys.combatWeaponPoiseDamageMax]: "1.5",
          [AppSettingKeys.combatWeaponOverextendExponent]: "0.35",
          [AppSettingKeys.combatWeaponOverextendMin]: "0.6",
          [AppSettingKeys.combatWeaponOverextendMax]: "1.5",
          [AppSettingKeys.combatWeaponBalanceHeavyBelow]: "0.92",
          [AppSettingKeys.combatWeaponBalanceLightAbove]: "1.08",
          [AppSettingKeys.combatWeaponReachShortBelow]: "0.5",
          [AppSettingKeys.combatWeaponReachLongAbove]: "1.5",
          [AppSettingKeys.combatWeaponGuardHardnessRef]: "300",
          [AppSettingKeys.combatReachCloseCost]: "0.18",
          [AppSettingKeys.combatReachAdvantageEnergy]: "0.2",
          [AppSettingKeys.combatReachContestStrength]: "1",
          [AppSettingKeys.combatSwitchSeconds]: "6",
          [AppSettingKeys.combatDrawSeconds]: "1.5",
          [AppSettingKeys.combatOffhandGuardBonus]: "0.6",
          [AppSettingKeys.combatDualWieldMasteryRank]: "2",
          [AppSettingKeys.combatDualWieldNoviceGuardBonus]: "-0.3",
          // The 16 electricity (shock channel + conduction) tuning keys.
          [AppSettingKeys.electricityBodyDryResistanceOhms]: "100000",
          [AppSettingKeys.electricityBodyWetFactor]: "100",
          [AppSettingKeys.electricityBodyGeometryFactor]: "20000",
          [AppSettingKeys.electricityContactGeometryFactor]: "0.01",
          [AppSettingKeys.electricityContactMaxOhms]: "1000000000000",
          [AppSettingKeys.electricityResistanceFloorOhms]: "1",
          [AppSettingKeys.electricityLetGoAmps]: "0.01",
          [AppSettingKeys.electricityTetanicAmps]: "0.02",
          [AppSettingKeys.electricityFibrillationAmps]: "0.1",
          [AppSettingKeys.electricityBurnThresholdAmps]: "0.02",
          [AppSettingKeys.electricityBurnSeverityPerAmp]: "10",
          [AppSettingKeys.electricityPoolMinConductivity]: "0.005",
          [AppSettingKeys.electricityInsulatorMaxConductivity]: "0.001",
          [AppSettingKeys.electricityArmorConductiveSkinFactor]: "0.15",
          [AppSettingKeys.electricitySustainBurnPerAmpSec]: "2",
          [AppSettingKeys.electricityArrestDrivePerSec]: "40",
          // The 5 concealment (detection gate — Phase 1) tuning keys.
          [AppSettingKeys.concealmentLevelSubtle]: "2",
          [AppSettingKeys.concealmentLevelHidden]: "4",
          [AppSettingKeys.concealmentLevelDeep]: "7",
          [AppSettingKeys.concealmentLevelBuried]: "11",
          [AppSettingKeys.concealmentHiddenDefaultLevel]: "hidden",
          // The 2 detection (Phase 2) dials.
          [AppSettingKeys.concealmentPassiveBaseline]: "0",
          [AppSettingKeys.detectionCapacityPerBand]: "3",
          // The 5 detection search / hint (Phase 3) dials.
          [AppSettingKeys.concealmentSearchBonus]: "4",
          [AppSettingKeys.concealmentSearchDepthBonus]: "3",
          [AppSettingKeys.concealmentSearchSeconds]: "4",
          [AppSettingKeys.concealmentHintCutoff]: "4",
          [AppSettingKeys.concealmentExamineBonus]: "2",
          // The 3 hazard (Phase 4) dials.
          [AppSettingKeys.hazardPinSeconds]: "6",
          [AppSettingKeys.hazardDropFallEnergy]: "4",
          [AppSettingKeys.hazardDisarmSeconds]: "5",
          // The 2 care↔speed movement attention (Phase 5) dials.
          [AppSettingKeys.movementAttentionSneak]: "2",
          [AppSettingKeys.movementAttentionRun]: "-2",
          [AppSettingKeys.wetnessEvaporationRatePct]: "1.25",
          [AppSettingKeys.wetnessWarmthFactor]: "0.03",
          [AppSettingKeys.wetnessWarmthReferenceK]: "295",
          [AppSettingKeys.wetnessRainAccrualPerHour]: "1.5",
          [AppSettingKeys.wetnessImmersionSaturation]: "1",
          [AppSettingKeys.wetnessBandDampAt]: "0.15",
          [AppSettingKeys.wetnessBandWetAt]: "0.45",
          [AppSettingKeys.wetnessBandSoakedAt]: "0.8",
          [AppSettingKeys.wetnessAbsorptionCapacityDefaultPct]: "5",
          [AppSettingKeys.stormPuddleAccrualLitersPerSegment]: "12",
          [AppSettingKeys.stormPuddleEvaporationFactor]: "0.2",
          [AppSettingKeys.stormPuddleFreshWaterMaterialPath]:
            "/lib/material/bulk/water",
          [AppSettingKeys.stormStrikeRate]: "0.15",
          [AppSettingKeys.stormStrikeIntervalS]: "1800",
          [AppSettingKeys.stormStrikeVoltage]: "30000000",
          [AppSettingKeys.stormAttractorBias]: "4",
          [AppSettingKeys.weatherCloudDimFactor]: "0.6",
          [AppSettingKeys.weatherSkyForecastSegments]: "2",
          [AppSettingKeys.thermalWetHeatLossFactor]: "1.5",
          [AppSettingKeys.stealthHideCompetencePerBand]: "2",
          [AppSettingKeys.stealthHideCoverWeight]: "1",
          [AppSettingKeys.stealthHideLightWeight]: "1",
          [AppSettingKeys.stealthHideStillnessBonus]: "1",
          [AppSettingKeys.stealthHideBandSubtle]: "0",
          [AppSettingKeys.stealthHideBandHidden]: "4",
          [AppSettingKeys.stealthHideBandDeep]: "7",
          [AppSettingKeys.stealthHideBandBuried]: "10",
          [AppSettingKeys.movementConcealmentSneak]: "0",
          [AppSettingKeys.movementConcealmentWalk]: "1",
          [AppSettingKeys.movementConcealmentRun]: "99",
          [AppSettingKeys.combatAmbushPoisePenalty]: "0.85",
          [AppSettingKeys.residencyResetMode]: "enforce",
          [AppSettingKeys.residencyResetIntervalS]: "3600",
          [AppSettingKeys.retailConsignmentListingCap]: "5",
          [AppSettingKeys.retailConsignmentCommissionRate]: "0.15",
          [AppSettingKeys.responseHeatBaseAttenuation]: "0.9",
          [AppSettingKeys.responseHeatInsulationRefConductivity]: "2.0",
          [AppSettingKeys.responseHeatDepthFactor]: "0.1",
          [AppSettingKeys.fireBurnRatePerMin]: "0.5",
          [AppSettingKeys.fireFlameTemperatureK]: "1000",
          [AppSettingKeys.fireIgnitionWaterLatentHeatJPerKg]: "2260000",
          [AppSettingKeys.fireIgnitionMaxManualDryingK]: "150",
          [AppSettingKeys.fireTickIntervalSeconds]: "30",
          [AppSettingKeys.fireRadiantJoulesPerTick]: "700000",
          [AppSettingKeys.fireCrossBoundaryFraction]: "0.4",
          [AppSettingKeys.fireFlameTemperatureIncompleteK]: "750",
          [AppSettingKeys.fireAirConsumePerTick]: "8",
          [AppSettingKeys.fireAirReplenishPerTick]: "30",
          [AppSettingKeys.fireAirCompleteThresholdPct]: "40",
          [AppSettingKeys.respirationContaminantBurdenPerBreath]: "5",
          [AppSettingKeys.bankingDefaultCustodianBank]: "goodkin",
          [AppSettingKeys.contractClaimExpiryGameHours]: "48",
          [AppSettingKeys.contractPostingExpiryDefaultGameHours]: "0",
          [AppSettingKeys.contractBreachRegardPenalty]: "15",
          [AppSettingKeys.magicCastSecondsDefault]: "3",
          [AppSettingKeys.magicCostDefault]: "15",
          [AppSettingKeys.magicAbortCostFraction]: "0",
          [AppSettingKeys.magicDepthCapacityLow]: "80",
          [AppSettingKeys.magicDepthCapacityMid]: "120",
          [AppSettingKeys.magicDepthCapacityHigh]: "180",
          [AppSettingKeys.magicRecoveryPerMinBase]: "1.5",
          [AppSettingKeys.magicSerenityFactorLow]: "0.6",
          [AppSettingKeys.magicSerenityFactorMid]: "1",
          [AppSettingKeys.magicSerenityFactorHigh]: "1.6",
          [AppSettingKeys.magicComposureBaseLow]: "0.7",
          [AppSettingKeys.magicComposureBaseMid]: "1",
          [AppSettingKeys.magicComposureBaseHigh]: "1.4",
          [AppSettingKeys.magicComposureFloorFactor]: "0.4",
          [AppSettingKeys.magicPotencyCompetenceFactor]: "0.25",
          [AppSettingKeys.magicOverchannelSeverityPerDeficit]: "0.1",
          [AppSettingKeys.magicOverchannelClearThreshold]: "0.5",
          [AppSettingKeys.magicDreadDecayPerSec]: "0.005",
          [AppSettingKeys.magicGlowlightLumens]: "500",
          [AppSettingKeys.magicConjureWaterLitres]: "1",
          [AppSettingKeys.combatFormationInterceptMaxIncoming]: "2",
          [AppSettingKeys.combatFormationHighThreatEdges]: "2",
          [AppSettingKeys.combatFormationCoupDirectiveWindowSeconds]: "12",
          [AppSettingKeys.combatInfluenceStaggerLightErode]: "0.12",
          [AppSettingKeys.combatInfluenceStaggerHeavyErode]: "0.3",
          [AppSettingKeys.combatInfluenceSteadyRestore]: "0.15",
          [AppSettingKeys.combatNaturalLargeBodyMassKg]: "150",
          [AppSettingKeys.craftingBrokenThreshold]: "0.1",
          [AppSettingKeys.craftingBrokenDeliveryFloor]: "0.35",
          [AppSettingKeys.craftingWearWeaponPerStrike]: "0.004",
          [AppSettingKeys.craftingWearArmorPerBlow]: "0.004",
          [AppSettingKeys.craftingKeennessWearPerUse]: "0.08",
          [AppSettingKeys.craftingKeennessDeliveryFloor]: "0.7",
          [AppSettingKeys.craftingKeennessSharpenDurationMs]: "12000",
          [AppSettingKeys.craftingSalvageRate]: "0.5",
          [AppSettingKeys.craftingRepairCostFactor]: "0.6",
          [AppSettingKeys.craftingRepairBrokenFactor]: "2",
          [AppSettingKeys.craftingRepairMetalHeatK]: "900",
          [AppSettingKeys.husbandryStepSec]: "43200",
          [AppSettingKeys.husbandryMaxSteps]: "2000",
          [AppSettingKeys.husbandryVigorTauSec]: "3801600",
          [AppSettingKeys.husbandryGoodAt]: "0.6",
          [AppSettingKeys.husbandryDeathAt]: "0.12",
          [AppSettingKeys.husbandryRootFloor]: "0.4",
          [AppSettingKeys.husbandryBandThrivingAt]: "0.8",
          [AppSettingKeys.husbandryBandHealthyAt]: "0.55",
          [AppSettingKeys.husbandryBandStressedAt]: "0.3",
          [AppSettingKeys.husbandryWarmthFactor]: "0.03",
          [AppSettingKeys.husbandryWarmthReferenceK]: "295",
          [AppSettingKeys.husbandryNutrientHappyAt]: "0.5",
          [AppSettingKeys.husbandryNutrientSpentAt]: "0.05",
          [AppSettingKeys.husbandryGradeFairAt]: "0.35",
          [AppSettingKeys.husbandryGradeFineAt]: "0.6",
          [AppSettingKeys.husbandryGradeExceptionalAt]: "0.8",
          [AppSettingKeys.husbandryGradeMasterfulAt]: "0.95",
          [AppSettingKeys.sandboxSweeperIntervalMs]: "300000",
          [AppSettingKeys.sandboxSessionGraceMs]: "600000",
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
    // + 6 experience combat (2 feint poise + 2 fog + 2 sharpness)
    // + 23 weapon-playstyle combat (15 weapon-profile + 3 reach + 5 hand-slot)
    // + 16 electricity (shock channel + conduction)
    // + 7 Attendant+Goodkin (4 banking + 3 lease/queue)
    // + 19 storms-and-wetness (8 wetness + 7 storm + 2 weather + 1 thermal + 1 absorptionCap)
    // + 17 concealment/detection/hazard/movement (5+2+5+3+2, Phases 1-5)
    // + 12 stealth-deployables (8 stealth.hide + 3 movement.concealment + 1 combat.ambush)
    // + 2 residency reset (mode + intervalS)
    // + 2 retail consignment (listingCap + commissionRate)
    // + 15 fire (3 heat-channel + 4 combustion + 3 tick/spread + 5 chemistry)
    // + 20 magic (cast + faculty + composure + potency + overchannel + effects)
    // + 3 combat formations
    // + 4 work-contracts (banking.defaultCustodianBank + 3 contract.*)
    // + 4 combat-hooks (stagger light/heavy + steady + natural.largeBodyMassKg)
    // + 4 kick relay (replayWindowSec + dedupTtlSec + dedupMaxSize
    //   + resolveCacheTtlMs)
    // + 11 crafting (broken + delivery floors, wear-per-use, 3 keenness,
    //   repair pricing/heat, salvageRate)
    // + 11 husbandry (step/maxSteps, vigor tau, goodAt, deathAt, rootFloor,
    //   3 bands, 2 warmth)
    // + 2 sandbox (sweeper.intervalMs + session.graceMs).
    expect(added).toBe(284); // 285 total − 1 operator-preset key
    expect(pm.saves).toHaveLength(1);
    const values = savedValues(pm);
    // operator value preserved, missing keys seeded
    expect(values[AppSettingKeys.defaultStartLocation]).toBe("/domain/custom");
    expect(values[AppSettingKeys.evacuationFallback]).toBe("/domain/void");
    expect(values[AppSettingKeys.reactionsThreshold]).toBe("10");
  });
});
