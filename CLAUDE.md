# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

PR Hub is a Chrome Extension (Manifest V3) that shows a user's open and recently-merged GitHub pull requests and CI status in a side panel, optionally scoped to a single organization. It uses GitHub's REST API with a Classic Personal Access Token (`ghp_`). Styled with GitHub Primer design tokens and supports auto light/dark mode via `prefers-color-scheme`.

## Commands

- `npm run build` — production build to `dist/` (popup/background, then the content script)
- `npm run dev` — watch mode (rebuilds on change)
- `npm test` — Jest unit tests (hooks + utils)
- `npm run test:ct` — Playwright component tests

After building, load `dist/` as an unpacked extension in `chrome://extensions`.

## Architecture

**Entry point:** `popup.html` → `src/popup.tsx` → `<App />`

**Data flow:** The `useApp` hook holds all top-level state (token, user, org scope, PRs). PR data lives in one `Record<Tab, PullRequestItem[]>` keyed by tab, and the tab list itself is `ALL_TABS` in `src/constants.ts` (which also derives the `cached_*` storage keys) — so a new tab means touching `ALL_TABS`, `fetchTab` in `useApp`, and `TAB_VIEW` in `Dashboard`. Each tab is loaded on demand and prefetched in the background: "My PRs" via `fetchAuthoredPRs`, "Reviews" via `fetchReviewPRs`, and "Merged" via `fetchMergedPRs`. Open PRs are enriched with details (comments, check status, approval counts) via parallel API calls. When an org scope is set, an `org:{org}` qualifier is appended to the search queries.

**Caching & background refresh:** Per-tab results are cached in `chrome.storage.local`. A background service worker (`src/background.ts`) refreshes every tab every 30 minutes via `chrome.alarms` (plus once on install/startup). On panel open the cache is shown immediately regardless of age and PRs are **not** refetched — only a tab that has never been cached hits the network. Background refreshes stream into an open panel via a `chrome.storage.onChanged` listener in `useApp`. The refresh button still force-refetches on demand. After each background refresh the "My PRs" tab group is gently re-synced (`syncPRTabGroup` with `gentle: true`): never closing the active tab, and without reordering. This automatic re-sync is gated by the `auto_sync` setting (default **off**); when off, the group only changes on a manual sync. When on, the gentle sync also *creates* the group if it's missing (`create: true`), anchoring it to the last focused window. "Stray" tabs (repurposed to non-PR URLs) are never closed in either sync mode; a setting (`stray_tab_action`) decides whether they're moved out of the group (default) or left in it.

**Hover preview on PR links:** A content script (`src/content.ts`) runs on every site **except** github.com and shows a small floating card when the pointer rests (200 ms) on a link to a GitHub PR. It is injected into subframes too (`all_frames` + `match_origin_as_fallback`, so `srcdoc`/`blob:` frames are covered) — without that, links inside embedded content such as Claude artifacts get no preview. Inside a frame the card is clamped to that frame's viewport, since `position: fixed` can't escape it. It is **cache-only** — never any network call: it indexes every `cached_*` tab (`TAB_CACHE_KEYS`) by canonical PR URL (`normalizePRUrl` in `src/utils/pr-url.ts`, so `/files`, query strings and fragments all match) and shows nothing for a PR that isn't cached. Cache age is ignored, matching the panel. The card is rendered imperatively into a closed shadow root attached to `<html>` (styles from `src/preview-style.ts` via `adoptedStyleSheets`, so a page's `style-src` CSP can't block them) and is `pointer-events: none`. It hides on pointer-out, scroll, `Esc`, and window blur, and follows the `link_preview` setting live through `chrome.storage.onChanged`.

**Key modules:**
- `src/github.ts` — All GitHub API interaction. Org-scoped search, enrichment (PR details + reviews + commit status + check-runs), and approval-count detection. Re-exports types from `types.ts`.
- `src/storage.ts` — Wrapper around `chrome.storage.local` for PAT persistence, settings, and the 30-minute per-tab cache. Settings live in one `AppSettings` object with `DEFAULT_SETTINGS`; `setSettings` writes them all in a single call, while individual getters exist for the background worker and `src/tabs.ts`. Falls back to no-op when chrome.storage is unavailable.
- `src/types.ts` — Shared TypeScript interfaces (`PullRequestItem`, `GitHubUser`, `CheckStatus`).

