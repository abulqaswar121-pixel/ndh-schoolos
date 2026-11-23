import React, { useEffect, useRef, useState } from "react";

export interface WalkthroughVideoSource {
  videoSrc: string;
  posterSrc: string;
  aspectRatio?: string;
}
export interface WalkthroughVideoMedia extends WalkthroughVideoSource {
  variants?: { phone: WalkthroughVideoSource; desktop: WalkthroughVideoSource };
}
type ViewPreference = "auto" | "phone" | "desktop";
interface PlaybackSnapshot {
  time: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  rate: number;
  captions?: TextTrackMode | undefined;
}
interface Props {
  media: WalkthroughVideoMedia;
  title: string;
  captionsSrc: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  userEnabledAudioRef: React.RefObject<boolean>;
  lowDataMode: boolean;
  autoPlay: boolean;
  inView: boolean;
  onMutedByPolicy: (muted: boolean) => void;
  onTimeUpdate: React.ReactEventHandler<HTMLVideoElement>;
  onEnded: React.ReactEventHandler<HTMLVideoElement>;
  onVolumeChange: React.ReactEventHandler<HTMLVideoElement>;
  children?: React.ReactNode;
}

/** One video element / one network source, with no UA sniffing or duplicate hidden players. */
export function ResponsiveWalkthroughVideo({
  media,
  title,
  captionsSrc,
  videoRef,
  userEnabledAudioRef,
  lowDataMode,
  autoPlay,
  inView,
  onMutedByPolicy,
  onTimeUpdate,
  onEnded,
  onVolumeChange,
  children,
}: Props) {
  const [preference, setPreference] = useState<ViewPreference>("auto");
  const [phoneViewport, setPhoneViewport] = useState(false);
  // No MP4 source during SSR/hydration: a phone never preloads the desktop recording first.
  const [activeSource, setActiveSource] = useState<WalkthroughVideoSource | null>(null);
  const [viewportReady, setViewportReady] = useState(false);
  const pending = useRef<PlaybackSnapshot | null>(null);
  const loading = useRef(true);
  const startPlaybackRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setPhoneViewport(query.matches);
      setViewportReady(true);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const view = preference === "auto" ? (phoneViewport ? "phone" : "desktop") : preference;
  const desired = media.variants?.[view] ?? media;

  useEffect(() => {
    if (!viewportReady || desired.videoSrc === activeSource?.videoSrc) return;
    const video = videoRef.current;
    // Snapshot BEFORE rendering the replacement src, when the old element still has its state.
    // If the user switches again while loading, keep the first valid snapshot.
    if (activeSource && video && !loading.current) {
      pending.current = {
        time: video.currentTime,
        paused: video.paused,
        muted: video.muted,
        volume: video.volume,
        rate: video.playbackRate,
        captions: video.textTracks[0]?.mode,
      };
    }
    loading.current = true;
    setActiveSource(desired);
  }, [viewportReady, desired, activeSource, videoRef]);

  const startPlayback = async () => {
    const video = videoRef.current;
    if (!video || loading.current || !inView) return;
    try {
      video.muted = false;
      await video.play();
      onMutedByPolicy(false);
    } catch {
      // Browsers may reject audible autoplay. Explicit audio opt-in is never undone.
      if (!userEnabledAudioRef.current) {
        video.muted = true;
        onMutedByPolicy(true);
      }
      try {
        await video.play();
      } catch {
        /* Native controls remain available. */
      }
    }
  };
  startPlaybackRef.current = startPlayback;
  useEffect(() => {
    const video = videoRef.current;
    if (!inView) {
      video?.pause();
      return;
    }
    if (autoPlay && !lowDataMode) void startPlaybackRef.current();
  }, [inView, autoPlay, lowDataMode, videoRef]);

  const restoreCaptions = () => {
    const video = videoRef.current;
    const snapshot = pending.current;
    if (snapshot?.captions && video?.textTracks[0]) video.textTracks[0].mode = snapshot.captions;
  };
  const loaded = () => {
    loading.current = false;
    const video = videoRef.current;
    if (!video) return;
    const snapshot = pending.current;
    if (snapshot) {
      video.currentTime = Math.min(
        snapshot.time,
        Number.isFinite(video.duration) ? video.duration : snapshot.time,
      );
      video.muted = snapshot.muted;
      video.volume = snapshot.volume;
      video.playbackRate = snapshot.rate;
      restoreCaptions();
      pending.current = null;
      // A manual/automatic format change must not start a paused video or override low-data mode.
      if (!snapshot.paused && inView && !lowDataMode) void video.play().catch(() => {});
    } else if (autoPlay && !lowDataMode && inView) {
      void startPlaybackRef.current();
    }
  };
  const portrait = Boolean(media.variants && view === "phone");

  return (
    <>
      {media.variants && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0c2340] px-3.5 py-2 sm:px-5">
          <span className="text-[11px] font-semibold text-[#9ed9d6]">
            Screen tutorial · Demo records
          </span>
          <div className="flex items-center gap-1" role="group" aria-label="Tutorial video view">
            {(["auto", "phone", "desktop"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={preference === option}
                onClick={() => setPreference(option)}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold ${preference === option ? "bg-white text-[#0c2340]" : "bg-white/10 text-slate-200 hover:bg-white/20"}`}
              >
                {option === "auto" ? "Auto" : option === "phone" ? "Phone" : "Desktop"}
              </button>
            ))}
            <span aria-live="polite" className="sr-only">
              Showing {view} video view
            </span>
          </div>
        </div>
      )}
      <div className="bg-[#060f1d]">
        <div
          data-testid="walkthrough-video-stage"
          className={`relative mx-auto w-full ${portrait ? "aspect-[9/16] max-w-[420px]" : "aspect-video"}`}
        >
          <video
            ref={videoRef}
            src={activeSource?.videoSrc}
            poster={activeSource?.posterSrc ?? media.posterSrc}
            controls
            playsInline
            preload={lowDataMode ? "none" : "metadata"}
            onLoadedMetadata={loaded}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onVolumeChange={onVolumeChange}
            aria-label={`${title} full video walkthrough`}
            className="h-full w-full object-contain"
          >
            <track
              kind="captions"
              src={captionsSrc}
              srcLang="en"
              label="English"
              default
              onLoad={restoreCaptions}
            />
          </video>
          {children}
        </div>
      </div>
    </>
  );
}
