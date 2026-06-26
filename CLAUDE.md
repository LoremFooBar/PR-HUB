# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

PR Hub is a Chrome Extension (Manifest V3) that shows a user's open and recently-merged GitHub pull requests and CI status in a popup, optionally scoped to a single organization. It uses GitHub's REST API with a Classic Personal Access Token (`ghp_`). Styled with GitHub Primer design tokens and supports auto light/dark mode via `prefers-color-scheme`.

## Commands

- `npm run build` — production build to `dist/`
- `npm run dev` — watch mode (rebuilds on change)
- `npm test` — Jest unit tests (hooks + utils)
- `npm run test:ct` — Playwright component tests

After building, load `dist/` as an unpacked extension in `chrome://extensions`.

## Architecture

**Entry point:** `popup.html` → `src/popup.tsx` → `<App />`

**Data flow:** The `useApp` hook holds all top-level state (token, user, org scope, PRs). Each tab is loaded on demand and prefetched in the background: "My PRs" via `fetchAuthoredPRs` and "Merged" via `fetchMergedPRs`. Open PRs are enriched with details (comments, check status, approval counts) via parallel API calls. When an org scope is set, an `org:{org}` qualifier is appended to the search queries.

**Caching:** Per-tab results are cached in `chrome.storage.local` for 30 minutes. On popup open, fresh cache is shown immediately and those tabs are not refetched; only missing/expired tabs hit the network. The refresh button invalidates the tab cache and force-refetches.

**Key modules:**
- `src/github.ts` — All GitHub API interaction. Org-scoped search, enrichment (PR details + reviews + commit status + check-runs), and approval-count detection. Re-exports types from `types.ts`.
- `src/storage.ts` — Wrapper around `chrome.storage.local` for PAT persistence, the org setting, and the 30-minute per-tab cache. Falls back to no-op when chrome.storage is unavailable.
- `src/types.ts` — Shared TypeScript interfaces (`PullRequestItem`, `GitHubUser`, `CheckStatus`).

**Components:**
- `LoginScreen` — PAT input with `ghp_` prefix validation and scope badges.
- `Dashboard` — Header (profile link, reload, settings gear, logout) + tab bar ("My PRs" / "Merged") + scrollable PR list.
- `Settings` — Org scope screen: free-text org login (blank = all orgs), Save/Cancel.
- `PRList` — Reusable paginated list (10 per page). Conditionally renders check badges, author info, and comment/approval counts based on props.
- `Skeleton` — Loading placeholders (`DashboardSkeleton` for initial load, `PRListSkeleton` for reload).

**Styling:** Single `src/popup.css` file using CSS custom properties for Primer color tokens. `:root` defines light mode, `@media (prefers-color-scheme: dark)` overrides for dark mode. All components use class names (no inline styles, no CSS-in-JS).

**Build:** Vite with a custom plugin that copies `manifest.json` and `icons/*.png` into `dist/` after bundling.

## Code principles

Follow DRY (Don't Repeat Yourself) and ETC (Easy To Change) principles in all changes.

## GitHub API constraints

- Only Classic PATs (`ghp_`) work — fine-grained tokens don't support the Search Issues API.
- Required scopes: `repo`, `read:user`.
- The Merged tab is filtered to the last week (`merged:>{lastWeek}`) to limit results.
- Org scoping appends an ` org:{org}` qualifier to the search queries; an empty org means no qualifier (all orgs).
