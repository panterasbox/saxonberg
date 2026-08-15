/**
 * InspectionCard — persistent right-column card sourced from two
 * MQL subscriptions: a `$focus`-bearing query (`focusDependent`)
 * for the focused-thing body, and a `here`-bearing query
 * (`locationDependent`) for the breadcrumb root.
 *
 * Subscribes on mount via `websocketClient.subscribeMql(spec)`; tears
 * down on unmount via `websocketClient.unsubscribe(id)`. The header
 * is always-live (any focus change updates it); the body is
 * paint/clear gated per the inspection-card principle: *focus is a
 * pointer; look is the verb that paints what the pointer points at*.
 *
 * **Body = percept projection, not state dump.** Per the
 * inspection-card reconciliation, the body renders ONLY what a
 * perception verb would reveal to *this viewer* — the focused
 * thing's description and its visible contents. Internal property
 * state (slot maps, mixin lists, raw fields) is NOT pulled into
 * the player body just because the subscription detail field-set
 * could carry it; raw state lives in the admin extras (role-gated)
 * exclusively. The detail subscription already projects only
 * percept-shaped fields server-side; this component preserves the
 * discipline on the render side.
 *
 * **Accumulate vs. latest — v1 ships latest-only.** Each
 * subscription result / delta replaces `cardLastResult` in place;
 * there is no per-fact union across multiple `look` / `examine` /
 * `measure` calls. The full revelation-condition spine (per-fact
 * provenance, accumulation across modalities) is parked per the
 * reconciliation handoff. Latest-only stays internally consistent
 * because the substrate re-projects the *currently-perceivable*
 * set on every re-resolve.
 *
 * Paint/clear policy (lives in the Zustand `inspection-card` slice,
 * not in this component's state):
 *
 * - On mount: cleared.
 * - On any subscription delta where the focus fragment changed
 *   compared to the slice's stored fragment: clear + push to
 *   breadcrumbs.
 * - On an outgoing `look` command (bare or against the current
 *   focus): paint. The fragment-change-clears rule applies on
 *   focus-verb usage only (see `App.tsx`'s `sendCommand` for the
 *   client-side verb detection).
 * - While painted: subscription deltas update `cardLastResult` and
 *   the body re-renders in place.
 * - While cleared: deltas still update `cardLastResult` (cache stays
 *   warm) but the body shows the placeholder.
 *
 * Body branches on result cardinality:
 *
 * - Single record → detail view (header name + descriptions via
 *   `MmlRenderer` + clickable visible contents list).
 * - Multi record → list view, one row per match. The shape will
 *   eventually project a group via `GroupApi` (per grouping-slate);
 *   v1 just renders a list of styled names with `stuff-id` already
 *   threaded so the future bucket-selector lands without component
 *   changes.
 *
 * Styling: every color / spacing / font value resolves through
 * `ui/tokens.ts`. The `data-stuff-id` attribute rides every
 * clickable name affordance (via `<EntityName>`) — one attribute,
 * double duty (interactivity + future social-graph bucket
 * coloring) per the message-rendering slate.
 */

import React, { useEffect } from "react";
import styled from "styled-components";
import type {
  Envelope,
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionResultEnvelope,
  StuffDetailRecord,
  StuffRefRecord,
  WireDetailEntry,
} from "@saxonberg/types";
import { useStore } from "../store/index";
import { websocketClient } from "../services/websocket";
import { MmlRenderer } from "./MmlRenderer";
import { Button, EntityName, List, ListItem, tokens } from "./ui";
import { mediaUrl } from "../config";

/**
 * ⚠⚠ **`$embedded` is the card living INSIDE a card, and it is the
 * default arrangement now.**
 *
 * Standalone, this was the whole right column: its own width, its own
 * border, its own `overflow: hidden` and its own inner scroll. Sitting
 * under a stack of cards all four are wrong — the fixed width fights
 * the column, the border draws a seam mid-list, and the inner scroll
 * **absorbs the overflow so the cards above can never scroll**. That
 * last one is why the feed felt stuck: the list was never the thing
 * overflowing.
 */
const CardContainer = styled.aside<{ $embedded?: boolean }>`
  display: flex;
  flex-direction: column;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};

  ${(p) =>
    p.$embedded
      ? `
    width: 100%;
    min-width: 0;
    max-width: 100%;
    background: transparent;
    overflow: visible;
  `
      : `
    width: 360px;
    min-width: 360px;
    max-width: 360px;
    height: 100%;
    background: ${tokens.color.surface};
    color: ${tokens.color.fg};
    border-left: 1px solid ${tokens.color.border};
    overflow: hidden;
  `}
`;

