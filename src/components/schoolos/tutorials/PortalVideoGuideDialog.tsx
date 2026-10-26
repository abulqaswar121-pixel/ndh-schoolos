import { PlayCircle } from "lucide-react";
import React from "react";
import {
  ROLE_VIDEO_PLAYLIST,
  RoleVideoTutorialPlayer,
} from "./RoleVideoTutorialPlayer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSchoolOS } from "@/context/SchoolOSContext";
import type { UserRole } from "@/types/school";

function resolvePortalVideoRole(
  role: UserRole
): (typeof ROLE_VIDEO_PLAYLIST)[number]["roleId"] {
  if (role === "muallim") return "class_teacher";
  return role;
}

export function PortalVideoGuideDialog() {
  const { portal, portalVideoGuideOpen, setPortalVideoGuideOpen } =
    useSchoolOS();

  const lockedRoleId = resolvePortalVideoRole(portal.role);
  const videoMeta =
    ROLE_VIDEO_PLAYLIST.find((item) => item.roleId === lockedRoleId) ??
    ROLE_VIDEO_PLAYLIST[0]!;

  return (
    <Dialog open={portalVideoGuideOpen} onOpenChange={setPortalVideoGuideOpen}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-slate-200 bg-white p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-[#0b1220] sm:text-lg">
            <PlayCircle className="h-5 w-5 text-[#1a4a6e]" />
            <span>{videoMeta.fullTitle} — In-Portal Video Guide</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#667085]">
            Step-by-step spoken walkthrough tailored strictly to your{" "}
            <strong>{videoMeta.fullTitle}</strong> portal. Tap any chapter pill
            below the video to jump directly to a task.
          </DialogDescription>
        </DialogHeader>

        {portalVideoGuideOpen && (
          <div className="mt-1">
            <RoleVideoTutorialPlayer
              lockedRoleId={lockedRoleId}
              autoPlay
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
