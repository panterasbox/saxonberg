// CleanlinessApi — the thin, gated forwarding shell over CleanlinessLogic.
// ⭐ Only what belongs to NO one object lives here (review, B48): every act
// on a thing is the thing's own (`Soilable.washSite`, `brushOff`,
// `holdAtHeat`; `Hygiene.washHands`, `bathe`; `Garment.launderBy`;
// `Floor.sweepInto`…). A WASH of several things in one water spans the
// items, the water and the cleansers at once, so it is orchestrated here.
// See docs/subsystems/cleanliness.md.

import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { CleanlinessLogic } from "../platform/idea/api/CleanlinessLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';
import type { Stuff } from "../lib/stuff/Stuff";
import type { WashOutcome, WashSpec } from "../lib/cleanliness/Soilable";

/** Wash `items` together in one water (each is the others' co-wash). */
export interface WashTogetherRequest {
  items: readonly Stuff[];
  /** The water, the cleansers, the effort; `coWashed` is filled in. */
  spec: Omit<WashSpec, 'coWashed'>;
}

/** One washed thing and what the wash did to it. */
export interface WashTogetherResult {
  item: Stuff;
  outcome: WashOutcome;
}

const LOGIC_PATH = "/platform/idea/api/cleanliness";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/CleanlinessLogic", import.meta.url),
);

function logic(): CleanlinessLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "CleanlinessLogic",
      ) as typeof CleanlinessLogic | null) ?? CleanlinessLogic)(),
  );
}

export class CleanlinessApi {
  /**
   * ⭐ Wash several things together in ONE water (cleanliness D10): each is
   * washed by the spec with the rest as its co-wash — so an unfast dye
   * bleeds onto the others — and the cleansers are spent once per thing.
   */
  public static washTogether(request: WashTogetherRequest): WashTogetherResult[] {
    return logic().washTogether(request);
  }
}

SecurityApi.decorateApiClass(CleanlinessApi);
