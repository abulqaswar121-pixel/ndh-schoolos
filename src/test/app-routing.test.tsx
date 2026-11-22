import { QueryClient } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { routeTree } from "../routeTree.gen";

vi.mock("@/services/cloudSchoolRepository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/cloudSchoolRepository")>()),
  isCloudConfigured: () => false,
}));

function createTestRouter(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    defaultPreloadStaleTime: 0,
  });
}

describe("NDH SchoolOS Live Routes, MP4 Video Walkthroughs, Session Pricing & Onboarding", () => {
  it("renders '/' with moving top ticker, sticky navbar, real MP4 video player, distinct cover photos, and zero banned terms", async () => {
    const router = createTestRouter("/");
    await router.load();
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByText(
        /Results, fees, attendance & parents — in one simple workspace\./i
      )
    ).toBeInTheDocument();

    // Moving announcement bar before sticky header
    const ticker = screen.getByLabelText("Platform announcements");
    expect(ticker).toHaveClass("ndh-top-ticker");
    const stickyHeader = document.querySelector("header.sticky.top-0");
    expect(stickyHeader).not.toBeNull();

    // Real HTML5 <video> MP4 player that auto-rolls to next role on ended
    const player = screen.getByTestId("role-video-tutorial-player");
    const videoEl = player.querySelector("video");
    expect(videoEl).not.toBeNull();
    expect(videoEl?.getAttribute("src")).toBe(
      "/videos/ndh-walkthrough-admin-v5.mp4"
    );

    expect(screen.getByText(/Keep Tahfeez optional/i)).toBeInTheDocument();
    fireEvent.ended(videoEl!);
    const nextVideoEl = player.querySelector("video");
    expect(nextVideoEl?.getAttribute("src")).toBe(
      "/videos/ndh-walkthrough-exam-officer-v5.mp4"
    );

    // Official ndh.com.ng contact info in footer
    expect(screen.getAllByText(/0902 993 2794/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/support@ndh\.com\.ng/i).length).toBeGreaterThanOrEqual(1);

    const html = document.body.innerHTML;
    expect(html).not.toMatch(/dual-curriculum/i);
    expect(html).not.toMatch(/Madrasah/i);
    expect(html).not.toMatch(/Operating System/i);
    expect(html).not.toMatch(/Universal Flexibility/i);
    expect(html).not.toMatch(/Try Demo Sandbox/i);
    expect(html).not.toMatch(/Book Demo/i);
  });

  it("supports both Per Term and Per Session (Save 17%) pricing on '/pricing'", async () => {
    const router = createTestRouter("/pricing");
    await router.load();
    render(<RouterProvider router={router} />);

    // Default: Termly prices
    expect(await screen.findByText("₦30,000")).toBeInTheDocument();
    expect(screen.getByText("₦80,000")).toBeInTheDocument();

    // Switch to Per Session (3 Terms)
    fireEvent.click(
      screen.getByRole("button", { name: /Per Session \(3 Terms\)/i })
    );

    expect(await screen.findByText("₦75,000")).toBeInTheDocument();
    expect(screen.getByText("₦200,000")).toBeInTheDocument();
    expect(
      screen.getByText(/Save ₦40,000 per session \(3 terms\)/i)
    ).toBeInTheDocument();
  });

  it("opens the NDH AI Assistant circular launcher and answers termly + per-session pricing questions without student data access", async () => {
    const router = createTestRouter("/");
    await router.load();
    render(<RouterProvider router={router} />);

    const launcher = await screen.findByRole("button", {
      name: /Open Ask Amina assistant/i,
    });
    fireEvent.click(launcher);

    const pricingChip = await screen.findByRole("button", {
      name: "Termly & per-session pricing?",
    });
    fireEvent.click(pricingChip);

    expect(
      await screen.findByText(/₦80,000\/term or ₦200,000\/session/i)
    ).toBeInTheDocument();
  });

  it("protects the Super Admin route without configured verified owner access", async () => {
    const router = createTestRouter("/platform");
    await router.load();
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("Platform owner access required")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders '/tutorials', '/features', '/for-schools', '/pricing', '/contact', and '/login' with 5 distinct v3 cover images (plus 3 distinct on '/')", async () => {
    const seenCoverImages = new Set<string>();
    for (const path of [
      "/",
      "/tutorials",
      "/features",
      "/for-schools",
      "/pricing",
      "/contact",
      "/login",
    ]) {
      const router = createTestRouter(path);
      await router.load();
      const { unmount } = render(<RouterProvider router={router} />);
      if (path === "/tutorials") {
        expect(
          await screen.findByText(/Quick video guides for every school role/i)
        ).toBeInTheDocument();
      }
      if (path === "/contact") {
        const matches = await screen.findAllByText(
          /Marmaron Nufawa Western Bye Pass, Sokoto, Nigeria/i
        );
        expect(matches.length).toBeGreaterThanOrEqual(1);
      }
      document
        .querySelectorAll<HTMLImageElement>('img[src^="/images/ndh-cover-"]')
        .forEach((img) => {
          const src = img.getAttribute("src")!;
          expect(seenCoverImages.has(src)).toBe(false);
          seenCoverImages.add(src);
        });
      unmount();
    }
    expect(seenCoverImages.size).toBe(8);
  });
});