/** The embedded card's one control, below the body rather than above it. */
const EmbeddedActions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: ${tokens.space.sm};
`;

const Breadcrumbs = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm} ${tokens.space.md};
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceMuted};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceAlt};
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-weight: 700;
  color: ${tokens.color.fgEmphasis};
  font-size: ${tokens.font.title};
  word-break: break-word;
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${tokens.space.lg};
  white-space: pre-wrap;
  line-height: 1.5;
  /* The inspected-content body is world prose — render it in the
     narrative serif so the card reads like the transcript's look frame
     (description + exits + contents). The card chrome (breadcrumbs,
     header, Refresh) sits OUTSIDE this Body and stays sans. Children
     (BodyProse/MmlRenderer, EntityName, Button) all font:inherit, so
     they pick this up; pre/code keep mono by element-level specificity. */
  font-family: ${tokens.font.serif};
`;

const Illustration = styled.img`
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: ${tokens.space.lg};
`;

const BodyProse = styled.div`
  margin-bottom: ${tokens.space.lg};
`;

const ExitsBlock = styled.div`
  margin-bottom: ${tokens.space.lg};
  color: ${tokens.color.fgMuted};
`;

const ContentsBlock = styled.div`
  margin-bottom: ${tokens.space.lg};
`;

/**
 * Inline system label — matches `<sys>` in MmlRenderer so the card
 * and the terminal scroll share the same visual treatment for
 * structural chrome ("Exits:", "Contents:"). Muted italic with a
 * decorative `── ` prefix carried via `::before` so screen readers
 * announce just the label text.
 */
const SystemLabel = styled.span`
  color: ${tokens.color.fgMuted};
  font-style: italic;

  &::before {
    content: '── ';
    color: ${tokens.color.borderMuted};
    font-style: normal;
  }
`;

const ContentsLabel = styled.div`
  margin-bottom: ${tokens.space.xs};
`;

/**
 * Current-position breadcrumb tail — the detail key the player has
 * descended into. Plain muted styling (no decorative prefix); the
 * chevron-separated layout already says "this is the trail's end."
 */
const CurrentSegment = styled.span`
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;

const TagSuffix = styled.span`
  color: ${tokens.color.fgMuted};
  margin-left: ${tokens.space.md};
`;

export interface InspectionCardProps {
  /**
   * Render inside a card card rather than as its own column.
   *
   * Suppresses the card's own header — the card's header carries the
   * name — and drops the width, border and inner scroll that only make
   * sense for a standalone column.
   */
  embedded?: boolean;
  /**
   * Outbound command sink. Routes through the same path
   * `CommandBar.onSend` does, so breadcrumb clicks, the Refresh
   * button, contents-row clicks, and admin extras all ride the
   * command bus uniformly. Wired by `App.tsx` to its `sendCommand`.
   */
  onSendCommand: (text: string) => void;
  /**
   * Hover-preview channel. Mousing over any affordance in the card
   * (breadcrumb, Refresh button, placeholder, exit, contents row,
   * MML tag inside the long description, admin action button)
   * fires `onCommandPreview(command)` with the command that
   * affordance would send; mouseleave fires `onCommandPreview(null)`.
   * Wired by `App.tsx` to the same handler the terminal scroll's
   * MmlRenderer uses, so the cockpit command bar mirrors what's
   * about to be sent uniformly across surfaces.
   */
  onCommandPreview?: (command: string | null) => void;
}

/**
 * Apply a wire `Change[]` batch to the card's cached result snapshot.
 *
 * Keys are the substrate's per-record stable key — for flat-mode
 * subscriptions that's the `stuffId`. The four `op` shapes:
 *
 * - `add`: a record entered the result set. Append.
 * - `remove`: a record left the result set. Drop by key.
 * - `replace`: a record's full projection changed in place. Overwrite.
 * - `update`: a record's field-level partial. Merge fields-present.
 *
 * Records lacking a `stuffId` (theoretically possible for non-Stuff
 * projections; not used by `me.focus` today) are tolerated by keying
 * on the change's explicit `key`.
 */
function applyChanges(
  previous: ReadonlyArray<StuffRefRecord | StuffDetailRecord>,
  changes: ReadonlyArray<{
    op: "replace" | "update" | "add" | "remove";
    key: string;
    fields?: Partial<StuffRefRecord | StuffDetailRecord>;
  }>
): (StuffRefRecord | StuffDetailRecord)[] {
  const next = previous.slice();
  for (const change of changes) {
    const idx = next.findIndex((r) => r.stuffId === change.key);
    if (change.op === "remove") {
      if (idx >= 0) next.splice(idx, 1);
      continue;
    }
    if (change.op === "add") {
      if (change.fields) {
        next.push({
          ...(change.fields as StuffDetailRecord),
          stuffId: change.key,
          displayName:
            (change.fields as Partial<StuffDetailRecord>).displayName ?? "",
        });
      }
      continue;
    }
    if (change.op === "replace") {
      const replacement = {
        ...(change.fields as StuffDetailRecord),
        stuffId: change.key,
        displayName:
          (change.fields as Partial<StuffDetailRecord>).displayName ?? "",
      };
      if (idx >= 0) {
        next[idx] = replacement;
      } else {
        next.push(replacement);
      }
      continue;
    }
    // op === 'update' — field-level merge.
    if (idx >= 0 && change.fields) {
      next[idx] = {
        ...next[idx],
        ...change.fields,
      } as StuffRefRecord | StuffDetailRecord;
    }
  }
  return next;
}

/**
 * Cardinality-aware empty-body placeholder text per the
 * requirements: single → "focused — `look` to inspect"; multi →
 * "N <summary> focused — `look` to list".
 */
function placeholderText(
  result: (StuffRefRecord | StuffDetailRecord)[] | null,
  fragment: string
): string {
  if (!result || result.length === 0) {
    return fragment
      ? `${fragment || "nothing"} focused — \`look\` to inspect`
      : "nothing focused — `look` to inspect";
  }
  if (result.length === 1) {
    return "focused — `look` to inspect";
  }
  const summary = fragment || "matches";
  return `${result.length} ${summary} focused — \`look\` to list`;
}

