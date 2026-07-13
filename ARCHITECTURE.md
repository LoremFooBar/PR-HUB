# Architecture

## Overview

PR Hub is a Chrome Extension (Manifest V3) built with React 19, TypeScript, and Vite. It displays a user's open and recently-merged GitHub pull requests and CI status in a popup, optionally scoped to a single organization.

## Project Structure

```
src/
  popup.tsx              # React entry point — mounts <App /> into #root
  popup.css              # All styles (GitHub Primer tokens, light/dark mode)
  App.tsx                # Root component — delegates to useApp hook, renders screen
  types.ts               # Shared TypeScript interfaces and types
  constants.ts           # Shared constants (pagination, branch sets)
  github.ts              # GitHub REST API layer (search, enrich, checks; org-scoped queries)
  storage.ts             # Chrome storage wrapper with caching (30m TTL) and org setting
  tabs.ts                # Chrome tabs helper (open or focus existing tab)
  utils/
    time.ts              # Date utilities (timeAgo, oneWeekAgo)
    repo.ts              # URL utilities (getRepoName)
    merge-status.ts      # PR merge readiness logic (getMergeStatus)
    search.ts            # Client-side PR filtering (filterPRs, token-AND substring)
  hooks/
    useApp.ts            # App-level state: auth, org scope, tab loading, caching, prefetch
    useLoginScreen.ts    # Login form state: input, validation, loading, error
    usePRList.ts         # PR list state: pagination, clipboard
  components/
    LoginScreen.tsx      # PAT input with ghp_ validation and scope badges
    Dashboard.tsx        # Header (incl. settings gear), tab bar, tab content routing
    Settings.tsx         # Org scope settings screen
    SearchBar.tsx        # Filter input for the active tab (/ to focus, Esc to clear)
    PRList.tsx           # Paginated PR list with conditional badges/stats
    Skeleton.tsx         # Loading placeholders (DashboardSkeleton, PRListSkeleton)
    Icons.tsx            # SVG icon components (Check, Branch, Link, Merge, Settings, etc.)
tests/
  setup.ts               # Jest setup: chrome API mock, clipboard mock
  __mocks__/style.ts     # CSS import stub for Jest
  unit/
    utils/               # Pure function tests (time, repo, merge-status)
    hooks/               # Hook tests with renderHook (useApp, useLoginScreen, usePRList)
  components/            # Playwright CT tests (LoginScreen, PRList, Dashboard)
playwright/
  index.html             # Playwright CT wrapper HTML
  index.tsx              # Playwright CT wrapper (imports CSS)
icons/                   # Extension icons (16, 48, 128px PNG)
popup.html               # Extension popup HTML (Vite entry point)
manifest.json            # Chrome Extension Manifest V3
```

## Data Flow

```
popup.html
  └─ src/popup.tsx
       └─ <App />  (useApp hook)
            ├─ Login: validates PAT → stores token → fetches assigned PRs → prefetches other tabs
            ├─ Init: reads cache → shows cached data instantly; only fetches tabs whose 30m cache is missing/expired
            ├─ Refresh: invalidates the tab cache and force-refetches
            └─ Renders:
                 ├─ <DashboardSkeleton />  (while loading)
                 ├─ <LoginScreen />        (no token)
                 ├─ <Settings />           (settings gear → org scope)
                 └─ <Dashboard />          (authenticated)
                      ├─ Tab: "My PRs"   → <PRList showChecks showBaseBranch />
                      └─ Tab: "Merged"   → <PRList showMergedBadge showBaseBranch />
```

## Module Responsibilities

| Layer | Modules | Role |
|-------|---------|------|
| **Types** | `types.ts`, `constants.ts` | Shared interfaces, type aliases, and configuration constants |
| **Utils** | `utils/time.ts`, `utils/repo.ts`, `utils/merge-status.ts`, `utils/search.ts` | Pure functions with no dependencies on React or browser APIs |
| **API** | `github.ts` | All GitHub REST API calls: org-scoped search, enrichment, approval counts |
| **Storage** | `storage.ts` | Chrome storage abstraction with 30m cache TTL and the persisted org setting. Falls back to no-op outside extension |
| **Platform** | `tabs.ts` | Chrome tabs abstraction. Falls back to `window.open` outside extension |
| **Hooks** | `hooks/useApp.ts`, `hooks/useLoginScreen.ts`, `hooks/usePRList.ts` | React state and effects. Each hook encapsulates one concern |
| **Components** | `components/*.tsx` | Pure rendering. Components receive data and callbacks from hooks |

## Design Principles

- **Separation of concerns**: Pure functions, constants, and types are in their own modules — not mixed into hooks or components
- **Hooks own logic, components own rendering**: Components are thin; hooks are testable without mounting
- **Cache-first UX**: Cached data (30m TTL) is shown instantly on popup open; tabs are only refetched when their cache is missing/expired or the user hits refresh
- **Stale request protection**: `activeLoadRef` counter discards responses from outdated API calls
- **Graceful degradation**: `storage.ts` and `tabs.ts` fall back to no-ops/alternatives when Chrome APIs are unavailable (enables testing outside extension context)

## Testing Strategy

| Layer | Tool | What's Tested |
|-------|------|---------------|
| **Pure functions** | Jest | `getMergeStatus` (all 9 branches), `timeAgo`, `getRepoName`, date helpers |
| **Hooks** | Jest + `renderHook` | State transitions, async flows, error handling. GitHub/storage modules are mocked |
| **Components** | Playwright CT | Rendering, user interaction, conditional UI. Mounted in real browser |

Run tests:
```bash
npm test          # Jest unit tests (hooks + utils)
npm run test:ct   # Playwright component tests
```

## GitHub API Flow

1. **Search** — Per-tab queries: `author:{user} is:open` (My PRs) and `author:{user} is:merged merged:>{lastWeek}` (Merged). When an org scope is set, ` org:{org}` is appended to each query.
2. **Enrich** — For each open PR: fetch PR details + reviews in parallel, then fetch commit status + check-runs. Merged PRs are enriched with base/head refs only.
3. **Approval counts** — The latest review per user is tracked to determine approval/changes-requested counts shown on the My PRs tab.

Only Classic PATs (`ghp_`) work. Fine-grained tokens don't support the Search Issues API.
