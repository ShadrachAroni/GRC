import React from "react";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";
import { describe, it, expect } from "vitest";

describe("Badge component", () => {
  it("renders children text correctly", () => {
    render(<Badge>Success</Badge>);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("applies success semantic color classes with contrast ratio features", () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText("Success");
    expect(badge).toHaveClass("bg-success-emerald/10");
    expect(badge).toHaveClass("text-success-emerald");
  });

  it("applies critical risk severity classes correctly", () => {
    render(<Badge variant="critical">Critical</Badge>);
    const badge = screen.getByText("Critical");
    expect(badge).toHaveClass("bg-risk-critical/10");
    expect(badge).toHaveClass("text-risk-critical");
  });

  it("applies custom size styles", () => {
    render(<Badge size="sm">Small</Badge>);
    const badge = screen.getByText("Small");
    expect(badge).toHaveClass("text-[10px]");
  });
});