/**
 * Pick the display name for the live-header position. For a single
 * record: the record's display name. For multi: the raw focus
 * fragment string (the MQL expression the player typed) — the
 * substrate's display-name projection is per-record, so there's no
 * single name to show.
 */
function deriveHeaderName(
  result: (StuffRefRecord | StuffDetailRecord)[] | null,
  fragment: string
): string | null {
  if (!result || result.length === 0) {
    return fragment || null;
  }
  if (result.length === 1) {
    return result[0]?.displayName ?? fragment ?? null;
  }
  return fragment || null;
}

/**
 * Push a breadcrumb trail entry when focus actually changes
 * server-side (not optimistically on command-send). Called from the
 * focus-subscription delivery path with the previous + next record
 * sets. Skips:
 *
 *   - First delivery (no prior records — initial focus, not a
 *     navigation).
 *   - Same-stuffId deliveries (focus didn't actually move).
 *   - Multi-cardinality next records (no single Stuff to label
 *     by; trail entries are single-target navigation anchors).
 *   - Focus changes to the current breadcrumb root (the location
 *     itself doesn't belong in the trail).
 *
 * The pushed entry uses the focused Stuff's `displayName` for the
 * label and `look <primaryKeyword>` for the click-to-revisit
 * command, so re-navigation hits a canonical keyword and won't
 * trigger another disambiguation prompt.
 */
function maybePushFocusBreadcrumb(
  previous: (StuffRefRecord | StuffDetailRecord)[] | null,
  next: (StuffRefRecord | StuffDetailRecord)[],
): void {
  if (previous === null) return; // first delivery
  const prevTop = previous[0];
  const nextTop = next[0];
  if (!nextTop) return; // unfocus delivery
  if (next.length > 1) return; // multi-cardinality: nothing single to label

  // Push when single-cardinality focus is a new selection. Three
  // cases qualify:
  //   - different Stuff than before;
  //   - shape changed from multi (>1 prev records) to single — the
  //     player narrowed an ambiguous focus down to one (e.g.
  //     `look thermometer` after a disambig left focus on `brass`);
  //   - shape changed from empty to single.
  const prevShapeNotSingle = previous.length !== 1;
  const stuffChanged =
    !prevTop || prevTop.stuffId !== nextTop.stuffId;
  if (!stuffChanged && !prevShapeNotSingle) return;

  const store = useStore.getState();
  const root = store.cardBreadcrumbRoot;
  if (root && root.stuffId === nextTop.stuffId) {
    // Back at root — drop the pending label too so it doesn't bleed
    // into a future, unrelated trail push.
    if (store.pendingTrailLabel !== null) {
      store.setPendingTrailLabel(null);
    }
    return;
  }

  // Prefer the typed-fragment label stashed by the App's outgoing-
  // command seam — that's the keyword the player actually used and
  // expects to see. Fall back to primaryKeyword (or displayName) when
  // the focus change wasn't triggered by a typed look/focus (e.g. a
  // server-side focus update). Consume the pending label so it
  // doesn't apply to subsequent unrelated focus changes.
  const typed = store.pendingTrailLabel;
  if (typed !== null) store.setPendingTrailLabel(null);
  const keyword = nextTop.primaryKeyword;
  const label = typed ?? keyword ?? nextTop.displayName;
  const command = `look ${label}`;
  store.pushCardBreadcrumbTrail({
    stuffId: nextTop.stuffId,
    label,
    command,
  });
}

