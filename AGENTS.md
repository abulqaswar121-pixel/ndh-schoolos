<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- School portal roles live in a protected school-scoped account table; verified server functions filter records before returning them, because browser role flags are not authorization.
- Report layout options are shared customization settings, with legacy Excel choices resolved into those settings; school-specific renderer dispatch must not be introduced.
- A4 previews scale fixed paper dimensions, not responsive document content, so phones and printed reports keep the same layout.
- Public school portals expose only branding; public school links never grant access to student or payroll records.
- Phone credentials use one normalized identity; school administrators may reset its PIN only when it is linked exclusively to their school, preventing cross-school account takeover.
- Collection forms use the current school's saved branding and fixed A4 page batches; parent slips remain blank so families confirm official names without exposing another learner's details.
- School aliases are unique public-branding fields; stable school UUIDs identify installed apps so alias edits never change an installed app's start address.
- Offline app shells use generated Workbox NetworkFirst navigation caching and one preview-guarded registrar; API responses and authentication never become app-shell caches.
- Offline copies and drafts are scoped to the signed-in user and school, cleared on sign-out, and replayed with the original revision through existing server authorization; conflicts never silently overwrite newer records.
