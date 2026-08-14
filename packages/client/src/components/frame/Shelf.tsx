/**
 * `Shelf` — the widget shelf: the player-pinned row of figures across
 * the top bar.
 *
 * ⭐⭐ **This is where the honesty convention stops being a primitive
 * and becomes a posture.** Of the nine rows in the catalogue, **three
 * have a live server read and six do not** — so the shelf is mostly
 * hatched by construction. That is not a shortfall to apologise for; it
 * is the convention working. A shelf showing nine confident numbers
 * would be lying about six of them, and the whole claim of this product
 * is that its figures are real.
 *
 * ## The three hatch categories, and why they are three
 *
 * ⚠ The reasons are **three distinct claims** and must not collapse
 * into one generic string. They tell the next builder where to look,
 * and a single "not wired" would erase exactly that:
 *
 * 1. **`level`** (`MAKE`) — the value EXISTS and its *level* is wrong.
 *    The server returns a real band, but Make is an account-level stock
 *    and the account roll-up is unbuilt, so the number answers
 *    per-character for a per-person claim. A figure whose level is
 *    wrong is not a figure you can render. This is the one row where
 *    hatching hides a real number, which is why the reason string is
 *    load-bearing: it must say *why*, not merely that it is missing.
 * 2. **`unexposed`** (`COIN`, `STATUS`) — genuinely figures about you,
 *    simply not on the wire. A one-field addition unhatches each.
 * 3. ⭐ **`not-self`** (`TIME`, `ONLINE`, `DOCKET`) — **world** figures,
 *    not self fields. The `self` pane structurally cannot carry them no
 *    matter what is added to `Avatar`; they need a different source,
 *    and that is a design conversation rather than a field addition. A
 *    reason saying "no subscribable field yet" here would send the next
 *    builder looking in the wrong place.
 *
 * ⭐ The reason is derived from a **category**, not typed per row. This
 * is the `contrast.test.ts` totality-gate pattern: a row must be
 * classified, the categories are three strings in one table, and a test
 * asserts they are pairwise distinct. A per-row free-text reason decays
 * into the generic one the first time somebody copies a neighbouring
 * line — which is the decay the acceptance criterion defends against.
 *
 * ## Pinning is a command
 *
 * Clicking a catalogue entry sends `cockpit shelf pin <row>` and
 * mutates nothing locally; the server writes `cockpit.shelf` and pushes
 * it back. Hovering previews the identical string in the status bar.
 * ⚠ Preview and send are the SAME string by construction here — they
 * are one constant, not two call sites that happen to agree.
 *
 * ## The subscription
 *
 * One `self` pane, opened here in a `useEffect`, torn down on unmount —
 * byte-for-byte the shape `InspectionPane` established. No new service
 * layer and no second registry. Results land in the store rather than
 * component state so tests can drive the shelf without a socket.
 */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import type {
  MqlSubscriptionResultEnvelope,
  MqlSubscriptionDeltaEnvelope,
  Envelope,
  SelfFigureRecord,
  ShelfRowId,
} from "@saxonberg/types";
import { DEFAULT_SHELF, SHELF_ROW_IDS } from "@saxonberg/types";
import { websocketClient } from "../../services/websocket";
import { useStore } from "../../store/index";
import { Figure, tokens, type FigureState } from "../ui";

/** Why a row is not showing a number. See the ⚠ block above. */
export type HatchReason = "unexposed" | "not-self";

/**
 * The claims, in one table so a test can assert they differ.
 * ⚠ Editing one of these to match another is the regression — the
 * distinction between them is the information.
 *
 * ⚠⚠ **A third category, `level`, was RETIRED when the account roll-up
 * landed**, and retiring it mattered more than adding the figure did.
 * It read *"account arithmetic unbuilt — Make is account-level, and the
 * account roll-up is not built"*, and the moment `standingForAccount`
 * shipped that sentence became **false while still being displayed** —
 * it named a gap that had been closed and pointed the next reader at
 * work already done.
 *
 * This is the second time this exact failure has occurred here: the
 * round-trip row once claimed nothing measured round trip when the
 * protocol existed end to end. ⭐ **A reason pointing at the wrong
 * place is worse than no reason, because it is confidently actionable
 * and false** — so a build that closes a gap must retire the sentence
 * describing it in the same commit. A guard test greps for the retired
 * string.
 */
export const HATCH_COPY: Record<HatchReason, string> = {
  unexposed: "no subscribable field yet",
  "not-self":
    "not a figure about you — a world figure, which the self pane cannot carry",
};

export interface ShelfRow {
  readonly id: ShelfRowId;
  readonly label: string;
  /** What the figure would mean — shown in the `＋ widget` menu. */
  readonly desc: string;
  /** `live` = this build paints it; otherwise the hatch category. */
  readonly source: "live" | HatchReason;
}

