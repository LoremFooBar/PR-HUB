import type { GitHubUser, PullRequestItem } from "./types";

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

// Org scope is a persistent preference, kept independently of the auth token
// and the PR cache so it survives logout.
export function getOrg(): Promise<string> {
  if (!storage) return Promise.resolve("");
  return new Promise((resolve) =>
    storage.get("gh_org", (result) => resolve(result.gh_org ?? ""))
  );
}

export function setOrg(org: string): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ gh_org: org }, () => resolve())
  );
}

// What tab-group sync does with a "stray" tab — one in the "My PRs" group the
// user navigated to a non-PR URL. Never closed; either moved out of the group
// or left in it.
export type StrayTabAction = "ungroup" | "keep";

export function getStrayTabAction(): Promise<StrayTabAction> {
  if (!storage) return Promise.resolve("ungroup");
  return new Promise((resolve) =>
    storage.get("stray_tab_action", (result) =>
      resolve(result.stray_tab_action ?? "ungroup")
    )
  );
}

export function setStrayTabAction(action: StrayTabAction): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ stray_tab_action: action }, () => resolve())
  );
}

// Whether the background refresh re-syncs the "My PRs" tab group — creating it
// if missing. Off by default; when off the group only changes on a manual sync.
export function getAutoSync(): Promise<boolean> {
  if (!storage) return Promise.resolve(false);
  return new Promise((resolve) =>
    storage.get("auto_sync", (result) => resolve(result.auto_sync ?? false))
  );
}

export function setAutoSync(enabled: boolean): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ auto_sync: enabled }, () => resolve())
  );
}

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

export function getGroupColor(): Promise<GroupColor> {
  if (!storage) return Promise.resolve("blue");
  return new Promise((resolve) =>
    storage.get("group_color", (result) => resolve(result.group_color ?? "blue"))
  );
}

export function setGroupColor(color: GroupColor): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.set({ group_color: color }, () => resolve())
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
    storage.remove(
      ["cached_user", "cached_assigned", "cached_merged"],
      () => resolve()
    )
  );
}

// Invalidates just the per-tab PR caches, leaving the cached user in place.
export function clearTabCache(): Promise<void> {
  if (!storage) return Promise.resolve();
  return new Promise((resolve) =>
    storage.remove(["cached_assigned", "cached_merged"], () => resolve())
  );
}

// Batch read: single chrome.storage call instead of several separate ones.
export interface InitCache {
  token: string | null;
  org: string;
  strayTabAction: StrayTabAction;
  groupColor: GroupColor;
  autoSync: boolean;
  user: GitHubUser | null;
  assigned: PullRequestItem[] | null;
  merged: PullRequestItem[] | null;
}

export function getInitCache(): Promise<InitCache> {
  if (!storage) return Promise.resolve({ token: null, org: "", strayTabAction: "ungroup", groupColor: "blue", autoSync: false, user: null, assigned: null, merged: null });
  const keys = ["gh_token", "gh_org", "stray_tab_action", "group_color", "auto_sync", "cached_user", "cached_assigned", "cached_merged"];
  return new Promise((resolve) =>
    storage.get(keys, (result) => {
      // On open we always show whatever is cached, regardless of age — the
      // background alarm keeps the cache fresh, so we never block on a fetch.
      const tab = (key: string): PullRequestItem[] | null => {
        const entry: CachedTab | undefined = result[key];
        return entry ? entry.data : null;
      };
      resolve({
        token: result.gh_token ?? null,
        org: result.gh_org ?? "",
        strayTabAction: result.stray_tab_action ?? "ungroup",
        groupColor: result.group_color ?? "blue",
        autoSync: result.auto_sync ?? false,
        user: result.cached_user ?? null,
        assigned: tab("cached_assigned"),
        merged: tab("cached_merged"),
      });
    })
  );
}
