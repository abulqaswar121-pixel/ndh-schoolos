import {
  BookOpen,
  Calculator,
  ClipboardCheck,
  FileCheck2,
  ShieldCheck,
  SkipForward,
  Smartphone,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useOptionalSchoolOS } from "@/context/SchoolOSContext";
import { WALKTHROUGH_V5 } from "@/data/walkthroughVideosV5";
import { getResolvedCustomization } from "@/services/customizationDefaults";

export interface VideoChapter {
  label: string;
  startSec: number;
}

export interface RoleVideoItem {
  roleId:
    | "admin"
    | "exam_officer"
    | "class_teacher"
    | "subject_teacher"
    | "bursar"
    | "secretary"
    | "parent";
  tabLabel: string;
  fullTitle: string;
  durationLabel: string;
  oneLiner: string;
  videoSrc: string;
  posterSrc: string;
  captionsSrc: string;
  icon: React.ComponentType<{ className?: string }>;
  chapters: VideoChapter[];
}

const ROLE_PRESENTATION = {
  admin: { tabLabel: "School Owner", icon: ShieldCheck },
  exam_officer: { tabLabel: "Exam Officer", icon: FileCheck2 },
  class_teacher: { tabLabel: "Class Teacher", icon: BookOpen },
  subject_teacher: { tabLabel: "Subject Teacher", icon: ClipboardCheck },
  bursar: { tabLabel: "Bursar", icon: Calculator },
  secretary: { tabLabel: "Secretary", icon: Users },
  parent: { tabLabel: "Parent", icon: Smartphone },
} satisfies Record<RoleVideoItem["roleId"], { tabLabel: string; icon: RoleVideoItem["icon"] }>;

export const ROLE_VIDEO_PLAYLIST: RoleVideoItem[] = WALKTHROUGH_V5.map((video) => ({
  ...ROLE_PRESENTATION[video.roleId],
  roleId: video.roleId,
  fullTitle: video.title,
  durationLabel: video.durationLabel,
  oneLiner: video.oneLiner,
  videoSrc: video.videoSrc,
  posterSrc: video.posterSrc,
  captionsSrc: video.captionsSrc,
  chapters: video.chapters.map((chapter, index) => ({
    label: `${index + 1}. ${chapter.label}`,
    startSec: chapter.startSec,
  })),
}));

interface RoleVideoTutorialPlayerProps {
  initialRoleId?: RoleVideoItem["roleId"] | undefined;
  /**
   * When set (e.g. inside an authenticated portal), locks the player strictly
   * to this single role's walkthrough video and hides all other role tabs.
   */
  lockedRoleId?: RoleVideoItem["roleId"] | undefined;
  autoPlay?: boolean | undefined;
  onRegisterSchool?: (() => void) | undefined;
}

