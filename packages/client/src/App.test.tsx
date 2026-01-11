import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App.js";

describe("App", () => {
  it("should render app title", () => {
    render(<App />);
    expect(screen.getByText("Saxonberg 2.0")).toBeDefined();
  });
});
