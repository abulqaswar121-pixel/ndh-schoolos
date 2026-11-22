import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function SchoolAppInstall({ school }: { school: { schoolId: string; name: string; logoUrl?: string } }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); };
  }, [school.schoolId]);
  if (installed) return null;
  return <>
    <Button variant="outline" onClick={async () => {
      if (!prompt) { setOpen(true); return; }
      await prompt.prompt(); await prompt.userChoice; setPrompt(null);
    }}><Download className="mr-2 h-4 w-4" />Install school app</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{school.name}</DialogTitle></DialogHeader>
      <p className="text-sm">On iPhone, open this school link in Safari, tap Share, then Add to Home Screen. On Android, open it in Chrome and choose Install app or Add to Home screen.</p>
      <p className="text-sm text-muted-foreground">Use your own device. Sign in online first; saved records and drafts stay on this device until you sign out. New sign-ins, payments and messages need internet.</p>
      {!school.logoUrl?.startsWith("data:image/png;base64,") && <p className="text-sm text-destructive">Ask your school administrator to upload a PNG school logo first.</p>}
    </DialogContent></Dialog>
  </>;
}