**Components:**
- `LoginScreen` — PAT input with `ghp_` prefix validation and scope badges.
- `Dashboard` — Header (profile link, open-in-tab-group, reload, settings gear, logout) + tab bar ("My PRs" / "Reviews" / "Merged", labels/empty states/list columns per tab in the `TAB_VIEW` map) + search bar + scrollable PR list. The list is ordered by `sortPRs` (`src/utils/sort.ts`) per the `pr_sort_order` setting, applied to the filtered list at render time so a setting change reorders without refetching — `github.ts` returns PRs unsorted. The tab-group button calls `syncPRTabGroup` (`src/tabs.ts`), which opens all open PRs in a "My PRs" tab group and re-syncs it (closes stale tabs, opens missing ones) on each press. It takes the PR items (not just URLs) and orders the tabs with the same `sortPRs`, so panel and tab group share one order.
- `SearchBar` — Client-side filter for the active tab. Its query is applied via the pure `filterPRs` (`src/utils/search.ts`, token-AND substring over title/repo/branch/author) memoized in `Dashboard`. Ephemeral (not persisted); `/` focuses, `Esc` clears.
- `Settings` — Edits a local draft of the whole `AppSettings` object and saves it in one call: org scope (free-text org login, blank = all orgs), automatic tab group sync (on/off, default off; when on it also creates the group if missing), the hover preview on PR links (`link_preview`, default **on**), the stray-tab action (move out of group / leave in group), the tab-group color (Chrome's fixed palette, default blue), and the PR order (`pr_sort_order`: by ticket number then date / by title / by title then date / by date — all ascending, default by ticket number then date), Save/Cancel.
- `PRList` — Reusable paginated list (10 per page). Conditionally renders check badges, author info, comment/approval counts, and the "draft" / "reviewed by you" chips (`showDraftTag` + `draft`, `showReviewedTag` + `reviewed_by_me`) based on props.
- `Skeleton` — Loading placeholders (`DashboardSkeleton` for initial load, `PRListSkeleton` for reload).

**Styling:** Single `src/popup.css` file using CSS custom properties for Primer color tokens. `:root` defines light mode, `@media (prefers-color-scheme: dark)` overrides for dark mode. All components use class names (no inline styles, no CSS-in-JS).

**Build:** Vite with a custom plugin that copies `manifest.json` and `icons/*.png` into `dist/` after bundling. A declarative content script can't be an ES module, so the content script is a **second** build (`vite.config.content.ts`, IIFE, `emptyOutDir: false`) that runs after the main one — `npm run build` does both, `npm run dev:content` watches it.

## Code principles

Follow DRY (Don't Repeat Yourself) and ETC (Easy To Change) principles in all changes.

## GitHub API constraints

- Only Classic PATs (`ghp_`) work — fine-grained tokens don't support the Search Issues API.
- Required scopes: `repo`, `read:user`.
- The Merged tab is filtered to the last week (`merged:>{lastWeek}`) to limit results.
- The Reviews tab is the union of two searches, deduped by PR id:
  - `user-review-requested:@me` — requests addressed to the user **directly**. Not `review-requested:`, which also returns every PR requested from a team the user belongs to and floods the tab when a team is auto-requested on all PRs (measured: 0 vs 136 in `daylightsec`). The qualifier only accepts `@me`, hence no username argument.
  - `reviewed-by:@me review:required -author:@me` — PRs the user already reviewed that still lack an approval. GitHub discharges a review request as soon as *any* review is submitted, including a comment-only one, so without this half a PR still needing the user's approval silently drops out of the tab.
  A PR in both (the author re-requested after a review) counts as a fresh request. Items from the second search carry `reviewed_by_me`, which `sortPRs` treats as the first sort key so they land after the fresh requests in every order, marked with a "reviewed by you" chip.
  Neither query excludes drafts: a review can be requested on a draft PR (GitHub even banners "waiting on your review" there), so `-is:draft` would silently drop real requests. Drafts get a "draft" chip instead, from the search payload's `draft` flag — also shown on "My PRs".
- Org scoping appends an ` org:{org}` qualifier to the search queries; an empty org means no qualifier (all orgs).
