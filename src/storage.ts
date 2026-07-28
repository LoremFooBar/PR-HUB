import type { GitHubUser, PullRequestItem, Tab } from "./types";
import { ALL_TABS, TAB_CACHE_KEYS } from "./constants";
import type { TabSortOrder } from "./utils/sort";

export type { TabSortOrder };

const storage =
  typeof chrome !== "undefined" && chrome.storage
    ? chrome.storage.local
    : null;

// Cached tab data is considered fresh for 30 minutes.
const CACHE_TTL_MS = 30 * 60 * 1000;

export function getToken(): Promise<string | null> {
  if (!storage) return Promise.resolve(null);
  return new Promise((resolve) =>
    storage.get("gh_token", (result) => resolve(result.gh_token ?? null))
  );
}

export function setToken(token: string): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ gh_token: token }, () => resolve())
  );
}

export function removeToken(): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.remove("gh_token", () => resolve())
  );
}

// --- Settings ---

// What tab-group sync does with a "stray" tab — one in the "My PRs" group the
// user navigated to a non-PR URL. Never closed; either moved out of the group
// or left in it.
export type StrayTabAction = "ungroup" | "keep";

// Chrome's fixed tab-group color palette (chrome.tabGroups.ColorEnum).
export const GROUP_COLORS = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
] as const;
export type GroupColor = (typeof GROUP_COLORS)[number];

// Settings are persistent preferences, kept independently of the auth token and
// the PR cache so they survive logout.
export interface AppSettings {
  org: string;
  strayTabAction: StrayTabAction;
  groupColor: GroupColor;
  // Whether the background refresh re-syncs the "My PRs" tab group, creating it
  // if missing. When off, the group only changes on a manual sync.
  autoSync: boolean;
  tabSortOrder: TabSortOrder;
  linkPreview: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  org: "",
  strayTabAction: "ungroup",
  groupColor: "blue",
  autoSync: false,
  tabSortOrder: "title",
  linkPreview: true,
};

export function getOrg(): Promise<string> {
  if (!storage) return Promise.resolve(DEFAULT_SETTINGS.org);
  return new Promise((resolve) =>
    storage.get("gh_org", (result) => resolve(result.gh_org ?? DEFAULT_SETTINGS.org))
  );
}

export function getStrayTabAction(): Promise<StrayTabAction> {
  if (!storage) return Promise.resolve(DEFAULT_SETTINGS.strayTabAction);
  return new Promise((resolve) =>
    storage.get("stray_tab_action", (result) =>
      resolve(result.stray_tab_action ?? DEFAULT_SETTINGS.strayTabAction)
    )
  );
}

export function getAutoSync(): Promise<boolean> {
  if (!storage) return Promise.resolve(DEFAULT_SETTINGS.autoSync);
  return new Promise((resolve) =>
    storage.get("auto_sync", (result) => resolve(result.auto_sync ?? DEFAULT_SETTINGS.autoSync))
  );
}

export function getTabSortOrder(): Promise<TabSortOrder> {
  if (!storage) return Promise.resolve(DEFAULT_SETTINGS.tabSortOrder);
  return new Promise((resolve) =>
    storage.get("tab_sort_order", (result) =>
      resolve(result.tab_sort_order ?? DEFAULT_SETTINGS.tabSortOrder)
    )
  );
}

export function getGroupColor(): Promise<GroupColor> {
  if (!storage) return Promise.resolve(DEFAULT_SETTINGS.groupColor);
  return new Promise((resolve) =>
    storage.get("group_color", (result) =>
      resolve(result.group_color ?? DEFAULT_SETTINGS.groupColor)
    )
  );
}

// Written in one go, so no reader ever sees a half-applied change.
export function setSettings(settings: AppSettings): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set(
      {
        gh_org: settings.org,
        stray_tab_action: settings.strayTabAction,
        group_color: settings.groupColor,
        auto_sync: settings.autoSync,
        tab_sort_order: settings.tabSortOrder,
        link_preview: settings.linkPreview,
      },
      () => resolve()
    )
  );
}

// --- Caching ---

interface CachedTab {
  data: PullRequestItem[];
  timestamp: number;
}

export function getCachedUser(): Promise<GitHubUser | null> {
  if (!storage) return Promise.resolve(null);
  return new Promise((resolve) =>
    storage.get("cached_user", (result) => resolve(result.cached_user ?? null))
  );
}

export function setCachedUser(user: GitHubUser): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ cached_user: user }, () => resolve())
  );
}

export function getCachedTab(tab: string): Promise<PullRequestItem[] | null> {
  if (!storage) return Promise.resolve(null);
  const key = `cached_${tab}`;
  return new Promise((resolve) =>
    storage.get(key, (result) => {
      const entry: CachedTab | undefined = result[key];
      if (!entry) return resolve(null);
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) return resolve(null);
      resolve(entry.data);
    })
  );
}

export function setCachedTab(tab: string, data: PullRequestItem[]): Promise<void> {
  if (!storage) return Promise.resolve();
  const key = `cached_${tab}`;
  const entry: CachedTab = { data, timestamp: Date.now() };
  return new Promise((resolve) =>
    storage.set({ [key]: entry }, () => resolve())
  );
}

export function clearCache(): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.remove(["cached_user", ...TAB_CACHE_KEYS], () => resolve())
  );
}

// Invalidates just the per-tab PR caches, leaving the cached user in place.
export function clearTabCache(): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) => storage.remove(TAB_CACHE_KEYS, () => resolve()));
}

export type CachedTabs = Record<Tab, PullRequestItem[] | null>;

function noCachedTabs(): CachedTabs {
  const tabs = {} as CachedTabs;
  for (const tab of ALL_TABS) tabs[tab] = null;
  return tabs;
}

// Batch read: single chrome.storage call instead of several separate ones.
export interface InitCache extends AppSettings {
  token: string | null;
  user: GitHubUser | null;
  tabs: CachedTabs;
}

export function getInitCache(): Promise<InitCache> {
  if (!storage) return Promise.resolve({ ...DEFAULT_SETTINGS, token: null, user: null, tabs: noCachedTabs() });
  const keys = ["gh_token", "gh_org", "stray_tab_action", "group_color", "auto_sync", "tab_sort_order", "link_preview", "cached_user", ...TAB_CACHE_KEYS];
  return new Promise((resolve) =>
    storage.get(keys, (result) => {
      // On open we always show whatever is cached, regardless of age — the
      // background alarm keeps the cache fresh, so we never block on a fetch.
      const tabs = noCachedTabs();
      for (const tab of ALL_TABS) {
        const entry: CachedTab | undefined = result[`cached_${tab}`];
        if (entry) tabs[tab] = entry.data;
      }
      resolve({
        token: result.gh_token ?? null,
        org: result.gh_org ?? DEFAULT_SETTINGS.org,
        strayTabAction: result.stray_tab_action ?? DEFAULT_SETTINGS.strayTabAction,
        groupColor: result.group_color ?? DEFAULT_SETTINGS.groupColor,
        autoSync: result.auto_sync ?? DEFAULT_SETTINGS.autoSync,
        tabSortOrder: result.tab_sort_order ?? DEFAULT_SETTINGS.tabSortOrder,
        linkPreview: result.link_preview ?? DEFAULT_SETTINGS.linkPreview,
        user: result.cached_user ?? null,
        tabs,
      });
    })
  );
}