/**
 * Resolve the click-target command for a contents/match row. Mirrors
 * the MmlRenderer's registry-then-label fallback shape (Wave 9):
 * prefer the row's `primaryKeyword` (substrate ships it in
 * `REF_FIELDS`), fall back to `displayName`.
 */
function commandForRow(row: StuffRefRecord): string {
  return `look ${row.primaryKeyword ?? row.displayName}`;
}

/**
 * ⚠⚠ **The inspection subscriptions, lifted OUT of the component.**
 *
 * They were a `useEffect` inside `InspectionCard`, which was fine while
 * the card was the whole right column and therefore always mounted. It
 * now renders as a CARD that is suppressed when it would only repeat
 * the PLACE card — and **a component gated on a subscription's result
 * cannot also be the thing that opens it.** Live, the focus card simply
 * never appeared.
 *
 * ⭐ This is the same defect as the dead mobile surface earlier in this
 * build — wiring hung off a conditionally-rendered component — so it
 * takes the same fix: the hook lives at the surface that always
 * renders, and the component is free to come and go.
 *
 * ⚠ Exactly one caller (`CardFeed`). A second would double-subscribe.
 */
export function useInspectionSubscriptions(): void {
useEffect(() => {
  // ⭐ Cards are opened BY NAME. The server owns what each one
  // subscribes to — the query, the cardinality, the field set, the
  // dependency flags. This used to send `query: "$focus"` and
  // `query: "here"` from here, which put MQL, a server semantic, in a
  // .tsx file; the client is not allowed to re-derive semantics, and
  // a card's query is one.
  const focusId = websocketClient.subscribeMql({ card: "inspect" });
  const locationId = websocketClient.subscribeMql({ card: "location" });

  const handleResult = (envelope: Envelope) => {
    const env = envelope as MqlSubscriptionResultEnvelope;
    if (env.subscriptionId === focusId) {
      const records = env.result as (StuffRefRecord | StuffDetailRecord)[];
      const store = useStore.getState();
      const hadPriorResult = store.cardLastResult !== null;
      const previousStuffId = store.cardLastResult?.[0]?.stuffId;
      const nextStuffId = records[0]?.stuffId;
      maybePushFocusBreadcrumb(store.cardLastResult, records);
      store.setCardResult(records);
      store.setCardFocusName(
        deriveHeaderName(records, store.cardFocusFragment)
      );
      if (previousStuffId !== nextStuffId) {
        store.clearCardDetail();
      }
      // First-delivery auto-paint: on a fresh session the focus
      // subscription's initial result arrives before the player
      // has sent any explicit `look`. Without this, the body sits
      // on the placeholder even though the data is in hand. Only
      // applies to the very first result (no prior snapshot); the
      // focus-change-clears policy still governs everything after.
      if (!hadPriorResult && records.length > 0) {
        store.setCardPainted(true);
      }
      // Drop the door annotation as soon as focus leaves the door
      // it was captured against.
      const doorCtx = store.cardDoorContext;
      if (doorCtx && doorCtx.stuffId !== nextStuffId) {
        store.setCardDoorContext(null);
      }
    } else if (env.subscriptionId === locationId) {
      const records = env.result as StuffRefRecord[];
      const store = useStore.getState();
      const top = records[0];
      store.setCardBreadcrumbRoot(
        top
          ? {
              stuffId: top.stuffId,
              displayName: top.displayName,
              primaryKeyword: top.primaryKeyword,
            }
          : null
      );
    }
  };
  const handleDelta = (envelope: Envelope) => {
    const env = envelope as MqlSubscriptionDeltaEnvelope;
    if (env.subscriptionId === focusId) {
      const store = useStore.getState();
      const previous = store.cardLastResult ?? [];
      const previousStuffId = previous[0]?.stuffId;
      const patched = applyChanges(previous, env.changes);
      const nextStuffId = patched[0]?.stuffId;
      maybePushFocusBreadcrumb(store.cardLastResult, patched);
      store.setCardResult(patched);
      store.setCardFocusName(
        deriveHeaderName(patched, store.cardFocusFragment)
      );
      if (previousStuffId !== nextStuffId) {
        store.clearCardDetail();
      }
      const doorCtx = store.cardDoorContext;
      if (doorCtx && doorCtx.stuffId !== nextStuffId) {
        store.setCardDoorContext(null);
      }
    } else if (env.subscriptionId === locationId) {
      // The `me.location` projection is single-cardinality. The
      // substrate's diff for a slot-replacement (player walked
      // from room A to room B) produces a single `replace` op
      // keyed by the NEW stuffId — the old entry is implicitly
      // evicted. The generic `applyChanges` would key its lookup
      // by stuffId and fail to find the prior entry, appending a
      // second record. Single-cardinality bypass: read the last
      // change directly and reduce to {replace,update,remove}.
      const store = useStore.getState();
      let nextRoot:
        | { stuffId: string; displayName: string; primaryKeyword?: string }
        | null = store.cardBreadcrumbRoot;
      for (const change of env.changes) {
        if (change.op === "remove") {
          nextRoot = null;
          continue;
        }
        if (change.op === "replace" || change.op === "add") {
          const fields = (change.fields ?? {}) as Partial<StuffRefRecord>;
          nextRoot = {
            stuffId: change.key,
            displayName: fields.displayName ?? "",
            primaryKeyword: fields.primaryKeyword,
          };
          continue;
        }
        // op === 'update' — slot's record kept its identity; merge.
        if (nextRoot && change.key === nextRoot.stuffId && change.fields) {
          const fields = change.fields as Partial<StuffRefRecord>;
          nextRoot = {
            stuffId: nextRoot.stuffId,
            displayName: fields.displayName ?? nextRoot.displayName,
            primaryKeyword:
              fields.primaryKeyword ?? nextRoot.primaryKeyword,
          };
        }
      }
      store.setCardBreadcrumbRoot(nextRoot);
    }
  };

  websocketClient.onEnvelope("mql-subscription-result", handleResult);
  websocketClient.onEnvelope("mql-subscription-delta", handleDelta);

  return () => {
    websocketClient.offEnvelope(
      "mql-subscription-result",
      handleResult
    );
    websocketClient.offEnvelope("mql-subscription-delta", handleDelta);
    websocketClient.unsubscribe(focusId);
    websocketClient.unsubscribe(locationId);
  };
}, []);
}

