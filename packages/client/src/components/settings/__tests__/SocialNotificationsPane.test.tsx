/**
 * SocialNotificationsPane — the thin front over the `notify` verb. Covers
 * the Phase-4 acceptance criteria: lists rules from the server-pushed
 * `social.rules` projection, every control previews its `notify …` command
 * on hover and issues it on commit, reorder issues `--above` / `--below`,
 * and the pane requests the projection on mount when none is cached.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { SocialNotificationsPane } from "../SocialNotificationsPane";
import type { SocialRuleProjection } from "@saxonberg/types";

const FRIENDS = "contacts:me:friends";

function rule(p: Partial<SocialRuleProjection>): SocialRuleProjection {
  return {
    groupRef: "everyone-else",
    label: "everyone-else",
    nameRendering: "name",
    boostInDense: false,
    onConnect: "silent",
    onDisconnect: "silent",
    onMessage: "silent",
    color: "neutral",
    reserved: true,
    ...p,
  };
}

function seed(rules: SocialRuleProjection[]): void {
  useStore.setState({ clientState: { "social.rules": { rules } } });
}

function renderPane(handlers: {
  onSendCommand?: (t: string) => void;
  onCommandPreview?: (c: string | null) => void;
  onCommandClick?: (c: string) => void;
  onClose?: () => void;
}) {
  return render(
    <SocialNotificationsPane
      onClose={handlers.onClose ?? (() => {})}
      onSendCommand={handlers.onSendCommand ?? (() => {})}
      onCommandPreview={handlers.onCommandPreview ?? (() => {})}
      onCommandClick={handlers.onCommandClick ?? (() => {})}
    />,
  );
}

describe("SocialNotificationsPane", () => {
  beforeEach(() => {
    useStore.setState({ clientState: {} });
  });

  it("lists rules from the social.rules projection", () => {
    seed([
      rule({ groupRef: FRIENDS, label: "friends", reserved: false }),
      rule({}),
    ]);
    renderPane({});
    expect(screen.getByTestId(`rule-${FRIENDS}`)).toBeTruthy();
    expect(screen.getByTestId("rule-everyone-else")).toBeTruthy();
    expect(screen.getByText("friends")).toBeTruthy();
  });

  it("a control previews its notify command on hover and issues it on commit", () => {
    seed([rule({ groupRef: FRIENDS, label: "friends", reserved: false })]);
    const onCommandPreview = vi.fn();
    const onCommandClick = vi.fn();
    renderPane({ onCommandPreview, onCommandClick });

    const cmd = `notify ${FRIENDS} --color teal`;
    const swatch = screen.getByTestId(cmd);
    fireEvent.mouseEnter(swatch);
    expect(onCommandPreview).toHaveBeenCalledWith(cmd);
    fireEvent.mouseLeave(swatch);
    expect(onCommandPreview).toHaveBeenCalledWith(null);
    fireEvent.click(swatch);
    expect(onCommandClick).toHaveBeenCalledWith(cmd);
  });

  it("a surface button issues notify <ref> --message full", () => {
    seed([rule({ groupRef: FRIENDS, label: "friends", reserved: false })]);
    const onCommandClick = vi.fn();
    renderPane({ onCommandClick });
    fireEvent.click(screen.getByTestId(`notify ${FRIENDS} --message full`));
    expect(onCommandClick).toHaveBeenCalledWith(
      `notify ${FRIENDS} --message full`,
    );
  });

  it("the boost toggle issues --boost / --no-boost", () => {
    seed([rule({ groupRef: FRIENDS, label: "friends", reserved: false })]);
    const onCommandClick = vi.fn();
    renderPane({ onCommandClick });
    fireEvent.click(screen.getByTestId(`notify ${FRIENDS} --boost`));
    expect(onCommandClick).toHaveBeenCalledWith(`notify ${FRIENDS} --boost`);
    fireEvent.click(screen.getByTestId(`notify ${FRIENDS} --no-boost`));
    expect(onCommandClick).toHaveBeenCalledWith(`notify ${FRIENDS} --no-boost`);
  });

  it("reorder up issues --above the previous row", () => {
    seed([
      rule({ groupRef: FRIENDS, label: "friends", reserved: false }),
      rule({}), // everyone-else, second
    ]);
    const onCommandClick = vi.fn();
    renderPane({ onCommandClick });
    // The up button on the everyone-else row anchors above friends.
    fireEvent.click(screen.getByTestId(`notify everyone-else --above ${FRIENDS}`));
    expect(onCommandClick).toHaveBeenCalledWith(
      `notify everyone-else --above ${FRIENDS}`,
    );
  });

  it("reorder down issues --below the next row", () => {
    seed([
      rule({ groupRef: FRIENDS, label: "friends", reserved: false }),
      rule({}),
    ]);
    const onCommandClick = vi.fn();
    renderPane({ onCommandClick });
    fireEvent.click(
      screen.getByTestId(`notify ${FRIENDS} --below everyone-else`),
    );
    expect(onCommandClick).toHaveBeenCalledWith(
      `notify ${FRIENDS} --below everyone-else`,
    );
  });

  it("add issues a default-preserving notify create", () => {
    seed([rule({})]);
    const onCommandClick = vi.fn();
    renderPane({ onCommandClick });
    fireEvent.change(screen.getByTestId("social-add-input"), {
      target: { value: "managed:fighter-guild" },
    });
    fireEvent.click(screen.getByTestId("social-add-button"));
    expect(onCommandClick).toHaveBeenCalledWith(
      "notify managed:fighter-guild --render name",
    );
  });

  it("the verbosity control issues a settings command", () => {
    seed([rule({})]);
    const onCommandClick = vi.fn();
    renderPane({ onCommandClick });
    fireEvent.click(screen.getByTestId("settings set social.verbosity verbose"));
    expect(onCommandClick).toHaveBeenCalledWith(
      "settings set social.verbosity verbose",
    );
  });

  it("requests the projection on mount when none is cached", () => {
    // clientState empty (beforeEach) → no social.rules yet.
    const onSendCommand = vi.fn();
    renderPane({ onSendCommand });
    expect(onSendCommand).toHaveBeenCalledWith("notify");
  });

  it("does not re-request when a projection is already cached", () => {
    seed([rule({})]);
    const onSendCommand = vi.fn();
    renderPane({ onSendCommand });
    expect(onSendCommand).not.toHaveBeenCalled();
  });
});