/**
 * ⚠ The catalogue is the reference art's, and widening it is a design
 * decision rather than an implementation one. `LoadBearingMixin`
 * contributes three MORE live self fields (`borneBurden`,
 * `carryCapacity`, `loadRatio`) that are deliberately not here: the
 * shelf's live set is limited by this list, not by the wire.
 *
 * ⚠⚠ `trait` is absent and permanent — see `ShelfRowId`.
 */
export const SHELF_CATALOGUE: readonly ShelfRow[] = [
  {
    id: "play",
    label: "PLAY",
    desc: "influence · earned by living in the world",
    source: "live",
  },
  {
    id: "renown",
    label: "RENOWN",
    desc: "how widely you are known, and for what",
    source: "live",
  },
  {
    id: "skill",
    label: "SKILL",
    desc: "the competence you are practising",
    source: "live",
  },
  {
    id: "make",
    label: "MAKE",
    desc: "influence · earned by building",
    // ⭐ Live since the account roll-up landed. `makeStanding` joined
    // `PANES.self` in the same commit as the arithmetic, so the band on
    // the wire is the ACCOUNT's — the same figure `standing` and
    // `profile` report, through the same seam.
    source: "live",
  },
  {
    id: "coin",
    label: "COIN",
    desc: "what you are carrying",
    source: "unexposed",
  },
  {
    id: "status",
    label: "STATUS",
    desc: "the note others see beside your name",
    source: "unexposed",
  },
  {
    id: "time",
    label: "TIME",
    desc: "in-world clock and phase",
    source: "not-self",
  },
  {
    id: "online",
    label: "ONLINE",
    desc: "how many people are on",
    source: "not-self",
  },
  {
    id: "docket",
    label: "DOCKET",
    desc: "open measures you may vote on",
    source: "not-self",
  },
];

/**
 * How many shelf rows ride a narrow bar's glance-line.
 *
 * ⚠ **A CLIENT constant, and it has to be**: the server does not know
 * how wide a bar is, so this is a rendering decision, not a shelf
 * constraint. A shelf shorter than three simply shows what it has. It
 * lives here — beside the catalogue — rather than in the mobile bar,
 * because the shelf screen names the same number when it explains which
 * rows fit, and two surfaces disagreeing about "three" would be a
 * ridiculous bug to actually ship.
 */
export const GLANCE_ROWS = 3;

/**
 * The player's shelf: server-authoritative, with the shipped default
 * standing in until the first `client-state-update` lands, filtered to
 * known ids so a shelf saved before a row was retired cannot ask for a
 * row that is gone.
 *
 * ⭐ **One reader, three surfaces.** The desktop shelf, the mobile
 * glance-line and the pull-down all resolve `cockpit.shelf` through
 * this, so "what is pinned, and in what order" has exactly one answer.
 * Three copies of the filter is how a retired row survives in one place
 * and not another.
 */
export function pinnedShelf(
  clientState: Record<string, unknown>,
): ShelfRowId[] {
  const raw = clientState["cockpit.shelf"];
  return Array.isArray(raw)
    ? (raw as string[]).filter((r): r is ShelfRowId =>
        (SHELF_ROW_IDS as readonly string[]).includes(r),
      )
    : [...DEFAULT_SHELF];
}

/** The command a pin / unpin affordance sends. ONE definition, so the */
/** preview and the send cannot drift into two strings that agree today. */
export function pinCommand(row: ShelfRowId): string {
  return `cockpit shelf pin ${row}`;
}
export function unpinCommand(row: ShelfRowId): string {
  return `cockpit shelf unpin ${row}`;
}
/**
 * ⭐ Move a row to the head of the shelf — and so onto the glance-line,
 * since a phone's bar shows the head. `first` pins the row if it was
 * not pinned, which is why the mobile shelf screen offers it on
 * unpinned rows too.
 */
export function firstCommand(row: ShelfRowId): string {
  return `cockpit shelf first ${row}`;
}

/**
 * Wire → honest state, one mapping per live row.
 *
 * ⚠ **Exported, because the mobile bar and the pull-down render the
 * same rows.** Two copies of this switch is exactly the decay the
 * category table prevents on the reason side: a live row added here and
 * not there would show a number on one form factor and a hatch on the
 * other, for the same field, at the same instant.
 *
 * ⭐ A `renown` of `0` is **live**, not empty. The server now
 * distinguishes "measured and found neutral" from "never materialized"
 * — the latter omits the key entirely — so a `{value: 0}` that reaches
 * here genuinely means the answer is zero, which is a real figure. An
 * earlier cut rendered every zero as empty, which was choosing which
 * way to be wrong rather than fixing it.
 */
