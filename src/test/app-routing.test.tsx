import { QueryClient } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { routeTree } from "../routeTree.gen";

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
      "/videos/ndh-walkthrough-admin-v2.mp4"
    );

    fireEvent.ended(videoEl!);
    const nextVideoEl = player.querySelector("video");
    expect(nextVideoEl?.getAttribute("src")).toBe(
      "/videos/ndh-walkthrough-class-teacher-v2.mp4"
    );

    // Official ndh.com.ng contact info in footer
    expect(screen.getAllByText(/0902 993 2794/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/support@ndh\.com\.ng/i).length).toBeGreaterThanOrEqual(1);

    const html = document.body.innerHTML;
    expect(html).not.toMatch(/dual-curriculum/i);
    expect(html).not.toMatch(/Tahfeez/i);
    expect(html).not.toMatch(/Halqah/i);
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

  it("completes 3-step live School Registration & signs Proprietor into '/app' with ADM-001", async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    const router = createTestRouter("/");
    await router.load();
    render(<RouterProvider router={router} />);

    const registerBtns = await screen.findAllByRole("button", {
      name: /Register Your School|Register School/i,
    });
    fireEvent.click(registerBtns[0]!);

    // Step 1: School Name
    const nameInput = await screen.findByLabelText(/School Name/i);
    fireEvent.change(nameInput, {
      target: { value: "Royal Gateway Academy" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 2: Proprietor Name & PIN
    const adminNameInput = await screen.findByLabelText(
      /Proprietor \/ Principal Full Name/i
    );
    fireEvent.change(adminNameInput, {
      target: { value: "Dr. Najeeb Ibrahim" },
    });
    const pinInput = screen.getByLabelText(/Set 4–6 Digit Login PIN/i);
    fireEvent.change(pinInput, { target: { value: "4321" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 3: Complete Setup
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Complete Setup & Open Workspace/i,
      })
    );

    expect(
      await screen.findByText(/Royal Gateway Academy — School Dashboard/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Start your school operations in 4 quick steps/i)
    ).toBeInTheDocument();
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
