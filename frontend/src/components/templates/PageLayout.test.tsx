import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageLayout } from "./PageLayout";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationProvider } from "@/context/NotificationContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/risks",
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock notifications service
vi.mock("@/services/notifications", () => ({
  notificationsService: {
    getNotifications: vi.fn(() => Promise.resolve([])),
    markAsRead: vi.fn(() => Promise.resolve()),
    markAllAsRead: vi.fn(() => Promise.resolve()),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        {ui}
      </NotificationProvider>
    </QueryClientProvider>
  );
};

describe("PageLayout component", () => {
  it("renders children, headers, and navigation correctly", () => {
    renderWithProviders(<PageLayout title="Risks Summary"><div>Content Area</div></PageLayout>);
    
    // Check main title and children
    expect(screen.getByText("Risks Summary")).toBeInTheDocument();
    expect(screen.getByText("Content Area")).toBeInTheDocument();
    
    // Check sidebar / navigation items
    expect(screen.getAllByText("Risks")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard")[0]).toBeInTheDocument();
  });

  it("handles theme toggle toggles document.documentElement dark class", () => {
    // Make sure classList is empty
    document.documentElement.classList.remove("dark");
    
    renderWithProviders(<PageLayout><div>Content</div></PageLayout>);
    
    const themeBtn = screen.getByLabelText("Toggle Dark Mode");
    
    // Toggle to Dark Mode
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    
    // Toggle back to Light Mode
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
