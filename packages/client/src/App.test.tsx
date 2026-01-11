import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("should render hello message", () => {
    render(<App />);
    expect(screen.getByText("Hello from client")).toBeInTheDocument();
  });
});
