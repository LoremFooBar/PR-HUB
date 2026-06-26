# PR Hub

Chrome extension that shows your open pull requests, merged PRs, CI status, and base branches — with GitHub Primer theming and auto dark mode.

## Features

- **My PRs tab** — Open pull requests with CI check status, comment count, approvals, change requests, and merge readiness badge
- **Merged tab** — Recently merged PRs (last week) with base branch info
- **Organization scope** — Settings screen to limit PRs to a single org (leave blank for all)
- **Copy actions** — Hover any PR to copy its branch name or URL
- **Production branch warnings** — Visual indicator when a PR targets `main` or `master`
- **GitHub Primer theme** — Light and dark mode that follows your OS setting
- **30-minute cache** — Cached data is shown instantly; click refresh to invalidate and refetch
- **Skeleton loading** — Smooth loading placeholders instead of blank screens
- **Pagination** — 10 PRs at a time with "Show more"

## Screenshots

| Light mode | Dark mode |
|---|---|
| _coming soon_ | _coming soon_ |

## Setup

### 1. Create a GitHub token

Go to [Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens) and generate a new token with these scopes:

- `repo`
- `read:user`

> **Note:** Only Classic PATs (starting with `ghp_`) are supported. Fine-grained tokens are not compatible with the Search Issues API.

### 2. Install the extension

```bash
git clone https://github.com/LoremFooBar/PR-HUB.git
cd PR-HUB
npm install
npm run build
```

Then load it in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

### 3. Login

Click the extension icon, paste your Classic PAT, and you're in.

### 4. (Optional) Scope to an organization

Click the gear icon in the header and enter an org login to show only that org's PRs. Leave it blank to show PRs from everywhere.

## Development

```bash
npm run dev          # Watch mode (rebuilds on file changes)
npm run build        # Production build
npm test             # Jest unit tests (hooks + utils)
npm run test:watch   # Jest in watch mode
npm run test:ct      # Playwright component tests
```

After building, go to `chrome://extensions` and click the reload button on the extension.

## Tech Stack

- **React 19** + **TypeScript 5.9**
- **Vite 6** for bundling
- **CSS custom properties** with GitHub Primer color tokens
- **Chrome Extension Manifest V3**
- **GitHub REST API** (Search, Pulls, Check Runs)
- **Jest** + **SWC** for unit tests
- **Playwright** for component tests

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full project structure, data flow, module responsibilities, and testing strategy.

## License

MIT
