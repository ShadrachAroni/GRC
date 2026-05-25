import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./Input";
import { describe, it, expect } from "vitest";

describe("Input component", () => {
  it("renders with a label and helper text", () => {
    render(<Input label="Username" helperText="Enter your email username" />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByText("Enter your email username")).toBeInTheDocument();
  });

  it("displays error messages and sets aria-invalid attribute", () => {
    render(<Input label="Password" error="Password is required" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("handles basic input events", () => {
    render(<Input label="Name" placeholder="John Doe" />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Alice" } });
    expect(input.value).toBe("Alice");
  });

  it("applies disabled attributes correctly", () => {
    render(<Input label="Code" disabled />);
    const input = screen.getByLabelText("Code");
    expect(input).toBeDisabled();
  });
});
