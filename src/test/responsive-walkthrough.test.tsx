import React, { createRef } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResponsiveWalkthroughVideo } from "@/components/schoolos/tutorials/ResponsiveWalkthroughVideo";
import { OWNER_SCREEN_TUTORIAL_V6 } from "@/data/ownerScreenTutorialV6";

const metadata = OWNER_SCREEN_TUTORIAL_V6;
function viewport(initialPhone: boolean) {
  let phone = initialPhone;
  const listeners = new Set<() => void>();
  const media = {
    get matches() {
      return phone;
    },
    media: "(max-width: 767px)",
    onchange: null,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(media as unknown as MediaQueryList);
  return {
    resize: (next: boolean) =>
      act(() => {
        phone = next;
        listeners.forEach((fn) => fn());
      }),
    listeners,
  };
}
function mount(overrides: { lowDataMode?: boolean; autoPlay?: boolean; inView?: boolean } = {}) {
  const videoRef = createRef<HTMLVideoElement>();
  const audioRef = { current: false };
  const { container, unmount } = render(
    <ResponsiveWalkthroughVideo
      media={{ ...metadata.variants.desktop, variants: metadata.variants }}
      title={metadata.title}
      captionsSrc={metadata.captionsSrc}
      videoRef={videoRef}
      userEnabledAudioRef={audioRef}
      lowDataMode={false}
      autoPlay={false}
      inView={true}
      onMutedByPolicy={vi.fn()}
      onTimeUpdate={vi.fn()}
      onEnded={vi.fn()}
      onVolumeChange={vi.fn()}
      {...overrides}
    />,
  );
  return { video: container.querySelector("video")!, container, unmount };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("actual-screen Owner tutorial variants", () => {
  it("uses only the portrait source on phones, with captions, native controls and no cropping", () => {
    viewport(true);
    const { video, container } = mount();
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(video).toHaveAttribute("src", metadata.variants.phone.videoSrc);
    expect(video).toHaveAttribute("poster", metadata.variants.phone.posterSrc);
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveClass("object-contain");
    expect(video.querySelector("track")).toHaveAttribute("src", metadata.captionsSrc);
    expect(screen.getByTestId("walkthrough-video-stage")).toHaveClass("aspect-[9/16]");
    expect(screen.getByRole("button", { name: "Auto" })).toHaveAttribute("aria-pressed", "true");
  });

  it("automatically follows viewport changes; manual override wins until Auto is selected", () => {
    const media = viewport(false);
    const { video, unmount } = mount();
    expect(video).toHaveAttribute("src", metadata.variants.desktop.videoSrc);
    media.resize(true);
    expect(video).toHaveAttribute("src", metadata.variants.phone.videoSrc);
    fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
    expect(video).toHaveAttribute("src", metadata.variants.desktop.videoSrc);
    media.resize(false);
    media.resize(true);
    expect(video).toHaveAttribute("src", metadata.variants.desktop.videoSrc);
    fireEvent.click(screen.getByRole("button", { name: "Auto" }));
    expect(video).toHaveAttribute("src", metadata.variants.phone.videoSrc);
    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it("preserves lesson position, paused state, volume, mute, captions and speed when switching", () => {
    viewport(true);
    const { video } = mount();
    fireEvent.loadedMetadata(video);
    video.currentTime = 76;
    video.muted = true;
    video.volume = 0.3;
    video.playbackRate = 1.25;
    Object.defineProperty(video, "paused", { configurable: true, value: true });
    const track = { mode: "hidden" };
    Object.defineProperty(video, "textTracks", { configurable: true, value: [track] });
    const play = vi.spyOn(video, "play");
    fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
    // Simulate native media reset on src replacement.
    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;
    video.playbackRate = 1;
    track.mode = "showing";
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(76);
    expect(video.muted).toBe(true);
    expect(video.volume).toBe(0.3);
    expect(video.playbackRate).toBe(1.25);
    expect(track.mode).toBe("hidden");
    expect(play).not.toHaveBeenCalled();
  });

  it("resumes an actively playing lesson after format change but never starts low-data playback", () => {
    viewport(false);
    const { video, unmount } = mount();
    fireEvent.loadedMetadata(video);
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    video.currentTime = 48;
    const play = vi.spyOn(video, "play");
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(48);
    expect(play).toHaveBeenCalledOnce();
    unmount();
    const { video: low } = mount({ lowDataMode: true, autoPlay: true });
    expect(low).toHaveAttribute("preload", "none");
    const lowPlay = vi.spyOn(low, "play");
    fireEvent.loadedMetadata(low);
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    fireEvent.loadedMetadata(low);
    expect(lowPlay).not.toHaveBeenCalled();
  });

  it("defers muted autoplay fallback until metadata is ready", async () => {
    viewport(false);
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new Error("Policy blocked"))
      .mockResolvedValue(undefined);
    const { video } = mount({ autoPlay: true });
    expect(play).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.loadedMetadata(video);
    });
    expect(play).toHaveBeenCalledTimes(2);
    expect(video.muted).toBe(true);
  });
});