export function RoleVideoTutorialPlayer({
  initialRoleId = "admin",
  lockedRoleId,
  autoPlay = true,
  onRegisterSchool,
}: RoleVideoTutorialPlayerProps) {
  const optionalCtx = useOptionalSchoolOS();
  const lowDataMode = optionalCtx
    ? getResolvedCustomization(optionalCtx.db.settings).workspaceTheme
        .lowDataMode
    : false;
  const effectiveAutoPlay = autoPlay && !lowDataMode;

  const targetRole = lockedRoleId ?? initialRoleId;
  const startIdx = Math.max(
    0,
    ROLE_VIDEO_PLAYLIST.findIndex((item) => item.roleId === targetRole)
  );

  const [roleIndex, setRoleIndex] = useState<number>(startIdx);

  // Keep locked player strictly pinned to `lockedRoleId` if role changes
  useEffect(() => {
    if (!lockedRoleId) return;
    const lockedIdx = ROLE_VIDEO_PLAYLIST.findIndex(
      (item) => item.roleId === lockedRoleId
    );
    if (lockedIdx >= 0 && lockedIdx !== roleIndex) {
      setRoleIndex(lockedIdx);
    }
  }, [lockedRoleId, roleIndex]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [mutedByBrowserPolicy, setMutedByBrowserPolicy] =
    useState<boolean>(false);
  const userEnabledAudioRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentVideo =
    ROLE_VIDEO_PLAYLIST[roleIndex] ?? ROLE_VIDEO_PLAYLIST[0]!;
  const nextVideo =
    ROLE_VIDEO_PLAYLIST[(roleIndex + 1) % ROLE_VIDEO_PLAYLIST.length]!;

  // Determine active chapter from playback time
  let activeChapterIdx = 0;
  for (let i = 0; i < currentVideo.chapters.length; i++) {
    const ch = currentVideo.chapters[i];
    if (ch && currentTime >= ch.startSec - 0.15) {
      activeChapterIdx = i;
    }
  }

  // Track whether the player is on screen. Video only plays while visible
  // and pauses automatically once scrolled past.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState<boolean>(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        setInView(visible);
        if (!visible) {
          const vid = videoRef.current;
          if (vid && typeof vid.pause === "function") {
            try {
              vid.pause();
            } catch {
              // ignore
            }
          }
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setCurrentTime(0);
  }, [roleIndex]);

  useEffect(() => {
    if (!effectiveAutoPlay || !inView) return;
    const vid = videoRef.current;
    if (!vid || typeof vid.play !== "function") return;

    let cancelled = false;
    const startPlayback = async () => {
      try {
        vid.muted = false;
        const p = vid.play();
        if (p && typeof p.then === "function") {
          await p;
        }
        if (!cancelled) {
          setMutedByBrowserPolicy(false);
        }
      } catch {
        if (cancelled) return;
        try {
          if (!userEnabledAudioRef.current) {
            vid.muted = true;
            setMutedByBrowserPolicy(true);
          } else {
            vid.muted = false;
          }
          const p2 = vid.play();
          if (p2 && typeof p2.catch === "function") {
            p2.catch(() => {});
          }
        } catch {
          // Ignore in jsdom
        }
      }
    };

    void startPlayback();
    return () => {
      cancelled = true;
    };
  }, [roleIndex, effectiveAutoPlay, inView]);

  const handleSelectRole = (idx: number) => {
    if (lockedRoleId) return;
    userEnabledAudioRef.current = true;
    setMutedByBrowserPolicy(false);
    setRoleIndex(idx);
  };

  const handleJumpChapter = (startSec: number) => {
    userEnabledAudioRef.current = true;
    setMutedByBrowserPolicy(false);
    setCurrentTime(startSec);
    const vid = videoRef.current;
    if (vid) {
      try {
        vid.currentTime = startSec;
      } catch {
        // Ignore in jsdom
      }
      vid.muted = false;
      const p = vid.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    }
  };

  const handleVideoEnded = () => {
    if (lockedRoleId) {
      // Locked to this portal's single role — never roll into another role's video
      return;
    }
    setRoleIndex((prev) => (prev + 1) % ROLE_VIDEO_PLAYLIST.length);
  };

  const handleEnableVoiceAudio = () => {
    userEnabledAudioRef.current = true;
    setMutedByBrowserPolicy(false);
    const vid = videoRef.current;
    if (vid) {
      vid.muted = false;
      const p = vid.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="role-video-tutorial-player"
      className="overflow-hidden rounded-3xl border border-[#d0d5dd] bg-[#0a1a30] text-white shadow-lg"
    >
      {/* Role Playlist Tabs (Public) OR Single-Role Portal Header (In-Portal Locked) */}
      <div className="border-b border-white/10 bg-[#0c2340] px-3.5 py-3 sm:px-5">
        {lockedRoleId ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0c2340] shadow-xs">
              <currentVideo.icon className="h-3.5 w-3.5 text-[#1a4a6e]" />
              <span>{currentVideo.fullTitle} — Portal Video Guide</span>
              <span className="text-[10px] font-medium text-[#667085]">
                {currentVideo.durationLabel}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#9ed9d6]">
              Dedicated to your portal role only
            </span>
          </div>
        ) : (
          <div
            role="tablist"
            aria-label="Choose role video tutorial"
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
          >
            {ROLE_VIDEO_PLAYLIST.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === roleIndex;
              return (
                <button
                  key={item.roleId}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => handleSelectRole(idx)}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-white text-[#0c2340] shadow-xs"
                      : "border border-white/15 bg-white/8 text-slate-200 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      active ? "text-[#1a4a6e]" : "text-[#9ed9d6]"
                    }`}
                  />
                  <span>{item.tabLabel}</span>
                  <span
                    className={`text-[10px] font-medium ${
                      active ? "text-[#667085]" : "text-slate-400"
                    }`}
                  >
                    {item.durationLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Real MP4 Video Stage with Spoken Voiceover */}
      <div className="relative aspect-video w-full bg-[#060f1d]">
        <video
          ref={videoRef}
          key={currentVideo.videoSrc}
          src={currentVideo.videoSrc}
          poster={currentVideo.posterSrc}
          controls
          playsInline
          preload={lowDataMode ? "none" : "metadata"}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={handleVideoEnded}
          onVolumeChange={(e) => {
            if (!e.currentTarget.muted) {
              userEnabledAudioRef.current = true;
              setMutedByBrowserPolicy(false);
            }
          }}
          aria-label={`${currentVideo.fullTitle} full video walkthrough`}
          className="h-full w-full object-contain"
        >
          <track
            kind="captions"
            src={currentVideo.captionsSrc}
            srcLang="en"
            label="English"
            default
          />
        </video>

        {mutedByBrowserPolicy && (
          <button
            type="button"
            onClick={handleEnableVoiceAudio}
            className="absolute top-3.5 left-3.5 z-10 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#9ed9d6] bg-[#0c2340]/92 px-3.5 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-xs transition hover:bg-[#1a4a6e]"
          >
            <VolumeX className="h-4 w-4 text-[#9ed9d6]" />
            <span>Tap for Voice Narration</span>
          </button>
        )}
      </div>

      {/* Interactive Chapter Jump Strip (Welcome -> Sign-Up -> Sign-In -> All Pages) */}
      <div className="border-t border-white/10 bg-[#081528] px-3.5 py-2.5 sm:px-5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {currentVideo.chapters.map((ch, idx) => {
            const isCurrent = idx === activeChapterIdx;
            return (
              <button
                key={ch.label}
                type="button"
                onClick={() => handleJumpChapter(ch.startSec)}
                className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  isCurrent
                    ? "bg-[#1a4a6e] text-white ring-1 ring-[#9ed9d6]"
                    : "bg-white/6 text-slate-300 hover:bg-white/15 hover:text-white"
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slim Bottom Status Bar (Stacks cleanly on phones, single row on sm+) */}
      <div className="flex flex-col gap-2.5 border-t border-white/10 bg-[#0c2340] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-2 sm:items-center">
          <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-[#9ed9d6] sm:mt-0" />
          <div className="min-w-0 leading-relaxed">
            <span className="font-bold text-white">{currentVideo.fullTitle}: </span>
            <span className="text-slate-300">{currentVideo.oneLiner}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:justify-end">
          {!lockedRoleId && (
            <button
              type="button"
              onClick={handleVideoEnded}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-[#9ed9d6] transition hover:bg-white/20 hover:text-white"
            >
              <SkipForward className="h-3 w-3" />
              <span>Up Next: {nextVideo.tabLabel}</span>
            </button>
          )}

          {onRegisterSchool && !lockedRoleId && (
            <button
              type="button"
              onClick={onRegisterSchool}
              className="cursor-pointer font-bold text-white underline decoration-[#9ed9d6] underline-offset-4 hover:text-[#9ed9d6]"
            >
              Register School →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
