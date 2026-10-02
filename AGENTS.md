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

## Stabilitas app architecture
- All engineering calculations live as pure functions in src/lib/engine/ (constants only in params.ts) — keeps results testable against the workbook UAT sample.
- Projects persist client-side via Zustand persist (skipHydration + useHydrated) — single-user app, no backend.
- Each workflow step is its own route under src/routes/proyek.$id.*.tsx, sharing the proyek.$id.tsx layout.
