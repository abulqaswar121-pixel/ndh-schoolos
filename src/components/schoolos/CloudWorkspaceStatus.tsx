import { useSchoolOS } from "@/context/SchoolOSContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CloudWorkspaceStatus() {
  const {
    cloudStatus,
    cloudError,
    cloudSchool,
    retryCloudSave,
    refreshCloud,
    downloadCompleteBackup,
  } = useSchoolOS();
  const expired = Boolean(
    cloudSchool?.subscription_expires_at &&
    Date.parse(cloudSchool.subscription_expires_at) < Date.now(),
  );
  const inactive =
    expired || (cloudSchool && !["Active", "Free Trial"].includes(cloudSchool.subscription_status));
  if (cloudStatus !== "error" && !inactive) return null;
  const run = (action: () => Promise<void>) => {
    void action().catch((error) =>
      toast.error(error instanceof Error ? error.message : "Unable to complete cloud action."),
    );
  };
  return (
    <div
      role="alert"
      className="no-print border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-slate-800 sm:px-7"
    >
      <p className="font-bold">
        {inactive
          ? "Your school subscription needs attention. Cloud changes cannot be saved until it is active."
          : "Cloud changes are not saved yet."}
      </p>
      {cloudError && <p className="mt-1">{cloudError}</p>}
      <p className="mt-1">
        Keep this tab open. Download a backup before reloading if you have unsaved changes.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => run(retryCloudSave)}>
          Retry Save
        </Button>
        <Button size="sm" variant="outline" onClick={downloadCompleteBackup}>
          Download Backup
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (
              window.confirm(
                "Discard unsaved changes and reload the latest cloud records? Download a backup first if needed.",
              )
            )
              run(refreshCloud);
          }}
        >
          Reload Cloud Data
        </Button>
      </div>
    </div>
  );
}

/** Explicit migration only; no browser data is uploaded by merely signing in. */
export function CloudImportButton() {
  const { importLocalSchool } = useSchoolOS();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        void importLocalSchool().catch((error) =>
          toast.error(error instanceof Error ? error.message : "Import failed."),
        );
      }}
    >
      Import This Browser’s School
    </Button>
  );
}
