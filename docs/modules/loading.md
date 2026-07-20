# Module: Loading UX

Cross-cutting rule for every route that shows game or panel data.

## Goal

Navigating to a page must feel immediate. The shell and **skeletons shaped like the incoming UI** appear first. Real data replaces skeletons when ready. The browser must not sit on a frozen previous page (or blank) while MySQL/Steam work finishes.

## Non-goals

- Spinners as the default full-page loading affordance (skeletons preferred).
- Showing empty tables/charts with no pending state.
- Blocking the entire document on every query in `load`.

## Required pattern

1. **Paint the route chrome first** (layout, nav, source switcher, page title, filter controls).
2. **Show skeletons** in each data region (table rows, profile header, chart block, Whois panels).
3. **Swap in data** when the promise resolves. Prefer per-region pending states so a slow secondary query does not hold the primary content.
4. **Errors stay local** to that region when possible (retry / message), without unmounting the whole page.
5. **Multi-source partial failures use a shared treatment**: every surface that renders `FanOutResult[]` (Whois search, Whois alt links, MGE presence badges) shows a failed source with `$lib/components/shell/source-error.svelte` instead of a bespoke error block per page. User-facing copy stays generic ("Couldn't reach this source"); the raw adapter error is only exposed as a `title` tooltip for staff diagnosis, never inlined into page body text.

## SvelteKit rules

- Do **not** `await` slow adapter/DB/Steam calls in `load` if that delays sending the page. Return promises (streamed/`deferred`) or fetch after the shell is up so the client can render pending UI.
- `load` may still resolve **fast** sync needs up front (auth gate, parse params, resolve `sourceId`, list enabled sources for the switcher).
- Prefer streaming deferred data from the server over a blank wait, then client-only waterfalls, when SEO/first paint matter.
- Layout `load` must stay light. Never put heavy MGE/Whois queries in root layout.

## UI rules

- Skeleton geometry should match the final layout (row counts, card heights, avatar circle, etc.).
- Shared primitives live under something like `$lib/components/ui/skeleton` (or shadcn Skeleton) and page-specific composed skeletons next to the page.
- Filter/source changes re-enter the skeleton state for affected regions only.

## Acceptance checks

- Clicking a nav link updates the URL and shows the new page chrome + skeletons without a multi-second freeze on the old view.
- A slow source or Steam call leaves skeletons visible; it does not block sibling regions that already have data.
- Hard-refresh on a data page still shows meaningful pending UI, not a long empty document.
- No route ships as “await everything in `load`, then render once.”
