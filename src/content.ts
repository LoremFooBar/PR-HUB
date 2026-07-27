import type { PullRequestItem } from "./types";
import { normalizePRUrl } from "./utils/pr-url";
import { getMergeStatus } from "./utils/merge-status";
import { getRepoName } from "./utils/repo";
import { timeAgo } from "./utils/time";
import { PREVIEW_STYLE } from "./preview-style";

const HOVER_DELAY_MS = 200;
const EDGE_GAP = 8;

interface CachedPR {
  pr: PullRequestItem;
  merged: boolean;
}

const MERGE_STATUS_CHAR = {
  ready: "✓",
  blocked: "✗",
  behind: "↑",
  pending: "●",
} as const;

const byUrl = new Map<string, CachedPR>();
let enabled = true;
let hoverTimer: number | undefined;
let currentAnchor: HTMLAnchorElement | null = null;
let card: HTMLDivElement | null = null;

function readCache(result: Record<string, unknown>) {
  const items = (key: string): PullRequestItem[] =>
    (result[key] as { data?: PullRequestItem[] } | undefined)?.data ?? [];

  byUrl.clear();
  // The assigned tab is indexed last, so a PR listed in both keeps its open
  // entry — the one carrying check status and review counts.
  addToIndex(items("cached_merged"), true);
  addToIndex(items("cached_assigned"), false);
}

function addToIndex(prs: PullRequestItem[], merged: boolean) {
  for (const pr of prs) {
    const key = normalizePRUrl(pr.html_url);
    if (key) byUrl.set(key, { pr, merged });
  }
}

function ensureCard(): HTMLDivElement {
  if (card) return card;
  const host = document.createElement("div");
  // Shadow DOM keeps the host page's CSS from reaching the preview and vice versa.
  const root = host.attachShadow({ mode: "closed" });
  try {
    // An adopted stylesheet isn't subject to the page's style-src CSP.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(PREVIEW_STYLE);
    root.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement("style");
    style.textContent = PREVIEW_STYLE;
    root.append(style);
  }
  card = document.createElement("div");
  card.className = "card";
  root.append(card);
  // Attached to <html>, not <body>: a transformed ancestor would otherwise
  // become the containing block for the card's fixed positioning.
  document.documentElement.appendChild(host);
  return card;
}

function row(className: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  return el;
}

function span(className: string, text: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}

function badgeFor({ pr, merged }: CachedPR) {
  if (merged) return { modifier: "merged", glyph: "⤴", label: "Merged" };
  const { status, reason } = getMergeStatus(pr);
  return { modifier: status, glyph: MERGE_STATUS_CHAR[status], label: reason };
}

function render(entry: CachedPR): HTMLDivElement {
  const { pr } = entry;
  const badge = badgeFor(entry);
  const el = ensureCard();
  el.textContent = "";

  const head = row("head");
  head.append(
    span(`badge badge--${badge.modifier}`, badge.glyph),
    span("repo", getRepoName(pr.repository_url)),
    span("num", `#${pr.number}`)
  );
  if (pr.created_at) head.append(span("age", timeAgo(pr.created_at)));
  el.append(head, span("title", pr.title));

  if (pr.head_ref || pr.base_ref) {
    const branches = row("branches");
    if (pr.head_ref) branches.append(span("branch", pr.head_ref));
    if (pr.head_ref && pr.base_ref) branches.append(span("arrow", "→"));
    if (pr.base_ref) branches.append(span("branch", pr.base_ref));
    el.append(branches);
  }

  const stats = row("stats");
  if ((pr.comments ?? 0) > 0) stats.append(span("stat", `\u{1F4AC} ${pr.comments}`));
  if ((pr.approvals ?? 0) > 0) stats.append(span("stat stat--ok", `✓ ${pr.approvals}`));
  if ((pr.changes_requested ?? 0) > 0) {
    stats.append(span("stat stat--bad", `✗ ${pr.changes_requested}`));
  }
  stats.append(span("status", badge.label));
  el.append(stats);

  return el;
}

function place(el: HTMLDivElement, anchor: HTMLAnchorElement) {
  const target = anchor.getBoundingClientRect();
  // The card is always laid out (only its opacity is toggled), so it can be
  // measured before being moved into place.
  el.style.left = "0px";
  el.style.top = "0px";
  const { width, height } = el.getBoundingClientRect();

  const left = Math.max(EDGE_GAP, Math.min(target.left, window.innerWidth - width - EDGE_GAP));
  const below = target.bottom + EDGE_GAP;
  const top =
    below + height + EDGE_GAP > window.innerHeight
      ? Math.max(EDGE_GAP, target.top - height - EDGE_GAP)
      : below;

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.classList.add("visible");
}

function hide() {
  clearTimeout(hoverTimer);
  hoverTimer = undefined;
  currentAnchor = null;
  card?.classList.remove("visible");
}

function onMouseOver(event: MouseEvent) {
  const target = event.target;
  const anchor =
    target instanceof Element
      ? (target.closest("a[href]") as HTMLAnchorElement | null)
      : null;
  if (anchor && anchor === currentAnchor) return;

  hide();
  if (!enabled || !anchor) return;

  const key = normalizePRUrl(anchor.href);
  const entry = key ? byUrl.get(key) : undefined;
  if (!entry) return;

  currentAnchor = anchor;
  hoverTimer = window.setTimeout(() => {
    if (currentAnchor !== anchor || !anchor.isConnected) return;
    place(render(entry), anchor);
  }, HOVER_DELAY_MS);
}

function start() {
  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseleave", hide);
  window.addEventListener("scroll", hide, { capture: true, passive: true });
  window.addEventListener("blur", hide);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });

  chrome.storage.local.get(
    ["link_preview", "cached_assigned", "cached_merged"],
    (result) => {
      enabled = result.link_preview ?? true;
      readCache(result);
    }
  );

  // Background refreshes and setting changes land while the page stays open.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if ("link_preview" in changes) {
      enabled = changes.link_preview.newValue ?? true;
      if (!enabled) hide();
    }
    if ("cached_assigned" in changes || "cached_merged" in changes) {
      chrome.storage.local.get(["cached_assigned", "cached_merged"], readCache);
    }
  });
}

start();
