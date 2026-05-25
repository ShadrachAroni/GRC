import React from "react";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "./Breadcrumbs";
import { describe, it, expect } from "vitest";

describe("Breadcrumbs component", () => {
  const items = [
    { label: "Risks", href: "/risks" },
    { label: "Detail" },
  ];

  it("renders breadcrumb trails and labels", () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Detail")).toBeInTheDocument();
  });

  it("renders a link for items with href", () => {
    render(<Breadcrumbs items={items} />);
    const link = screen.getByRole("link", { name: "Risks" });
    expect(link).toHaveAttribute("href", "/risks");
  });

  it("renders plain span for the last item", () => {
    render(<Breadcrumbs items={items} />);
    const detail = screen.getByText("Detail");
    expect(detail.tagName).toBe("SPAN");
  });
});
