// Styles for the hover preview card. Kept as a string (not a .css file) so the
// content script stays a single self-contained bundle it can inject into its
// shadow root.
export const PREVIEW_STYLE = `
:host {
  all: initial;
}

.card {
  --pv-bg: #ffffff;
  --pv-fg: #1f2328;
  --pv-muted: #59636e;
  --pv-border: #d1d9e0;
  --pv-success: #1a7f37;
  --pv-danger: #cf222e;
  --pv-attention: #9a6700;
  --pv-done: #8250df;

  position: fixed;
  z-index: 2147483647;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 340px;
  padding: 8px 10px;
  border: 1px solid var(--pv-border);
  border-radius: 6px;
  background: var(--pv-bg);
  color: var(--pv-fg);
  font: 400 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  box-shadow: 0 8px 24px rgba(31, 35, 40, 0.2);
  opacity: 0;
  pointer-events: none;
  transition: opacity 90ms ease-out;
}

.card.visible {
  opacity: 1;
}

.head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 10px;
  line-height: 1;
}

.badge--ready { background: var(--pv-success); }
.badge--blocked { background: var(--pv-danger); }
.badge--behind { background: var(--pv-attention); }
.badge--pending { background: var(--pv-muted); }
.badge--merged { background: var(--pv-done); }

.repo {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--pv-muted);
}

.num {
  flex: none;
  color: var(--pv-muted);
}

.age {
  flex: none;
  margin-left: auto;
  padding-left: 8px;
  color: var(--pv-muted);
}

.title {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.branches {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--pv-muted);
}

.branch {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(129, 139, 152, 0.12);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.arrow { flex: none; }

.stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat { flex: none; }
.stat--ok { color: var(--pv-success); }
.stat--bad { color: var(--pv-danger); }

.status {
  margin-left: auto;
  padding-left: 8px;
  color: var(--pv-muted);
  white-space: nowrap;
}

@media (prefers-color-scheme: dark) {
  .card {
    --pv-bg: #151b23;
    --pv-fg: #f0f6fc;
    --pv-muted: #9198a1;
    --pv-border: #3d444d;
    --pv-success: #3fb950;
    --pv-danger: #f85149;
    --pv-attention: #d29922;
    --pv-done: #ab7df8;

    box-shadow: 0 8px 24px rgba(1, 4, 9, 0.6);
  }

  .badge { color: #151b23; }
}
`;
