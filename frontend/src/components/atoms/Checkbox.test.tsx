import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Checkbox } from "./Checkbox";
import { describe, it, expect } from "vitest";

describe("Checkbox component", () => {
  it("renders with a label correctly", () => {
    render(<Checkbox label="Accept Terms" />);
    expect(screen.getByLabelText("Accept Terms")).toBeInTheDocument();
  });

  it("toggles checked state when clicked", () => {
    render(<Checkbox label="Keep signed in" />);
    const checkbox = screen.getByLabelText("Keep signed in") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("handles error styling indicator", () => {
    render(<Checkbox label="Confirm" error="Agreement is required" />);
    expect(screen.getByText("Agreement is required")).toBeInTheDocument();
  });

  it("honors disabled prop", () => {
    render(<Checkbox label="Consent" disabled />);
    const checkbox = screen.getByLabelText("Consent") as HTMLInputElement;
    expect(checkbox).toBeDisabled();
  });
});
