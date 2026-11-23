import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoleVideoTutorialPlayer } from "@/components/schoolos/tutorials/RoleVideoTutorialPlayer";
import { SCREEN_TUTORIALS_V6 } from "@/data/screenTutorialsV6";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("all seven role-locked responsive portal players", () => {
  it.each(SCREEN_TUTORIALS_V6)(
    "keeps $roleId locked while offering genuine Phone/Desktop recordings",
    (role) => {
      vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }));
      const { container } = render(
        <RoleVideoTutorialPlayer lockedRoleId={role.roleId} autoPlay={false} />,
      );
      let video = container.querySelector("video")!;
      expect(video).toHaveAttribute("src", role.variants.phone.videoSrc);
      expect(video.querySelector("track")).toHaveAttribute("src", role.captionsSrc);
      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
      expect(video).toHaveAttribute("src", role.variants.desktop.videoSrc);
      const chapter = role.chapters[1]!;
      fireEvent.click(screen.getByRole("button", { name: `2. ${chapter.label}` }));
      expect(video.currentTime).toBe(chapter.startSec);
      fireEvent.ended(video);
      video = container.querySelector("video")!;
      expect(video).toHaveAttribute("src", role.variants.desktop.videoSrc);
      expect(container.querySelectorAll("video")).toHaveLength(1);
    },
  );
});