export function InspectionCard({
  onSendCommand,
  onCommandPreview,
  embedded = false,
}: InspectionCardProps) {
  // Stable no-op fallback so child affordances always receive a
  // function — the preview API stays uniform whether the parent
  // wired it or not, and `EntityName` / `Button` gate on
  // `command + onPreview` together so a no-op handler with no
  // `command` still disables the mouseenter/leave hookup cleanly.
  const previewSink = onCommandPreview ?? (() => undefined);
  const cardFocusName = useStore((s) => s.cardFocusName);
  const cardFocusFragment = useStore((s) => s.cardFocusFragment);
  const cardBodyPainted = useStore((s) => s.cardBodyPainted);
  const cardLastResult = useStore((s) => s.cardLastResult);
  const cardBreadcrumbRoot = useStore((s) => s.cardBreadcrumbRoot);
  const cardBreadcrumbTrail = useStore((s) => s.cardBreadcrumbTrail);
  const cardDetailPath = useStore((s) => s.cardDetailPath);
  const cardDoorContext = useStore((s) => s.cardDoorContext);


  // Header text: card slice's live name when present, else derived
  // from the latest cached result + fragment.
  const headerName =
    cardFocusName ?? deriveHeaderName(cardLastResult, cardFocusFragment);

  const placeholder = placeholderText(cardLastResult, cardFocusFragment);

  const handleRefresh = () => {
    onSendCommand("look");
  };

  const handlePlaceholderClick = () => {
    onSendCommand("look");
  };

  const handleRowClick = (row: StuffRefRecord) => {
    onSendCommand(commandForRow(row));
  };

  const renderBody = () => {
    if (!cardBodyPainted) {
      return (
        <Button
          variant="ghost"
          aria-label="paint card body"
          command="look"
          onPreview={previewSink}
          onClick={handlePlaceholderClick}
        >
          {placeholder}
        </Button>
      );
    }
    const result = cardLastResult ?? [];
    if (result.length === 0) {
      // Painted-but-empty edge case (look fired against a fragment
      // that resolves to nothing). Show a terse note rather than the
      // pre-look placeholder so the player sees the painted state
      // took effect.
      return <div>(no matches)</div>;
    }
    if (result.length === 1) {
      const record = result[0] as StuffRefRecord | StuffDetailRecord;
      const detail = record as StuffDetailRecord;
      // Detail-drill view: if the player has descended into a detail
      // of the focused Stuff, the body shows the detail's prose
      // instead of the Stuff's long. The Stuff itself doesn't
      // change — only the level of inspection descends.
      if (cardDetailPath.length > 0) {
        const tailKey = cardDetailPath[cardDetailPath.length - 1] ?? "";
        const drillEntry = detail.details?.find((d) =>
          d.ids.includes(tailKey)
        );
        if (drillEntry) {
          return renderDetailDrill(
            record,
            drillEntry,
            onSendCommand,
            previewSink
          );
        }
      }
      // The door-context annotation surfaces an exit link in the
      // body when the focused thing is the door the player just
      // clicked from a room's exits projection. Cleared on focus
      // shift (see handleResult / handleDelta above).
      const doorDirection =
        cardDoorContext && cardDoorContext.stuffId === record.stuffId
          ? cardDoorContext.direction
          : null;
      return renderSingle(
        record,
        wrapForDetailDrill(detail, onSendCommand),
        onSendCommand,
        previewSink,
        handleRowClick,
        doorDirection
      );
    }
    return renderMulti(result, previewSink, handleRowClick);
  };

  return (
    <CardContainer $embedded={embedded}>
      {cardBreadcrumbRoot && (
        <Breadcrumbs aria-label="focus breadcrumbs">
          {(() => {
            // Root segment = the player's current location. Label
            // shows the primaryKeyword (consistent with trail
            // entries, which display the keyword the player typed)
            // and falls back to displayName only when no keyword
            // exists. Click re-focuses the room; preview reads
            // `look <keyword>` (or bare `look` for the no-keyword
            // fallback). Also clears the detail-drill state — if
            // you click back to the room, you're not inspecting a
            // detail of anything anymore.
            const rootKeyword = cardBreadcrumbRoot.primaryKeyword;
            const rootCommand = rootKeyword
              ? `look ${rootKeyword}`
              : "look";
            const rootLabel = rootKeyword ?? cardBreadcrumbRoot.displayName;
            return (
              <EntityName
                stuffId={cardBreadcrumbRoot.stuffId}
                label={rootLabel}
                title={`Click to send: ${rootCommand}`}
                command={rootCommand}
                onPreview={previewSink}
                onClick={() => {
                  useStore.getState().popCardBreadcrumbTrail(0);
                  useStore.getState().clearCardDetail();
                  onSendCommand(rootCommand);
                }}
              />
            );
          })()}
          {cardBreadcrumbTrail.map((entry, i) => (
            <React.Fragment key={`trail-${entry.command}-${i}`}>
              {" › "}
              <EntityName
                stuffId={entry.stuffId}
                label={entry.label}
                title={`Click to send: ${entry.command}`}
                command={entry.command}
                onPreview={previewSink}
                onClick={() => {
                  // Pop trail to this index (drops everything past
                  // this point), clear any detail drill (detail is
                  // subordinate to the focus stack), then re-send so
                  // focus shifts back to this segment.
                  useStore.getState().popCardBreadcrumbTrail(i);
                  useStore.getState().clearCardDetail();
                  onSendCommand(entry.command);
                }}
              />
            </React.Fragment>
          ))}
          {cardDetailPath.map((key, i) => {
            // Detail segments chain off the trail's tail (or the
            // root, if the trail is empty). The current tail is
            // rendered as a plain system label — clicking it would
            // be a no-op (you'd be backing out to where you already
            // are); intermediate segments pop the detail stack to
            // that level. To leave the detail entirely, click the
            // segment before it (root or focus trail tail).
            const isTail = i === cardDetailPath.length - 1;
            return (
              <React.Fragment key={`detail-${key}-${i}`}>
                {" › "}
                {isTail ? (
                  <CurrentSegment>{key}</CurrentSegment>
                ) : (
                  <EntityName
                    label={key}
                    title={`Click to back out: ${key}`}
                    command={`look ${key}`}
                    onPreview={previewSink}
                    onClick={() => {
                      useStore.getState().popCardDetailToIndex(i);
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </Breadcrumbs>
      )}
      {/*
        ⚠ Embedded, the card's header carries the name — repeating it
        here is the duplication this change exists to remove. The
        Refresh control still belongs to the card, so it rides the body.
      */}
      {!embedded && (
        <Header>
          <HeaderTitle>{headerName ?? "nothing focused"}</HeaderTitle>
          <Button
            variant="primary"
            aria-label="refresh card"
            command="look"
            onPreview={previewSink}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Header>
      )}
      <Body>{renderBody()}</Body>
      {embedded && (
        <EmbeddedActions>
          <Button
            variant="primary"
            aria-label="refresh card"
            command="look"
            onPreview={previewSink}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </EmbeddedActions>
      )}
    </CardContainer>
  );
}

/**
 * Single-focus body — percept projection for the focused thing.
 *
 * Renders only the prose the substrate's detail field-set ships
 * as look-revealable percepts: the long description (the body),
 * the obvious exits, and the visible contents. The header already
 * carries the short description (or the display name when the
 * focused thing has a proper Name); the body does NOT repeat it.
 * No "SHORT"/"DESCRIPTION" label headings — the implicit structure
 * (header → prose → exits → contents) tells the reader what's
 * what, and the slate's flatten-linear-labeled discipline applies
 * inside each list (exits, contents) where labels are load-bearing.
 *
 * Internal property state (slot maps, mixin lists, raw fields)
 * lives in the admin extras when the viewer is admin — never the
 * player body.
 */
/**
 * Wrap `onSendCommand` for clicks INSIDE the card's long-description
 * MmlRenderer. Detail-keyword clicks (`look <key>` where `<key>` is
 * an alias of one of the focused Stuff's details) intercept the
 * send and push the detail onto the card's drill stack instead —
 * the body swaps to the detail's prose, the focused Stuff stays the
 * same. Non-detail clicks (`look <stuff>` for contents, the room
 * name, etc.) flow through to the regular sink and ride the
 * command bus.
 */
function wrapForDetailDrill(
  detail: StuffDetailRecord,
  onSendCommand: (text: string) => void
): (text: string) => void {
  const detailAliases = new Set<string>();
  for (const entry of detail.details ?? []) {
    for (const id of entry.ids) detailAliases.add(id);
  }
  return (text: string) => {
    const match = /^look (\S+)$/.exec(text);
    if (match && detailAliases.has(match[1]!)) {
      useStore.getState().pushCardDetail(match[1]!);
      return;
    }
    onSendCommand(text);
  };
}

function renderSingle(
  record: StuffRefRecord | StuffDetailRecord,
  onProseClick: (text: string) => void,
  onSendCommand: (text: string) => void,
  onPreview: (command: string | null) => void,
  onRowClick: (row: StuffRefRecord) => void,
  doorDirection: string | null
): React.ReactElement {
  const detail = record as StuffDetailRecord;
  const long = detail.longDescription ?? "";
  const illustration = detail.illustration;
  const exits = detail.exits ?? [];
  const contents = detail.contents ?? [];

  return (
    <div data-stuff-id={record.stuffId}>
      {illustration && (
        <Illustration
          src={mediaUrl(illustration)}
          alt={detail.shortDescription ?? detail.displayName ?? ""}
          // No asset / broken key → hide rather than show a broken-image icon.
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      {long && (
        <BodyProse>
          <MmlRenderer
            text={long}
            onCommandClick={onProseClick}
            onCommandPreview={onPreview}
          />
        </BodyProse>
      )}
      {doorDirection && (
        <ExitsBlock>
          <SystemLabel>Obvious exits:</SystemLabel>{" "}
          <EntityName
            label={doorDirection}
            title={`Click to send: go ${doorDirection}`}
            command={`go ${doorDirection}`}
            onPreview={onPreview}
            onClick={() => onSendCommand(`go ${doorDirection}`)}
          />
        </ExitsBlock>
      )}
      {exits.length > 0 && (
        <ExitsBlock>
          <SystemLabel>Obvious exits:</SystemLabel>{" "}
          {exits.map((exit, i) => (
            <React.Fragment key={exit.direction}>
              {i > 0 && ", "}
              <EntityName
                label={exit.direction}
                title={`Click to send: go ${exit.direction}`}
                command={`go ${exit.direction}`}
                onPreview={onPreview}
                onClick={() => onSendCommand(`go ${exit.direction}`)}
              />
              {exit.door && (
                <>
                  {" ("}
                  {(() => {
                    // Prefer the door's `primaryKeyword` for the click
                    // target — `look doors` parses cleanly, `look the
                    // front doors` falls into the command-shape
                    // rejection. Display name stays the visible label.
                    const target =
                      exit.door.primaryKeyword ?? exit.door.displayName;
                    const cmd = `look ${target}`;
                    const doorStuffId = exit.door.stuffId;
                    const doorDir = exit.direction;
                    return (
                      <EntityName
                        stuffId={exit.door.stuffId}
                        label={exit.door.displayName}
                        title={`Click to send: ${cmd}`}
                        command={cmd}
                        onPreview={onPreview}
                        onClick={() => {
                          // Stash the door↔exit binding so the door's
                          // card can render a "go <direction>" link.
                          useStore.getState().setCardDoorContext({
                            stuffId: doorStuffId,
                            direction: doorDir,
                          });
                          onSendCommand(cmd);
                        }}
                      />
                    );
                  })()}
                  {`, ${exit.door.open ? "open" : "closed"})`}
                </>
              )}
            </React.Fragment>
          ))}
        </ExitsBlock>
      )}
      {contents.length > 0 && (
        <ContentsBlock>
          <ContentsLabel>
            <SystemLabel>Contents:</SystemLabel>
          </ContentsLabel>
          <List aria-label="contents">
            {contents.map((row) => (
              <ListItem key={row.stuffId}>
                <EntityName
                  stuffId={row.stuffId}
                  label={row.displayName}
                  title={`Click to send: ${commandForRow(row)}`}
                  command={commandForRow(row)}
                  onPreview={onPreview}
                  onClick={() => onRowClick(row)}
                />
              </ListItem>
            ))}
          </List>
        </ContentsBlock>
      )}
    </div>
  );
}

/**
 * Multi-focus body — one row per match.
 *
 * Each row is a styled name (`<EntityName>`) carrying the row's
 * `stuff-id` for future social-graph bucket selectors. Per the
 * grouping slate the multi-cardinality focus will eventually
 * project a group via `GroupApi`; the v1 surface is shape-correct
 * (list of styled names) and ready for that wiring without
 * component changes.
 */
function renderMulti(
  records: ReadonlyArray<StuffRefRecord | StuffDetailRecord>,
  onPreview: (command: string | null) => void,
  onRowClick: (row: StuffRefRecord) => void
): React.ReactElement {
  return (
    <List aria-label="matches">
      {records.map((row) => {
        const detail = row as StuffDetailRecord;
        return (
          <ListItem key={row.stuffId}>
            <EntityName
              stuffId={row.stuffId}
              label={row.displayName}
              title={`Click to send: ${commandForRow(row)}`}
              command={commandForRow(row)}
              onPreview={onPreview}
              onClick={() => onRowClick(row)}
            />
            {detail.shortDescription && (
              <TagSuffix>— {detail.shortDescription}</TagSuffix>
            )}
          </ListItem>
        );
      })}
    </List>
  );
}


/**
 * Detail-drill view — the player has descended into a detail of the
 * focused Stuff. The Stuff itself doesn't change (header still
 * shows the parent Stuff); only the level of inspection has shifted.
 *
 * Navigation lives in the top breadcrumb (detail segments append
 * to the focus trail). This view renders just the detail's prose
 * and the parent Stuff's exits.
 */
function renderDetailDrill(
  record: StuffRefRecord | StuffDetailRecord,
  drillEntry: WireDetailEntry,
  onSendCommand: (text: string) => void,
  onPreview: (command: string | null) => void
): React.ReactElement {
  const detail = record as StuffDetailRecord;
  const exits = detail.exits ?? [];
  const parentName = record.displayName ?? "parent";

  return (
    <div data-stuff-id={record.stuffId}>
      <BodyProse>
        <MmlRenderer
          text={drillEntry.description}
          onCommandClick={onSendCommand}
          onCommandPreview={onPreview}
        />
      </BodyProse>
      {exits.length > 0 && (
        <ExitsBlock>
          <SystemLabel>Obvious exits (on {parentName}):</SystemLabel>{" "}
          {exits.map((exit, i) => (
            <React.Fragment key={exit.direction}>
              {i > 0 && ", "}
              <EntityName
                label={exit.direction}
                title={`Click to send: go ${exit.direction}`}
                command={`go ${exit.direction}`}
                onPreview={onPreview}
                onClick={() => onSendCommand(`go ${exit.direction}`)}
              />
              {exit.door && (
                <>
                  {" ("}
                  {(() => {
                    // Prefer the door's `primaryKeyword` for the click
                    // target — `look doors` parses cleanly, `look the
                    // front doors` falls into the command-shape
                    // rejection. Display name stays the visible label.
                    const target =
                      exit.door.primaryKeyword ?? exit.door.displayName;
                    const cmd = `look ${target}`;
                    const doorStuffId = exit.door.stuffId;
                    const doorDir = exit.direction;
                    return (
                      <EntityName
                        stuffId={exit.door.stuffId}
                        label={exit.door.displayName}
                        title={`Click to send: ${cmd}`}
                        command={cmd}
                        onPreview={onPreview}
                        onClick={() => {
                          useStore.getState().setCardDoorContext({
                            stuffId: doorStuffId,
                            direction: doorDir,
                          });
                          onSendCommand(cmd);
                        }}
                      />
                    );
                  })()}
                  {`, ${exit.door.open ? "open" : "closed"})`}
                </>
              )}
            </React.Fragment>
          ))}
        </ExitsBlock>
      )}
    </div>
  );
}