export function figureFor(
  row: ShelfRow,
  figures: SelfFigureRecord | null,
): FigureState {
  if (row.source !== "live") {
    return { state: "unwired", reason: HATCH_COPY[row.source] };
  }
  switch (row.id) {
    case "play": {
      const band = figures?.playStanding?.band;
      return band === undefined
        ? { state: "empty", reason: "not resolved for this session" }
        : // A band floor (`dormant`) is a real derivation, not an
          // absence — the server measured and this is the answer.
          { state: "live", value: band };
    }
    case "make": {
      const band = figures?.makeStanding?.band;
      // ⚠ Absent means the server could not resolve the account — it
      // does NOT mean zero, and it must not fall back to a
      // per-character figure. That substitution is the defect the
      // roll-up was built to end.
      return band === undefined
        ? { state: "empty", reason: "no account resolved for this session" }
        : { state: "live", value: band };
    }
    case "renown": {
      const value = figures?.renown?.value;
      return value === undefined
        ? { state: "empty", reason: "no renown recorded yet" }
        : { state: "live", value: String(value) };
    }
    case "skill": {
      const c = figures?.practisingCompetence;
      if (c === undefined) {
        // Absent ≠ null: the transcript fold had not landed when this
        // record was projected, and a later poke will bring it.
        return { state: "empty", reason: "the transcript fold has not landed yet" };
      }
      if (c === null) {
        return { state: "empty", reason: "nothing being practised" };
      }
      return { state: "live", value: `${c.discipline} · ${c.band}` };
    }
    default:
      // Unreachable while every `live` row is handled above. A new live
      // row without a mapping hatches rather than printing nothing.
      return { state: "unwired", reason: HATCH_COPY.unexposed };
  }
}

const Rack = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  /*
   * ⚠ WRAPS, never scrolls. Nothing the player pinned may be out of
   * sight — a horizontally scrolling shelf hides figures behind a
   * gesture, which is the same failure as not rendering them.
   */
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
  row-gap: ${tokens.space.xs};
`;

const Chip = styled(Figure)`
  flex: none;
`;

const AddButton = styled.button`
  flex: none;
  height: 30px;
  background: transparent;
  border: 1px dashed ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgDim};
  font: inherit;
  font-size: ${tokens.font.small};
  padding: 0 ${tokens.space.sm};
  cursor: pointer;

  &:hover {
    background: ${tokens.color.surfaceMuted};
  }
`;

const MenuWrap = styled.div`
  position: relative;
  flex: none;
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + ${tokens.space.xs});
  /*
   * ⚠ Anchored RIGHT, opening leftward. Left-anchored it overflowed the
   * viewport by 15px at 1440 and made the whole page scroll sideways —
   * the add-widget button is the last item in the rack, so it always
   * sits near the right end and a 20rem menu hanging off it has nowhere
   * to go. Found by driving, not by the suite: jsdom has no layout, so
   * nothing short of a real browser could see it.
   */
  right: 0;
  z-index: 20;
  min-width: 20rem;
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  box-shadow: 0 2px 8px ${tokens.color.shadow};
  padding: ${tokens.space.xs};
`;

const MenuItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  font: inherit;
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  cursor: pointer;

  &:hover {
    background: ${tokens.color.surfaceMuted};
  }
`;

const MenuLabel = styled.span`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.fgDim};
  margin-right: ${tokens.space.sm};
`;

const MenuDesc = styled.span`
  color: ${tokens.color.fgDim};
`;

/**
 * The reason, as VISIBLE text. The chip carries it in `title` and the
 * accessible name; this menu is where it is readable without hovering,
 * which is what makes "each with its reason" true of the surface as a
 * whole rather than of a tooltip.
 */
const MenuReason = styled.div`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  margin-top: 2px;
`;

