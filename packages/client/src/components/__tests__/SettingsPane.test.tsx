import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsPane } from "../settings/SettingsPane";

/**
 * SettingsPane — the first summoned-pane consumer. Every control sends a
 * REAL command (command-bus primacy); notifications degrade gracefully
 * when the backend is absent.
 */
describe("SettingsPane", () => {
  it("degrades the notifications section when the backend is absent", () => {
    render(<SettingsPane onSendCommand={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });

  it("renders notification categories when the backend is present", () => {
    render(
      <SettingsPane
        onSendCommand={vi.fn()}
        onClose={vi.fn()}
        notificationsAvailable
      />,
    );
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it("a quick-setting select sends the real settings command", () => {
    const onSendCommand = vi.fn();
    render(<SettingsPane onSendCommand={onSendCommand} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Reaction intensity"), {
      target: { value: "vivid" },
    });
    expect(onSendCommand).toHaveBeenCalledWith(
      "settings set social.react.intensity vivid",
    );
  });

  it("the settings mini-form sends settings set", () => {
    const onSendCommand = vi.fn();
    render(<SettingsPane onSendCommand={onSendCommand} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("setting key"), {
      target: { value: "workspace.home" },
    });
    fireEvent.change(screen.getByLabelText("setting value"), {
      target: { value: "/home/me" },
    });
    fireEvent.click(screen.getAllByText("set")[0]!);
    expect(onSendCommand).toHaveBeenCalledWith(
      "settings set workspace.home /home/me",
    );
  });

  it("the variables mini-form sends var set", () => {
    const onSendCommand = vi.fn();
    render(<SettingsPane onSendCommand={onSendCommand} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("variable name"), {
      target: { value: "spot" },
    });
    fireEvent.change(screen.getByLabelText("variable value"), {
      target: { value: "/obj/Tavern" },
    });
    // The second "set" button belongs to the variables form.
    fireEvent.click(screen.getAllByText("set")[1]!);
    expect(onSendCommand).toHaveBeenCalledWith("var set spot /obj/Tavern");
  });

  it("the close button calls onClose", () => {
    const onClose = vi.fn();
    render(<SettingsPane onSendCommand={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close settings"));
    expect(onClose).toHaveBeenCalled();
  });
});
