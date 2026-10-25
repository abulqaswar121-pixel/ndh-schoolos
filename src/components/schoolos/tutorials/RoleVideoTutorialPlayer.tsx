import {
  BookOpen,
  Calculator,
  ClipboardCheck,
  ShieldCheck,
  SkipForward,
  Smartphone,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface RoleVideoItem {
  roleId:
    | "admin"
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
  icon: React.ComponentType<{ className?: string }>;
}

export const ROLE_VIDEO_PLAYLIST: RoleVideoItem[] = [
  {
    roleId: "admin",
    tabLabel: "School Owner",
    fullTitle: "School Owner / Principal",
    durationLabel: "0:22",
    oneLiner: "Setup, staff PINs, live Naira fees, score approvals & result lock.",
    videoSrc: "/videos/tutorial-admin.mp4",
    posterSrc: "/videos/poster-admin.jpg",
    icon: ShieldCheck,
  },
  {
    roleId: "class_teacher",
    tabLabel: "Class Teacher",
    fullTitle: "Class Teacher",
    durationLabel: "0:25",
    oneLiner: "1-tap attendance, CA1/CA2/Exam grading & A4 report cards.",
    videoSrc: "/videos/tutorial-class-teacher.mp4",
    posterSrc: "/videos/poster-class-teacher.jpg",
    icon: BookOpen,
  },
  {
    roleId: "subject_teacher",
    tabLabel: "Subject Teacher",
    fullTitle: "Subject Teacher",
    durationLabel: "0:23",
    oneLiner: "Scoped subject marksheets, max-score guard & edit requests.",
    videoSrc: "/videos/tutorial-subject-teacher.mp4",
    posterSrc: "/videos/poster-subject-teacher.jpg",
    icon: ClipboardCheck,
  },
  {
    roleId: "bursar",
    tabLabel: "Bursar",
    fullTitle: "Bursar / Accountant",
    durationLabel: "0:24",
    oneLiner: "Class fee schedules, transfer confirmation, receipts & payroll.",
    videoSrc: "/videos/tutorial-bursar.mp4",
    posterSrc: "/videos/poster-bursar.jpg",
    icon: Calculator,
  },
  {
    roleId: "secretary",
    tabLabel: "Secretary",
    fullTitle: "School Secretary",
    durationLabel: "0:22",
    oneLiner: "Admissions, sibling phone linking, notices & safe printing.",
    videoSrc: "/videos/tutorial-secretary.mp4",
    posterSrc: "/videos/poster-secretary.jpg",
    icon: Users,
  },
  {
    roleId: "parent",
    tabLabel: "Parent",
    fullTitle: "Parent / Guardian",
    durationLabel: "0:21",
    oneLiner: "One phone login for all siblings — results, fees & receipts.",
    videoSrc: "/videos/tutorial-parent.mp4",
    posterSrc: "/videos/poster-parent.jpg",
    icon: Smartphone,
  },
];

interface RoleVideoTutorialPlayerProps {
  initialRoleId?: RoleVideoItem["roleId"] | undefined;
  autoPlay?: boolean | undefined;
  onRegisterSchool?: (() => void) | undefined;
}

export function RoleVideoTutorialPlayer({
  initialRoleId = "admin",
  autoPlay = true,
  onRegisterSchool,
}: RoleVideoTutorialPlayerProps) {
  const startIdx = Math.max(
    0,
    ROLE_VIDEO_PLAYLIST.findIndex((item) => item.roleId === initialRoleId)
  );

  const [roleIndex, setRoleIndex] = useState<number>(startIdx);
  const [mutedByBrowserPolicy, setMutedByBrowserPolicy] = useState<boolean>(false);
  const userEnabledAudioRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentVideo =
    ROLE_VIDEO_PLAYLIST[roleIndex] ?? ROLE_VIDEO_PLAYLIST[0]!;
  const nextVideo =
    ROLE_VIDEO_PLAYLIST[(roleIndex + 1) % ROLE_VIDEO_PLAYLIST.length]!;

  // Start playback whenever active role video changes
  useEffect(() => {
    if (!autoPlay) return;
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
        // Browser blocked unmuted autoplay before first click -> fall back to muted autoplay with 1-tap Sound pill
        if (cancelled) return;
        try {
          vid.muted = !userEnabledAudioRef.current;
          if (!userEnabledAudioRef.current) {
            vid.muted = true;
            setMutedByBrowserPolicy(true);
          }
          const p2 = vid.play();
          if (p2 && typeof p2.catch === "function") {
            p2.catch(() => {});
          }
        } catch {
          // Ignore in headless/jsdom test environments
        }
      }
    };

    void startPlayback();
    return () => {
      cancelled = true;
    };
  }, [roleIndex, autoPlay]);

  const handleSelectRole = (idx: number) => {
    userEnabledAudioRef.current = true;
    setMutedByBrowserPolicy(false);
    setRoleIndex(idx);
  };

  const handleVideoEnded = () => {
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
      data-testid="role-video-tutorial-player"
      className="overflow-hidden rounded-3xl border border-[#d0d5dd] bg-[#0a1a30] text-white shadow-lg"
    >
      {/* Compact Role Playlist Tabs */}
      <div className="border-b border-white/10 bg-[#0c2340] px-3.5 py-3 sm:px-5">
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
          preload="metadata"
          onEnded={handleVideoEnded}
          onVolumeChange={(e) => {
            if (!e.currentTarget.muted) {
              userEnabledAudioRef.current = true;
              setMutedByBrowserPolicy(false);
            }
          }}
          aria-label={`${currentVideo.fullTitle} video walkthrough`}
          className="h-full w-full object-contain"
        />

        {/* 1-Tap Unmute Pill shown ONLY if browser policy muted initial autoplay */}
        {mutedByBrowserPolicy && (
          <button
            type="button"
            onClick={handleEnableVoiceAudio}
            className="absolute top-3.5 left-3.5 z-10 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#9ed9d6] bg-[#0c2340]/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-xs transition hover:bg-[#1a4a6e]"
          >
            <VolumeX className="h-4 w-4 text-[#9ed9d6]" />
            <span>Tap for Voice Audio</span>
          </button>
        )}
      </div>

      {/* Slim Bottom Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0c2340] px-4 py-2.5 text-xs sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Volume2 className="h-4 w-4 shrink-0 text-[#9ed9d6]" />
          <span className="font-bold text-white">{currentVideo.fullTitle}:</span>
          <span className="truncate text-slate-300">{currentVideo.oneLiner}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleVideoEnded}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-[#9ed9d6] transition hover:bg-white/20 hover:text-white"
          >
            <SkipForward className="h-3 w-3" />
            <span>Up Next: {nextVideo.tabLabel}</span>
          </button>

          {onRegisterSchool && (
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