const MenuState = styled.span`
  float: right;
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

interface ShelfProps {
  /** Click-to-send a command (command-bus primacy). */
  onCommandClick?: (command: string) => void;
  /** Hover-preview a command in the status bar (`null` = stop). */
  onCommandPreview?: (command: string | null) => void;
}

/**
 * Open the `self` pane for as long as the caller is mounted, feeding
 * `store.shelfFigures`.
 *
 * ⭐⭐ **A HOOK, because the subscription belongs to whoever shows the
 * figures — and that is now two components.** It began as a `useEffect`
 * inside `Shelf`, which was correct while the desktop bar was the only
 * consumer. The mobile bar does not render `Shelf` at all, so the
 * glance-line and the pull-down shipped reading a `shelfFigures` that
 * **nothing ever populated**: every row rendered its honest empty state
 * forever, on a phone, for figures the server was perfectly willing to
 * send.
 *
 * ⚠⚠ **Eleven green unit tests did not catch it, and could not have:**
 * every one of them drives the store directly with
 * `useStore.setState({ shelfFigures })`, which is the seam that makes
 * the shelf testable without a socket — and is therefore blind to the
 * question *does anything ask for them?* This is the wake-vs-read
 * distinction the pane holds taught: a derive-on-read surface needs its
 * WAKE tested, not just its read. Found by driving.
 */
export function useSelfFigures(): void {
  useEffect(() => {
    // ⭐ Opened BY NAME. The server owns the query, the cardinality and
    // the field set — the client sends `pane: 'self'` and nothing else.
    const selfId = websocketClient.subscribeMql({ pane: "self" });

    const handleResult = (envelope: Envelope) => {
      const env = envelope as MqlSubscriptionResultEnvelope;
      if (env.subscriptionId !== selfId) return;
      const record = env.result[0] as SelfFigureRecord | undefined;
      useStore.getState().setShelfFigures(record ?? null);
    };

    const handleDelta = (envelope: Envelope) => {
      const env = envelope as MqlSubscriptionDeltaEnvelope;
      if (env.subscriptionId !== selfId) return;
      /*
       * ⚠ **The single-cardinality trap.** `self` is `cardinality:
       * 'one'`, so a slot replacement arrives as ONE `replace` keyed by
       * the NEW stuffId with the old entry implicitly evicted. The
       * generic `applyChanges` keys its lookup by stuffId, fails to
       * find the prior entry, and APPENDS a second record. This is the
       * bypass the location handler already documents at length: read
       * the changes directly and reduce to {replace, update, remove}.
       */
      const store = useStore.getState();
      for (const change of env.changes) {
        if (change.op === "remove") {
          store.setShelfFigures(null);
          continue;
        }
        if (change.op === "replace" || change.op === "add") {
          store.setShelfFigures({
            ...(change.fields as Partial<SelfFigureRecord>),
            stuffId: change.key,
          } as SelfFigureRecord);
          continue;
        }
        // `update` — the slot kept its identity, so MERGE. Replacing
        // wholesale would drop every field the poke did not touch.
        store.mergeShelfFigures(
          (change.fields ?? {}) as Partial<SelfFigureRecord>,
        );
      }
    };

    websocketClient.onEnvelope("mql-subscription-result", handleResult);
    websocketClient.onEnvelope("mql-subscription-delta", handleDelta);

    return () => {
      websocketClient.offEnvelope("mql-subscription-result", handleResult);
      websocketClient.offEnvelope("mql-subscription-delta", handleDelta);
      websocketClient.unsubscribe(selfId);
    };
  }, []);
}

export const Shelf: React.FC<ShelfProps> = ({
  onCommandClick,
  onCommandPreview,
}) => {
  const shelfFigures = useStore((s) => s.shelfFigures);
  const clientState = useStore((s) => s.clientState);
  const [menuOpen, setMenuOpen] = useState(false);

  useSelfFigures();

  const pinned = pinnedShelf(clientState);

  const byId = new Map(SHELF_CATALOGUE.map((r) => [r.id, r]));
  const rows = pinned
    .map((id) => byId.get(id))
    .filter((r): r is ShelfRow => r !== undefined);

  const preview = (command: string | null) => onCommandPreview?.(command);
  const send = (command: string) => {
    onCommandClick?.(command);
    setMenuOpen(false);
  };

  return (
    <Rack data-testid="shelf">
      {rows.map((row) => (
        <Chip
          key={row.id}
          variant="chip"
          label={row.label}
          figure={figureFor(row, shelfFigures)}
        />
      ))}
      <MenuWrap>
        <AddButton
          type="button"
          aria-label="Add or remove a shelf widget"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ＋ widget
        </AddButton>
        {menuOpen ? (
          <Menu role="menu" data-testid="shelf-menu">
            {SHELF_CATALOGUE.map((row) => {
              const isPinned = pinned.includes(row.id);
              const command = isPinned
                ? unpinCommand(row.id)
                : pinCommand(row.id);
              return (
                <MenuItem
                  key={row.id}
                  type="button"
                  role="menuitem"
                  data-command={command}
                  onMouseEnter={() => preview(command)}
                  onMouseLeave={() => preview(null)}
                  onFocus={() => preview(command)}
                  onBlur={() => preview(null)}
                  onClick={() => send(command)}
                >
                  <MenuState>{isPinned ? "pinned" : "—"}</MenuState>
                  <MenuLabel>{row.label}</MenuLabel>
                  <MenuDesc>{row.desc}</MenuDesc>
                  {row.source === "live" ? null : (
                    <MenuReason>{HATCH_COPY[row.source]}</MenuReason>
                  )}
                </MenuItem>
              );
            })}
          </Menu>
        ) : null}
      </MenuWrap>
    </Rack>
  );
};
