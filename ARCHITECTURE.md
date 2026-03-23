# Architecture

## Overview

PR Hub is a Chrome Extension (Manifest V3) built with React 19, TypeScript, and Vite. It displays a user's GitHub pull requests, review requests, and CI status in a popup.

## Project Structure

```
src/
  popup.tsx              # React entry point — mounts <App /> into #root
  popup.css              # All styles (GitHub Primer tokens, light/dark mode)
  App.tsx                # Root component — delegates to useApp hook, renders screen
  types.ts               # Shared TypeScript interfaces and types
  constants.ts           # Shared constants (pagination, review labels, branch sets)
  github.ts              # GitHub REST API layer (search, enrich, reviews, checks)
  storage.ts             # Chrome storage wrapper with caching (4h TTL)
  tabs.ts                # Chrome tabs helper (open or focus existing tab)
  utils/
    time.ts              # Date utilities (timeAgo, oneWeekAgo, oneMonthAgo)
    repo.ts              # URL utilities (getRepoName)
    merge-status.ts      # PR merge readiness logic (getMergeStatus)
  hooks/
    useApp.ts            # App-level state: auth, tab loading, caching, prefetch
    useLoginScreen.ts    # Login form state: input, validation, loading, error
    usePRList.ts         # PR list state: pagination, clipboard
  components/
    LoginScreen.tsx      # PAT input with ghp_ validation and scope badges
    Dashboard.tsx        # Header, tab bar, tab content routing
    PRList.tsx           # Paginated PR list with conditional badges/stats
    Skeleton.tsx         # Loading placeholders (DashboardSkeleton, PRListSkeleton)
    Icons.tsx            # SVG icon components (Check, Branch, Link, Merge, etc.)
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
            ├─ Init: reads cache → shows cached data instantly → revalidates in background
            └─ Renders:
                 ├─ <DashboardSkeleton />  (while loading)
                 ├─ <LoginScreen />        (no token)
                 └─ <Dashboard />          (authenticated)
                      ├─ Tab: "My PRs"   → <PRList showChecks showBaseBranch />
                      ├─ Tab: "Reviews"  → <PRList showAuthor showMyReview /> (pending + reviewed sections)
                      └─ Tab: "Merged"   → <PRList showMergedBadge showBaseBranch />
```

## Module Responsibilities

| Layer | Modules | Role |
|-------|---------|------|
| **Types** | `types.ts`, `constants.ts` | Shared interfaces, type aliases, and configuration constants |
| **Utils** | `utils/time.ts`, `utils/repo.ts`, `utils/merge-status.ts` | Pure functions with no dependencies on React or browser APIs |
| **API** | `github.ts` | All GitHub REST API calls: search, enrichment, review status |
| **Storage** | `storage.ts` | Chrome storage abstraction with cache TTL. Falls back to no-op outside extension |
| **Platform** | `tabs.ts` | Chrome tabs abstraction. Falls back to `window.open` outside extension |
| **Hooks** | `hooks/useApp.ts`, `hooks/useLoginScreen.ts`, `hooks/usePRList.ts` | React state and effects. Each hook encapsulates one concern |
| **Components** | `components/*.tsx` | Pure rendering. Components receive data and callbacks from hooks |

## Design Principles

- **Separation of concerns**: Pure functions, constants, and types are in their own modules — not mixed into hooks or components
- **Hooks own logic, components own rendering**: Components are thin; hooks are testable without mounting
- **Cache-first UX**: Cached data is shown instantly on popup open, then revalidated in the background
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

1. **Search** — Three parallel queries: `author:{user} is:open`, `review-requested:{user}`, `reviewed-by:{user}`
2. **Enrich** — For each PR: fetch PR details + reviews in parallel, then fetch commit status + check-runs
3. **Deduplicate** — Review queries are merged by PR id (a PR disappears from `review-requested` after reviewing)
4. **Review status** — Latest review per user is tracked to determine approval/changes-requested counts

Only Classic PATs (`ghp_`) work. Fine-grained tokens don't support the Search Issues API.
